-- Create user_referrals table for storing referral codes
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_referral UNIQUE(user_id, referral_code)
);

-- Create user_invite_shares table for tracking invite shares
CREATE TABLE IF NOT EXISTS user_invite_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_referral_conversions table for tracking successful referrals
CREATE TABLE IF NOT EXISTS user_referral_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_referral_conversion UNIQUE(referrer_id, referred_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_referrals_user_id ON user_referrals(user_id);
CREATE INDEX idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX idx_user_invite_shares_user_id ON user_invite_shares(user_id);
CREATE INDEX idx_user_referral_conversions_referrer ON user_referral_conversions(referrer_id);

-- Enable Row Level Security
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invite_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referral_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_referrals
CREATE POLICY "Users can view their own referrals" ON user_referrals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referrals" ON user_referrals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_invite_shares
CREATE POLICY "Users can view their own invite shares" ON user_invite_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invite shares" ON user_invite_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_referral_conversions
CREATE POLICY "Users can view their referrals" ON user_referral_conversions
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "System can create referral conversions" ON user_referral_conversions
  FOR INSERT WITH CHECK (true); -- Will be restricted by service role