-- Verification Queries: Campaign Acceptance RLS Fix
-- Run these to confirm the RLS policies are correctly deployed
-- Date: 2026-02-09

-- 1. Verify admin policies exist on campaign_applications with role-based pattern
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'campaign_applications'
AND policyname LIKE '%Admin%';

-- Expected: "Admins can update any application" (UPDATE) and "Admins can view any application" (SELECT)
-- Both should reference users.role = 'admin', NOT hardcoded UUIDs

-- 2. Verify admin policies exist on campaign_deliverables with role-based pattern
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'campaign_deliverables'
AND policyname LIKE '%Admin%';

-- Expected: "Admins can update all deliverables" (UPDATE) and "Admins can view all deliverables" (SELECT)

-- 3. Verify business owner policy no longer has OR creator_id clause
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'campaign_applications'
AND policyname LIKE '%Business owners can update%';

-- Expected: USING clause should only check owner_id = auth.uid(), NOT creator_id

-- 4. Verify admin users have role = 'admin' set
SELECT id, email, role
FROM users
WHERE role = 'admin';

-- Expected: Should include team@troodieapp.com (prod) and/or kouame@troodieapp.com (dev)

-- 5. List all policies on campaign_applications for completeness
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'campaign_applications'
ORDER BY policyname;

-- 6. List all policies on campaign_deliverables for completeness
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'campaign_deliverables'
ORDER BY policyname;
