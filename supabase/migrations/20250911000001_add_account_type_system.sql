-- Migration: Add Account Type System
-- Date: 2025-09-11
-- Purpose: Implement account type system for Creator Marketplace

-- Add account type fields to users table
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'consumer' CHECK (account_type IN ('consumer', 'creator', 'business'));
ALTER TABLE users ADD COLUMN account_status VARCHAR(30) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification'));
ALTER TABLE users ADD COLUMN account_upgraded_at TIMESTAMP;

-- Create creator_profiles table
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create business_profiles table  
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  claimed_at TIMESTAMP DEFAULT NOW(),
  management_permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_verification ON creator_profiles(verification_status);
CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX idx_business_profiles_restaurant ON business_profiles(restaurant_id);
CREATE INDEX idx_business_profiles_verification ON business_profiles(verification_status);

-- Create function to upgrade user account type
CREATE OR REPLACE FUNCTION upgrade_user_account(
  user_id_param UUID,
  new_account_type TEXT,
  profile_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  current_account_type TEXT;
  result JSONB := '{"success": false}'::JSONB;
BEGIN
  -- Get current account type
  SELECT account_type INTO current_account_type 
  FROM users 
  WHERE id = user_id_param;
  
  IF current_account_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate upgrade path (no downgrades allowed)
  IF (current_account_type = 'creator' AND new_account_type = 'consumer') OR
     (current_account_type = 'business' AND new_account_type IN ('consumer', 'creator')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account type downgrade not allowed');
  END IF;
  
  -- Update user account type
  UPDATE users 
  SET 
    account_type = new_account_type,
    account_upgraded_at = NOW(),
    -- Update legacy flags for backward compatibility
    is_creator = CASE WHEN new_account_type IN ('creator', 'business') THEN TRUE ELSE is_creator END,
    is_restaurant = CASE WHEN new_account_type = 'business' THEN TRUE ELSE is_restaurant END,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  -- Create appropriate profile based on account type
  IF new_account_type = 'creator' THEN
    INSERT INTO creator_profiles (user_id, bio, specialties, social_links)
    VALUES (
      user_id_param,
      COALESCE(profile_data->>'bio', ''),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(profile_data->'specialties')), 
        '{}'::TEXT[]
      ),
      COALESCE(profile_data->'social_links', '{}'::JSONB)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      bio = EXCLUDED.bio,
      specialties = EXCLUDED.specialties,
      social_links = EXCLUDED.social_links,
      updated_at = NOW();
      
  ELSIF new_account_type = 'business' THEN
    -- Business profile creation requires restaurant_id in profile_data
    IF profile_data->>'restaurant_id' IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Restaurant ID required for business accounts');
    END IF;
    
    INSERT INTO business_profiles (user_id, restaurant_id, management_permissions)
    VALUES (
      user_id_param,
      (profile_data->>'restaurant_id')::UUID,
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(profile_data->'management_permissions')), 
        '{}'::TEXT[]
      )
    )
    ON CONFLICT (user_id) DO UPDATE SET
      restaurant_id = EXCLUDED.restaurant_id,
      management_permissions = EXCLUDED.management_permissions,
      updated_at = NOW();
      
    -- Mark restaurant as claimed
    UPDATE restaurants 
    SET 
      is_claimed = TRUE,
      owner_id = user_id_param,
      updated_at = NOW()
    WHERE id = (profile_data->>'restaurant_id')::UUID;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'previous_type', current_account_type,
    'new_type', new_account_type,
    'upgraded_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user account info with profiles
CREATE OR REPLACE FUNCTION get_user_account_info(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  user_info JSONB;
  creator_profile JSONB;
  business_profile JSONB;
  result JSONB;
BEGIN
  -- Get user basic info
  SELECT to_jsonb(users.*) INTO user_info
  FROM users 
  WHERE id = user_id_param;
  
  IF user_info IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Get creator profile if exists
  SELECT to_jsonb(creator_profiles.*) INTO creator_profile
  FROM creator_profiles
  WHERE user_id = user_id_param;
  
  -- Get business profile if exists
  SELECT jsonb_build_object(
    'id', bp.id,
    'user_id', bp.user_id,
    'restaurant_id', bp.restaurant_id,
    'restaurant_name', r.name,
    'restaurant_address', r.address,
    'verification_status', bp.verification_status,
    'claimed_at', bp.claimed_at,
    'management_permissions', bp.management_permissions,
    'created_at', bp.created_at,
    'updated_at', bp.updated_at
  ) INTO business_profile
  FROM business_profiles bp
  LEFT JOIN restaurants r ON bp.restaurant_id = r.id
  WHERE bp.user_id = user_id_param;
  
  -- Build result
  result := user_info;
  
  IF creator_profile IS NOT NULL THEN
    result := result || jsonb_build_object('creator_profile', creator_profile);
  END IF;
  
  IF business_profile IS NOT NULL THEN
    result := result || jsonb_build_object('business_profile', business_profile);
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Creator profiles policies
CREATE POLICY "Users can view their own creator profile" ON creator_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own creator profile" ON creator_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own creator profile" ON creator_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view verified creator profiles" ON creator_profiles
  FOR SELECT USING (verification_status = 'verified');

-- Business profiles policies  
CREATE POLICY "Users can view their own business profile" ON business_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile" ON business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile" ON business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Set default account type for existing users
UPDATE users 
SET account_type = 'consumer'
WHERE account_type IS NULL;

-- Update account types based on existing flags for data consistency
UPDATE users 
SET 
  account_type = CASE 
    WHEN is_restaurant = TRUE THEN 'business'
    WHEN is_creator = TRUE THEN 'creator' 
    ELSE 'consumer'
  END,
  account_upgraded_at = CASE 
    WHEN is_restaurant = TRUE OR is_creator = TRUE THEN created_at
    ELSE NULL
  END
WHERE account_type = 'consumer' AND (is_restaurant = TRUE OR is_creator = TRUE);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creator_profiles_updated_at
  BEFORE UPDATE ON creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();