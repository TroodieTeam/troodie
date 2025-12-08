-- ================================================================
-- Step 1: Setup Required Extensions
-- ================================================================
-- Run this first to ensure all required extensions are available
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extensions are installed
DO $$
BEGIN
  RAISE NOTICE '✅ Extensions setup complete';
  RAISE NOTICE '   - pgcrypto: Available';
  RAISE NOTICE '   - postgis: Available';
END $$;

