-- ============================================================================
-- Identify Admin Accounts
-- ============================================================================
-- Query to identify admin accounts that can approve restaurant claims
-- ============================================================================

-- Admin User IDs (from adminReviewService.ts)
-- 'b08d9600-358d-4be9-9552-4607d9f50227'
-- '31744191-f7c0-44a4-8673-10b34ccbb87f'

SELECT 
  u.id,
  u.email,
  u.name,
  u.account_type,
  u.role,
  u.is_verified,
  u.created_at,
  CASE 
    WHEN u.id = 'b08d9600-358d-4be9-9552-4607d9f50227' THEN 'Admin 1'
    WHEN u.id = '31744191-f7c0-44a4-8673-10b34ccbb87f' THEN 'Admin 2'
    ELSE 'Not Admin'
  END as admin_label
FROM users u
WHERE u.id IN (
  'b08d9600-358d-4be9-9552-4607d9f50227',
  '31744191-f7c0-44a4-8673-10b34ccbb87f'
)
ORDER BY u.email;

-- Expected Results:
-- Should return 2 rows with admin account details
-- If no results, these accounts may not exist in production yet
