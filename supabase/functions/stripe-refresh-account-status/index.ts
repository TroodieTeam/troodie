import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: Stripe key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from auth header
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user - pass token directly to ensure it works
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[stripe-refresh-account-status] User authentication failed:', userError?.message);
      console.error('[stripe-refresh-account-status] Auth header present:', !!authHeader);
      console.error('[stripe-refresh-account-status] Token length:', token?.length || 0);
      return new Response(
        JSON.stringify({ success: false, error: `Unauthorized: ${userError?.message || 'Auth session missing!'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[stripe-refresh-account-status] Processing request for user:', user.id);

    // Parse request body (handle empty body gracefully)
    let accountType = 'business';
    try {
      const body = await req.json();
      accountType = body.accountType || 'business';
    } catch (e) {
      // Body might be empty, use default
      console.log('[stripe-refresh-account-status] No body provided, using default accountType: business');
    }

    // Get Stripe account from database
    const { data: account, error: accountError } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .eq('account_type', accountType)
      .single();

    if (accountError) {
      console.error('[stripe-refresh-account-status] Database error:', accountError);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${accountError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!account?.stripe_account_id) {
      console.log('[stripe-refresh-account-status] No Stripe account found for user:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[stripe-refresh-account-status] Fetching account from Stripe:', account.stripe_account_id);

    // Check account status directly from Stripe API
    let stripeAccount;
    try {
      stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
      console.log('[stripe-refresh-account-status] Stripe account retrieved:', {
        id: stripeAccount.id,
        details_submitted: stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
      });
    } catch (stripeError: any) {
      console.error('[stripe-refresh-account-status] Stripe API error:', stripeError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Stripe API error: ${stripeError.message || 'Failed to retrieve account'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const onboardingCompleted = stripeAccount.details_submitted || false;
    const accountStatus = onboardingCompleted ? 'enabled' : 'pending';

    console.log('[stripe-refresh-account-status] Updating database with status:', {
      onboardingCompleted,
      accountStatus,
    });

    // Update database with latest status
    const { error: updateError } = await supabase
      .from('stripe_accounts')
      .update({
        stripe_account_status: accountStatus,
        onboarding_completed: onboardingCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.stripe_account_id);

    if (updateError) {
      console.error('[stripe-refresh-account-status] Error updating stripe_accounts:', updateError);
      // Don't fail the whole request, but log it
    }

    // Update profile table
    if (accountType === 'creator') {
      const { error: creatorError } = await supabase
        .from('creator_profiles')
        .update({
          stripe_onboarding_completed: onboardingCompleted,
        })
        .eq('user_id', user.id);
      
      if (creatorError) {
        console.error('[stripe-refresh-account-status] Error updating creator_profiles:', creatorError);
      }
    } else if (accountType === 'business') {
      const { error: businessError } = await supabase
        .from('business_profiles')
        .update({
          stripe_onboarding_completed: onboardingCompleted,
        })
        .eq('user_id', user.id);
      
      if (businessError) {
        console.error('[stripe-refresh-account-status] Error updating business_profiles:', businessError);
      }
    }

    console.log('[stripe-refresh-account-status] Successfully refreshed account status');

    return new Response(
      JSON.stringify({
        success: true,
        onboardingCompleted,
        accountStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error refreshing account status:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh account status',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
