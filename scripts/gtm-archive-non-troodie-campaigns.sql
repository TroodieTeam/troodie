-- ============================================================================
-- GTM: Archive Non-Troodie Campaigns
-- ============================================================================
-- Purpose: Hide all existing campaigns so only Troodie campaigns are visible
-- Run this BEFORE creating Troodie campaigns in production
-- ============================================================================
-- ⚠️ PRODUCTION SCRIPT - Run with caution
-- ============================================================================

DO $$
DECLARE
  v_team_admin_id UUID;
  v_archived_count INTEGER;
  v_active_troodie_count INTEGER;
BEGIN
  -- Get team@troodieapp.com user ID
  SELECT id INTO v_team_admin_id
  FROM users
  WHERE email = 'team@troodieapp.com';
  
  IF v_team_admin_id IS NULL THEN
    RAISE EXCEPTION 'team@troodieapp.com admin account not found. Please create it first (see docs/ADMIN_ACCOUNT_SETUP_GUIDE.md)';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GTM: ARCHIVING NON-TROODIE CAMPAIGNS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Team Admin ID: %', v_team_admin_id;
  RAISE NOTICE '';
  
  -- Count campaigns before archive
  SELECT COUNT(*) INTO v_active_troodie_count
  FROM campaigns
  WHERE owner_id = v_team_admin_id
    AND status = 'active';
  
  RAISE NOTICE 'Current Troodie campaigns: %', v_active_troodie_count;
  RAISE NOTICE '';
  
  -- Archive all campaigns NOT owned by team@troodieapp.com
  UPDATE campaigns
  SET 
    status = 'completed',  -- Change to completed (hides from active view)
    updated_at = NOW()
  WHERE owner_id != v_team_admin_id
    AND status IN ('active', 'draft', 'review');
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Archived % campaigns', v_archived_count;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ARCHIVE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Create Troodie campaigns (see GTM guide)';
  RAISE NOTICE '  2. Verify only Troodie campaigns are visible';
  RAISE NOTICE '  3. Test creator application flow';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check 1: Only Troodie campaigns should be active
SELECT 
  '1. Active Campaigns Check' as check_name,
  COUNT(*) as total_active,
  COUNT(CASE WHEN u.email = 'team@troodieapp.com' THEN 1 END) as troodie_active,
  COUNT(CASE WHEN u.email != 'team@troodieapp.com' THEN 1 END) as other_active,
  CASE 
    WHEN COUNT(CASE WHEN u.email != 'team@troodieapp.com' THEN 1 END) = 0 
    THEN '✅ PASS - Only Troodie campaigns active'
    ELSE '❌ FAIL - Other campaigns still active'
  END as status
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE c.status = 'active';

-- Check 2: Show archived campaigns (for reference)
SELECT 
  '2. Archived Campaigns' as info,
  COUNT(*) as archived_count,
  COUNT(DISTINCT u.email) as unique_owners
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE c.status = 'completed'
  AND c.updated_at >= CURRENT_DATE - INTERVAL '1 day'
  AND u.email != 'team@troodieapp.com';

-- Check 3: Show active Troodie campaigns
SELECT 
  '3. Active Troodie Campaigns' as info,
  c.title,
  c.status,
  c.payment_status,
  c.budget_cents / 100.0 as budget_dollars,
  c.max_creators,
  c.start_date,
  c.end_date
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'team@troodieapp.com'
  AND c.status = 'active'
ORDER BY c.budget_cents DESC;
