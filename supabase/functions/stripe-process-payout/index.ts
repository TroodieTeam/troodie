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
    // Parse request body
    const body = await req.json();
    const { deliverableId, creatorId, campaignId, amountCents, stripeAccountId } = body;

    console.log('[stripe-process-payout] 🚀 Processing payout request:', {
      deliverableId,
      creatorId,
      campaignId,
      amountCents,
      stripeAccountId,
    });

    // Validate required fields
    if (!deliverableId || !creatorId || !campaignId || !amountCents || !stripeAccountId) {
      const missing = [];
      if (!deliverableId) missing.push('deliverableId');
      if (!creatorId) missing.push('creatorId');
      if (!campaignId) missing.push('campaignId');
      if (!amountCents) missing.push('amountCents');
      if (!stripeAccountId) missing.push('stripeAccountId');
      
      console.error('[stripe-process-payout] ❌ Missing required fields:', missing);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Missing required fields: ${missing.join(', ')}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate amount
    if (amountCents <= 0 || !Number.isInteger(amountCents)) {
      console.error('[stripe-process-payout] ❌ Invalid amount:', amountCents);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid amount. Must be a positive integer in cents' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get campaign info for transaction record
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('business_id')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('[stripe-process-payout] ❌ Error fetching campaign:', campaignError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to fetch campaign: ${campaignError.message}` 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!campaign) {
      console.error('[stripe-process-payout] ❌ Campaign not found:', campaignId);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Campaign not found' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[stripe-process-payout] ✅ Campaign found, creating Stripe transfer...');

    // Create Stripe Transfer to creator
    let transfer;
    try {
      transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: stripeAccountId,
        description: `Payout for deliverable ${deliverableId}`,
        metadata: {
          deliverable_id: deliverableId,
          creator_id: creatorId,
          campaign_id: campaignId,
        },
      });
      console.log('[stripe-process-payout] ✅ Stripe transfer created:', transfer.id);
    } catch (stripeError: any) {
      console.error('[stripe-process-payout] ❌ Stripe transfer creation failed:', {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        decline_code: stripeError.decline_code,
        param: stripeError.param,
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Stripe transfer failed: ${stripeError.message || 'Unknown error'}`,
          stripeError: stripeError.type || 'unknown',
          stripeCode: stripeError.code,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update deliverable payment status
    console.log('[stripe-process-payout] 📝 Updating deliverable payment status...');
    const { error: updateError } = await supabase
      .from('campaign_deliverables')
      .update({
        payment_status: 'processing',
        payment_transaction_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    if (updateError) {
      console.error('[stripe-process-payout] ❌ Error updating deliverable:', {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      // Try to reverse the transfer if possible
      try {
        console.log('[stripe-process-payout] 🔄 Attempting to reverse transfer...');
        await stripe.transfers.createReversal(transfer.id, {
          amount: amountCents,
        });
        console.log('[stripe-process-payout] ✅ Transfer reversed successfully');
      } catch (reversalError: any) {
        console.error('[stripe-process-payout] ❌ Error reversing transfer:', {
          error: reversalError.message,
          type: reversalError.type,
        });
      }
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to update deliverable payment status: ${updateError.message}`,
          details: updateError.details,
          hint: updateError.hint,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('[stripe-process-payout] ✅ Deliverable updated successfully');

    // Create transaction record
    console.log('[stripe-process-payout] 💾 Creating payment transaction record...');
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        campaign_id: campaignId,
        deliverable_id: deliverableId,
        creator_id: creatorId,
        business_id: campaign?.business_id,
        stripe_transfer_id: transfer.id,
        amount_cents: amountCents,
        platform_fee_cents: 0, // Fee already deducted from campaign payment
        creator_amount_cents: amountCents,
        transaction_type: 'payout',
        status: 'processing',
      })
      .select()
      .single();

    if (transactionError) {
      console.error('[stripe-process-payout] ⚠️ Error creating transaction record (non-fatal):', {
        error: transactionError.message,
        code: transactionError.code,
        details: transactionError.details,
        hint: transactionError.hint,
      });
      // Don't fail the request, but log the error
    } else {
      console.log('[stripe-process-payout] ✅ Transaction record created:', transaction?.id);
    }

    // Return success response
    console.log('[stripe-process-payout] ✅ Payout processed successfully');
    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        transactionId: transaction?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[stripe-process-payout] ❌ Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payout',
        errorType: error?.name || 'Unknown',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
