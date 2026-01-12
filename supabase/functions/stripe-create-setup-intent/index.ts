/**
 * Stripe Create SetupIntent Edge Function (TRO-136)
 * Creates a SetupIntent to save a payment method for future use
 */

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
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
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

    // Verify user matches
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: user ID mismatch' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get business profile
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, user_id, stripe_customer_id, business_email')
      .eq('user_id', userId)
      .single();

    if (profileError || !businessProfile) {
      console.error('[SetupIntent] Business profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Business profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let customerId = businessProfile.stripe_customer_id;

    // Create Stripe Customer if doesn't exist
    if (!customerId) {
      console.log('[SetupIntent] Creating Stripe customer for user:', userId);
      
      const customer = await stripe.customers.create({
        email: businessProfile.business_email || user.email,
        metadata: {
          user_id: userId,
          business_profile_id: businessProfile.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to business profile
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', businessProfile.id);

      if (updateError) {
        console.error('[SetupIntent] Failed to save customer ID:', updateError);
        // Don't fail the request, continue with the customer we created
      }
    }

    // Create SetupIntent
    console.log('[SetupIntent] Creating SetupIntent for customer:', customerId);
    
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow charging the card later without customer present
      metadata: {
        user_id: userId,
        business_profile_id: businessProfile.id,
      },
    });

    console.log('[SetupIntent] Created SetupIntent:', setupIntent.id);

    return new Response(
      JSON.stringify({
        success: true,
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[SetupIntent] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create setup intent',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
