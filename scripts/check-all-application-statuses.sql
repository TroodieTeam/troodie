-- Check All Application Statuses for a Creator
-- This shows the breakdown of all applications and why they appear/don't appear in tabs

SELECT 
  'Application Status Breakdown' as report,
  ca.status,
  COUNT(*) as count,
  STRING_AGG(c.title, ', ' ORDER BY ca.applied_at DESC) as campaign_titles,
  CASE 
    WHEN ca.status = 'pending' THEN '✅ Shows in "Pending" tab'
    WHEN ca.status = 'accepted' THEN '✅ Shows in "Active" tab'
    WHEN ca.status = 'rejected' THEN '❌ Does NOT show in My Campaigns'
    WHEN ca.status = 'withdrawn' THEN '❌ Does NOT show in My Campaigns'
    ELSE '❓ Unknown status'
  END as visibility
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
GROUP BY ca.status
ORDER BY 
  CASE ca.status
    WHEN 'pending' THEN 1
    WHEN 'accepted' THEN 2
    WHEN 'rejected' THEN 3
    WHEN 'withdrawn' THEN 4
    ELSE 5
  END;

-- Detailed view of all applications
SELECT 
  ca.id as application_id,
  c.title as campaign_title,
  c.status as campaign_status,
  ca.status as application_status,
  ca.applied_at,
  ca.reviewed_at,
  ca.proposed_rate_cents,
  CASE 
    WHEN ca.status = 'pending' THEN '✅ Pending tab'
    WHEN ca.status = 'accepted' THEN '✅ Active tab'
    ELSE '❌ Not visible'
  END as where_visible
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
ORDER BY ca.applied_at DESC;


