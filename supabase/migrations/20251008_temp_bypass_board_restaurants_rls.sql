-- Temporary bypass for board_restaurants RLS during development/testing
-- IMPORTANT: Remove this in production!
-- This allows any authenticated user to add restaurants (for testing bypass user scenarios)

DROP POLICY IF EXISTS "temp_dev_allow_all_inserts" ON board_restaurants;

CREATE POLICY "temp_dev_allow_all_inserts" ON board_restaurants
  FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated
    auth.uid() IS NOT NULL
  );

COMMENT ON POLICY "temp_dev_allow_all_inserts" ON board_restaurants IS
  'TEMPORARY DEV ONLY: Allows any authenticated user to add restaurants. Remove before production deployment!';
