-- Content Reports Table
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('post', 'review', 'comment')),
  content_id UUID NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'harassment', 'false_information', 'other')),
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_action VARCHAR(50) CHECK (resolution_action IN ('content_removed', 'user_warned', 'user_suspended', 'user_banned', 'dismissed'))
);

-- Create indexes for performance
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_created_at ON content_reports(created_at DESC);
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);

-- User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Add terms acceptance to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT '1.0';

-- RLS Policies for content_reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON content_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Admin users can view all reports (you'll need to add admin role check)
-- For now, we'll create a placeholder that you can update with your admin logic
CREATE POLICY "Admins can view all reports" ON content_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can view their own blocks
CREATE POLICY "Users can view own blocks" ON user_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete own blocks" ON user_blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(check_blocker_id UUID, check_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = check_blocker_id 
    AND blocked_id = check_blocked_id
  );
END;
$$ LANGUAGE plpgsql;

-- Add is_admin column to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;