-- Migration: Allow restaurant owners to have multiple business profiles (one per restaurant)
-- Feature: multi-restaurant-claims (TRO-170)
--
-- Previously: UNIQUE(user_id) limited to one business profile per user
-- Now: UNIQUE(user_id, restaurant_id) allows one profile per user per restaurant
-- Also adds a claim limit of 10 restaurants per owner

-- 1. Drop the old unique constraint on user_id alone
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_key;

-- 2. Add new composite unique constraint (one profile per user per restaurant)
ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_user_restaurant_unique
  UNIQUE(user_id, restaurant_id);

-- 3. Add claim limit check function (max 10 restaurants per owner)
CREATE OR REPLACE FUNCTION check_restaurant_claim_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM restaurant_claims
      WHERE user_id = NEW.user_id
      AND status IN ('pending', 'verified')) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 restaurant claims per user reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Add trigger to enforce limit on new claims
DROP TRIGGER IF EXISTS enforce_claim_limit ON restaurant_claims;
CREATE TRIGGER enforce_claim_limit
  BEFORE INSERT ON restaurant_claims
  FOR EACH ROW
  EXECUTE FUNCTION check_restaurant_claim_limit();

-- 5. Update get_user_account_info to handle multiple business profiles
-- Returns the first business profile found (for backward compatibility)
-- and adds a business_profiles_count field
CREATE OR REPLACE FUNCTION get_user_account_info(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  user_info JSONB;
  creator_profile JSONB;
  business_profile JSONB;
  business_profiles_count INTEGER;
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

  -- Get first verified business profile (or first profile if none verified)
  -- Uses LIMIT 1 for backward compatibility with single-profile callers
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
  WHERE bp.user_id = user_id_param
  ORDER BY
    CASE WHEN bp.verification_status = 'verified' THEN 0 ELSE 1 END,
    bp.created_at ASC
  LIMIT 1;

  -- Count total business profiles for this user
  SELECT COUNT(*) INTO business_profiles_count
  FROM business_profiles
  WHERE user_id = user_id_param;

  -- Build result
  result := user_info;

  IF creator_profile IS NOT NULL THEN
    result := result || jsonb_build_object('creator_profile', creator_profile);
  END IF;

  IF business_profile IS NOT NULL THEN
    result := result || jsonb_build_object('business_profile', business_profile);
  END IF;

  result := result || jsonb_build_object('business_profiles_count', business_profiles_count);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
