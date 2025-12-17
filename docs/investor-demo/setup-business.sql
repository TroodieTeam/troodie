-- ============================================================================
-- SETUP: Set up prod-business1 with Restaurant
-- 
-- Usage: Run this to set up prod-business1 with a claimed restaurant
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_restaurant_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'prod-business1@bypass.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Upgrade account
    UPDATE users
    SET account_type = 'business',
        is_restaurant = true
    WHERE id = v_user_id;
    
    -- Find or create restaurant
    SELECT r.id INTO v_restaurant_id
    FROM restaurants r
    JOIN restaurant_claims rc ON rc.restaurant_id = r.id
    WHERE rc.user_id = v_user_id AND rc.status = 'verified'
    LIMIT 1;
    
    IF v_restaurant_id IS NULL THEN
      INSERT INTO restaurants (
        name, address, city, state, zip_code,
        cuisine_types, price_range, description, is_test_restaurant,
        is_claimed, claimed_by, is_verified,
        created_at, updated_at
      )
      VALUES (
        'Prod Test Restaurant 1',
        '123 Test Street',
        'Charlotte',
        'NC',
        '28202',
        ARRAY['American'],
        '$$',
        'Production test restaurant for prod-business1. New user experience - no campaigns yet.',
        true,
        true,
        v_user_id,
        true,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_restaurant_id;
      
      -- Create claim
      INSERT INTO restaurant_claims (
        restaurant_id, user_id, email, status,
        verification_method, verified_at,
        created_at, updated_at
      )
      VALUES (
        v_restaurant_id, v_user_id, 'prod-business1@bypass.com',
        'verified', 'manual_review', NOW(),
        NOW(), NOW()
      );
    END IF;
    
    -- Create business profile
    INSERT INTO business_profiles (
      user_id, restaurant_id, verification_status, claimed_at,
      created_at, updated_at
    )
    VALUES (
      v_user_id, v_restaurant_id, 'verified', NOW(),
      NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      restaurant_id = EXCLUDED.restaurant_id,
      updated_at = NOW();
    
    RAISE NOTICE '✅ prod-business1 set up with restaurant: %', v_restaurant_id;
  ELSE
    RAISE NOTICE '❌ prod-business1@bypass.com not found';
  END IF;
END $$;

