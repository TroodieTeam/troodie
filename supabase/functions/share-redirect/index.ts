import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Expected format: /functions/v1/share-redirect/{type}/{id}
    if (pathParts.length < 4) {
      return new Response('Invalid URL format', { status: 400 });
    }

    const contentType = pathParts[3];
    const contentId = pathParts[4];
    
    if (!contentType || !contentId) {
      return new Response('Missing content type or ID', { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Track analytics for this share access
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    // Try to get user ID from auth header if present
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (e) {
        // Ignore auth errors for analytics
      }
    }

    // Track share completion analytics
    if (userId) {
      await supabase.from('share_analytics').insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        action: 'completed',
        platform: 'web',
        method: 'link_click',
        metadata: {
          user_agent: req.headers.get('user-agent'),
          referer: req.headers.get('referer')
        }
      }).catch(e => console.warn('Analytics insert failed:', e));
    }

    // Detect if request is from a bot (for social media previews)
    const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
    const isBot = /bot|crawl|slurp|spider|facebookexternalhit|whatsapp|telegram|twitter|linkedin/i.test(userAgent);

    // Get content metadata
    let metadata: any = {};
    let appPath = '';
    
    switch (contentType) {
      case 'board': {
        const { data: board } = await supabase
          .from('boards')
          .select('id, name, description, cover_photo_url, user_id')
          .eq('id', contentId)
          .single();
          
        if (board) {
          const { data: user } = await supabase
            .from('users')
            .select('username, full_name')
            .eq('id', board.user_id)
            .single();
            
          metadata = {
            title: board.name || 'Restaurant Collection',
            description: board.description || `Check out this curated collection of restaurants`,
            image: board.cover_photo_url || 'https://troodie.com/og-image.png',
            creator: user?.full_name || user?.username || 'Troodie User'
          };
          appPath = `/boards/${contentId}`;
        }
        break;
      }
      
      case 'post': {
        const { data: post } = await supabase
          .from('posts')
          .select(`
            id, 
            content, 
            photos,
            user_id,
            restaurant_id,
            restaurants (
              name,
              cuisine,
              city
            )
          `)
          .eq('id', contentId)
          .single();
          
        if (post) {
          const { data: user } = await supabase
            .from('users')
            .select('username, full_name')
            .eq('id', post.user_id)
            .single();
            
          metadata = {
            title: post.restaurants?.name || 'Food Discovery',
            description: post.content || 'Check out this amazing food discovery on Troodie',
            image: post.photos?.[0] || 'https://troodie.com/og-image.png',
            creator: user?.full_name || user?.username || 'Troodie User'
          };
          appPath = `/posts/${contentId}`;
        }
        break;
      }
      
      case 'profile': {
        const { data: user } = await supabase
          .from('users')
          .select('id, username, full_name, bio, avatar_url')
          .or(`username.eq.${contentId},id.eq.${contentId}`)
          .single();
          
        if (user) {
          metadata = {
            title: `${user.full_name || user.username} on Troodie`,
            description: user.bio || 'Discover amazing restaurants and food experiences',
            image: user.avatar_url || 'https://troodie.com/og-image.png',
            creator: user.full_name || user.username
          };
          appPath = `/user/${user.id}`;
        }
        break;
      }
      
      case 'restaurant': {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id, name, cuisine, city, state, price_range, average_rating, photos')
          .eq('id', contentId)
          .single();
          
        if (restaurant) {
          metadata = {
            title: restaurant.name,
            description: `${restaurant.cuisine?.join(', ')} in ${restaurant.city}, ${restaurant.state}`,
            image: restaurant.photos?.[0] || 'https://troodie.com/og-image.png',
            rating: restaurant.average_rating
          };
          appPath = `/restaurant/${contentId}`;
        }
        break;
      }
    }

    // If bot, return HTML with Open Graph tags
    if (isBot) {
      // Track bot/crawler access for social media previews
      await supabase.from('share_analytics').insert({
        user_id: null, // Anonymous bot access
        content_type: contentType,
        content_id: contentId,
        action: 'completed',
        platform: 'social_media',
        method: 'bot_crawler',
        metadata: {
          user_agent: req.headers.get('user-agent'),
          referer: req.headers.get('referer'),
          bot_type: userAgent.includes('facebookexternalhit') ? 'facebook' : 
                   userAgent.includes('whatsapp') ? 'whatsapp' :
                   userAgent.includes('twitter') ? 'twitter' :
                   userAgent.includes('linkedin') ? 'linkedin' :
                   userAgent.includes('telegram') ? 'telegram' : 'other'
        }
      }).catch(e => console.warn('Bot analytics insert failed:', e));
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${metadata.title || 'Troodie - Discover Amazing Food'}</title>
            <meta property="og:title" content="${metadata.title || 'Troodie'}">
            <meta property="og:description" content="${metadata.description || 'Discover and share amazing restaurants'}">
            <meta property="og:image" content="${metadata.image}">
            <meta property="og:url" content="${req.url}">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="Troodie">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${metadata.title || 'Troodie'}">
            <meta name="twitter:description" content="${metadata.description || 'Discover and share amazing restaurants'}">
            <meta name="twitter:image" content="${metadata.image}">
            ${metadata.rating ? `<meta property="og:rating" content="${metadata.rating}">` : ''}
            ${metadata.creator ? `<meta property="article:author" content="${metadata.creator}">` : ''}
          </head>
          <body>
            <h1>${metadata.title || 'Troodie'}</h1>
            <p>${metadata.description || 'Discover and share amazing restaurants'}</p>
            <a href="https://apps.apple.com/app/troodie">Download on App Store</a>
            <a href="https://play.google.com/store/apps/details?id=com.troodie.app">Get it on Google Play</a>
          </body>
        </html>
      `;
      
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      });
    }

    // For regular users, redirect to app or app store
    const isMobile = /iphone|ipad|android/i.test(userAgent);
    
    if (isMobile) {
      // Try to open in app first (using deep link)
      const deepLink = `troodie://${appPath}`;
      
      // Detect platform for fallback
      const isIOS = /iphone|ipad/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent);
      
      // Track mobile redirect analytics (anonymous since no auth on mobile redirects)
      await supabase.from('share_analytics').insert({
        user_id: null, // Anonymous mobile access
        content_type: contentType,
        content_id: contentId,
        action: 'completed',
        platform: isIOS ? 'ios' : isAndroid ? 'android' : 'mobile',
        method: 'mobile_redirect',
        metadata: {
          user_agent: req.headers.get('user-agent'),
          referer: req.headers.get('referer'),
          deep_link: deepLink
        }
      }).catch(e => console.warn('Mobile analytics insert failed:', e));
      
      // Create a page that attempts to open the app, then falls back to store
      const redirectHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Opening Troodie...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .logo {
                width: 80px;
                height: 80px;
                margin-bottom: 20px;
              }
              h1 {
                margin: 0 0 10px;
                font-size: 24px;
              }
              p {
                margin: 0 0 30px;
                opacity: 0.9;
              }
              .button {
                background: white;
                color: #667eea;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <h1>Opening in Troodie...</h1>
            <p>You'll be redirected to the app store if Troodie isn't installed</p>
            <a href="${isIOS ? 'https://apps.apple.com/app/troodie' : 'https://play.google.com/store/apps/details?id=com.troodie.app'}" 
               class="button" id="download">Download Troodie</a>
            <script>
              // Try to open the app
              window.location.href = '${deepLink}';
              
              // Fallback to app store after 2 seconds
              setTimeout(function() {
                if (document.hasFocus()) {
                  window.location.href = '${isIOS ? 'https://apps.apple.com/app/troodie' : 'https://play.google.com/store/apps/details?id=com.troodie.app'}';
                }
              }, 2000);
            </script>
          </body>
        </html>
      `;
      
      return new Response(redirectHtml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      });
    }

    // For desktop, redirect to web app or landing page
    // Track desktop redirect analytics (anonymous)
    await supabase.from('share_analytics').insert({
      user_id: null, // Anonymous desktop access
      content_type: contentType,
      content_id: contentId,
      action: 'completed',
      platform: 'desktop',
      method: 'web_redirect',
      metadata: {
        user_agent: req.headers.get('user-agent'),
        referer: req.headers.get('referer')
      }
    }).catch(e => console.warn('Desktop analytics insert failed:', e));
    
    const webUrl = `https://troodie.com${appPath}`;
    return Response.redirect(webUrl, 302);
    
  } catch (error) {
    console.error('Error in share-redirect function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});