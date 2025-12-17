import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { userId, accountType, email } = body;

    // Validate required fields
    if (!userId || !accountType || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, accountType, email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate account type
    if (accountType !== 'business' && accountType !== 'creator') {
      return new Response(
        JSON.stringify({ error: 'Invalid accountType. Must be "business" or "creator"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user matches userId
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: user ID mismatch' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, onboarding_completed, onboarding_link, onboarding_link_expires_at')
      .eq('user_id', userId)
      .eq('account_type', accountType)
      .single();

    if (existingAccount?.stripe_account_id) {
      // Account exists, check if onboarding is complete
      if (existingAccount.onboarding_completed) {
        return new Response(
          JSON.stringify({
            success: true,
            accountId: existingAccount.stripe_account_id,
            onboardingCompleted: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Account exists but onboarding incomplete, get new onboarding link
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      // Function is configured as public in config.toml (verify_jwt = false)
      const redirectBaseUrl = supabaseUrl 
        ? `${supabaseUrl}/functions/v1/stripe-redirect`
        : 'troodie://stripe/onboarding';
      
      const accountLink = await stripe.accountLinks.create({
        account: existingAccount.stripe_account_id,
        refresh_url: `${redirectBaseUrl}/refresh`,
        return_url: `${redirectBaseUrl}/return?account_type=${accountType}`,
        type: 'account_onboarding',
      });

      // Store onboarding link with expiration (1 hour)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await supabase
        .from('stripe_accounts')
        .update({
          onboarding_link: accountLink.url,
          onboarding_link_expires_at: expiresAt.toISOString(),
        })
        .eq('stripe_account_id', existingAccount.stripe_account_id);

      return new Response(
        JSON.stringify({
          success: true,
          accountId: existingAccount.stripe_account_id,
          onboardingLink: accountLink.url,
          onboardingCompleted: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        user_id: userId,
        account_type: accountType,
      },
    });

    // Store account in database
    const { error: insertError } = await supabase
      .from('stripe_accounts')
      .insert({
        user_id: userId,
        account_type: accountType,
        stripe_account_id: account.id,
        stripe_account_status: account.details_submitted ? 'enabled' : 'pending',
        onboarding_completed: account.details_submitted || false,
      });

    if (insertError) {
      console.error('Error storing Stripe account:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to store Stripe account' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Also update creator_profiles or business_profiles table
    if (accountType === 'creator') {
      await supabase
        .from('creator_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('user_id', userId);
    } else if (accountType === 'business') {
      await supabase
        .from('business_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('user_id', userId);
    }

    // Get onboarding link
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // Function is configured as public in config.toml (verify_jwt = false)
    const redirectBaseUrl = supabaseUrl 
      ? `${supabaseUrl}/functions/v1/stripe-redirect`
      : 'troodie://stripe/onboarding';
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${redirectBaseUrl}/refresh`,
      return_url: `${redirectBaseUrl}/return?account_type=${accountType}`,
      type: 'account_onboarding',
    });

    // Store onboarding link with expiration (1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await supabase
      .from('stripe_accounts')
      .update({
        onboarding_link: accountLink.url,
        onboarding_link_expires_at: expiresAt.toISOString(),
      })
      .eq('stripe_account_id', account.id);

    return new Response(
      JSON.stringify({
        success: true,
        accountId: account.id,
        onboardingLink: accountLink.url,
        onboardingCompleted: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Stripe account',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
