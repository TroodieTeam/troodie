-- Create achievements table
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create referral tracking tables
CREATE TABLE user_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_invite_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_referral_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_user_id)
);

-- Add RLS policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invite_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referral_conversions ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own referrals
CREATE POLICY "Users can view their own referrals"
  ON user_referrals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own invite shares
CREATE POLICY "Users can view their own invite shares"
  ON user_invite_shares FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own referral conversions
CREATE POLICY "Users can view their own referral conversions"
  ON user_referral_conversions FOR SELECT
  USING (auth.uid() = referrer_id);

-- Service role can insert achievements
CREATE POLICY "Service role can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert referrals
CREATE POLICY "Service role can insert referrals"
  ON user_referrals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert invite shares
CREATE POLICY "Service role can insert invite shares"
  ON user_invite_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert referral conversions
CREATE POLICY "Service role can insert referral conversions"
  ON user_referral_conversions FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- Add restaurant review count column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'review_count') 
  THEN
    ALTER TABLE restaurants ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;
END $$; 