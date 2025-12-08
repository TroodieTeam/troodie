-- Create 3 Active Campaigns for test-business1@bypass.com
-- This script creates 3 active campaigns and accepts applications from test-creator1@bypass.com
-- These campaigns will show in test-creator1's "Active" tab for testing CM-4 (Deliverable URL Validation)

DO $$
DECLARE
  v_business_user_id UUID;
  v_business_profile_id UUID;
  v_restaurant_id UUID;
  v_creator_user_id UUID;
  v_creator_profile_id UUID;
  v_campaign1_id UUID := gen_random_uuid();
  v_campaign2_id UUID := gen_random_uuid();
  v_campaign3_id UUID := gen_random_uuid();
  v_application1_id UUID;
  v_application2_id UUID;
  v_application3_id UUID;
BEGIN
  -- Find test-business1 user
  SELECT id INTO v_business_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_business_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Found business user ID: %', v_business_user_id;

  -- Get business profile to find restaurant
  SELECT id, restaurant_id INTO v_business_profile_id, v_restaurant_id
  FROM public.business_profiles
  WHERE user_id = v_business_user_id
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'No restaurant found for test-business1. Please claim a restaurant first.';
  END IF;

  RAISE NOTICE 'Found restaurant ID: %', v_restaurant_id;

  -- Find test-creator1 user and profile for accepted applications
  SELECT id INTO v_creator_user_id
  FROM public.users
  WHERE email = 'test-creator1@bypass.com';

  IF v_creator_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator1@bypass.com not found';
  END IF;

  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_creator_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for test-creator1@bypass.com';
  END IF;

  RAISE NOTICE 'Found creator profile ID: %', v_creator_profile_id;

  -- Campaign 1: Summer Menu Launch
  INSERT INTO public.campaigns (
    id,
    restaurant_id,
    owner_id,
    title,
    description,
    status,
    budget,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    deadline,
    requirements,
    deliverable_requirements,
    campaign_type,
    created_at,
    updated_at
  ) VALUES (
    v_campaign1_id,
    v_restaurant_id,
    v_business_user_id,
    'Summer Menu Launch 2025',
    'Promote our exciting new summer menu featuring fresh seasonal ingredients, new cocktails, and chef specials. We''re looking for creators to showcase the vibrant flavors and beautiful presentation of our dishes.',
    'active',
    500.00, -- $500 total budget
    50000, -- $500 in cents
    5, -- Max 5 creators
    CURRENT_DATE, -- Start today
    (CURRENT_DATE + INTERVAL '60 days')::date, -- End in 60 days
    (CURRENT_DATE + INTERVAL '30 days'), -- Application deadline in 30 days
    ARRAY[
      'Visit during dinner service (5 PM - 10 PM)',
      'Order at least 2 items from the new summer menu',
      'Include high-quality photos showcasing food presentation',
      'Mention our new cocktail pairings',
      'Tag @restauranthandle and use #SummerMenu2025'
    ],
    jsonb_build_object(
      'deliverables', ARRAY[
        '1 Instagram post with 3+ photos',
        '3 Instagram stories',
        '1 Instagram reel or TikTok video (30+ seconds)'
      ]
    ),
    'seasonal_promotion',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Campaign 1: Summer Menu Launch 2025 (ID: %)', v_campaign1_id;

  -- Campaign 2: Weekend Brunch Promotion
  INSERT INTO public.campaigns (
    id,
    restaurant_id,
    owner_id,
    title,
    description,
    status,
    budget,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    deadline,
    requirements,
    deliverable_requirements,
    campaign_type,
    created_at,
    updated_at
  ) VALUES (
    v_campaign2_id,
    v_restaurant_id,
    v_business_user_id,
    'Weekend Brunch Promotion',
    'Highlight our popular weekend brunch menu! We serve bottomless mimosas, creative brunch cocktails, and chef-inspired breakfast dishes every Saturday and Sunday. Perfect for lifestyle and food creators.',
    'active',
    750.00, -- $750 total budget
    75000, -- $750 in cents
    5, -- Max 5 creators
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '45 days')::date,
    (CURRENT_DATE + INTERVAL '20 days'),
    ARRAY[
      'Visit during brunch hours (10 AM - 3 PM Saturday or Sunday)',
      'Try our bottomless mimosa option',
      'Order at least 1 signature brunch dish',
      'Capture the weekend brunch atmosphere',
      'Tag @restauranthandle and use #WeekendBrunch'
    ],
    jsonb_build_object(
      'deliverables', ARRAY[
        '1 Instagram post with carousel (5+ photos)',
        '5 Instagram stories',
        '1 Instagram reel showcasing brunch experience'
      ]
    ),
    'promotional',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Campaign 2: Weekend Brunch Promotion (ID: %)', v_campaign2_id;

  -- Campaign 3: Date Night Special
  INSERT INTO public.campaigns (
    id,
    restaurant_id,
    owner_id,
    title,
    description,
    status,
    budget,
    budget_cents,
    max_creators,
    start_date,
    end_date,
    deadline,
    requirements,
    deliverable_requirements,
    campaign_type,
    created_at,
    updated_at
  ) VALUES (
    v_campaign3_id,
    v_restaurant_id,
    v_business_user_id,
    'Date Night Special - Romantic Dining',
    'Showcase our intimate atmosphere perfect for date nights! We offer romantic lighting, cozy seating, and a curated menu designed for couples. Looking for creators who can capture the romantic dining experience.',
    'active',
    400.00, -- $400 total budget
    40000, -- $400 in cents
    2, -- Max 2 creators (more exclusive)
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '90 days')::date,
    (CURRENT_DATE + INTERVAL '45 days'),
    ARRAY[
      'Visit during dinner service (6 PM - 10 PM)',
      'Order our Date Night Special menu (appetizer, entree, dessert)',
      'Capture the romantic ambiance and lighting',
      'Showcase our wine pairings',
      'Tag @restauranthandle and use #DateNightDining'
    ],
    jsonb_build_object(
      'deliverables', ARRAY[
        '1 high-quality Instagram post with professional photos',
        '1 Instagram reel or TikTok video (60+ seconds)',
        '3 Instagram stories showing the experience'
      ]
    ),
    'special_event',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Campaign 3: Date Night Special (ID: %)', v_campaign3_id;

  -- Create and accept applications from test-creator1@bypass.com
  -- Application 1: Summer Menu Launch
  INSERT INTO public.campaign_applications (
    campaign_id,
    creator_id,
    status,
    proposed_rate_cents,
    cover_letter,
    proposed_deliverables,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign1_id,
    v_creator_profile_id,
    'accepted',
    10000, -- $100 in cents
    'I am excited to showcase your summer menu! I have experience creating food content and love highlighting seasonal ingredients.',
    '1 Instagram post with 5 photos, 3 Instagram stories, 1 Instagram reel (60 seconds)',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days',
    v_business_user_id
  ) RETURNING id INTO v_application1_id;

  RAISE NOTICE 'Created and accepted Application 1 (ID: %)', v_application1_id;

  -- Application 2: Weekend Brunch Promotion
  INSERT INTO public.campaign_applications (
    campaign_id,
    creator_id,
    status,
    proposed_rate_cents,
    cover_letter,
    proposed_deliverables,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign2_id,
    v_creator_profile_id,
    'accepted',
    15000, -- $150 in cents
    'I specialize in brunch content and would love to showcase your bottomless mimosas and weekend atmosphere!',
    '1 Instagram carousel with 7 photos, 5 Instagram stories, 1 Instagram reel showcasing brunch experience',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '2 days',
    v_business_user_id
  ) RETURNING id INTO v_application2_id;

  RAISE NOTICE 'Created and accepted Application 2 (ID: %)', v_application2_id;

  -- Application 3: Date Night Special
  INSERT INTO public.campaign_applications (
    campaign_id,
    creator_id,
    status,
    proposed_rate_cents,
    cover_letter,
    proposed_deliverables,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign3_id,
    v_creator_profile_id,
    'accepted',
    20000, -- $200 in cents
    'I have experience creating romantic dining content and can capture the intimate atmosphere perfectly.',
    '1 high-quality Instagram post with professional photos, 1 Instagram reel (90 seconds), 3 Instagram stories',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day',
    v_business_user_id
  ) RETURNING id INTO v_application3_id;

  RAISE NOTICE 'Created and accepted Application 3 (ID: %)', v_application3_id;

  -- Update campaign selected_creators_count
  UPDATE public.campaigns
  SET selected_creators_count = 1,
      updated_at = NOW()
  WHERE id IN (v_campaign1_id, v_campaign2_id, v_campaign3_id);

  RAISE NOTICE 'Successfully created 3 active campaigns and accepted applications for test-creator1@bypass.com!';
  RAISE NOTICE 'Campaigns will appear in test-creator1''s "Active" tab for deliverable submission testing';

END $$;

-- Verification: Check the created campaigns and accepted applications
SELECT 
  'Campaigns' as type,
  c.id,
  c.title,
  c.status,
  c.budget,
  c.budget_cents,
  c.max_creators,
  c.selected_creators_count,
  r.name as restaurant_name,
  u.email as created_by
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.owner_id = u.id
WHERE u.email = 'test-business1@bypass.com'
  AND c.status = 'active'
ORDER BY c.created_at DESC
LIMIT 5;

-- Verification: Check accepted applications for test-creator1
SELECT 
  'Accepted Applications' as type,
  ca.id as application_id,
  c.title as campaign_title,
  ca.status,
  ca.proposed_rate_cents,
  ca.applied_at,
  ca.reviewed_at,
  u.email as creator_email
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.status = 'accepted'
ORDER BY ca.reviewed_at DESC;

