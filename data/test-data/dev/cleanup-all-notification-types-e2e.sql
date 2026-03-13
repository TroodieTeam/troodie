-- Cleanup all-notification-types E2E test data
-- Run: node scripts/run-sql.js --dev data/test-data/dev/cleanup-all-notification-types-e2e.sql

DELETE FROM notifications
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'test-consumer1@bypass.com'
)
AND title LIKE '[E2E-ALL]%';

SELECT 'Cleaned up E2E-ALL test notifications' AS status;
