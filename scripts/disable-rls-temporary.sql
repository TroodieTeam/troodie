-- ================================================================
-- TEMPORARY: Disable RLS for Testing
-- ================================================================
-- WARNING: Only use this for development/testing!
-- This completely disables Row Level Security
-- ================================================================

-- Disable RLS on both tables
ALTER TABLE creator_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_portfolio_items DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('creator_profiles', 'creator_portfolio_items');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RLS DISABLED FOR TESTING';
  RAISE NOTICE '';
  RAISE NOTICE 'Row Level Security has been disabled for:';
  RAISE NOTICE '• creator_profiles table';
  RAISE NOTICE '• creator_portfolio_items table';
  RAISE NOTICE '';
  RAISE NOTICE '✅ You can now complete creator onboarding without RLS errors';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: This is for testing only!';
  RAISE NOTICE 'Re-enable RLS before going to production by running:';
  RAISE NOTICE 'ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;';
  RAISE NOTICE 'ALTER TABLE creator_portfolio_items ENABLE ROW LEVEL SECURITY;';
  RAISE NOTICE '';
END $$;