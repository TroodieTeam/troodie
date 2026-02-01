-- ============================================================================
-- TRO-137: Subscription Payment Reset Queries for Testing
-- ============================================================================
-- Use these queries to reset subscription states for test-business accounts
-- to test different subscription scenarios.
-- 
-- Test Accounts:
-- - test-business1@bypass.com (UUID: 8e7df4ee-e180-427b-ad8d-e6ffcf41a03a)
-- - test-business2@bypass.com (UUID: f456d1ea-96f0-4245-b420-4db4e6456def)
-- ============================================================================

-- ============================================================================
-- SCENARIO 1: Reset to NO SUBSCRIPTION (none status)
-- Use Case: Test first campaign post → trial modal appears
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = NULL,
  subscription_status = 'none',
  trial_start_date = NULL,
  trial_end_date = NULL,
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NULL,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 2: Set to TRIALING (14-day trial active)
-- Use Case: Test trial banner, trial countdown, subscription management
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_trialing',
  subscription_status = 'trialing',
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '14 days',
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NOW(),
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 3: Set to ACTIVE (paid subscription)
-- Use Case: Test active subscription state, can post campaigns
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_active',
  subscription_status = 'active',
  trial_start_date = NOW() - INTERVAL '20 days',
  trial_end_date = NOW() - INTERVAL '6 days',
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NOW() - INTERVAL '20 days',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 4: Set to PAST_DUE (payment failed)
-- Use Case: Test PaymentRequiredModal, blocked campaign posting
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_past_due',
  subscription_status = 'past_due',
  trial_start_date = NOW() - INTERVAL '20 days',
  trial_end_date = NOW() - INTERVAL '6 days',
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NOW() - INTERVAL '20 days',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 5: Set to CANCELED (user canceled subscription)
-- Use Case: Test canceled state, cannot post campaigns
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_canceled',
  subscription_status = 'canceled',
  trial_start_date = NOW() - INTERVAL '20 days',
  trial_end_date = NOW() - INTERVAL '6 days',
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NOW() - INTERVAL '20 days',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 6: Set to UNPAID (subscription unpaid)
-- Use Case: Test unpaid state, cannot post campaigns
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_unpaid',
  subscription_status = 'unpaid',
  trial_start_date = NOW() - INTERVAL '20 days',
  trial_end_date = NOW() - INTERVAL '6 days',
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NOW() - INTERVAL '20 days',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 7: Set to TRIALING with REMINDER DISMISSED
-- Use Case: Test dismissed reminder state, modal won't show again
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_trialing_dismissed',
  subscription_status = 'trialing',
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '14 days',
  subscription_reminder_dismissed_at = NOW(),
  subscription_created_at = NOW(),
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- SCENARIO 8: Set to TRIALING with TRIAL ENDING SOON (2 days left)
-- Use Case: Test trial ending soon banner
-- ============================================================================
UPDATE restaurant_claims
SET 
  stripe_subscription_id = 'sub_test_trialing_ending_soon',
  subscription_status = 'trialing',
  trial_start_date = NOW() - INTERVAL '12 days',
  trial_end_date = NOW() + INTERVAL '2 days',
  subscription_reminder_dismissed_at = NULL,
  subscription_created_at = NOW() - INTERVAL '12 days',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- ============================================================================
-- VERIFICATION QUERY: Check current subscription states
-- ============================================================================
SELECT 
  u.email,
  u.account_type,
  rc.id as claim_id,
  rc.restaurant_id,
  rc.status as claim_status,
  rc.stripe_subscription_id,
  rc.subscription_status,
  rc.trial_start_date,
  rc.trial_end_date,
  rc.subscription_reminder_dismissed_at,
  CASE 
    WHEN rc.trial_end_date IS NOT NULL AND rc.trial_end_date > NOW() 
    THEN EXTRACT(DAY FROM (rc.trial_end_date - NOW()))::int
    ELSE NULL
  END as days_until_trial_ends,
  r.name as restaurant_name
FROM users u
LEFT JOIN restaurant_claims rc ON rc.user_id = u.id
LEFT JOIN restaurants r ON r.id = rc.restaurant_id
WHERE u.email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
ORDER BY u.email;

-- ============================================================================
-- VERIFY/DELETE TEST CAMPAIGNS
-- ============================================================================
-- Use this to check for existing campaigns or delete them before testing
-- ============================================================================

-- Check existing campaigns for test-business accounts
SELECT 
  u.email,
  c.id as campaign_id,
  c.title,
  c.status,
  c.created_at,
  r.name as restaurant_name
FROM users u
JOIN campaigns c ON c.owner_id = u.id
LEFT JOIN restaurants r ON r.id = c.restaurant_id
WHERE u.email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
ORDER BY u.email, c.created_at DESC;

-- Delete all campaigns for test-business accounts (use before Test 2)
-- WARNING: This will delete all campaigns and related data for these test accounts
-- Deletes in order to respect foreign key constraints:
-- 1. Payment transactions (references campaigns)
-- 2. Campaign applications (if exists, references campaigns)
-- 3. Campaign deliverables (if exists, references campaigns)
-- 4. Campaigns

-- Step 1: Delete payment transactions for these campaigns
DELETE FROM payment_transactions
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  JOIN users u ON c.owner_id = u.id
  WHERE u.email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- Step 2: Delete campaign applications (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_applications') THEN
    DELETE FROM campaign_applications
    WHERE campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.owner_id = u.id
      WHERE u.email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
    );
  END IF;
END $$;

-- Step 3: Delete campaign deliverables (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_deliverables') THEN
    DELETE FROM campaign_deliverables
    WHERE campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.owner_id = u.id
      WHERE u.email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
    );
  END IF;
END $$;

-- Step 4: Delete campaigns (now safe since dependencies are removed)
DELETE FROM campaigns
WHERE owner_id IN (
  SELECT id FROM users 
  WHERE email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
);

-- Verify no campaigns remain (should return 0 rows)
SELECT 
  u.email,
  COUNT(c.id) as campaign_count
FROM users u
LEFT JOIN campaigns c ON c.owner_id = u.id
WHERE u.email IN ('test-business1@bypass.com', 'test-business2@bypass.com')
GROUP BY u.email
ORDER BY u.email;
