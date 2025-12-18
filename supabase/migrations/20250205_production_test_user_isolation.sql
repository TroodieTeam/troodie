-- ============================================================================
-- Production Test User Isolation
-- ============================================================================
-- This migration creates infrastructure to isolate test users (@bypass.com)
-- from production users in all public-facing queries.
--
-- Test users should be able to:
-- - Log in and use the app normally
-- - See their own data and interact with each other
-- - NOT appear in any public listings, feeds, or searches
--
-- Production users should:
-- - Never see test users in browse, search, or feed
-- - Never see test restaurants (owned by test users)
-- - Never see test campaigns, posts, or communities
--
-- Date: 2025-02-05
-- ============================================================================

-- ============================================================================
-- PART 1: Helper Function to Identify Test Users
-- ============================================================================

-- Function to check if an email is a test email
CREATE OR REPLACE FUNCTION is_test_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email IS NOT NULL AND (
    LOWER(email) LIKE '%@bypass.com' OR
    LOWER(email) LIKE '%@troodie.test'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_test_email IS
'Returns true if the email belongs to a test account (@bypass.com or @troodie.test domains)';

-- Function to check if a user ID belongs to a test user
CREATE OR REPLACE FUNCTION is_test_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id
    AND is_test_email(u.email)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_test_user IS
'Returns true if the user_id belongs to a test account';

-- Function to check if current user is a test user
CREATE OR REPLACE FUNCTION current_user_is_test()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get current user's email from auth
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN is_test_email(user_email);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_is_test IS
'Returns true if the currently authenticated user is a test account';

-- ============================================================================
-- PART 2: Add is_test_account Column to Users Table
-- ============================================================================

-- Add column to flag test accounts (computed from email)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN GENERATED ALWAYS AS (
  is_test_email(email)
) STORED;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_is_test_account
ON public.users(is_test_account) WHERE is_test_account = true;

COMMENT ON COLUMN public.users.is_test_account IS
'Computed column: true if user email matches test domain patterns (@bypass.com, @troodie.test)';

-- ============================================================================
-- PART 3: Update get_creators() to Exclude Test Users
-- ============================================================================

CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_min_engagement DECIMAL DEFAULT NULL,
  p_collab_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  total_followers INTEGER,
  troodie_engagement_rate DECIMAL,
  open_to_collabs BOOLEAN,
  specialties TEXT[],
  sample_posts JSON
) AS $$
DECLARE
  is_current_user_test BOOLEAN;
BEGIN
  -- Check if current user is a test user
  is_current_user_test := current_user_is_test();

  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    COALESCE(cp.display_name, u.name, u.username) as display_name,
    cp.bio,
    cp.location,
    u.avatar_url,
    cp.total_followers,
    cp.troodie_engagement_rate,
    cp.open_to_collabs,
    cp.specialties,
    (
      SELECT COALESCE(json_agg(sample ORDER BY sample.rank), '[]'::json)
      FROM (
        SELECT
          post_id,
          caption,
          image_url,
          likes_count,
          restaurant_name,
          rank
        FROM creator_sample_posts
        WHERE creator_profile_id = cp.id AND rank <= 3
      ) sample
    ) as sample_posts
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.open_to_collabs = true
    AND u.account_type = 'creator'
    AND (cp.availability_status = 'available' OR cp.availability_status = 'busy')
    -- TEST USER ISOLATION: Only show test users to other test users
    AND (
      is_current_user_test = true  -- Test users can see all creators
      OR u.is_test_account IS NOT TRUE  -- Production users only see non-test creators
    )
    AND (p_city IS NULL OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%'))
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
  ORDER BY
    cp.featured_at DESC NULLS LAST,
    cp.troodie_engagement_rate DESC,
    cp.total_followers DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_creators IS
'Returns filtered list of creators. Test users are hidden from production users but visible to other test users.';

GRANT EXECUTE ON FUNCTION get_creators TO authenticated;

-- ============================================================================
-- PART 4: Create View for Non-Test Users (for general queries)
-- ============================================================================

-- View to get only production users
CREATE OR REPLACE VIEW production_users AS
SELECT *
FROM public.users
WHERE is_test_account IS NOT TRUE;

COMMENT ON VIEW production_users IS
'View that excludes test accounts (@bypass.com, @troodie.test) from user listings';

-- ============================================================================
-- PART 5: Add Test Restaurant Marking
-- ============================================================================

-- Add column to mark test restaurants (restaurants owned by test users)
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS is_test_restaurant BOOLEAN DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_is_test
ON restaurants(is_test_restaurant) WHERE is_test_restaurant = true;

COMMENT ON COLUMN restaurants.is_test_restaurant IS
'True if this restaurant is owned by a test account (for isolation from production users)';

-- Function to mark restaurants owned by test users
CREATE OR REPLACE FUNCTION mark_test_restaurants()
RETURNS void AS $$
BEGIN
  -- Mark restaurants where the owner (via restaurant_claims) is a test user
  UPDATE restaurants r
  SET is_test_restaurant = true
  WHERE EXISTS (
    SELECT 1 FROM restaurant_claims rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.restaurant_id = r.id
    AND rc.status = 'verified'
    AND u.is_test_account = true
  );

  -- Also mark restaurants that were created with test data
  -- (checking if they're linked to test campaigns)
  UPDATE restaurants r
  SET is_test_restaurant = true
  WHERE EXISTS (
    SELECT 1 FROM campaigns c
    JOIN users u ON c.owner_id = u.id
    WHERE c.restaurant_id = r.id
    AND u.is_test_account = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_test_restaurants IS
'Marks restaurants as test restaurants if owned by test users';

-- Run initial marking
SELECT mark_test_restaurants();

-- ============================================================================
-- PART 6: Add Test Campaign Marking
-- ============================================================================

-- Add column to mark test campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS is_test_campaign BOOLEAN DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_is_test
ON campaigns(is_test_campaign) WHERE is_test_campaign = true;

COMMENT ON COLUMN campaigns.is_test_campaign IS
'True if this campaign belongs to a test account';

-- Function to mark test campaigns
CREATE OR REPLACE FUNCTION mark_test_campaigns()
RETURNS void AS $$
BEGIN
  -- Mark campaigns created by test business users
  UPDATE campaigns c
  SET is_test_campaign = true
  WHERE EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = c.owner_id
    AND u.is_test_account = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_test_campaigns IS
'Marks campaigns as test campaigns if created by test business users';

-- Run initial marking
SELECT mark_test_campaigns();

-- ============================================================================
-- PART 7: Create Filtered Views for Production Queries
-- ============================================================================

-- View for production-safe campaigns (excludes test campaigns for production users)
CREATE OR REPLACE VIEW production_campaigns AS
SELECT c.*
FROM campaigns c
WHERE c.is_test_campaign IS NOT TRUE
  OR current_user_is_test() = true;  -- Test users can see all campaigns

COMMENT ON VIEW production_campaigns IS
'View that shows campaigns filtered by test status. Production users see only real campaigns, test users see all.';

-- View for production-safe restaurants (excludes test restaurants for production users)
CREATE OR REPLACE VIEW production_restaurants AS
SELECT r.*
FROM restaurants r
WHERE r.is_test_restaurant IS NOT TRUE
  OR current_user_is_test() = true;  -- Test users can see all restaurants

COMMENT ON VIEW production_restaurants IS
'View that shows restaurants filtered by test status. Production users see only real restaurants, test users see all.';

-- ============================================================================
-- PART 8: Update creator_sample_posts View to Exclude Test Users
-- ============================================================================

CREATE OR REPLACE VIEW creator_sample_posts AS
SELECT
  cp.id as creator_profile_id,
  p.id as post_id,
  p.caption,
  p.photos[1] as image_url,
  p.likes_count,
  p.comments_count,
  p.created_at,
  r.name as restaurant_name,
  ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY p.likes_count DESC) as rank
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
JOIN posts p ON p.user_id = u.id
LEFT JOIN restaurants r ON p.restaurant_id::UUID = r.id
WHERE p.photos IS NOT NULL
  AND array_length(p.photos, 1) > 0
  -- Include all posts for view, filtering happens in get_creators()
;

COMMENT ON VIEW creator_sample_posts IS
'View showing top posts for each creator, ranked by likes.';

-- ============================================================================
-- PART 9: Trigger to Auto-Mark Test Data on Insert
-- ============================================================================

-- Trigger function to mark campaigns as test when created by test users
CREATE OR REPLACE FUNCTION trigger_mark_test_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the owner_id belongs to a test user
  IF EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = NEW.owner_id
    AND u.is_test_account = true
  ) THEN
    NEW.is_test_campaign := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaigns
DROP TRIGGER IF EXISTS trigger_campaign_test_flag ON campaigns;
CREATE TRIGGER trigger_campaign_test_flag
  BEFORE INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mark_test_campaign();

-- Trigger function to mark restaurants as test when claimed by test users
CREATE OR REPLACE FUNCTION trigger_mark_test_restaurant_on_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- When a claim is verified, check if the user is a test user
  IF NEW.status = 'verified' AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = NEW.user_id
    AND u.is_test_account = true
  ) THEN
    UPDATE restaurants
    SET is_test_restaurant = true
    WHERE id = NEW.restaurant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for restaurant claims
DROP TRIGGER IF EXISTS trigger_restaurant_claim_test_flag ON restaurant_claims;
CREATE TRIGGER trigger_restaurant_claim_test_flag
  AFTER UPDATE OF status ON restaurant_claims
  FOR EACH ROW
  WHEN (NEW.status = 'verified')
  EXECUTE FUNCTION trigger_mark_test_restaurant_on_claim();

-- ============================================================================
-- PART 10: Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_test_email TO authenticated;
GRANT EXECUTE ON FUNCTION is_test_user TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_test TO authenticated;
GRANT SELECT ON production_users TO authenticated;
GRANT SELECT ON production_campaigns TO authenticated;
GRANT SELECT ON production_restaurants TO authenticated;

-- ============================================================================
-- PART 11: Summary
-- ============================================================================

DO $$
DECLARE
  test_user_count INTEGER;
  test_restaurant_count INTEGER;
  test_campaign_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_user_count FROM users WHERE is_test_account = true;
  SELECT COUNT(*) INTO test_restaurant_count FROM restaurants WHERE is_test_restaurant = true;
  SELECT COUNT(*) INTO test_campaign_count FROM campaigns WHERE is_test_campaign = true;

  RAISE NOTICE '✅ Production Test User Isolation Migration Complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Accounts Identified:';
  RAISE NOTICE '  - Test Users: %', test_user_count;
  RAISE NOTICE '  - Test Restaurants: %', test_restaurant_count;
  RAISE NOTICE '  - Test Campaigns: %', test_campaign_count;
  RAISE NOTICE '';
  RAISE NOTICE 'New Functions:';
  RAISE NOTICE '  - is_test_email(email) - Check if email is test domain';
  RAISE NOTICE '  - is_test_user(user_id) - Check if user is test account';
  RAISE NOTICE '  - current_user_is_test() - Check if current session is test user';
  RAISE NOTICE '';
  RAISE NOTICE 'New Views:';
  RAISE NOTICE '  - production_users - Users excluding test accounts';
  RAISE NOTICE '  - production_campaigns - Campaigns excluding test data';
  RAISE NOTICE '  - production_restaurants - Restaurants excluding test data';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated Functions:';
  RAISE NOTICE '  - get_creators() - Now excludes test creators from production users';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers:';
  RAISE NOTICE '  - Auto-marks new campaigns as test if created by test user';
  RAISE NOTICE '  - Auto-marks restaurants as test when claimed by test user';
END $$;
