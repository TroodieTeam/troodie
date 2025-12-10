-- Setup Script for CM-4: Deliverable URL Validation Testing
-- This script creates active campaigns and accepts applications from test-creator1@bypass.com
-- Run this script before testing CM-4 to ensure test-creator1 has accepted campaigns

DO $$
DECLARE
  v_business_user_id UUID;
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

  -- Get restaurant ID from business profile
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.business_profiles
  WHERE user_id = v_business_user_id
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'No restaurant found for test-business1. Please claim a restaurant first.';
  END IF;

  RAISE NOTICE 'Found restaurant ID: %', v_restaurant_id;

  -- Find test-creator1 user and profile
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

  -- Campaign 1: Instagram Content Campaign
  INSERT INTO public.campaigns (
    id,
    restaurant_id,
    owner_id,
    title,
    description,
    status,
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
    'Instagram Content Campaign - CM-4 Test',
    'Test campaign for CM-4 deliverable URL validation. Focus on Instagram posts, reels, and stories.',
    'active',
    30000, -- $300 in cents
    3,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '60 days')::date,
    (CURRENT_DATE + INTERVAL '30 days'),
    ARRAY[
      'Create high-quality Instagram content',
      'Follow brand guidelines',
      'Include relevant hashtags'
    ],
    jsonb_build_object(
      'deliverables', ARRAY[
        jsonb_build_object('type', 'Instagram Post', 'description', '1 post with 3+ photos', 'quantity', 1),
        jsonb_build_object('type', 'Instagram Reel', 'description', '1 reel (30+ seconds)', 'quantity', 1),
        jsonb_build_object('type', 'Instagram Story', 'description', '3 stories', 'quantity', 3)
      ]
    ),
    'general',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Campaign 1: Instagram Content Campaign (ID: %)', v_campaign1_id;

  -- Campaign 2: Multi-Platform Campaign (TikTok, YouTube)
  INSERT INTO public.campaigns (
    id,
    restaurant_id,
    owner_id,
    title,
    description,
    status,
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
    'Multi-Platform Video Campaign - CM-4 Test',
    'Test campaign for validating TikTok and YouTube URL patterns.',
    'active',
    40000, -- $400 in cents
    2,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '45 days')::date,
    (CURRENT_DATE + INTERVAL '20 days'),
    ARRAY[
      'Create engaging video content',
      'Showcase restaurant atmosphere',
      'Include call-to-action'
    ],
    jsonb_build_object(
      'deliverables', ARRAY[
        jsonb_build_object('type', 'TikTok Video', 'description', '1 TikTok video (60+ seconds)', 'quantity', 1),
        jsonb_build_object('type', 'YouTube Video', 'description', '1 YouTube video or short', 'quantity', 1)
      ]
    ),
    'general',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Campaign 2: Multi-Platform Video Campaign (ID: %)', v_campaign2_id;

  -- Campaign 3: YouTube Focused Campaign
  INSERT INTO public.campaigns (
    id,
    restaurant_id,
    owner_id,
    title,
    description,
    status,
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
    'YouTube Content Campaign - CM-4 Test',
    'Test campaign for YouTube URL validation including shorts and live streams.',
    'active',
    50000, -- $500 in cents
    2,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '90 days')::date,
    (CURRENT_DATE + INTERVAL '45 days'),
    ARRAY[
      'Create YouTube video content',
      'Include restaurant visit footage',
      'Highlight menu items'
    ],
    jsonb_build_object(
      'deliverables', ARRAY[
        jsonb_build_object('type', 'YouTube Video', 'description', '1 main video or short', 'quantity', 1)
      ]
    ),
    'general',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Campaign 3: YouTube Content Campaign (ID: %)', v_campaign3_id;

  -- Create and accept applications from test-creator1@bypass.com
  -- Application 1: Instagram Campaign
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
    'I have experience creating Instagram content and would love to showcase your restaurant!',
    '1 Instagram post, 1 reel, 3 stories as specified',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days',
    v_business_user_id
  ) RETURNING id INTO v_application1_id;

  RAISE NOTICE 'Created and accepted Application 1 (ID: %)', v_application1_id;

  -- Application 2: Multi-Platform Campaign
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
    'I create TikTok and YouTube content. Perfect for this campaign!',
    '1 TikTok video, 1 YouTube video',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '2 days',
    v_business_user_id
  ) RETURNING id INTO v_application2_id;

  RAISE NOTICE 'Created and accepted Application 2 (ID: %)', v_application2_id;

  -- Application 3: YouTube Campaign
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
    'I specialize in YouTube content creation and would be perfect for this campaign!',
    '1 YouTube video or short',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day',
    v_business_user_id
  ) RETURNING id INTO v_application3_id;

  RAISE NOTICE 'Created and accepted Application 3 (ID: %)', v_application3_id;

  -- Update campaign selected_creators_count
  UPDATE public.campaigns
  SET selected_creators_count = 1
  WHERE id IN (v_campaign1_id, v_campaign2_id, v_campaign3_id);

  RAISE NOTICE 'Updated selected_creators_count for all campaigns';

  RAISE NOTICE '✅ CM-4 Setup Complete!';
  RAISE NOTICE 'Created 3 active campaigns with accepted applications for test-creator1@bypass.com';
  RAISE NOTICE 'Campaign IDs: %, %, %', v_campaign1_id, v_campaign2_id, v_campaign3_id;
  RAISE NOTICE 'Application IDs: %, %, %', v_application1_id, v_application2_id, v_application3_id;

END $$;




