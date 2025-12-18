-- Migration: Add posts_with_engagement view for calculated counts
-- This view calculates engagement counts on-demand, eliminating the need for stale count columns
-- Part of PE-002: Eliminate Stale Count Columns

-- Step 1: Create the view for backward compatibility during migration
-- This view calculates counts from actual data (single source of truth)
CREATE OR REPLACE VIEW posts_with_engagement AS
SELECT
  p.id,
  p.user_id,
  p.restaurant_id,
  p.caption,
  p.photos,
  p.videos,
  p.rating,
  p.visit_date,
  p.price_range,
  p.visit_type,
  p.tags,
  p.privacy,
  p.created_at,
  p.updated_at,
  p.post_type,
  p.content_type,
  p.external_source,
  p.external_url,
  p.external_title,
  p.external_description,
  p.external_thumbnail,
  p.external_author,
  p.is_trending,
  p.location_lat,
  p.location_lng,
  -- Calculate counts from actual data (always accurate)
  COALESCE(likes.count, 0)::integer as likes_count,
  COALESCE(comments.count, 0)::integer as comments_count,
  COALESCE(saves.count, 0)::integer as saves_count,
  COALESCE(shares.count, 0)::integer as share_count
FROM posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_likes
  GROUP BY post_id
) likes ON likes.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_comments
  GROUP BY post_id
) comments ON comments.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_saves
  GROUP BY post_id
) saves ON saves.post_id = p.id
LEFT JOIN (
  SELECT content_id as post_id, COUNT(*) as count
  FROM share_analytics
  WHERE content_type = 'post'
  GROUP BY content_id
) shares ON shares.post_id = p.id;

-- Grant access to authenticated users
GRANT SELECT ON posts_with_engagement TO authenticated;
GRANT SELECT ON posts_with_engagement TO anon;

-- Add comment
COMMENT ON VIEW posts_with_engagement IS 'Posts with engagement counts calculated from actual data. Replaces stale count columns.';
