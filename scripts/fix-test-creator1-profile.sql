-- ================================================================
-- Fix Missing Creator Profile for test-creator1
-- ================================================================
-- Creates a creator_profiles record for test-creator1 if it doesn't exist
-- Based on logs: user_id = 4a797077-116e-4a3a-bc43-a71ae18963d8
-- ================================================================

DO $$
DECLARE
  v_user_id UUID := '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid;
  v_user_email TEXT;
  v_user_name TEXT;
  v_profile_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Get user info
  SELECT email, name INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_user_id;
  END IF;
  
  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;
  
  -- Check if profile already exists
  SELECT EXISTS(
    SELECT 1 FROM creator_profiles WHERE user_id = v_user_id
  ) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RAISE NOTICE 'Creator profile already exists for user %', v_user_email;
    
    -- Show current profile info
    SELECT id INTO v_profile_id FROM creator_profiles WHERE user_id = v_user_id;
    RAISE NOTICE 'Profile ID: %', v_profile_id;
  ELSE
    RAISE NOTICE 'Creating creator profile for user %', v_user_email;
    
    -- Create creator profile with current schema columns
    INSERT INTO creator_profiles (
      user_id,
      display_name,
      bio,
      location,
      specialties,
      open_to_collabs,
      availability_status,
      total_followers,
      troodie_engagement_rate,
      verification_status,
      portfolio_uploaded,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      COALESCE(v_user_name, 'Foodie Lens'),
      'Professional food photographer specializing in restaurant and culinary content. 5+ years experience.',
      'Charlotte, NC',
      ARRAY['Food Photography', 'Restaurant Reviews'],
      true,
      'available',
      1000,
      5.0,
      'pending',
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_profile_id;
    
    RAISE NOTICE '✅ Created creator profile with ID: %', v_profile_id;
    
    -- Create some sample portfolio items
    INSERT INTO creator_portfolio_items (
      creator_profile_id,
      image_url,
      media_type,
      display_order,
      created_at
    )
    VALUES
      (v_profile_id, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'image', 1, NOW() - INTERVAL '5 days'),
      (v_profile_id, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'image', 2, NOW() - INTERVAL '4 days'),
      (v_profile_id, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'image', 3, NOW() - INTERVAL '3 days'),
      (v_profile_id, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', 'image', 4, NOW() - INTERVAL '2 days'),
      (v_profile_id, 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800', 'image', 5, NOW() - INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created 5 sample portfolio items';
  END IF;
  
  -- Verify the profile was created/updated
  RAISE NOTICE '';
  RAISE NOTICE '✅ Profile fix complete!';
  RAISE NOTICE 'Run the verification query below to see the profile details.';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error fixing creator profile: %', SQLERRM;
END $$;

-- ================================================================
-- Quick verification query
-- ================================================================
SELECT 
  cp.id as profile_id,
  cp.user_id,
  u.email,
  cp.display_name,
  cp.availability_status,
  cp.open_to_collabs,
  COUNT(cpi.id) as portfolio_items_count
FROM creator_profiles cp
JOIN auth.users u ON u.id = cp.user_id
LEFT JOIN creator_portfolio_items cpi ON cpi.creator_profile_id = cp.id
WHERE u.email = 'test-creator1@bypass.com'
GROUP BY cp.id, cp.user_id, u.email, cp.display_name, cp.availability_status, cp.open_to_collabs;
