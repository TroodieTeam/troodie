-- Verification Queries: Creator Marketplace Name Fix
-- Run these to confirm the feature is working correctly
-- Date: 2026-02-09

-- 1. Check which creators have NULL display_name (these are the ones affected by the bug)
SELECT
  cp.id,
  cp.display_name,
  u.name AS user_name,
  u.username,
  COALESCE(cp.display_name, u.name, u.username, 'Unknown Creator') AS expected_bold_text,
  CASE
    WHEN cp.display_name IS NOT NULL THEN '@' || u.username
    WHEN u.name IS NOT NULL THEN '@' || u.username
    WHEN u.username IS NOT NULL THEN '' -- username promoted to bold, hide grey
    ELSE '' -- no username at all
  END AS expected_grey_text
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.account_type = 'creator'
ORDER BY cp.display_name IS NULL DESC, u.name IS NULL DESC;

-- 2. Count creators by name availability
SELECT
  COUNT(*) AS total_creators,
  COUNT(cp.display_name) AS with_display_name,
  COUNT(CASE WHEN cp.display_name IS NULL AND u.name IS NOT NULL THEN 1 END) AS fallback_to_user_name,
  COUNT(CASE WHEN cp.display_name IS NULL AND u.name IS NULL AND u.username IS NOT NULL THEN 1 END) AS fallback_to_username,
  COUNT(CASE WHEN cp.display_name IS NULL AND u.name IS NULL AND u.username IS NULL THEN 1 END) AS unknown_creator
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.account_type = 'creator';

-- 3. Verify the get_creators RPC COALESCE is working (should not return NULL display_name)
SELECT id, display_name, user_id
FROM get_creators()
WHERE display_name IS NULL;
