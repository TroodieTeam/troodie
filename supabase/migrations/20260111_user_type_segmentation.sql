-- =============================================
-- User Type Segmentation Migration
-- Date: 2026-01-11
-- Tickets: TRO-139, TRO-143
-- Description: Add user_type field for analytics tracking of signup intent
-- =============================================

-- Add user_type for analytics tracking (immutable, captures signup intent)
-- This is separate from account_type which can change over time
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(30) 
  CHECK (user_type IN ('diner', 'content_creator', 'restaurant_admin'));

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- Add comment explaining the difference between user_type and account_type
COMMENT ON COLUMN users.user_type IS 'Immutable field capturing user signup intent for analytics. Values: diner, content_creator, restaurant_admin. Unlike account_type which can change, this preserves original signup choice.';
