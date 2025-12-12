-- ============================================================================
-- COMPLETE TEST DATA SETUP
-- Sets up all accounts, profiles, restaurants, and campaigns for easy testing
-- 
-- Usage: Run this in Supabase SQL Editor to set up all test data at once
-- ============================================================================

DO $$
DECLARE
  -- User IDs (get from users table)
  consumer1_id UUID;
  creator1_id UUID;
  business1_id UUID;
  
  -- Profile IDs
  creator1_profile_id UUID;
  
  -- Restaurant IDs
  business1_restaurant_id UUID;
  unclaimed_restaurant_id UUID;
  
  -- Campaign IDs
  campaign1_id UUID;
  campaign2_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO consumer1_id FROM users WHERE email = 'prod-consumer1@bypass.com';
  SELECT id INTO creator1_id FROM users WHERE email = 'prod-creator1@bypass.com';
  SELECT id INTO business1_id FROM users WHERE email = 'prod-business1@bypass.com';
  
  -- ============================================================================
  -- STEP 1: Set up prod-consumer1 as a Creator (with profile and portfolio)
  -- ============================================================================
  
  IF consumer1_id IS NOT NULL THEN
    -- Upgrade account to creator
    UPDATE users
    SET account_type = 'creator',
        is_creator = true,
        account_upgraded_at = NOW()
    WHERE id = consumer1_id;
    
    -- Create creator profile
    INSERT INTO creator_profiles (
      user_id,
      display_name,
      bio,
      location,
      specialties,
      open_to_collabs,
      availability_status,
      instagram_followers,
      tiktok_followers,
      troodie_posts_count,
      troodie_likes_count,
      created_at,
      updated_at
    )
    VALUES (
      consumer1_id,
      'Demo Creator',
      'Food enthusiast and content creator. Love exploring local restaurants and sharing my food adventures!',
      'Charlotte, NC',
      ARRAY['Food Photography', 'Local Restaurants', 'Fine Dining'],
      true,
      'available',
      5000,
      3000,
      15,
      250,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      bio = EXCLUDED.bio,
      location = EXCLUDED.location,
      specialties = EXCLUDED.specialties,
      open_to_collabs = true,
      availability_status = 'available',
      updated_at = NOW();
    
    SELECT id INTO creator1_profile_id FROM creator_profiles WHERE user_id = consumer1_id;
    
    -- Add portfolio items (if profile exists and no items yet)
    IF creator1_profile_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM creator_portfolio_items WHERE creator_profile_id = creator1_profile_id
    ) THEN
      -- Note: Portfolio items require actual image URLs or storage paths
      -- These are placeholder - you may need to upload actual images
      INSERT INTO creator_portfolio_items (
        creator_profile_id,
        media_type,
        media_url,
        caption,
        display_order,
        created_at
      )
      VALUES
        (creator1_profile_id, 'image', 'https://via.placeholder.com/400x400?text=Food+Photo+1', 'Delicious pasta dish', 1, NOW()),
        (creator1_profile_id, 'image', 'https://via.placeholder.com/400x400?text=Food+Photo+2', 'Beautiful presentation', 2, NOW()),
        (creator1_profile_id, 'image', 'https://via.placeholder.com/400x400?text=Food+Photo+3', 'Local favorite', 3, NOW());
    END IF;
  END IF;
  
  -- ============================================================================
  -- STEP 2: Set up prod-creator1 (ensure it's ready)
  -- ============================================================================
  
  IF creator1_id IS NOT NULL THEN
    -- Ensure account is creator
    UPDATE users
    SET account_type = 'creator',
        is_creator = true
    WHERE id = creator1_id;
    
    -- Ensure creator profile exists
    INSERT INTO creator_profiles (
      user_id,
      display_name,
      bio,
      location,
      specialties,
      open_to_collabs,
      availability_status,
      instagram_followers,
      tiktok_followers,
      created_at,
      updated_at
    )
    SELECT
      creator1_id,
      'Prod Creator One',
      'Production test creator for internal testing.',
      'Charlotte, NC',
      ARRAY['Food Photography', 'Fine Dining', 'Local Restaurants'],
      true,
      'available',
      5000,
      3000,
      NOW(),
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM creator_profiles WHERE user_id = creator1_id)
    ON CONFLICT (user_id) DO UPDATE SET
      open_to_collabs = true,
      availability_status = 'available',
      updated_at = NOW();
  END IF;
  
  -- ============================================================================
  -- STEP 3: Set up prod-business1 with claimed restaurant
  -- ============================================================================
  
  IF business1_id IS NOT NULL THEN
    -- Ensure account is business
    UPDATE users
    SET account_type = 'business',
        is_restaurant = true
    WHERE id = business1_id;
    
    -- Find or create restaurant for business1
    SELECT r.id INTO business1_restaurant_id
    FROM restaurants r
    JOIN restaurant_claims rc ON rc.restaurant_id = r.id
    WHERE rc.user_id = business1_id AND rc.status = 'verified'
    LIMIT 1;
    
    -- If no restaurant, create one
    IF business1_restaurant_id IS NULL THEN
      INSERT INTO restaurants (
        name,
        address,
        city,
        state,
        zip_code,
        cuisine_types,
        price_range,
        description,
        is_test_restaurant,
        created_at,
        updated_at
      )
      VALUES (
        'Prod Test Restaurant 1',
        '123 Test Street',
        'Charlotte',
        'NC',
        '28202',
        ARRAY['American', 'Casual Dining'],
        '$$',
        'Production test restaurant for prod-business1. New user experience - no campaigns yet.',
        true,
        NOW(),
        NOW()
      )
      RETURNING id INTO business1_restaurant_id;
      
      -- Create restaurant claim
      INSERT INTO restaurant_claims (
        restaurant_id,
        user_id,
        email,
        status,
        verification_method,
        verified_at,
        created_at,
        updated_at
      )
      VALUES (
        business1_restaurant_id,
        business1_id,
        'prod-business1@bypass.com',
        'verified',
        'manual_review',
        NOW(),
        NOW(),
        NOW()
      );
      
      -- Mark restaurant as claimed
      UPDATE restaurants
      SET is_claimed = true,
          claimed_by = business1_id,
          is_verified = true
      WHERE id = business1_restaurant_id;
    END IF;
    
    -- Create business profile
    INSERT INTO business_profiles (
      user_id,
      restaurant_id,
      verification_status,
      claimed_at,
      created_at,
      updated_at
    )
    VALUES (
      business1_id,
      business1_restaurant_id,
      'verified',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      restaurant_id = EXCLUDED.restaurant_id,
      verification_status = 'verified',
      updated_at = NOW();
  END IF;
  
  -- ============================================================================
  -- STEP 4: Create unclaimed test restaurant for claiming tests
  -- ============================================================================
  
  -- Find or create unclaimed test restaurant
  SELECT id INTO unclaimed_restaurant_id
  FROM restaurants
  WHERE name = 'Prod Test Claiming Restaurant'
    AND is_test_restaurant = true
    AND is_claimed = false
  LIMIT 1;
  
  IF unclaimed_restaurant_id IS NULL THEN
    INSERT INTO restaurants (
      name,
      address,
      city,
      state,
      zip_code,
      cuisine_types,
      price_range,
      description,
      website,
      is_test_restaurant,
      is_claimed,
      created_at,
      updated_at
    )
    VALUES (
      'Prod Test Claiming Restaurant',
      '999 Claiming Street',
      'Charlotte',
      'NC',
      '28202',
      ARRAY['American'],
      '$$',
      'Unclaimed test restaurant for testing the claiming flow.',
      'https://claiming.test',
      true,
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO unclaimed_restaurant_id;
  END IF;
  
  -- ============================================================================
  -- STEP 5: Create active test campaigns
  -- ============================================================================
  
  IF business1_restaurant_id IS NOT NULL THEN
    -- Campaign 1: Active campaign for creators to apply to
    INSERT INTO campaigns (
      restaurant_id,
      owner_id,
      name,
      title,
      description,
      status,
      budget_cents,
      max_creators,
      start_date,
      end_date,
      created_at,
      updated_at
    )
    VALUES (
      business1_restaurant_id,
      business1_id,
      'Summer Menu Launch',
      'Summer Menu Launch',
      'Looking for food creators to showcase our new summer menu items. Focus on Instagram Reels and TikTok content. Perfect for food photographers and video creators!',
      'active',
      50000, -- $500
      3,
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '37 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO campaign1_id;
    
    -- Campaign 2: Another active campaign
    INSERT INTO campaigns (
      restaurant_id,
      owner_id,
      name,
      title,
      description,
      status,
      budget_cents,
      max_creators,
      start_date,
      end_date,
      created_at,
      updated_at
    )
    VALUES (
      business1_restaurant_id,
      business1_id,
      'Grand Opening Campaign',
      'Grand Opening Campaign',
      'Celebrating our grand opening! Need creators to help spread the word about our new location. Video content preferred.',
      'active',
      100000, -- $1000
      5,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO campaign2_id;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Test Data Setup Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Setup Summary:';
  IF consumer1_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ prod-consumer1 set up as Creator';
  END IF;
  IF creator1_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ prod-creator1 ready';
  END IF;
  IF business1_id IS NOT NULL AND business1_restaurant_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ prod-business1 has claimed restaurant';
  END IF;
  IF unclaimed_restaurant_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ Unclaimed test restaurant ready for claiming';
  END IF;
  IF campaign1_id IS NOT NULL OR campaign2_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ Active campaigns created';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for testing!';
  RAISE NOTICE '';
END $$;
