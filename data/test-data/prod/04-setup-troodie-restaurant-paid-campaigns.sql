-- ============================================================================
-- TROODIE RESTAURANT - PAID OPPORTUNITIES SETUP
-- ============================================================================
-- Purpose: Create paid campaigns at "Troodie Restaurant" for creators to apply
-- Run this in Supabase SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_troodie_restaurant_id UUID;
  v_troodie_owner_id UUID;
  v_business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1
  v_campaign1_id UUID;
  v_campaign2_id UUID;
  v_campaign3_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SETTING UP TROODIE RESTAURANT CAMPAIGNS';
  RAISE NOTICE '========================================';

  -- ============================================================================
  -- STEP 1: Find or Create Troodie Restaurant
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 1: Looking for Troodie Restaurant...';

  -- First, check if Troodie Restaurant exists
  SELECT id, 
         (SELECT user_id FROM business_profiles WHERE restaurant_id = restaurants.id LIMIT 1)
  INTO v_troodie_restaurant_id, v_troodie_owner_id
  FROM restaurants
  WHERE name ILIKE '%troodie%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_troodie_restaurant_id IS NULL THEN
    RAISE NOTICE '   ⚠️ No Troodie Restaurant found. Creating one...';
    
    -- Create Troodie Restaurant
    INSERT INTO restaurants (
      name,
      address,
      city,
      state,
      zip_code,
      phone,
      cuisine_type,
      description,
      price_range,
      rating,
      latitude,
      longitude,
      created_at,
      updated_at
    )
    VALUES (
      'Troodie Restaurant',
      '123 Main Street',
      'Charlotte',
      'NC',
      '28202',
      '(704) 555-0123',
      'American',
      'The official Troodie Restaurant - where creators and food lovers connect. Great food, great content, great community.',
      '$$',
      4.8,
      35.2271,
      -80.8431,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_troodie_restaurant_id;
    
    RAISE NOTICE '   ✅ Created Troodie Restaurant';
    
    -- Create business profile for prod-business1 to own it
    INSERT INTO business_profiles (
      user_id,
      restaurant_id,
      business_name,
      verified,
      verification_status,
      created_at,
      updated_at
    )
    VALUES (
      v_business1_id,
      v_troodie_restaurant_id,
      'Troodie Restaurant',
      true,
      'verified',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      restaurant_id = v_troodie_restaurant_id,
      business_name = 'Troodie Restaurant',
      verified = true,
      verification_status = 'verified',
      updated_at = NOW();
    
    v_troodie_owner_id := v_business1_id;
    
    -- Create restaurant claim
    INSERT INTO restaurant_claims (
      user_id,
      restaurant_id,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_business1_id,
      v_troodie_restaurant_id,
      'approved',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '   ✅ Assigned to prod-business1@bypass.com';
  ELSE
    RAISE NOTICE '   ✅ Found existing Troodie Restaurant: %', v_troodie_restaurant_id;
    
    -- If no owner, assign to prod-business1
    IF v_troodie_owner_id IS NULL THEN
      INSERT INTO business_profiles (
        user_id,
        restaurant_id,
        business_name,
        verified,
        verification_status,
        created_at,
        updated_at
      )
      VALUES (
        v_business1_id,
        v_troodie_restaurant_id,
        'Troodie Restaurant',
        true,
        'verified',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        restaurant_id = v_troodie_restaurant_id,
        business_name = 'Troodie Restaurant',
        verified = true,
        verification_status = 'verified',
        updated_at = NOW();
      
      v_troodie_owner_id := v_business1_id;
      
      RAISE NOTICE '   ✅ Assigned ownership to prod-business1@bypass.com';
    ELSE
      RAISE NOTICE '   ✅ Already owned by user: %', v_troodie_owner_id;
    END IF;
  END IF;

  -- Use the actual owner (or prod-business1 if we created it)
  IF v_troodie_owner_id IS NULL THEN
    v_troodie_owner_id := v_business1_id;
  END IF;

  -- ============================================================================
  -- STEP 2: Create Paid Campaigns
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '📢 Step 2: Creating Paid Opportunity Campaigns...';

  -- Campaign 1: Featured Creator Partnership ($500)
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    payment_status,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    requirements,
    target_audience,
    content_types,
    created_at,
    updated_at
  )
  VALUES (
    v_troodie_restaurant_id,
    v_troodie_owner_id,
    'Featured Creator Partnership',
    'Featured Creator Partnership 🎬',
    E'Looking for 2-3 talented food creators to become featured partners at Troodie Restaurant!\n\n💰 PAID OPPORTUNITY - $250 per creator\n\nWhat we need:\n• 1 Instagram Reel (30-60 seconds)\n• 1 TikTok video\n• Stories coverage of your visit\n\nRequirements:\n• 5,000+ followers on Instagram or TikTok\n• Food content focus\n• Based in or willing to visit Charlotte, NC\n\nPerks:\n• Full meal for 2 comped\n• Featured on our socials\n• Potential for ongoing partnership',
    'active',
    'paid',
    50000, -- $500 total
    2,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    ARRAY['Visit during business hours', 'Tag @troodieapp in all content', 'Post within 7 days of visit'],
    'Food enthusiasts, local foodies, Charlotte community',
    ARRAY['Reels', 'TikTok', 'Stories'],
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign1_id;

  IF v_campaign1_id IS NOT NULL THEN
    RAISE NOTICE '   ✅ Created: Featured Creator Partnership ($500)';
  ELSE
    RAISE NOTICE '   ⚠️ Featured Creator Partnership already exists';
  END IF;

  -- Campaign 2: Menu Launch Content Creator ($300)
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    payment_status,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    requirements,
    target_audience,
    content_types,
    created_at,
    updated_at
  )
  VALUES (
    v_troodie_restaurant_id,
    v_troodie_owner_id,
    'New Menu Launch',
    'New Menu Launch - Content Creators Wanted 🍽️',
    E'We''re launching our NEW seasonal menu and need creators to help spread the word!\n\n💵 $300 PAID OPPORTUNITY\n\nDeliverables:\n• 1 high-quality Instagram post (carousel preferred)\n• 1 Reel featuring at least 3 new menu items\n• Behind-the-scenes Stories\n\nIdeal Creator:\n• Food photography skills\n• Engaging storytelling\n• Authentic voice\n\nThis is a great opportunity to build your portfolio while getting paid!',
    'active',
    'paid',
    30000, -- $300
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '21 days',
    ARRAY['Must try at least 3 new menu items', 'Include pricing info in caption', 'Tag @troodieapp'],
    'Local food lovers, Instagram food community',
    ARRAY['Post', 'Reel', 'Stories'],
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign2_id;

  IF v_campaign2_id IS NOT NULL THEN
    RAISE NOTICE '   ✅ Created: New Menu Launch ($300)';
  ELSE
    RAISE NOTICE '   ⚠️ New Menu Launch already exists';
  END IF;

  -- Campaign 3: UGC Video Creator ($400)
  INSERT INTO campaigns (
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    payment_status,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    requirements,
    target_audience,
    content_types,
    created_at,
    updated_at
  )
  VALUES (
    v_troodie_restaurant_id,
    v_troodie_owner_id,
    'UGC Video Creator',
    'UGC Video Creator - Paid Partnership 🎥',
    E'Seeking a skilled UGC creator for professional-quality video content!\n\n💰 $400 FLAT RATE\n\nWhat we''re looking for:\n• 2-3 short-form videos (15-30 seconds each)\n• Can be used for our ads and socials\n• Professional quality with good lighting and audio\n\nRequirements:\n• Experience creating UGC content\n• Portfolio showing previous work\n• Own filming equipment\n\nBonus: If content performs well, potential for retainer agreement!',
    'active',
    'paid',
    40000, -- $400
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    ARRAY['Professional filming equipment required', 'Raw footage must be provided', 'Rights transfer included'],
    'UGC creators, videographers, content professionals',
    ARRAY['UGC Video'],
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign3_id;

  IF v_campaign3_id IS NOT NULL THEN
    RAISE NOTICE '   ✅ Created: UGC Video Creator ($400)';
  ELSE
    RAISE NOTICE '   ⚠️ UGC Video Creator already exists';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TROODIE RESTAURANT SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Troodie Restaurant ID: %', v_troodie_restaurant_id;
  RAISE NOTICE 'Owner: %', v_troodie_owner_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Active Paid Campaigns:';
  RAISE NOTICE '  1. Featured Creator Partnership - $500 (2 creators)';
  RAISE NOTICE '  2. New Menu Launch - $300 (1 creator)';
  RAISE NOTICE '  3. UGC Video Creator - $400 (1 creator)';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Available: $1,200 in paid opportunities!';
  RAISE NOTICE '';
  RAISE NOTICE 'For creators to apply:';
  RAISE NOTICE '  1. Login as prod-creator1/2/3@bypass.com (OTP: 000000)';
  RAISE NOTICE '  2. Navigate to Discover/Marketplace';
  RAISE NOTICE '  3. Search for "Troodie" or browse active campaigns';
  RAISE NOTICE '  4. Click "Apply Now" on any campaign';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  'Troodie Restaurant Campaigns' as info,
  r.name as restaurant_name,
  c.title as campaign_title,
  c.status,
  c.payment_status,
  c.budget_cents / 100.0 as budget_dollars,
  c.max_creators,
  c.start_date,
  c.end_date
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.name ILIKE '%troodie%'
  AND c.status = 'active'
ORDER BY c.budget_cents DESC;

-- Check applications to Troodie campaigns
SELECT 
  'Current Applications' as info,
  u.email as creator_email,
  ca.status as application_status,
  c.title as campaign_title,
  ca.proposed_rate_cents / 100.0 as proposed_rate
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN campaigns c ON ca.campaign_id = c.id
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.name ILIKE '%troodie%'
ORDER BY ca.applied_at DESC;
