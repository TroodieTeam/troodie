import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // This function is public - Stripe redirects here
  // Note: Supabase gateway requires apikey header, but Stripe redirects don't include it
  // The function code itself doesn't check auth, so it should work if gateway allows it
  // If you get 401, you may need to configure the function as public in Supabase Dashboard

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log('[stripe-redirect] Request received', { 
      method: req.method, 
      path,
      url: req.url,
      hasAuth: !!req.headers.get('authorization'),
      hasApikey: !!req.headers.get('apikey')
    });
    
    // Determine redirect type
    const isReturn = path.includes('/return');
    const isRefresh = path.includes('/refresh');
    
    if (!isReturn && !isRefresh) {
      return new Response('Invalid path. Use /return or /refresh', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }
    
    // Get query parameters (e.g., account_type)
    const accountType = url.searchParams.get('account_type') || '';
    const params = accountType ? `?account_type=${accountType}` : '';
    
    // Build deep link
    const deepLink = isReturn 
      ? `troodie://stripe/onboarding/return${params}`
      : `troodie://stripe/onboarding/refresh`;
    
    // Return HTML that redirects to deep link
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redirecting to Troodie...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            a {
              color: #3498db;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>Redirecting to Troodie...</h2>
            <p>If the app doesn't open automatically, <a href="${deepLink}">click here</a></p>
          </div>
          <script>
            // Try to open deep link immediately
            window.location.href = '${deepLink}';
            
            // Fallback: Show manual link after delay
            setTimeout(function() {
              const container = document.querySelector('.container');
              if (container) {
                container.innerHTML = '<h2>Opening Troodie app...</h2><p>If the app doesn\'t open, <a href="${deepLink}">click here to open manually</a></p>';
              }
            }, 2000);
          </script>
        </body>
      </html>
    `;
    
    return new Response(redirectHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in stripe-redirect function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
