-- Create a unified activity feed view that aggregates different types of activities
-- This view will power the Activity tab in the app

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.activity_feed CASCADE;

-- Create the activity feed view
CREATE OR REPLACE VIEW public.activity_feed AS
-- Posts (Reviews)
SELECT 
  'post'::text as activity_type,
  p.id as activity_id,
  p.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'created a review'::text as action,
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
  p.restaurant_id::varchar as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN restaurants r ON p.restaurant_id::uuid = r.id
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
  rs.restaurant_id::varchar as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM restaurant_saves rs
JOIN users u ON rs.user_id = u.id
JOIN restaurants r ON rs.restaurant_id::uuid = r.id
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
  NULL::text as restaurant_id,
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
  NULL::text as restaurant_id,
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

-- Post Likes
SELECT 
  'like'::text as activity_type,
  pl.id as activity_id,
  pl.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'liked a review'::text as action,
  r.name::text as target_name,
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
  p.restaurant_id::varchar as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM post_likes pl
JOIN users u ON pl.user_id = u.id
JOIN posts p ON pl.post_id = p.id
JOIN restaurants r ON p.restaurant_id::uuid = r.id
JOIN users u2 ON p.user_id = u2.id
WHERE p.privacy = 'public'

UNION ALL

-- Comments
SELECT 
  'comment'::text as activity_type,
  pc.id as activity_id,
  pc.user_id as actor_id,
  u.name::text as actor_name,
  u.username::text as actor_username,
  u.avatar_url::text as actor_avatar,
  u.is_verified as actor_is_verified,
  'commented on'::text as action,
  r.name::text as target_name,
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
  p.restaurant_id::varchar as restaurant_id,
  r.cuisine_types,
  COALESCE(r.city || ', ' || r.state, r.address)::text as restaurant_location,
  NULL::uuid as community_id,
  NULL::text as community_name,
  NULL::uuid as board_id,
  NULL::text as board_name
FROM post_comments pc
JOIN users u ON pc.user_id = u.id
JOIN posts p ON pc.post_id = p.id
JOIN restaurants r ON p.restaurant_id::uuid = r.id
JOIN users u2 ON p.user_id = u2.id
WHERE p.privacy = 'public'

ORDER BY created_at DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON posts(privacy);
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_created_at ON restaurant_saves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_privacy ON restaurant_saves(privacy);
CREATE INDEX IF NOT EXISTS idx_user_relationships_created_at ON user_relationships(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_joined_at ON community_members(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- Grant permissions
GRANT SELECT ON public.activity_feed TO authenticated;
GRANT SELECT ON public.activity_feed TO anon;

-- Drop existing function if it exists (in case of type changes)
DROP FUNCTION IF EXISTS get_activity_feed(UUID, VARCHAR, INT, INT, TIMESTAMPTZ);

-- Create a function to get activity feed with friend filtering
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
  restaurant_id VARCHAR,
  cuisine_types TEXT[],
  restaurant_location TEXT,
  community_id UUID,
  community_name TEXT,
  board_id UUID,
  board_name TEXT
) AS $$
BEGIN
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
    -- Return all public activities
    RETURN QUERY
    SELECT af.*
    FROM activity_feed af
    WHERE (p_after_timestamp IS NULL OR af.created_at > p_after_timestamp)
    ORDER BY af.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed TO anon;