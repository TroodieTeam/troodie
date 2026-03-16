-- Cleanup E2E test notifications
-- Run: node scripts/run-sql.js --dev data/test-data/dev/cleanup-notification-e2e.sql

DELETE FROM notifications
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'test-consumer1@bypass.com'
)
AND title LIKE '[E2E]%';

SELECT 'Cleaned up E2E test notifications' AS status;
