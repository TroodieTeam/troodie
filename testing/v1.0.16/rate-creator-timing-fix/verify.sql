-- Verification Queries: Rate Creator Timing Fix
-- Run these to confirm the feature is working correctly
-- Date: 2026-02-18

-- 1. Find accepted applications with their deliverable counts
SELECT
  ca.id AS application_id,
  ca.status,
  ca.rating,
  c.title AS campaign_title,
  cp.display_name AS creator_name,
  COUNT(cd.id) AS total_deliverables,
  COUNT(CASE WHEN cd.status IN ('approved', 'auto_approved') THEN 1 END) AS approved_deliverables,
  CASE
    WHEN COUNT(cd.id) > 0 AND COUNT(cd.id) = COUNT(CASE WHEN cd.status IN ('approved', 'auto_approved') THEN 1 END)
    THEN true
    ELSE false
  END AS all_deliverables_approved
FROM campaign_applications ca
JOIN campaigns c ON c.id = ca.campaign_id
JOIN creator_profiles cp ON cp.id = ca.creator_id
LEFT JOIN campaign_deliverables cd ON cd.campaign_application_id = ca.id
WHERE ca.status = 'accepted'
GROUP BY ca.id, ca.status, ca.rating, c.title, cp.display_name
ORDER BY ca.applied_at DESC;

-- 2. Check for applications that have been rated before all deliverables were approved (should be empty)
SELECT
  ca.id AS application_id,
  ca.rating,
  ca.rated_at,
  COUNT(cd.id) AS total_deliverables,
  COUNT(CASE WHEN cd.status IN ('approved', 'auto_approved') THEN 1 END) AS approved_deliverables
FROM campaign_applications ca
LEFT JOIN campaign_deliverables cd ON cd.campaign_application_id = ca.id
WHERE ca.rating IS NOT NULL
GROUP BY ca.id, ca.rating, ca.rated_at
HAVING COUNT(cd.id) = 0
   OR COUNT(cd.id) > COUNT(CASE WHEN cd.status IN ('approved', 'auto_approved') THEN 1 END);

-- 3. List all deliverables grouped by application to verify status
SELECT
  cd.campaign_application_id,
  cp.display_name AS creator_name,
  cd.id AS deliverable_id,
  cd.status,
  cd.social_platform,
  cd.submitted_at
FROM campaign_deliverables cd
JOIN campaign_applications ca ON ca.id = cd.campaign_application_id
JOIN creator_profiles cp ON cp.id = cd.creator_id
ORDER BY cd.campaign_application_id, cd.submitted_at;
