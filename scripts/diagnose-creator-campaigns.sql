-- Diagnostic Query for Creator Campaigns
-- Use this to understand why a creator has no active/pending campaigns
-- Run this for test-creator1@bypass.com (or update email as needed)

-- Step 1: Check if user exists and has creator profile
SELECT 
  'Step 1: User & Creator Profile Check' as step,
  u.id as user_id,
  u.email,
  u.account_type,
  u.is_creator,
  cp.id as creator_profile_id,
  CASE 
    WHEN cp.id IS NULL THEN '❌ No creator profile found'
    ELSE '✅ Creator profile exists'
  END as profile_status
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com';

-- Step 2: Check all applications for this creator
SELECT 
  'Step 2: All Applications' as step,
  ca.id as application_id,
  ca.campaign_id,
  c.title as campaign_title,
  c.status as campaign_status,
  ca.status as application_status,
  ca.applied_at,
  ca.proposed_rate_cents,
  CASE 
    WHEN ca.status = 'pending' THEN 'Should appear in "Pending" tab'
    WHEN ca.status = 'accepted' THEN 'Should appear in "Active" tab'
    WHEN ca.status = 'rejected' THEN 'Won''t appear in My Campaigns'
    ELSE 'Unknown status'
  END as where_should_appear
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
ORDER BY ca.applied_at DESC;

-- Step 3: Check for applications with 'accepted' status (should show in Active tab)
SELECT 
  'Step 3: Accepted Applications (Active Tab)' as step,
  COUNT(*) as accepted_count,
  STRING_AGG(c.title, ', ') as campaign_titles
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.status = 'accepted';

-- Step 4: Check for applications with 'pending' status (should show in Pending tab)
SELECT 
  'Step 4: Pending Applications (Pending Tab)' as step,
  COUNT(*) as pending_count,
  STRING_AGG(c.title, ', ') as campaign_titles
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.status = 'pending';

-- Step 5: Check available active campaigns that can be applied to
SELECT 
  'Step 5: Available Active Campaigns' as step,
  c.id as campaign_id,
  c.title,
  c.status,
  c.end_date,
  r.name as restaurant_name,
  CASE 
    WHEN c.end_date < NOW() THEN '❌ Campaign expired'
    WHEN c.status != 'active' THEN '❌ Campaign not active'
    ELSE '✅ Available for application'
  END as availability
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.status = 'active'
  AND c.end_date >= NOW()
ORDER BY c.created_at DESC
LIMIT 10;

-- Step 6: Check if creator has applied to any active campaigns
SELECT 
  'Step 6: Creator Applications to Active Campaigns' as step,
  c.id as campaign_id,
  c.title,
  ca.status as application_status,
  ca.applied_at,
  CASE 
    WHEN ca.id IS NULL THEN '❌ Not applied yet'
    WHEN ca.status = 'pending' THEN '✅ Applied (Pending)'
    WHEN ca.status = 'accepted' THEN '✅ Applied (Accepted)'
    ELSE '❌ Application ' || ca.status
  END as status_description
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN campaign_applications ca ON ca.campaign_id = c.id
LEFT JOIN creator_profiles cp ON ca.creator_id = cp.id
LEFT JOIN users u ON cp.user_id = u.id AND u.email = 'test-creator1@bypass.com'
WHERE c.status = 'active'
  AND c.end_date >= NOW()
ORDER BY c.created_at DESC
LIMIT 10;

-- Summary Query: Quick overview
SELECT 
  u.email,
  cp.id as creator_profile_id,
  COUNT(ca.id) FILTER (WHERE ca.status = 'pending') as pending_applications,
  COUNT(ca.id) FILTER (WHERE ca.status = 'accepted') as accepted_applications,
  COUNT(ca.id) FILTER (WHERE ca.status = 'rejected') as rejected_applications,
  COUNT(ca.id) as total_applications
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
LEFT JOIN campaign_applications ca ON ca.creator_id = cp.id
WHERE u.email = 'test-creator1@bypass.com'
GROUP BY u.email, cp.id;


