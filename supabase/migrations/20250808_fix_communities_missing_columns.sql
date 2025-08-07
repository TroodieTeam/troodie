-- Fix missing columns in communities table for event-based features
-- This ensures the columns exist regardless of migration order

-- Add missing columns if they don't exist
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS is_event_based BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS event_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_date DATE;

-- Ensure admin_id column exists (should already exist from 001_initial_schema.sql)
-- This is just a safety check
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id);

-- Update the RLS policy to allow users to insert communities
DROP POLICY IF EXISTS "Users can create communities" ON communities;
CREATE POLICY "Users can create communities" 
  ON communities FOR INSERT 
  WITH CHECK (auth.uid() = admin_id);

-- Grant necessary permissions
GRANT INSERT ON communities TO authenticated;
GRANT INSERT ON community_members TO authenticated;