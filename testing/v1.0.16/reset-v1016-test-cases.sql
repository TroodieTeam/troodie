-- ================================================================
-- v1.0.16 Test Case Reset Script
-- ================================================================
-- Resets campaign/deliverable data to a clean testable state for
-- the three v1.0.16 features WITHOUT deleting accounts or base data.
--
-- Fixes:
--   1. Auth password mismatch (000000 → 000000)
--   2. Deliverable statuses drifted by 72h auto-approval
--   3. Payment duplication (multiple payouts per application)
--   4. Stale ratings from prior test runs
--   5. Workflow stages reset for Content Submission Flow testing
--
-- Run:
--   node scripts/run-sql.js --prod testing/v1.0.16/reset-v1016-test-cases.sql
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1. RESET AUTH PASSWORD
-- ================================================================
-- All test accounts use password '000000'. The app's bypass login detects
-- @bypass.com emails and uses signInWithPassword with the value from
-- EXPO_PUBLIC_TEST_AUTH_PASSWORD (set to '000000' in .env.development
-- and .env.production).

UPDATE auth.users
SET encrypted_password = crypt('000000', gen_salt('bf')),
    updated_at = NOW()
WHERE email LIKE 'prod-%@bypass.com';

-- ================================================================
-- 2. RESET DELIVERABLE STATUSES & PAYMENT DATA
-- ================================================================
-- Auto-approval (72h) drifted many deliverables from pending_review
-- to auto_approved. Reset to intended test states.
-- Also fix payment duplication: only the LAST deliverable in each
-- application should carry the payment amount (triggers on final approval).

-- Spring Menu - Creator 1 (app a2111111): 3 deliverables
-- D1: approved + proof submitted (complete flow example)
UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'proof',
  content_file_url = 'campaign-content/spring-menu-photo1.jpg',
  content_file_type = 'image/jpeg',
  proof_submitted_at = NOW() - INTERVAL '1 day',
  platform_post_url = 'https://instagram.com/p/spring1',
  reviewed_at = NOW() - INTERVAL '2 days',
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd1111111-1111-4111-d111-111111111111';

-- D2: content approved, awaiting proof link (CSF step 2 test)
UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'approved',
  content_file_url = 'campaign-content/spring-menu-reel.mp4',
  content_file_type = 'video/mp4',
  proof_submitted_at = NULL,
  platform_post_url = NULL,
  reviewed_at = NOW() - INTERVAL '1 day',
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd2222222-2222-4222-d222-222222222222';

-- D3: draft, ready for upload (CSF Scenario 1.1 — creator uploads content)
-- Scenarios are sequential: upload (1.1) → review (1.2) → proof (1.3)
UPDATE campaign_deliverables SET
  status = 'draft',
  workflow_stage = 'upload',
  content_file_url = NULL,
  content_file_type = NULL,
  proof_submitted_at = NULL,
  platform_post_url = NULL,
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 50000,
  updated_at = NOW()
WHERE id = 'd3333333-3333-4333-d333-333333333333';

-- Weekend Brunch - Creator 4 (app a2444444): 1 deliverable
-- Pending review (single deliverable = immediate payout on approval)
UPDATE campaign_deliverables SET
  status = 'pending_review',
  workflow_stage = 'review',
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 30000,
  updated_at = NOW()
WHERE id = 'd4444444-4444-4444-d444-444444444444';

-- Weekend Brunch - Creator 5 (app a2555555): 2 deliverables
-- D5: approved (1/2 approved - partial approval for RCT testing)
UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'approved',
  content_file_url = 'campaign-content/brunch-reel.mp4',
  content_file_type = 'video/mp4',
  reviewed_at = NOW() - INTERVAL '3 days',
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd5555555-5555-4555-d555-555555555555';

-- D6: pending review (1/2 approved - RCT button should be hidden)
UPDATE campaign_deliverables SET
  status = 'pending_review',
  workflow_stage = 'review',
  content_file_url = 'campaign-content/brunch-photo.jpg',
  content_file_type = 'image/jpeg',
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 35000,
  updated_at = NOW()
WHERE id = 'd6666666-6666-4666-d666-666666666666';

-- Summer Patio (completed) - Creator 6 (app a2666666): 2 deliverables
-- Both approved + proof submitted + paid (completed campaign, RCT button should show)
-- Only D8 carries the payout (last deliverable = trigger)
UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'proof',
  proof_submitted_at = NOW() - INTERVAL '37 days',
  reviewed_at = NOW() - INTERVAL '38 days',
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd7777777-7777-4777-d777-777777777777';

UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'proof',
  proof_submitted_at = NOW() - INTERVAL '36 days',
  reviewed_at = NOW() - INTERVAL '37 days',
  auto_approved_at = NULL,
  payment_status = 'completed',
  payment_amount_cents = 40000,
  updated_at = NOW()
WHERE id = 'd8888888-8888-4888-d888-888888888888';

-- Sushi Special - Creator 1 (app a3111111): 3 deliverables
-- All pending_review (for PDF testing: approve 1→no pay, 2→no pay, 3→pay)
UPDATE campaign_deliverables SET
  status = 'pending_review',
  workflow_stage = 'review',
  content_file_url = 'campaign-content/sushi-photo1.jpg',
  content_file_type = 'image/jpeg',
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd9111111-1111-4111-d111-111111111111';

UPDATE campaign_deliverables SET
  status = 'pending_review',
  workflow_stage = 'review',
  content_file_url = 'campaign-content/sushi-reel.mp4',
  content_file_type = 'video/mp4',
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd9222222-2222-4222-d222-222222222222';

UPDATE campaign_deliverables SET
  status = 'pending_review',
  workflow_stage = 'review',
  content_file_url = 'campaign-content/sushi-post.jpg',
  content_file_type = 'image/jpeg',
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 60000,
  updated_at = NOW()
WHERE id = 'd9333333-3333-4333-d333-333333333333';

-- Date Night - Creator 5 (app a3555555): 2 deliverables (draft/upload stage)
UPDATE campaign_deliverables SET
  status = 'draft',
  workflow_stage = 'upload',
  content_file_url = NULL,
  content_file_type = NULL,
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd9444444-4444-4444-d444-444444444444';

UPDATE campaign_deliverables SET
  status = 'draft',
  workflow_stage = 'upload',
  content_file_url = NULL,
  content_file_type = NULL,
  reviewed_at = NULL,
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 45000,
  updated_at = NOW()
WHERE id = 'd9555555-5555-4555-d555-555555555555';

-- Chef Special (completed) - Creator 2 (app a3aaaaaa): 3 deliverables
-- All approved + proof + paid (completed campaign)
-- Only D9888888 carries the payout (single payout per application)
UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'proof',
  proof_submitted_at = NOW() - INTERVAL '47 days',
  reviewed_at = NOW() - INTERVAL '48 days',
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd9666666-6666-4666-d666-666666666666';

UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'proof',
  proof_submitted_at = NOW() - INTERVAL '46 days',
  reviewed_at = NOW() - INTERVAL '47 days',
  auto_approved_at = NULL,
  payment_status = 'pending',
  payment_amount_cents = 0,
  updated_at = NOW()
WHERE id = 'd9777777-7777-4777-d777-777777777777';

UPDATE campaign_deliverables SET
  status = 'approved',
  workflow_stage = 'proof',
  proof_submitted_at = NOW() - INTERVAL '45 days',
  reviewed_at = NOW() - INTERVAL '46 days',
  auto_approved_at = NULL,
  payment_status = 'completed',
  payment_amount_cents = 50000,
  updated_at = NOW()
WHERE id = 'd9888888-8888-4888-d888-888888888888';

-- Happy Hour - Creator 1 (app a3888888): 1 deliverable
-- Auto-approved + proof submitted (completed)
UPDATE campaign_deliverables SET
  status = 'auto_approved',
  workflow_stage = 'proof',
  proof_submitted_at = NOW() - INTERVAL '6 days',
  auto_approved_at = NOW() - INTERVAL '7 days',
  payment_status = 'completed',
  payment_amount_cents = 35000,
  updated_at = NOW()
WHERE id = 'd9999999-9999-4999-d999-999999999999';

-- ================================================================
-- 3. CLEAR RATINGS
-- ================================================================
-- Reset all ratings so the Rate Creator Timing scenarios start fresh.
-- Only touches applications linked to test business campaigns.

UPDATE campaign_applications
SET rating = NULL,
    rating_comment = NULL,
    rated_at = NULL
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
)
AND rating IS NOT NULL;

-- ================================================================
-- 4. VERIFICATION
-- ================================================================

DO $$
DECLARE
  pw_updated INTEGER;
  pending_review_count INTEGER;
  approved_count INTEGER;
  draft_count INTEGER;
  multi_payout_count INTEGER;
  rated_count INTEGER;
BEGIN
  -- Count password-updated accounts
  SELECT COUNT(*) INTO pw_updated
  FROM auth.users
  WHERE email LIKE 'prod-%@bypass.com'
    AND encrypted_password = crypt('000000', encrypted_password);

  -- Deliverable status breakdown
  SELECT COUNT(*) INTO pending_review_count
  FROM campaign_deliverables
  WHERE id IN ('d4444444-4444-4444-d444-444444444444',
               'd6666666-6666-4666-d666-666666666666','d9111111-1111-4111-d111-111111111111',
               'd9222222-2222-4222-d222-222222222222','d9333333-3333-4333-d333-333333333333')
    AND status = 'pending_review';

  SELECT COUNT(*) INTO approved_count
  FROM campaign_deliverables
  WHERE id IN ('d1111111-1111-4111-d111-111111111111','d2222222-2222-4222-d222-222222222222',
               'd5555555-5555-4555-d555-555555555555','d7777777-7777-4777-d777-777777777777',
               'd8888888-8888-4888-d888-888888888888','d9666666-6666-4666-d666-666666666666',
               'd9777777-7777-4777-d777-777777777777','d9888888-8888-4888-d888-888888888888')
    AND status = 'approved';

  SELECT COUNT(*) INTO draft_count
  FROM campaign_deliverables
  WHERE id IN ('d3333333-3333-4333-d333-333333333333',
               'd9444444-4444-4444-d444-444444444444','d9555555-5555-4555-d555-555555555555')
    AND status = 'draft';

  -- Check payment duplication: applications with > 1 payout (should be 0)
  SELECT COUNT(*) INTO multi_payout_count
  FROM (
    SELECT ca.id
    FROM campaign_applications ca
    JOIN campaign_deliverables cd ON cd.campaign_application_id = ca.id
    WHERE ca.campaign_id IN (
      SELECT id FROM campaigns
      WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com')
    )
    GROUP BY ca.id
    HAVING COUNT(CASE WHEN cd.payment_status IN ('processing','completed') THEN 1 END) > 1
  ) dupes;

  -- Check stale ratings (should be 0)
  SELECT COUNT(*) INTO rated_count
  FROM campaign_applications
  WHERE rating IS NOT NULL
    AND campaign_id IN (
      SELECT id FROM campaigns
      WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com')
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'v1.0.16 Test Case Reset Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Auth passwords updated: % (should be 20)', pw_updated;
  RAISE NOTICE '';
  RAISE NOTICE 'Deliverable statuses:';
  RAISE NOTICE '  pending_review: % (should be 5)', pending_review_count;
  RAISE NOTICE '  approved:       % (should be 8)', approved_count;
  RAISE NOTICE '  draft:          % (should be 3)', draft_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Payment duplication: % apps with >1 payout (should be 0)', multi_payout_count;
  RAISE NOTICE 'Stale ratings: % (should be 0)', rated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test accounts (login via app with OTP 000000):';
  RAISE NOTICE '  Business: prod-business2@bypass.com (3 campaigns)';
  RAISE NOTICE '  Business: prod-business3@bypass.com (10 campaigns)';
  RAISE NOTICE '  Creator:  prod-creator1@bypass.com (Foodie Lens)';
  RAISE NOTICE '  Creator:  prod-creator2@bypass.com (Wanderlust Eats)';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: prod-business1 has 0 campaigns (intentionally NEW).';
  RAISE NOTICE '      Use prod-business2 or prod-business3 for testing.';
  RAISE NOTICE '========================================';
END $$;
