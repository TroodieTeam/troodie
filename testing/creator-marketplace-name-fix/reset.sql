-- Reset Script: Creator Marketplace Name Fix
-- Date: 2026-02-09
--
-- This feature is display-only (no data changes), so no reset is needed.
-- This file is included for completeness.
--
-- If you need to test the fallback scenarios, you can temporarily clear display_name:

-- WARNING: Only run on test accounts!
-- UPDATE creator_profiles SET display_name = NULL WHERE user_id = '<test-user-id>';

-- To restore:
-- UPDATE creator_profiles SET display_name = '<original-name>' WHERE user_id = '<test-user-id>';
