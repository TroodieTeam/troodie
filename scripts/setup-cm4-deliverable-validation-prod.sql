-- ============================================================================
-- Setup Script for CM-4: Deliverable URL Validation Testing (Production)
-- ============================================================================
-- This script creates active campaigns and accepts applications from 
-- prod-creator1@bypass.com for testing deliverable URL validation in production.
-- Run this script before testing CM-4 to ensure prod-creator1 has accepted campaigns.
-- ============================================================================

DO $$
DECLARE
  v_business_user_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1@bypass.com
  v_restaurant_id UUID;
  v_creator_user_id UUID := '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid; -- prod-creator1@bypass.com
  v_creator_profile_id UUID;
  v_campaign1_id UUID := gen_random_uuid();
  v_campaign2_id UUID := gen_random_uuid();
  v_campaign3_id UUID := gen_random_uuid();
  v_application1_id UUID;
  v_application2_id UUID;
  v_application3_id UUID;
BEGIN
  -- Verify business user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_business_user_id) THEN
    RAISE EXCEPTION 'Business user prod-business1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Found business user ID: %', v_business_user_id;

  -- Get restaurant ID from restaurant_claims (production uses restaurant_claims, not business_profiles)
  SELECT r.id INTO v_restaurant_id
  FROM restaurants r
  JOIN restaurant_claims rc ON rc.restaurant_id = r.id
  WHERE rc.user_id = v_business_user_id
    AND rc.status = 'verified'
  ORDER BY r.created_at DESC
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'No verified restaurant found for prod-business1@bypass.com. Please run 02c-claim-restaurants.sql first.';
  END IF;

  RAISE NOTICE 'Found restaurant ID: %', v_restaurant_id;

  -- Verify creator user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_creator_user_id) THEN
    RAISE EXCEPTION 'Creator user prod-creator1@bypass.com not found';
  END IF;

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_creator_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for prod-creator1@bypass.com. Please run 02a-create-creator-profiles.sql first.';
  END IF;

  RAISE NOTICE 'Found creator profile ID: %', v_creator_profile_id;

  -- ============================================================================
  -- Campaign 1: Instagram Content Campaign
  -- ============================================================================
  INSERT INTO public.campaigns (
    id,
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
    deliverable_requirements,
    campaign_type,
    is_test_campaign,
    created_at,
    updated_at
  ) VALUES (
    v_campaign1_id,
    v_restaurant_id,
    v_business_user_id,
    'Instagram Content Campaign - CM-4 Test',
    'Instagram Content Campaign - CM-4 Test',
    'Production test campaign for CM-4 deliverable URL validation. Focus on Instagram posts, reels, and stories.',
    'active',
    30000, -- $300 in cents
    3,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '60 days')::date,
    jsonb_build_object(
      'deliverables', ARRAY[
        jsonb_build_object('type', 'Instagram Post', 'description', '1 post with 3+ photos', 'quantity', 1),
        jsonb_build_object('type', 'Instagram Reel', 'description', '1 reel (30+ seconds)', 'quantity', 1),
        jsonb_build_object('type', 'Instagram Story', 'description', '3 stories', 'quantity', 3)
      ]
    ),
    'general',
    true, -- Mark as test campaign
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created Campaign 1: Instagram Content Campaign (ID: %)', v_campaign1_id;

  -- ============================================================================
  -- Campaign 2: Multi-Platform Campaign (TikTok, YouTube)
  -- ============================================================================
  INSERT INTO public.campaigns (
    id,
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
    deliverable_requirements,
    campaign_type,
    is_test_campaign,
    created_at,
    updated_at
  ) VALUES (
    v_campaign2_id,
    v_restaurant_id,
    v_business_user_id,
    'Multi-Platform Video Campaign - CM-4 Test',
    'Multi-Platform Video Campaign - CM-4 Test',
    'Production test campaign for validating TikTok and YouTube URL patterns.',
    'active',
    40000, -- $400 in cents
    2,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '45 days')::date,
    jsonb_build_object(
      'deliverables', ARRAY[
        jsonb_build_object('type', 'TikTok Video', 'description', '1 TikTok video (60+ seconds)', 'quantity', 1),
        jsonb_build_object('type', 'YouTube Video', 'description', '1 YouTube video or short', 'quantity', 1)
      ]
    ),
    'general',
    true, -- Mark as test campaign
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created Campaign 2: Multi-Platform Video Campaign (ID: %)', v_campaign2_id;

  -- ============================================================================
  -- Campaign 3: YouTube Focused Campaign
  -- ============================================================================
  INSERT INTO public.campaigns (
    id,
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
    deliverable_requirements,
    campaign_type,
    is_test_campaign,
    created_at,
    updated_at
  ) VALUES (
    v_campaign3_id,
    v_restaurant_id,
    v_business_user_id,
    'YouTube Content Campaign - CM-4 Test',
    'YouTube Content Campaign - CM-4 Test',
    'Production test campaign for YouTube URL validation including shorts and live streams.',
    'active',
    50000, -- $500 in cents
    2,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '90 days')::date,
    jsonb_build_object(
      'deliverables', ARRAY[
        jsonb_build_object('type', 'YouTube Video', 'description', '1 main video or short', 'quantity', 1)
      ]
    ),
    'general',
    true, -- Mark as test campaign
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created Campaign 3: YouTube Content Campaign (ID: %)', v_campaign3_id;

  -- ============================================================================
  -- Create and accept applications from prod-creator1@bypass.com
  -- ============================================================================

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
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_application1_id;

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
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_application2_id;

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
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_application3_id;

  RAISE NOTICE 'Created and accepted Application 3 (ID: %)', v_application3_id;

  -- Update campaign selected_creators_count
  UPDATE public.campaigns
  SET selected_creators_count = 1
  WHERE id IN (v_campaign1_id, v_campaign2_id, v_campaign3_id);

  RAISE NOTICE 'Updated selected_creators_count for all campaigns';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ CM-4 Production Setup Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 3 active campaigns with accepted applications for prod-creator1@bypass.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaign IDs:';
  RAISE NOTICE '  - Campaign 1 (Instagram): %', v_campaign1_id;
  RAISE NOTICE '  - Campaign 2 (Multi-Platform): %', v_campaign2_id;
  RAISE NOTICE '  - Campaign 3 (YouTube): %', v_campaign3_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Application IDs:';
  RAISE NOTICE '  - Application 1: %', v_application1_id;
  RAISE NOTICE '  - Application 2: %', v_application2_id;
  RAISE NOTICE '  - Application 3: %', v_application3_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Log in as prod-creator1@bypass.com (OTP: 000000)';
  RAISE NOTICE '  2. Navigate to "My Campaigns" → "Active" tab';
  RAISE NOTICE '  3. You should see 3 campaigns ready for deliverable submission';
  RAISE NOTICE '  4. Test deliverable URL validation with various URL patterns';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  ca.id as application_id,
  ca.status as application_status,
  u.email as creator_email,
  r.name as restaurant_name
FROM campaigns c
JOIN campaign_applications ca ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN restaurants r ON c.restaurant_id = r.id
WHERE u.email = 'prod-creator1@bypass.com'
  AND c.name LIKE '%CM-4 Test%'
ORDER BY c.created_at DESC;
