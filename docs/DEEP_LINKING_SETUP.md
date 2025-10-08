# Deep Linking Setup for Troodie

## Overview
This guide covers setting up deep linking for sharing functionality using Expo and Supabase.

## Development Setup

### 1. Expo Development Links
During development, the app uses Expo's linking which creates URLs like:
- `exp://192.168.1.100:8081/boards/[id]` (local development)
- `exp://u.expo.dev/[project-id]?channel=default&runtime-version=1.0.0/boards/[id]` (Expo Go)

These work automatically when testing with Expo Go or development builds.

### 2. Testing Share Links in Development
```bash
# Test a deep link in development
npx uri-scheme open "exp://192.168.1.100:8081/boards/98db758d-2cfd-491f-bee2-2bcd7a496ebd" --ios
```

## Production Setup with Supabase

### 1. Supabase Edge Functions
Create a URL shortener/redirect service using Supabase Edge Functions:

```bash
# Deploy the share redirect function
supabase functions deploy share-redirect
```

Your share URLs will be:
- `https://[project-id].supabase.co/functions/v1/share-redirect/board/[id]`
- Can be shortened to: `https://troodie.link/b/[short-id]`

### 2. Custom Domain Setup

#### Option A: Using Supabase Custom Domain
1. Add custom domain in Supabase dashboard
2. Point `api.troodie.app` to Supabase
3. Share URLs become: `https://api.troodie.app/functions/v1/share/board/[id]`

#### Option B: Using Cloudflare Workers (Recommended)
1. Create a Cloudflare Worker for `troodie.link`
2. Worker redirects to your app or app stores
3. Provides analytics and geographic routing

### 3. Configure App Association

#### iOS (Universal Links)
1. Add to `app.json`:
```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:troodie.link", "applinks:api.troodie.app"]
    }
  }
}
```

2. Host `apple-app-site-association` file at:
   - `https://troodie.link/.well-known/apple-app-site-association`

#### Android (App Links)
1. Add to `app.json`:
```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "troodie.link",
              "pathPrefix": "/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

2. Host `assetlinks.json` at:
   - `https://troodie.link/.well-known/assetlinks.json`

### 4. URL Structure

#### Short URLs (via Edge Function):
- Boards: `https://troodie.link/b/[short-id]`
- Posts: `https://troodie.link/p/[short-id]`
- Profiles: `https://troodie.link/u/[username]`
- Restaurants: `https://troodie.link/r/[short-id]`

#### Direct URLs (fallback):
- Boards: `https://api.troodie.app/share/boards/[uuid]`
- Posts: `https://api.troodie.app/share/posts/[uuid]`

### 5. Share Service Configuration

Update `shareService.ts` for production:

```typescript
static generateDeepLink(content: ShareContent): string {
  if (__DEV__) {
    return Linking.createURL(`/${content.type}s/${content.id}`);
  }
  
  // Production: Use Supabase Edge Function
  const SHARE_BASE_URL = 'https://api.troodie.app/functions/v1/share';
  
  switch (content.type) {
    case 'board':
      return `${SHARE_BASE_URL}/board/${content.id}`;
    case 'post':
      return `${SHARE_BASE_URL}/post/${content.id}`;
    case 'profile':
      return `${SHARE_BASE_URL}/u/${content.username || content.id}`;
    case 'restaurant':
      return `${SHARE_BASE_URL}/restaurant/${content.id}`;
    default:
      return SHARE_BASE_URL;
  }
}
```

### 6. Analytics & Tracking

The Supabase Edge Function can:
- Log all share link clicks
- Track conversion (app opened vs store redirect)
- Provide geographic analytics
- A/B test different redirect strategies

### 7. Testing Production Links

```bash
# Test with curl
curl -I https://api.troodie.app/functions/v1/share/board/[uuid]

# Test user agent detection
curl -H "User-Agent: facebookexternalhit/1.1" https://api.troodie.app/functions/v1/share/board/[uuid]
```

## Benefits of This Approach

1. **No separate web hosting needed** - Supabase handles everything
2. **Built-in analytics** - Track shares in your existing database
3. **Smart redirects** - Different behavior for bots vs users
4. **Scalable** - Edge Functions auto-scale
5. **Cost-effective** - Included in Supabase plan
6. **SEO friendly** - Proper Open Graph tags for social sharing

## Migration Path

1. **Phase 1**: Use Expo URLs in development ✅
2. **Phase 2**: Deploy Supabase Edge Function
3. **Phase 3**: Configure custom domain
4. **Phase 4**: Submit app with associated domains
5. **Phase 5**: Monitor analytics and optimize