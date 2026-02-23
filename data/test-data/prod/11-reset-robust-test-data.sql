-- ================================================================
-- Reset Robust Test Data
-- ================================================================
-- Removes ALL data created by 10-setup-robust-test-scenario.sql
-- Respects foreign key ordering for clean deletion
-- Safe to run multiple times (idempotent)
-- ================================================================

-- Define the test user email pattern
-- All robust test users use prod-{role}{N}@bypass.com

BEGIN;

-- ================================================================
-- 1. DELETE PAYMENT DATA (deepest dependency)
-- ================================================================

-- Payment transactions referencing test deliverables/campaigns
DELETE FROM payment_transactions
WHERE creator_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE 'prod-consumer%@bypass.com'
     OR u.email LIKE 'prod-creator%@bypass.com'
     OR u.email LIKE 'prod-business%@bypass.com'
)
OR business_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-business%@bypass.com'
)
OR campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
);

-- Campaign payments
DELETE FROM campaign_payments
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
);

-- ================================================================
-- 2. DELETE DELIVERABLE DATA
-- ================================================================

-- Dispute messages -> disputes -> revisions -> deliverables
DELETE FROM dispute_messages
WHERE dispute_id IN (
  SELECT dd.id FROM deliverable_disputes dd
  JOIN campaign_deliverables cd ON dd.deliverable_id = cd.id
  WHERE cd.campaign_id IN (
    SELECT id FROM campaigns
    WHERE owner_id IN (
      SELECT id FROM users
      WHERE email LIKE 'prod-business%@bypass.com'
    )
  )
);

DELETE FROM deliverable_disputes
WHERE deliverable_id IN (
  SELECT cd.id FROM campaign_deliverables cd
  WHERE cd.campaign_id IN (
    SELECT id FROM campaigns
    WHERE owner_id IN (
      SELECT id FROM users
      WHERE email LIKE 'prod-business%@bypass.com'
    )
  )
);

DELETE FROM deliverable_revisions
WHERE deliverable_id IN (
  SELECT cd.id FROM campaign_deliverables cd
  WHERE cd.campaign_id IN (
    SELECT id FROM campaigns
    WHERE owner_id IN (
      SELECT id FROM users
      WHERE email LIKE 'prod-business%@bypass.com'
    )
  )
);

DELETE FROM campaign_deliverables
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
);

-- ================================================================
-- 3. DELETE CAMPAIGN DATA
-- ================================================================

-- Campaign applications
DELETE FROM campaign_applications
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
);

-- Campaign invitations
DELETE FROM campaign_invitations
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
);

-- Saved campaigns
DELETE FROM saved_campaigns
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  )
);

-- Campaigns themselves
DELETE FROM campaigns
WHERE owner_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-business%@bypass.com'
);

-- ================================================================
-- 4. DELETE POST ENGAGEMENT DATA
-- ================================================================

-- Post saves
DELETE FROM post_saves
WHERE post_id IN (
  SELECT id FROM posts
  WHERE user_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-consumer%@bypass.com'
       OR email LIKE 'prod-creator%@bypass.com'
       OR email LIKE 'prod-business%@bypass.com'
  )
);

-- Also delete saves BY test users on any posts
DELETE FROM post_saves
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- Post comments
DELETE FROM post_comments
WHERE post_id IN (
  SELECT id FROM posts
  WHERE user_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-consumer%@bypass.com'
       OR email LIKE 'prod-creator%@bypass.com'
       OR email LIKE 'prod-business%@bypass.com'
  )
);

DELETE FROM post_comments
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- Post likes
DELETE FROM post_likes
WHERE post_id IN (
  SELECT id FROM posts
  WHERE user_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-consumer%@bypass.com'
       OR email LIKE 'prod-creator%@bypass.com'
       OR email LIKE 'prod-business%@bypass.com'
  )
);

DELETE FROM post_likes
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- Posts
DELETE FROM posts
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- ================================================================
-- 5. DELETE BOARD & SAVE DATA
-- ================================================================

-- Board restaurants (junction table)
DELETE FROM board_restaurants
WHERE board_id IN (
  SELECT id FROM boards
  WHERE user_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-consumer%@bypass.com'
       OR email LIKE 'prod-creator%@bypass.com'
       OR email LIKE 'prod-business%@bypass.com'
  )
);

-- Restaurant saves
DELETE FROM restaurant_saves
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- Boards
DELETE FROM boards
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- ================================================================
-- 6. DELETE SOCIAL GRAPH
-- ================================================================

DELETE FROM user_relationships
WHERE follower_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
)
OR following_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- ================================================================
-- 7. DELETE CREATOR & BUSINESS PROFILES
-- ================================================================

-- Creator portfolio items
DELETE FROM creator_portfolio_items
WHERE creator_profile_id IN (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email LIKE 'prod-creator%@bypass.com'
);

-- Creator earnings
DELETE FROM creator_earnings
WHERE creator_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-creator%@bypass.com'
);

-- Creator profiles
DELETE FROM creator_profiles
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-creator%@bypass.com'
);

-- Business profiles
DELETE FROM business_profiles
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-business%@bypass.com'
);

-- ================================================================
-- 8. DELETE RESTAURANT DATA
-- ================================================================

-- Restaurant claims
DELETE FROM restaurant_claims
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-business%@bypass.com'
);

-- Restaurant images
DELETE FROM restaurant_images
WHERE restaurant_id IN (
  'dd111111-1111-4111-d111-111111111111',
  'dd222222-2222-4222-d222-222222222222',
  'dd333333-3333-4333-d333-333333333333',
  'dd444444-4444-4444-d444-444444444444',
  'dd555555-5555-4555-d555-555555555555',
  'dd666666-6666-4666-d666-666666666666',
  'dd777777-7777-4777-d777-777777777777',
  'dd888888-8888-4888-d888-888888888888'
);

-- Restaurants
DELETE FROM restaurants
WHERE id IN (
  'dd111111-1111-4111-d111-111111111111',
  'dd222222-2222-4222-d222-222222222222',
  'dd333333-3333-4333-d333-333333333333',
  'dd444444-4444-4444-d444-444444444444',
  'dd555555-5555-4555-d555-555555555555',
  'dd666666-6666-4666-d666-666666666666',
  'dd777777-7777-4777-d777-777777777777',
  'dd888888-8888-4888-d888-888888888888'
);

-- ================================================================
-- 9. DELETE NOTIFICATIONS
-- ================================================================

DELETE FROM notifications
WHERE user_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
)
OR actor_id IN (
  SELECT id FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com'
);

-- ================================================================
-- 10. RESET USER ACCOUNT TYPES & DELETE USERS
-- ================================================================

-- Reset account types before deletion (in case some users should persist)
UPDATE users
SET account_type = 'consumer', is_creator = false
WHERE email LIKE 'prod-consumer%@bypass.com';

-- Delete public.users records
DELETE FROM users
WHERE email LIKE 'prod-consumer%@bypass.com'
   OR email LIKE 'prod-creator%@bypass.com'
   OR email LIKE 'prod-business%@bypass.com';

-- Delete auth.users records
DELETE FROM auth.users
WHERE email LIKE 'prod-consumer%@bypass.com'
   OR email LIKE 'prod-creator%@bypass.com'
   OR email LIKE 'prod-business%@bypass.com';

COMMIT;

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
  user_count INTEGER;
  post_count INTEGER;
  campaign_count INTEGER;
  restaurant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users
  WHERE email LIKE 'prod-consumer%@bypass.com'
     OR email LIKE 'prod-creator%@bypass.com'
     OR email LIKE 'prod-business%@bypass.com';

  SELECT COUNT(*) INTO post_count FROM posts
  WHERE user_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-consumer%@bypass.com'
       OR email LIKE 'prod-creator%@bypass.com'
       OR email LIKE 'prod-business%@bypass.com'
  );

  SELECT COUNT(*) INTO campaign_count FROM campaigns
  WHERE owner_id IN (
    SELECT id FROM users
    WHERE email LIKE 'prod-business%@bypass.com'
  );

  SELECT COUNT(*) INTO restaurant_count FROM restaurants
  WHERE id IN (
    'dd111111-1111-4111-d111-111111111111',
    'dd222222-2222-4222-d222-222222222222',
    'dd333333-3333-4333-d333-333333333333',
    'dd444444-4444-4444-d444-444444444444',
    'dd555555-5555-4555-d555-555555555555',
    'dd666666-6666-4666-d666-666666666666',
    'dd777777-7777-4777-d777-777777777777',
    'dd888888-8888-4888-d888-888888888888'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Reset Verification:';
  RAISE NOTICE '  Users remaining: % (should be 0)', user_count;
  RAISE NOTICE '  Posts remaining: % (should be 0)', post_count;
  RAISE NOTICE '  Campaigns remaining: % (should be 0)', campaign_count;
  RAISE NOTICE '  Restaurants remaining: % (should be 0)', restaurant_count;
  RAISE NOTICE '========================================';
END $$;
