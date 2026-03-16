-- Cleanup swipe-to-delete E2E test notifications
-- Run: node scripts/run-sql.js --dev data/test-data/dev/cleanup-swipe-delete-e2e.sql

DELETE FROM notifications
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'test-consumer1@bypass.com'
)
AND title LIKE '[E2E-SWIPE]%';

SELECT 'Cleaned up swipe-delete E2E test notifications' AS status;
