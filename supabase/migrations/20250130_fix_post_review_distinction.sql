-- Fix activity feed to properly distinguish between posts and reviews
-- A post with a rating is a review, a post without a rating is a simple post

-- Drop the existing view and function
DROP FUNCTION IF EXISTS get_activity_feed(UUID, VARCHAR, INT, INT, TIMESTAMPTZ) CASCADE;
DROP VIEW IF EXISTS public.activity_feed CASCADE;

-- Recreate the activity_feed view with proper distinction between posts and reviews
CREATE OR REPLACE VIEW public.activity_feed AS
-- Posts (Reviews and Simple Posts)
SELECT 
  'post'::text as activity_type,
  p.id as activity_id,
  p.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  -- Distinguish between reviews (with rating) and posts (without rating)
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

UNION ALL

-- Restaurant Saves
SELECT 
  'save'::text as activity_type,
  rs.id as activity_id,
  rs.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'saved'::text as action,
  r.name::text as target_name,
  r.id as target_id,
  'restaurant'::text as target_type,
  rs.personal_rating as rating,
  rs.notes::text as content,
  rs.photos,
  NULL::uuid as related_user_id,
  NULL::text as related_user_name,
  NULL::text as related_user_username,
  NULL::text as related_user_avatar,
  rs.privacy::text as privacy,
  rs.created_at,
  rs.restaurant_id::uuid as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM restaurant_saves rs
JOIN users u ON rs.user_id = u.id
JOIN restaurants r ON rs.restaurant_id = r.id
WHERE rs.privacy = 'public'

UNION ALL

-- Follows
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

UNION ALL

-- Community Joins
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
WHERE cm.status = 'active' AND c.type = 'public'

UNION ALL

-- Post Likes - distinguish between review likes and post likes
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

UNION ALL

-- Comments - distinguish between review comments and post comments
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
WHERE p.privacy = 'public';

-- Recreate the get_activity_feed function
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id UUID,
  p_filter VARCHAR DEFAULT 'all',
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
BEGIN
  RETURN QUERY
  SELECT 
    af.activity_type,
    af.activity_id,
    af.actor_id,
    af.actor_name,
    af.actor_username,
    af.actor_avatar,
    af.actor_is_verified,
    af.action,
    af.target_name,
    af.target_id,
    af.target_type,
    af.rating,
    af.content,
    af.photos,
    af.related_user_id,
    af.related_user_name,
    af.related_user_username,
    af.related_user_avatar,
    af.privacy,
    af.created_at,
    af.restaurant_id,
    af.cuisine_types,
    af.restaurant_location,
    af.community_id,
    af.community_name,
    af.board_id,
    af.board_name
  FROM activity_feed af
  WHERE
    -- Filter by timestamp if provided
    (p_after_timestamp IS NULL OR af.created_at > p_after_timestamp)
    AND
    -- Filter by friends if requested
    (
      p_filter = 'all'
      OR (
        p_filter = 'friends' 
        AND p_user_id IS NOT NULL
        AND (
          -- Include activities from users this user follows
          af.actor_id IN (
            SELECT following_id 
            FROM user_relationships 
            WHERE follower_id = p_user_id
          )
          -- Or activities about this user
          OR af.related_user_id = p_user_id
          OR af.target_id = p_user_id
        )
      )
    )
  ORDER BY af.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT SELECT ON activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed TO authenticated;