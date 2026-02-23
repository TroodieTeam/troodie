-- =============================================
-- Add @troodieapp.com Visibility to Test Data
-- Date: 2026-02-19
-- Description: Update current_user_is_test() to also return true for
--   @troodieapp.com emails, so internal team members can see test data.
--   We do NOT change is_test_email() — that would flag team accounts as
--   is_test_account = true and hide their content from production users.
-- =============================================

CREATE OR REPLACE FUNCTION current_user_is_test()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN is_test_email(user_email)
    OR (user_email IS NOT NULL AND LOWER(user_email) LIKE '%@troodieapp.com');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_is_test IS
'Returns true if the currently authenticated user is a test account OR an internal @troodieapp.com team member';
