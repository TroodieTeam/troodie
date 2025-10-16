-- ========================================
-- FINAL FIX: Remove auth.users trigger that blocks user creation
-- This trigger is causing "Database error creating new user"
-- ========================================

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop the function it calls (if it exists)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_v2() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_simple() CASCADE;

-- Verify it's gone
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'RI_%'
  AND tgname NOT LIKE 'pg_%'
  AND tgname = 'on_auth_user_created';

  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created has been removed';
    RAISE NOTICE '✅ Auth user creation should now work';
  ELSE
    RAISE WARNING '❌ Trigger still exists!';
  END IF;
END $$;

-- Note: Profile creation will now happen via ensure_user_profile() function
-- which is called after OTP verification in the app
