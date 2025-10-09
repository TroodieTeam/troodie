-- Temporary fix for development: Allow querying notifications without auth session
-- This is needed for bypass/anonymous users during development
-- TODO: Remove this in production and require proper authentication

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- Create a more permissive policy for development
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (
  -- Allow if authenticated user matches
  auth.uid() = user_id
  -- OR allow if no auth session (bypass mode) - DEVELOPMENT ONLY
  OR auth.uid() IS NULL
);

COMMENT ON POLICY "Users can view their own notifications" ON notifications IS 'DEVELOPMENT ONLY: Allows bypass users without auth session to query notifications. Remove in production!';
