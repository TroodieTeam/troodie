-- ============================================================================
-- Fix Admin RLS Policies for Notifications Table
-- ============================================================================
-- This migration ensures admins can create notifications when approving claims
-- ============================================================================

-- Admin user IDs (from adminReviewService.ts)
-- 'b08d9600-358d-4be9-9552-4607d9f50227'
-- '31744191-f7c0-44a4-8673-10b34ccbb87f'

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

-- Create admin policy for INSERT (for sending notifications when approving claims)
-- Admins can create notifications for any user (user_id can be different from auth.uid())
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin is creating the notification (auth.uid() is admin)
    (
      auth.uid() IN (
        'b08d9600-358d-4be9-9552-4607d9f50227'::uuid,
        '31744191-f7c0-44a4-8673-10b34ccbb87f'::uuid
      )
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND (account_type = 'admin' OR is_verified = true)
      )
    )
    -- The notification can be for any user (user_id doesn't need to match auth.uid())
  );

-- Add comment
COMMENT ON POLICY "Admins can create notifications" ON notifications IS 
  'Allows admins (by UUID or account_type) to create notifications when approving claims/applications';
