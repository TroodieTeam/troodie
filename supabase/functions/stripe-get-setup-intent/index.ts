/**
 * Stripe Get SetupIntent Edge Function (TRO-136)
 * Retrieves payment method details from a completed SetupIntent
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

    // Verify user
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

    // Parse request body
    const body = await req.json();
    const { setupIntentId } = body;

    if (!setupIntentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: setupIntentId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[GetSetupIntent] Retrieving SetupIntent:', setupIntentId);

    // Retrieve the SetupIntent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (!setupIntent.payment_method) {
      console.log('[GetSetupIntent] No payment method attached to SetupIntent');
      return new Response(
        JSON.stringify({ error: 'No payment method found on SetupIntent' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the payment method details
    const paymentMethodId = typeof setupIntent.payment_method === 'string' 
      ? setupIntent.payment_method 
      : setupIntent.payment_method.id;

    console.log('[GetSetupIntent] Retrieving payment method:', paymentMethodId);

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    const last4 = paymentMethod.card?.last4 || null;
    const brand = paymentMethod.card?.brand || null;

    console.log('[GetSetupIntent] Payment method details:', { paymentMethodId, last4, brand });

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethodId,
        last4,
        brand,
        customerId: setupIntent.customer,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[GetSetupIntent] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to retrieve setup intent',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
