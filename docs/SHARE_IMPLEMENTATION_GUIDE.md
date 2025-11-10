# Production Share Implementation Guide for Troodie

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing Guide](#testing-guide)
5. [Monitoring & Analytics](#monitoring-analytics)
6. [Troubleshooting](#troubleshooting)

## Overview

This guide provides a complete implementation path for production-ready share functionality using Expo and Supabase. The solution provides:
- Universal deep links that work across platforms
- Rich social media previews
- Analytics tracking
- Fallback to app stores for new users

## Prerequisites

- [ ] Supabase project with Edge Functions enabled
- [ ] Apple Developer account (for iOS Universal Links)
- [ ] Google Play Console access (for Android App Links)
- [ ] Domain for short URLs (optional but recommended)
- [ ] Production app builds (not Expo Go)

## Step-by-Step Implementation

### Phase 1: Database Setup

1. **Run the share analytics migration**
   ```bash
   supabase db push
   # or manually run in SQL editor:
   # supabase/migrations/20250130_add_share_functionality.sql
   ```

2. **Verify tables exist**
   ```sql
   -- Check share_analytics table
   SELECT * FROM share_analytics LIMIT 1;
   
   -- Check share count columns
   SELECT shares_count FROM posts LIMIT 1;
   SELECT share_count FROM boards LIMIT 1;
   ```

### Phase 2: Deploy Supabase Edge Function

1. **Initialize Supabase Functions**
   ```bash
   supabase functions new share-redirect
   ```

2. **Update the function code**
   Replace the generated function with our optimized version:
   ```typescript
   // supabase/functions/share-redirect/index.ts
   // (Already created in previous step)
   ```

3. **Deploy the function**
   ```bash
   supabase functions deploy share-redirect
   ```

4. **Test the function**
   ```bash
   # Test the function endpoint
   curl https://[PROJECT_ID].supabase.co/functions/v1/share-redirect/board/test-id
   ```

### Phase 3: Configure Production URLs

1. **Update ShareService for production**
   ```typescript
   // services/shareService.ts
   
   const SUPABASE_PROJECT_URL = 'https://[YOUR_PROJECT_ID].supabase.co';
   const SHARE_FUNCTION_URL = `${SUPABASE_PROJECT_URL}/functions/v1/share-redirect`;
   
   static generateDeepLink(content: ShareContent): string {
     if (__DEV__) {
       return Linking.createURL(`/${content.type}s/${content.id}`);
     }
     
     // Production URLs using Supabase Edge Function
     switch (content.type) {
       case 'board':
         return `${SHARE_FUNCTION_URL}/board/${content.id}`;
       case 'post':
         return `${SHARE_FUNCTION_URL}/post/${content.id}`;
       case 'profile':
         return `${SHARE_FUNCTION_URL}/profile/${content.username || content.id}`;
       case 'restaurant':
         return `${SHARE_FUNCTION_URL}/restaurant/${content.id}`;
       default:
         return SHARE_FUNCTION_URL;
     }
   }
   ```

### Phase 4: Configure App Association Files

1. **Create Apple App Site Association file**
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "TEAM_ID.com.troodie.app",
           "paths": [
             "/functions/v1/share-redirect/*"
           ]
         }
       ]
     }
   }
   ```

2. **Create Android Asset Links file**
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.troodie.app",
       "sha256_cert_fingerprints": ["YOUR_APP_CERT_FINGERPRINT"]
     }
   }]
   ```

3. **Host these files**
   - Option A: Use Supabase Storage (public bucket)
   - Option B: Use Cloudflare Pages/Workers
   - Option C: GitHub Pages with custom domain

### Phase 5: Update App Configuration

1. **Update app.json for production**
   ```json
   {
     "expo": {
       "scheme": "troodie",
       "ios": {
         "bundleIdentifier": "com.troodie.app",
         "associatedDomains": [
           "applinks:[PROJECT_ID].supabase.co"
         ]
       },
       "android": {
         "package": "com.troodie.app",
         "intentFilters": [
           {
             "action": "VIEW",
             "autoVerify": true,
             "data": [{
               "scheme": "https",
               "host": "[PROJECT_ID].supabase.co",
               "pathPrefix": "/functions/v1/share-redirect"
             }],
             "category": ["BROWSABLE", "DEFAULT"]
           }
         ]
       }
     }
   }
   ```

2. **Build production apps**
   ```bash
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

### Phase 6: Implement Analytics Dashboard

1. **Create analytics queries**
   ```sql
   -- Share funnel analysis
   CREATE VIEW share_analytics_funnel AS
   SELECT 
     content_type,
     COUNT(CASE WHEN action = 'initiated' THEN 1 END) as shares_initiated,
     COUNT(CASE WHEN action = 'completed' THEN 1 END) as shares_completed,
     ROUND(
       COUNT(CASE WHEN action = 'completed' THEN 1 END)::numeric / 
       NULLIF(COUNT(CASE WHEN action = 'initiated' THEN 1 END), 0) * 100, 
       2
     ) as completion_rate
   FROM share_analytics
   GROUP BY content_type;
   
   -- Top shared content
   CREATE VIEW top_shared_content AS
   SELECT 
     content_type,
     content_id,
     COUNT(*) as share_count,
     COUNT(DISTINCT user_id) as unique_sharers
   FROM share_analytics
   WHERE action = 'completed'
   GROUP BY content_type, content_id
   ORDER BY share_count DESC;
   ```

2. **Add to your admin dashboard**
   ```typescript
   // services/analyticsService.ts
   export async function getShareAnalytics() {
     const { data: funnel } = await supabase
       .from('share_analytics_funnel')
       .select('*');
       
     const { data: topContent } = await supabase
       .from('top_shared_content')
       .select('*')
       .limit(10);
       
     return { funnel, topContent };
   }
   ```

### Phase 7: Optional - URL Shortener

1. **Create short URL table**
   ```sql
   CREATE TABLE short_urls (
     id SERIAL PRIMARY KEY,
     short_code VARCHAR(10) UNIQUE NOT NULL,
     long_url TEXT NOT NULL,
     content_type VARCHAR(20),
     content_id UUID,
     clicks INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX idx_short_urls_code ON short_urls(short_code);
   ```

2. **Update Edge Function to handle short URLs**
   ```typescript
   // Add to share-redirect function
   if (pathParts[1] === 's') {
     // Short URL format: /s/abc123
     const shortCode = pathParts[2];
     const { data } = await supabase
       .from('short_urls')
       .select('long_url')
       .eq('short_code', shortCode)
       .single();
       
     if (data) {
       // Increment click count
       await supabase.rpc('increment_short_url_clicks', { 
         code: shortCode 
       });
       
       return Response.redirect(data.long_url, 302);
     }
   }
   ```

## Testing Guide

### Development Testing

1. **Test Expo development URLs**
   ```bash
   # iOS Simulator
   npx uri-scheme open "exp://localhost:8081/boards/test-id" --ios
   
   # Android Emulator  
   npx uri-scheme open "exp://localhost:8081/boards/test-id" --android
   ```

2. **Test share functionality**
   ```javascript
   // Add test button to your app
   <Button 
     title="Test Share" 
     onPress={() => {
       ShareService.share({
         type: 'board',
         id: 'test-board-id',
         title: 'Test Board',
         description: 'Testing share functionality'
       });
     }}
   />
   ```

### Production Testing

1. **Test Edge Function directly**
   ```bash
   # Test bot detection (should return HTML)
   curl -H "User-Agent: facebookbot" \
     https://[PROJECT_ID].supabase.co/functions/v1/share-redirect/board/test
   
   # Test mobile redirect (should redirect to app/store)
   curl -H "User-Agent: Mozilla/5.0 (iPhone)" \
     https://[PROJECT_ID].supabase.co/functions/v1/share-redirect/board/test
   ```

2. **Test Universal/App Links**
   - Share a link via Messages/WhatsApp
   - Tap the link on a device with the app installed
   - Verify it opens in the app, not the browser

3. **Test social media previews**
   - Share on Facebook/Twitter
   - Verify Open Graph tags display correctly

## Monitoring & Analytics

### Key Metrics to Track

1. **Share Funnel**
   - Shares initiated vs completed
   - Platform breakdown (iOS/Android/Web)
   - Content type performance

2. **Viral Coefficient**
   ```sql
   -- Calculate K-factor (viral coefficient)
   WITH share_data AS (
     SELECT 
       user_id,
       COUNT(DISTINCT content_id) as items_shared
     FROM share_analytics
     WHERE action = 'completed'
     GROUP BY user_id
   ),
   new_users_from_shares AS (
     -- Track users who joined via shared links
     SELECT COUNT(DISTINCT user_id) as new_users
     FROM users
     WHERE referral_source = 'share_link'
   )
   SELECT 
     AVG(items_shared) as avg_shares_per_user,
     (SELECT new_users FROM new_users_from_shares) / COUNT(DISTINCT user_id) as conversion_rate
   FROM share_data;
   ```

3. **Performance Monitoring**
   - Edge Function execution time
   - Failed share attempts
   - Redirect success rate

### Setting Up Alerts

```sql
-- Alert for high share failure rate
CREATE OR REPLACE FUNCTION check_share_failure_rate()
RETURNS void AS $$
DECLARE
  failure_rate numeric;
BEGIN
  SELECT 
    COUNT(CASE WHEN error IS NOT NULL THEN 1 END)::numeric / 
    COUNT(*) * 100
  INTO failure_rate
  FROM share_analytics
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  IF failure_rate > 10 THEN
    -- Send alert (integrate with your notification service)
    PERFORM notify_admin('High share failure rate: ' || failure_rate || '%');
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

### Common Issues

1. **"Site can't be reached" error**
   - Verify Edge Function is deployed
   - Check function logs: `supabase functions logs share-redirect`

2. **Links open in browser instead of app**
   - Verify app association files are accessible
   - Check bundle ID/package name matches
   - Ensure production build has associated domains

3. **No social media preview**
   - Test with Facebook Debugger: https://developers.facebook.com/tools/debug/
   - Verify Open Graph tags in Edge Function response

4. **Share counts not updating**
   - Check if trigger exists: `\df increment_share_count`
   - Verify RLS policies allow inserts
   - Check function logs for errors

### Debug Checklist

- [ ] Edge Function deployed and accessible
- [ ] App association files hosted and valid
- [ ] Production app built with correct configuration
- [ ] Database migrations run successfully
- [ ] RLS policies configured correctly
- [ ] Analytics tracking working

## Best Practices

1. **Use environment variables**
   ```typescript
   const SHARE_BASE_URL = process.env.EXPO_PUBLIC_SHARE_BASE_URL || 
     'https://[PROJECT_ID].supabase.co/functions/v1/share-redirect';
   ```

2. **Cache Edge Function responses**
   ```typescript
   return new Response(html, {
     headers: {
       ...corsHeaders,
       'Content-Type': 'text/html',
       'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
     },
   });
   ```

3. **Implement retry logic**
   ```typescript
   async function shareWithRetry(content: ShareContent, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await ShareService.share(content);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   }
   ```

4. **A/B test share messages**
   ```typescript
   const shareMessages = {
     board: [
       'Check out my restaurant collection: "{title}"',
       'I curated these amazing spots: "{title}"',
       '{count} handpicked restaurants in "{title}"'
     ]
   };
   
   // Randomly select message for A/B testing
   const message = shareMessages.board[Math.floor(Math.random() * shareMessages.board.length)];
   ```

## Conclusion

This implementation provides a robust, scalable share system that:
- Works seamlessly across platforms
- Provides rich social media previews
- Tracks detailed analytics
- Scales with your app growth
- Requires minimal maintenance

For support or questions, refer to:
- [Expo Deep Linking Docs](https://docs.expo.dev/guides/linking/)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Universal Links Troubleshooting](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)