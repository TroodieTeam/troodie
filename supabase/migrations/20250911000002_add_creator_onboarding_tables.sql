-- ================================================================
-- Creator Onboarding and Portfolio Tables
-- ================================================================
-- This migration adds tables for the simplified creator onboarding flow
-- and restaurant claiming system for the MVP
-- ================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- Creator Portfolio Items Table
-- ================================================================
-- Stores portfolio images uploaded by creators during onboarding
CREATE TABLE IF NOT EXISTS creator_portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  restaurant_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- Restaurant Claims Table (Simplified for MVP)
-- ================================================================
-- Tracks restaurant claiming attempts and verification status
CREATE TABLE IF NOT EXISTS restaurant_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  verification_method VARCHAR(50) CHECK (verification_method IN ('domain_match', 'email_code', 'manual_review')),
  verification_code VARCHAR(6),
  code_expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Only one verified claim per restaurant
  CONSTRAINT unique_verified_claim UNIQUE (restaurant_id, status) 
    DEFERRABLE INITIALLY DEFERRED,
  
  -- User can only have one active claim per restaurant
  CONSTRAINT unique_user_restaurant_claim UNIQUE (restaurant_id, user_id)
);

-- ================================================================
-- Creator Onboarding Progress Table
-- ================================================================
-- Tracks onboarding progress for analytics and recovery
CREATE TABLE IF NOT EXISTS creator_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 3,
  step_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  abandoned_at TIMESTAMP WITH TIME ZONE,
  completion_source VARCHAR(50) DEFAULT 'app' CHECK (completion_source IN ('app', 'web', 'admin'))
);

-- ================================================================
-- Add columns to creator_profiles if they don't exist
-- ================================================================
DO $$ 
BEGIN
  -- Add display_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'creator_profiles' 
                AND column_name = 'display_name') THEN
    ALTER TABLE creator_profiles ADD COLUMN display_name VARCHAR(100);
  END IF;
  
  -- Add location column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'creator_profiles' 
                AND column_name = 'location') THEN
    ALTER TABLE creator_profiles ADD COLUMN location VARCHAR(255);
  END IF;
  
  -- Add food_specialties column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'creator_profiles' 
                AND column_name = 'food_specialties') THEN
    ALTER TABLE creator_profiles ADD COLUMN food_specialties TEXT[] DEFAULT '{}';
  END IF;
  
  -- Add portfolio_uploaded column to track if user has uploaded portfolio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'creator_profiles' 
                AND column_name = 'portfolio_uploaded') THEN
    ALTER TABLE creator_profiles ADD COLUMN portfolio_uploaded BOOLEAN DEFAULT false;
  END IF;
  
  -- Add instant_approved column for MVP (all creators instantly approved)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'creator_profiles' 
                AND column_name = 'instant_approved') THEN
    ALTER TABLE creator_profiles ADD COLUMN instant_approved BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ================================================================
-- Add columns to business_profiles if they don't exist
-- ================================================================
DO $$ 
BEGIN
  -- Add business_email column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'business_profiles' 
                AND column_name = 'business_email') THEN
    ALTER TABLE business_profiles ADD COLUMN business_email VARCHAR(255);
  END IF;
  
  -- Add business_role column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'business_profiles' 
                AND column_name = 'business_role') THEN
    ALTER TABLE business_profiles ADD COLUMN business_role VARCHAR(100);
  END IF;
  
  -- Add verification_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'business_profiles' 
                AND column_name = 'verification_method') THEN
    ALTER TABLE business_profiles ADD COLUMN verification_method VARCHAR(50);
  END IF;
END $$;

-- ================================================================
-- Indexes for Performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_portfolio_creator ON creator_portfolio_items(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_order ON creator_portfolio_items(creator_profile_id, display_order);
CREATE INDEX IF NOT EXISTS idx_claims_restaurant_status ON restaurant_claims(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_user ON restaurant_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_code ON restaurant_claims(verification_code, code_expires_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON creator_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_specialties ON creator_profiles USING GIN(food_specialties);

-- ================================================================
-- Functions
-- ================================================================

-- Function to enforce max portfolio items limit
CREATE OR REPLACE FUNCTION check_max_portfolio_items()
RETURNS TRIGGER AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Count existing portfolio items for this creator
  SELECT COUNT(*) INTO item_count
  FROM creator_portfolio_items
  WHERE creator_profile_id = NEW.creator_profile_id;
  
  -- Check if adding this item would exceed the limit
  IF item_count >= 10 THEN
    RAISE EXCEPTION 'Maximum portfolio items limit (10) reached for this creator';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce portfolio items limit
DROP TRIGGER IF EXISTS enforce_max_portfolio_items ON creator_portfolio_items;
CREATE TRIGGER enforce_max_portfolio_items
  BEFORE INSERT ON creator_portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION check_max_portfolio_items();

-- Function to complete creator onboarding
CREATE OR REPLACE FUNCTION complete_creator_onboarding(
  p_user_id UUID,
  p_display_name VARCHAR(100),
  p_bio TEXT,
  p_location VARCHAR(255),
  p_food_specialties TEXT[]
) RETURNS BOOLEAN AS $$
DECLARE
  v_creator_profile_id UUID;
BEGIN
  -- Start transaction
  
  -- Check if user already has a creator profile
  SELECT id INTO v_creator_profile_id
  FROM creator_profiles
  WHERE user_id = p_user_id;
  
  IF v_creator_profile_id IS NULL THEN
    -- Create new creator profile
    INSERT INTO creator_profiles (
      user_id,
      display_name,
      bio,
      location,
      food_specialties,
      specialties,
      verification_status,
      instant_approved
    ) VALUES (
      p_user_id,
      p_display_name,
      p_bio,
      p_location,
      p_food_specialties,
      p_food_specialties, -- Also store in specialties for compatibility
      'verified', -- Instant approval for MVP
      true
    );
  ELSE
    -- Update existing profile
    UPDATE creator_profiles
    SET 
      display_name = p_display_name,
      bio = p_bio,
      location = p_location,
      food_specialties = p_food_specialties,
      specialties = p_food_specialties,
      verification_status = 'verified',
      instant_approved = true,
      updated_at = NOW()
    WHERE id = v_creator_profile_id;
  END IF;
  
  -- Update user account type to creator
  UPDATE users
  SET 
    account_type = 'creator',
    is_creator = true,
    account_upgraded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Mark onboarding as complete
  UPDATE creator_onboarding_progress
  SET 
    completed_at = NOW(),
    current_step = total_steps
  WHERE user_id = p_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and rollback
    RAISE NOTICE 'Error in complete_creator_onboarding: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify restaurant claim with domain matching
CREATE OR REPLACE FUNCTION verify_restaurant_claim(
  p_restaurant_id UUID,
  p_user_id UUID,
  p_email VARCHAR(255),
  p_restaurant_website TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_email_domain VARCHAR(255);
  v_website_domain VARCHAR(255);
  v_verification_code VARCHAR(6);
  v_result JSONB;
BEGIN
  -- Extract domain from email
  v_email_domain := LOWER(SPLIT_PART(p_email, '@', 2));
  
  -- If restaurant website provided, check for domain match
  IF p_restaurant_website IS NOT NULL AND p_restaurant_website != '' THEN
    -- Extract domain from website URL
    v_website_domain := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(p_restaurant_website, '^https?://', ''),
        '^www\.', ''
      )
    );
    v_website_domain := SPLIT_PART(v_website_domain, '/', 1);
    
    -- Check if domains match (instant verification)
    IF v_email_domain = v_website_domain OR 
       v_email_domain = REGEXP_REPLACE(v_website_domain, '^www\.', '') THEN
      
      -- Create verified claim
      INSERT INTO restaurant_claims (
        restaurant_id,
        user_id,
        email,
        verification_method,
        status,
        verified_at
      ) VALUES (
        p_restaurant_id,
        p_user_id,
        p_email,
        'domain_match',
        'verified',
        NOW()
      );
      
      -- Update user to business account
      PERFORM upgrade_user_to_business(p_user_id, p_restaurant_id);
      
      RETURN jsonb_build_object(
        'success', true,
        'method', 'instant',
        'message', 'Verified! Your email domain matches the restaurant website.'
      );
    END IF;
  END IF;
  
  -- Generate verification code for email verification
  v_verification_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Create pending claim with verification code
  INSERT INTO restaurant_claims (
    restaurant_id,
    user_id,
    email,
    verification_method,
    verification_code,
    code_expires_at,
    status
  ) VALUES (
    p_restaurant_id,
    p_user_id,
    p_email,
    'email_code',
    v_verification_code,
    NOW() + INTERVAL '10 minutes',
    'pending'
  )
  ON CONFLICT (restaurant_id, user_id) 
  DO UPDATE SET
    email = p_email,
    verification_code = v_verification_code,
    code_expires_at = NOW() + INTERVAL '10 minutes',
    status = 'pending',
    updated_at = NOW();
  
  -- Return code for email sending (would be sent via email service)
  RETURN jsonb_build_object(
    'success', true,
    'method', 'email_code',
    'message', 'Verification code sent to your email',
    'code', v_verification_code -- Remove in production, only for testing
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify email code for restaurant claim
CREATE OR REPLACE FUNCTION verify_claim_code(
  p_restaurant_id UUID,
  p_user_id UUID,
  p_code VARCHAR(6)
) RETURNS JSONB AS $$
DECLARE
  v_claim RECORD;
BEGIN
  -- Find valid claim with matching code
  SELECT * INTO v_claim
  FROM restaurant_claims
  WHERE restaurant_id = p_restaurant_id
    AND user_id = p_user_id
    AND verification_code = p_code
    AND code_expires_at > NOW()
    AND status = 'pending';
  
  IF v_claim IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification code'
    );
  END IF;
  
  -- Mark claim as verified
  UPDATE restaurant_claims
  SET 
    status = 'verified',
    verified_at = NOW(),
    updated_at = NOW()
  WHERE id = v_claim.id;
  
  -- Upgrade user to business account
  PERFORM upgrade_user_to_business(p_user_id, p_restaurant_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Restaurant successfully claimed!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upgrade user to business account
CREATE OR REPLACE FUNCTION upgrade_user_to_business(
  p_user_id UUID,
  p_restaurant_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Create business profile if it doesn't exist
  INSERT INTO business_profiles (
    user_id,
    restaurant_id,
    verification_status,
    claimed_at
  ) VALUES (
    p_user_id,
    p_restaurant_id,
    'verified',
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    restaurant_id = p_restaurant_id,
    verification_status = 'verified',
    updated_at = NOW();
  
  -- Update user account type to business
  UPDATE users
  SET 
    account_type = 'business',
    is_restaurant = true,
    account_upgraded_at = COALESCE(account_upgraded_at, NOW()),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Mark restaurant as claimed
  UPDATE restaurants
  SET 
    is_claimed = true,
    owner_id = p_user_id,
    is_verified = true,
    updated_at = NOW()
  WHERE id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- Row Level Security Policies
-- ================================================================

-- Portfolio items policies
ALTER TABLE creator_portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio items are viewable by everyone"
  ON creator_portfolio_items FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own portfolio items"
  ON creator_portfolio_items FOR ALL
  USING (
    creator_profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Restaurant claims policies
ALTER TABLE restaurant_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims"
  ON restaurant_claims FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create claims"
  ON restaurant_claims FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending claims"
  ON restaurant_claims FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

-- Onboarding progress policies
ALTER TABLE creator_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own onboarding progress"
  ON creator_onboarding_progress FOR ALL
  USING (user_id = auth.uid());

-- ================================================================
-- Grants
-- ================================================================
GRANT EXECUTE ON FUNCTION complete_creator_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION verify_restaurant_claim TO authenticated;
GRANT EXECUTE ON FUNCTION verify_claim_code TO authenticated;