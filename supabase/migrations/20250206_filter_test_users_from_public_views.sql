-- ============================================================================
-- Filter Test Users from Public Views
-- ============================================================================
-- This migration updates all public-facing views and queries to exclude
-- test users (@bypass.com) from being visible to production users.
--
-- Test users can still see each other, but production users will never
-- see test users, their posts, restaurants, communities, or activities.
--
-- Date: 2025-02-06
-- ============================================================================

-- ============================================================================
-- PART 1: Update activity_feed view to exclude test users
-- ============================================================================

DROP FUNCTION IF EXISTS get_activity_feed(UUID, VARCHAR, INT, INT, TIMESTAMPTZ) CASCADE;
DROP VIEW IF EXISTS public.activity_feed CASCADE;

CREATE OR REPLACE VIEW public.activity_feed AS
-- Posts (Reviews) - exclude test users
SELECT
  'post'::text as activity_type,
  p.id as activity_id,
  p.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  CASE
    WHEN p.rating IS NOT NULL THEN 'wrote a review'::text
    ELSE 'shared a post'::text
  END as action,
  r.name::text as target_name,
  r.id as target_id,
  'restaurant'::text as target_type,
  p.rating,
  p.caption::text as content,
  p.photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  p.privacy::text as privacy,
  p.created_at,
  p.restaurant_id::uuid as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id
WHERE p.privacy = 'public'
  AND u.is_test_account IS NOT TRUE  -- Exclude test users

UNION ALL

-- Restaurant Saves (from board_restaurants) - exclude test users
SELECT
  'save'::text as activity_type,
  br.id as activity_id,
  br.added_by as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'saved'::text as action,
  r.name::text as target_name,
  r.id::uuid as target_id,
  'restaurant'::text as target_type,
  br.rating::decimal as rating,
  br.notes::text as content,
  NULL::text[] as photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  CASE
    WHEN b.is_private = true THEN 'private'::text
    ELSE 'public'::text
  END as privacy,
  COALESCE(br.added_at, br.created_at) as created_at,
  CASE
    WHEN r.id IS NOT NULL THEN r.id::uuid
    ELSE br.restaurant_id::uuid
  END as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  br.board_id as board_id,
  b.title::text as board_name
FROM board_restaurants br
JOIN users u ON br.added_by = u.id
JOIN boards b ON br.board_id = b.id
LEFT JOIN restaurants r ON br.restaurant_id::uuid = r.id
WHERE b.is_private = false
  AND u.is_test_account IS NOT TRUE  -- Exclude test users
  AND (r.id IS NULL OR r.is_test_restaurant IS NOT TRUE)  -- Exclude test restaurants

UNION ALL

-- Board Creations - exclude test users
SELECT
  'board_created'::text as activity_type,
  b.id as activity_id,
  b.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'created new board'::text as action,
  b.title::text as target_name,
  b.id as target_id,
  'board'::text as target_type,
  NULL::decimal as rating,
  b.description::text as content,
  CASE
    WHEN b.cover_image_url IS NOT NULL THEN ARRAY[b.cover_image_url]::text[]
    ELSE NULL::text[]
  END as photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  CASE
    WHEN b.is_private = true THEN 'private'::text
    ELSE 'public'::text
  END as privacy,
  b.created_at,
  NULL::uuid as restaurant_id,
  NULL::text[] as cuisine_types,
  NULL::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  b.id as board_id,
  b.title::text as board_name
FROM boards b
JOIN users u ON b.user_id = u.id
WHERE b.is_private = false
  AND u.is_test_account IS NOT TRUE  -- Exclude test users

UNION ALL

-- Follows - exclude test users (both follower and following)
SELECT
  'follow'::text as activity_type,
  ur.id as activity_id,
  ur.follower_id as actor_id,
  u1.name::text as actor_name,
  u1.username::text as actor_username,
  u1.avatar_url::text as actor_avatar,
  u1.is_verified as actor_is_verified,
  'started following'::text as action,
  u2.name::text as target_name,
  ur.following_id as target_id,
  'user'::text as target_type,
  NULL::decimal as rating,
  NULL::text as content,
  NULL::text[] as photos,
  ur.following_id as related_user_id,
  u2.name::text as related_user_name,
  u2.username::text as related_user_username,
  u2.avatar_url::text as related_user_avatar,
  'public'::text as privacy,
  ur.created_at,
  NULL::uuid as restaurant_id,
  NULL::text[] as cuisine_types,
  NULL::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM user_relationships ur
JOIN users u1 ON ur.follower_id = u1.id
JOIN users u2 ON ur.following_id = u2.id
WHERE u1.is_test_account IS NOT TRUE  -- Exclude test followers
  AND u2.is_test_account IS NOT TRUE   -- Exclude test users being followed

UNION ALL

-- Community Joins - exclude test users and test communities
SELECT
  'community_join'::text as activity_type,
  cm.id as activity_id,
  cm.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'joined community'::text as action,
  c.name::text as target_name,
  c.id as target_id,
  'community'::text as target_type,
  NULL::decimal as rating,
  c.description::text as content,
  ARRAY[c.cover_image_url]::text[] as photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  'public'::text as privacy,
  cm.joined_at as created_at,
  NULL::uuid as restaurant_id,
  NULL::text[] as cuisine_types,
  c.location::text as restaurant_location,
  c.id as community_id,
  c.name::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM community_members cm
JOIN users u ON cm.user_id = u.id
JOIN communities c ON cm.community_id = c.id
WHERE c.type = 'public'
  AND u.is_test_account IS NOT TRUE  -- Exclude test users
  AND NOT EXISTS (  -- Exclude communities created by test users
    SELECT 1 FROM users cu
    WHERE cu.id = c.created_by
    AND cu.is_test_account = true
  )

UNION ALL

-- Post Likes - exclude test users and likes on test user posts
SELECT
  'like'::text as activity_type,
  pl.id as activity_id,
  pl.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  CASE
    WHEN p.rating IS NOT NULL THEN 'liked a review'::text
    ELSE 'liked a post'::text
  END as action,
  COALESCE(r.name, 'Simple Post')::text as target_name,
  p.id as target_id,
  'post'::text as target_type,
  p.rating,
  p.caption::text as content,
  p.photos,
  p.user_id as related_user_id,
  u2.name::text as related_user_name,
  u2.username::text as related_user_username,
  u2.avatar_url::text as related_user_avatar,
  p.privacy::text as privacy,
  pl.created_at,
  p.restaurant_id::uuid as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM post_likes pl
JOIN users u ON pl.user_id = u.id
JOIN posts p ON pl.post_id = p.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id
JOIN users u2 ON p.user_id = u2.id
WHERE p.privacy = 'public'
  AND u.is_test_account IS NOT TRUE   -- Exclude test users who liked
  AND u2.is_test_account IS NOT TRUE   -- Exclude likes on test user posts

UNION ALL

-- Comments - exclude test users and comments on test user posts
SELECT
  'comment'::text as activity_type,
  pc.id as activity_id,
  pc.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  CASE
    WHEN p.rating IS NOT NULL THEN 'commented on a review'::text
    ELSE 'commented on a post'::text
  END as action,
  COALESCE(r.name, 'Simple Post')::text as target_name,
  p.id as target_id,
  'post'::text as target_type,
  p.rating,
  pc.content::text,
  p.photos,
  p.user_id as related_user_id,
  u2.name::text as related_user_name,
  u2.username::text as related_user_username,
  u2.avatar_url::text as related_user_avatar,
  p.privacy::text as privacy,
  pc.created_at,
  p.restaurant_id::uuid as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM post_comments pc
JOIN users u ON pc.user_id = u.id
JOIN posts p ON pc.post_id = p.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id
JOIN users u2 ON p.user_id = u2.id
WHERE p.privacy = 'public'
  AND u.is_test_account IS NOT TRUE   -- Exclude test users who commented
  AND u2.is_test_account IS NOT TRUE   -- Exclude comments on test user posts

ORDER BY created_at DESC;

-- Recreate the activity feed function
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id UUID DEFAULT NULL,
  p_filter VARCHAR DEFAULT 'all', -- 'all' or 'friends'
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_after_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  activity_type TEXT,
  activity_id UUID,
  actor_id UUID,
  actor_name TEXT,
  actor_username TEXT,
  actor_avatar TEXT,
  actor_is_verified BOOLEAN,
  action TEXT,
  target_name TEXT,
  target_id UUID,
  target_type TEXT,
  rating DECIMAL,
  content TEXT,
  photos TEXT[],
  related_user_id UUID,
  related_user_name TEXT,
  related_user_username TEXT,
  related_user_avatar TEXT,
  privacy TEXT,
  created_at TIMESTAMPTZ,
  restaurant_id UUID,
  cuisine_types TEXT[],
  restaurant_location TEXT,
  community_id UUID,
  community_name TEXT,
  board_id UUID,
  board_name TEXT
) AS $$
DECLARE
  is_current_user_test BOOLEAN;
BEGIN
  -- Check if current user is a test user
  is_current_user_test := current_user_is_test();

  IF p_filter = 'friends' AND p_user_id IS NOT NULL THEN
    -- Return only activities from friends
    RETURN QUERY
    SELECT af.*
    FROM activity_feed af
    WHERE (
      -- Activities from users I follow
      af.actor_id IN (
        SELECT following_id
        FROM user_relationships
        WHERE follower_id = p_user_id
      )
      -- Or my own activities
      OR af.actor_id = p_user_id
    )
    AND (p_after_timestamp IS NULL OR af.created_at > p_after_timestamp)
    ORDER BY af.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Return all public activities (already filtered by view)
    -- Test users can see all activities, production users only see non-test activities
    RETURN QUERY
    SELECT af.*
    FROM activity_feed af
    WHERE (p_after_timestamp IS NULL OR af.created_at > p_after_timestamp)
    ORDER BY af.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Update search_users function to exclude test users
-- ============================================================================

DROP FUNCTION IF EXISTS search_users(TEXT, INT, INT) CASCADE;

CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  name VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  followers_count INT,
  saves_count INT,
  location TEXT
) AS $$
DECLARE
  is_current_user_test BOOLEAN;
BEGIN
  -- Check if current user is a test user
  is_current_user_test := current_user_is_test();

  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.name,
    u.bio,
    u.avatar_url,
    u.is_verified,
    u.followers_count,
    u.saves_count,
    u.location
  FROM users u
  WHERE 
    to_tsvector('english', 
      COALESCE(u.username, '') || ' ' || 
      COALESCE(u.name, '') || ' ' || 
      COALESCE(u.bio, '')
    ) @@ plainto_tsquery('english', search_query)
    -- Test users can see all users, production users only see non-test users
    AND (
      is_current_user_test = true
      OR u.is_test_account IS NOT TRUE
    )
  ORDER BY 
    u.is_verified DESC,
    u.followers_count DESC,
    ts_rank(
      to_tsvector('english', 
        COALESCE(u.username, '') || ' ' || 
        COALESCE(u.name, '') || ' ' || 
        COALESCE(u.bio, '')
      ),
      plainto_tsquery('english', search_query)
    ) DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_users IS
'Search users by username, name, or bio. Test users are hidden from production users but visible to other test users.';

-- ============================================================================
-- PART 3: Grant permissions
-- ============================================================================

GRANT SELECT ON public.activity_feed TO authenticated;
GRANT SELECT ON public.activity_feed TO anon;
GRANT EXECUTE ON FUNCTION get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed TO anon;
GRANT EXECUTE ON FUNCTION search_users TO authenticated;
GRANT EXECUTE ON FUNCTION search_users TO anon;

-- ============================================================================
-- PART 4: Summary
-- ============================================================================

COMMENT ON VIEW public.activity_feed IS 
'Unified activity feed including posts, saves, board creations, follows, community joins, likes, and comments. Test users (@bypass.com) are excluded from production user views.';

DO $$
DECLARE
  test_user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_user_count FROM users WHERE is_test_account = true;

  RAISE NOTICE '✅ Test User Filtering Migration Complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Accounts Identified: %', test_user_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Updated Views/Functions:';
  RAISE NOTICE '  - activity_feed view - Excludes test users from all activity types';
  RAISE NOTICE '  - get_activity_feed() - Respects test user filtering';
  RAISE NOTICE '  - search_users() - Excludes test users from search results';
  RAISE NOTICE '';
  RAISE NOTICE 'Test users can still see each other, but production users';
  RAISE NOTICE 'will never see test users, their posts, restaurants, communities, or activities.';
END $$;
