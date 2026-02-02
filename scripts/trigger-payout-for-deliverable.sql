/**
 * Manual Script: Trigger Payout for a Specific Deliverable
 * 
 * This script can be run in the browser console or as a one-off script
 * to manually trigger processDeliverablePayout for a deliverable that was
 * approved but didn't have the payout processing triggered.
 * 
 * Usage:
 * 1. Import the function: import { processDeliverablePayout } from '@/services/payoutService'
 * 2. Call it: await processDeliverablePayout('255e2e96-643d-426e-b00d-e4a2931f89eb')
 * 
 * Or run this in Supabase SQL Editor to get the details needed for manual Edge Function call:
 */

-- Get all details needed to manually trigger the Edge Function
SELECT 
    cd.id as deliverable_id,
    cd.creator_id as creator_profile_id,
    cd.campaign_id,
    cd.payment_amount_cents as amount_cents,
    cp.stripe_account_id,
    cp.stripe_onboarding_completed,
    c.title as campaign_title,
    cd.status as deliverable_status,
    cd.payment_status,
    CASE 
        WHEN cd.status NOT IN ('approved', 'auto_approved') THEN '❌ Deliverable not approved'
        WHEN cp.stripe_account_id IS NULL THEN '❌ Creator has no Stripe account'
        WHEN cp.stripe_onboarding_completed = false THEN '❌ Creator onboarding not completed'
        WHEN cd.payment_amount_cents IS NULL OR cd.payment_amount_cents = 0 THEN '❌ payment_amount_cents not set'
        WHEN cpi.id IS NULL THEN '❌ Campaign payment not found'
        WHEN cpi.status != 'succeeded' THEN '❌ Campaign payment not succeeded'
        ELSE '✅ Ready to trigger payout'
    END as readiness_check,
    -- JSON payload for Edge Function
    json_build_object(
        'deliverableId', cd.id,
        'creatorId', cd.creator_id,
        'campaignId', cd.campaign_id,
        'amountCents', COALESCE(cd.payment_amount_cents, cpi.amount_cents, c.budget_cents),
        'stripeAccountId', cp.stripe_account_id
    ) as edge_function_payload
FROM campaign_deliverables cd
INNER JOIN campaigns c ON c.id = cd.campaign_id
INNER JOIN creator_profiles cp ON cp.id = cd.creator_id
LEFT JOIN campaign_payments cpi ON cpi.campaign_id = cd.campaign_id AND cpi.status = 'succeeded'
WHERE cd.id = '255e2e96-643d-426e-b00d-e4a2931f89eb';
