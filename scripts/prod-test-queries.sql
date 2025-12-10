-- ============================================================================
-- Production Test Data Queries
-- ============================================================================
-- These queries help test the Creator Marketplace in production
-- Test users are identified by @bypass.com email domain
-- ============================================================================

-- ============================================================================
-- 1. GET ALL TEST USER UIDs
-- ============================================================================
-- Use this to get all production test account user IDs

-- Option 1: Check auth.users (where accounts are created first)
SELECT 
  id as user_id,
  email,
  created_at as auth_created_at,
  CASE WHEN pu.id IS NOT NULL THEN 'In public.users' ELSE 'NOT in public.users' END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE email LIKE '%@bypass.com' OR email LIKE '%@troodie.test'
ORDER BY email;

-- Option 2: Check public.users (after sync)
SELECT 
  id as user_id,
  email,
  account_type,
  created_at,
  is_test_account
FROM public.users
WHERE email LIKE '%@bypass.com' OR email LIKE '%@troodie.test'
ORDER BY account_type, email;

-- Option 3: Find missing users (auth.users without public.users entry)
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as auth_created_at,
  'MISSING from public.users' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND (au.email LIKE '%@bypass.com' OR au.email LIKE '%@troodie.test')
ORDER BY au.email;

-- Option 2: Using is_test_email() function (if function exists)
-- SELECT 
--   id as user_id,
--   email,
--   account_type,
--   created_at,
--   is_test_account
-- FROM users
-- WHERE is_test_email(email)
-- ORDER BY account_type, email;

-- ============================================================================
-- 2. CRITICAL WORKFLOW #1: CM-1 Creator Profile Race Condition Fix
-- ============================================================================
-- Test: Consumer upgrades to creator atomically
-- Critical because: Foundation for all creator features

-- Check if test consumer exists and is ready for upgrade
SELECT 
  u.id,
  u.email,
  u.account_type,
  CASE WHEN cp.id IS NOT NULL THEN 'Has Profile' ELSE 'No Profile' END as profile_status,
  cp.id as creator_profile_id
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
WHERE u.email = 'prod-consumer1@bypass.com';

-- Verify atomic upgrade function exists
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'upgrade_to_creator'
AND routine_schema = 'public';

-- After upgrade, verify profile was created
SELECT 
  cp.id,
  cp.user_id,
  u.email,
  u.account_type,
  cp.created_at
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-consumer1@bypass.com';

-- ============================================================================
-- 3. CRITICAL WORKFLOW #2: CM-3 Campaign Application creator_id
-- ============================================================================
-- Test: Creator applies to campaign with correct creator_id
-- Critical because: Core marketplace functionality

-- Find test campaigns
SELECT 
  c.id as campaign_id,
  c.title,
  c.status,
  r.name as restaurant_name,
  u.email as business_owner_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE u.is_test_account = true
ORDER BY c.created_at DESC;

-- Find test creator profile ID
SELECT 
  cp.id as creator_profile_id,
  cp.user_id,
  u.email as creator_email,
  cp.display_name
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com';

-- Check applications for correct creator_id
SELECT 
  ca.id,
  ca.campaign_id,
  c.title as campaign_title,
  ca.creator_id,
  cp.display_name as creator_name,
  u.email as creator_email,
  ca.status,
  ca.created_at
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY ca.created_at DESC;

-- ============================================================================
-- 4. CRITICAL WORKFLOW #3: CM-4 Deliverable URL Validation
-- ============================================================================
-- Test: Creator submits deliverable with URL validation
-- Critical because: Core deliverable workflow

-- Find campaigns with deliverables
SELECT 
  c.id as campaign_id,
  c.title,
  c.deliverable_requirements,
  u.email as business_owner_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.is_test_account = true
  AND c.deliverable_requirements IS NOT NULL
ORDER BY c.created_at DESC;

-- Check deliverables with URLs
SELECT 
  cd.id,
  cd.campaign_id,
  c.title as campaign_title,
  cd.creator_id,
  cp.display_name as creator_name,
  u.email as creator_email,
  cd.deliverable_url,
  cd.status,
  cd.submitted_at
FROM campaign_deliverables cd
JOIN campaigns c ON cd.campaign_id = c.id
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- 5. CM-2: Portfolio Image Upload
-- ============================================================================

-- Check portfolio items for test creators
SELECT 
  cpi.id,
  cpi.creator_id,
  cp.display_name as creator_name,
  u.email as creator_email,
  cpi.media_type,
  cpi.image_url,
  cpi.video_url,
  cpi.thumbnail_url,
  cpi.created_at
FROM creator_portfolio_items cpi
JOIN creator_profiles cp ON cpi.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY cpi.created_at DESC;

-- Verify storage bucket exists and has correct policies
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'creator-portfolios';

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%portfolio%';

-- ============================================================================
-- 6. CM-5: Auto-Approval Cron Job
-- ============================================================================

-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check cron job schedule
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE command LIKE '%auto_approve_overdue_deliverables%';

-- Find deliverables eligible for auto-approval
SELECT 
  cd.id,
  cd.campaign_id,
  c.title as campaign_title,
  cd.creator_id,
  cp.display_name as creator_name,
  cd.status,
  cd.submitted_at,
  cd.auto_approved_at,
  CASE 
    WHEN cd.status = 'pending' 
      AND cd.submitted_at < NOW() - INTERVAL '7 days'
      AND cd.auto_approved_at IS NULL
    THEN 'Eligible for auto-approval'
    ELSE 'Not eligible'
  END as auto_approval_status
FROM campaign_deliverables cd
JOIN campaigns c ON cd.campaign_id = c.id
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY cd.submitted_at DESC;

-- ============================================================================
-- 7. CM-6: Restaurant Analytics Dashboard
-- ============================================================================

-- Get restaurants with analytics data
SELECT 
  r.id,
  r.name,
  r.city,
  r.state,
  u.email as owner_email,
  (SELECT COUNT(*) FROM restaurant_saves rs WHERE rs.restaurant_id = r.id) as total_saves,
  (SELECT COUNT(*) FROM posts p WHERE p.restaurant_id = r.id) as total_mentions,
  (SELECT COUNT(*) FROM campaigns c WHERE c.restaurant_id = r.id) as total_campaigns
FROM restaurants r
JOIN restaurant_claims rc ON rc.restaurant_id = r.id
JOIN users u ON rc.user_id = u.id
WHERE u.is_test_account = true
  AND rc.status = 'verified'
ORDER BY r.name;

-- Get restaurant analytics using function
SELECT * FROM get_restaurant_analytics(
  (SELECT r.id FROM restaurants r
   JOIN restaurant_claims rc ON rc.restaurant_id = r.id
   JOIN users u ON rc.user_id = u.id
   WHERE u.email = 'prod-business1@bypass.com'
   LIMIT 1)
);

-- ============================================================================
-- 8. CM-7: Campaign Creation Validation
-- ============================================================================

-- Check campaigns created by test businesses
SELECT 
  c.id,
  c.title,
  c.status,
  c.restaurant_id,
  r.name as restaurant_name,
  u.email as owner_email,
  c.deliverable_requirements,
  c.created_at
FROM campaigns c
JOIN users u ON c.owner_id = u.id
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE u.is_test_account = true
ORDER BY c.created_at DESC;

-- ============================================================================
-- 9. CM-8: Restaurant Editable Details
-- ============================================================================

-- Check restaurant details for test restaurants
SELECT 
  r.id,
  r.name,
  r.description,
  r.about_us,
  r.parking_info,
  r.special_deals,
  r.hours_of_operation,
  u.email as owner_email
FROM restaurants r
JOIN restaurant_claims rc ON rc.restaurant_id = r.id
JOIN users u ON rc.user_id = u.id
WHERE u.is_test_account = true
  AND rc.status = 'verified'
ORDER BY r.name;

-- ============================================================================
-- 10. CM-9: Creator Profiles & Discovery
-- ============================================================================

-- Test get_creators function (should exclude test users for production users)
SELECT * FROM get_creators(
  p_city := NULL,
  p_min_followers := NULL,
  p_min_engagement := NULL,
  p_collab_types := NULL,
  p_limit := 20,
  p_offset := 0
);

-- Get creator profiles with discovery metrics
SELECT 
  cp.id,
  cp.display_name,
  cp.bio,
  cp.location,
  cp.availability_status,
  cp.open_to_collabs,
  cp.total_followers,
  cp.troodie_engagement_rate,
  u.email,
  u.is_test_account
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY cp.total_followers DESC;

-- ============================================================================
-- 11. ER-001: Creator Discovery Filter Fix
-- ============================================================================

-- Verify only creators appear (not business users)
SELECT 
  u.id,
  u.email,
  u.account_type,
  cp.id as creator_profile_id,
  cp.open_to_collabs
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY u.account_type, u.email;

-- ============================================================================
-- 12. ER-007: Campaign Invitation System
-- ============================================================================

-- Check campaign invitations
SELECT 
  ci.id,
  ci.campaign_id,
  c.title as campaign_title,
  ci.creator_id,
  cp.display_name as creator_name,
  ci.status,
  ci.created_at,
  ci.expires_at,
  ci.responded_at
FROM campaign_invitations ci
JOIN campaigns c ON ci.campaign_id = c.id
JOIN creator_profiles cp ON ci.creator_id = cp.id
JOIN users u ON c.owner_id = u.id
WHERE u.is_test_account = true
ORDER BY ci.created_at DESC;

-- ============================================================================
-- 13. ER-008: Multiple Deliverables Support
-- ============================================================================

-- Check campaigns with multiple deliverables
SELECT 
  c.id,
  c.title,
  c.deliverable_requirements,
  jsonb_array_length(c.deliverable_requirements->'deliverables') as deliverable_count,
  u.email as owner_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.is_test_account = true
  AND c.deliverable_requirements IS NOT NULL
  AND jsonb_array_length(c.deliverable_requirements->'deliverables') > 1
ORDER BY deliverable_count DESC;

-- Check deliverable progress for campaigns
SELECT 
  c.id as campaign_id,
  c.title,
  jsonb_array_length(c.deliverable_requirements->'deliverables') as required_count,
  COUNT(cd.id) as submitted_count,
  COUNT(CASE WHEN cd.status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN cd.status = 'pending' THEN 1 END) as pending_count
FROM campaigns c
LEFT JOIN campaign_deliverables cd ON cd.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.is_test_account = true
  AND c.deliverable_requirements IS NOT NULL
GROUP BY c.id, c.title, c.deliverable_requirements
ORDER BY c.created_at DESC;

-- ============================================================================
-- 14. CM-11: Creator Availability Status
-- ============================================================================

-- Check creator availability statuses
SELECT 
  cp.id,
  cp.display_name,
  cp.availability_status,
  cp.open_to_collabs,
  u.email
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY cp.availability_status, u.email;

-- ============================================================================
-- 15. CM-16: Creator Rating System
-- ============================================================================

-- Check creator ratings
SELECT 
  ca.id as application_id,
  c.title as campaign_title,
  cp.display_name as creator_name,
  u.email as creator_email,
  ca.rating,
  ca.rating_comment,
  ca.rated_at,
  ca.status as application_status
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
  AND ca.rating IS NOT NULL
ORDER BY ca.rated_at DESC;

-- ============================================================================
-- 16. Test User Isolation Verification
-- ============================================================================

-- Verify test users are properly flagged
SELECT 
  COUNT(*) as total_test_users,
  COUNT(CASE WHEN account_type = 'creator' THEN 1 END) as test_creators,
  COUNT(CASE WHEN account_type = 'business' THEN 1 END) as test_businesses,
  COUNT(CASE WHEN account_type = 'consumer' THEN 1 END) as test_consumers
FROM users
WHERE is_test_account = true;

-- Verify test restaurants are flagged
SELECT 
  COUNT(*) as total_test_restaurants
FROM restaurants
WHERE is_test_restaurant = true;

-- Verify test campaigns are flagged
SELECT 
  COUNT(*) as total_test_campaigns
FROM campaigns
WHERE is_test_campaign = true;

-- ============================================================================
-- 17. Quick Reference: Test Account Summary
-- ============================================================================

SELECT 
  account_type,
  COUNT(*) as count,
  STRING_AGG(email, ', ' ORDER BY email) as emails
FROM users
WHERE is_test_email(email)
GROUP BY account_type
ORDER BY account_type;
