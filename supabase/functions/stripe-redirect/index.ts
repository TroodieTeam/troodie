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
    
    // Return completely blank HTML that redirects immediately
    // Stripe requires HTTPS URLs, but we can make this page invisible
    // The page will redirect to deep link before any content renders
    const redirectHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${deepLink}"><script>window.location.replace('${deepLink}');</script></head><body></body></html>`;
    
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
