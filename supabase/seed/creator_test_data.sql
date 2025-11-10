-- ================================================================
-- Creator Test Data
-- ================================================================
-- This script adds test data for creator accounts to demonstrate
-- the full creator experience with campaigns and applications
-- ================================================================

-- Get creator profile IDs for test creators
DO $$
DECLARE
  v_creator1_profile_id UUID;
  v_creator2_profile_id UUID;
  v_campaign1_id UUID;
  v_campaign2_id UUID;
  v_campaign3_id UUID;
BEGIN
  -- Get creator profile IDs
  SELECT id INTO v_creator1_profile_id
  FROM creator_profiles
  WHERE user_id = (SELECT id FROM users WHERE email = 'creator1@bypass.com');
  
  SELECT id INTO v_creator2_profile_id
  FROM creator_profiles
  WHERE user_id = (SELECT id FROM users WHERE email = 'creator2@bypass.com');

  -- Get some campaign IDs (assuming they exist from previous seeds)
  SELECT id INTO v_campaign1_id
  FROM campaigns
  WHERE status = 'active'
  LIMIT 1 OFFSET 0;
  
  SELECT id INTO v_campaign2_id
  FROM campaigns
  WHERE status = 'active'
  LIMIT 1 OFFSET 1;
  
  SELECT id INTO v_campaign3_id
  FROM campaigns
  WHERE status = 'active'
  LIMIT 1 OFFSET 2;

  -- Only proceed if we have the necessary data
  IF v_creator1_profile_id IS NOT NULL AND v_campaign1_id IS NOT NULL THEN
    
    -- ================================================================
    -- Campaign Applications for Creator 1
    -- ================================================================
    
    -- Active/Accepted campaign
    INSERT INTO campaign_applications (
      campaign_id,
      creator_id,
      proposed_rate_cents,
      cover_letter,
      status,
      applied_at,
      reviewed_at
    ) VALUES (
      v_campaign1_id,
      v_creator1_profile_id,
      7500, -- $75
      'I''m excited to showcase your restaurant to my 5K+ followers who love authentic Spanish cuisine. I specialize in food photography and have worked with several upscale restaurants in Charlotte.',
      'accepted',
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '4 days'
    ) ON CONFLICT (campaign_id, creator_id) DO UPDATE
    SET status = 'accepted',
        reviewed_at = NOW() - INTERVAL '4 days';

    -- Pending application
    IF v_campaign2_id IS NOT NULL THEN
      INSERT INTO campaign_applications (
        campaign_id,
        creator_id,
        proposed_rate_cents,
        cover_letter,
        status,
        applied_at
      ) VALUES (
        v_campaign2_id,
        v_creator1_profile_id,
        5000, -- $50
        'Your restaurant''s aesthetic perfectly matches my content style. I can create engaging reels and stories that highlight your unique dishes.',
        'pending',
        NOW() - INTERVAL '2 days'
      ) ON CONFLICT (campaign_id, creator_id) DO UPDATE
      SET status = 'pending';
    END IF;

    RAISE NOTICE 'Added campaign applications for creator1@bypass.com';
  END IF;

  -- ================================================================
  -- Campaign Applications for Creator 2
  -- ================================================================
  
  IF v_creator2_profile_id IS NOT NULL AND v_campaign3_id IS NOT NULL THEN
    
    -- Accepted campaign
    INSERT INTO campaign_applications (
      campaign_id,
      creator_id,
      proposed_rate_cents,
      cover_letter,
      status,
      applied_at,
      reviewed_at
    ) VALUES (
      v_campaign3_id,
      v_creator2_profile_id,
      10000, -- $100
      'As a travel food blogger with 8K followers, I love discovering hidden gems. Your restaurant would be perfect for my ''Best of Charlotte'' series.',
      'accepted',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '6 days'
    ) ON CONFLICT (campaign_id, creator_id) DO UPDATE
    SET status = 'accepted',
        reviewed_at = NOW() - INTERVAL '6 days';

    -- Another pending application
    IF v_campaign1_id IS NOT NULL THEN
      INSERT INTO campaign_applications (
        campaign_id,
        creator_id,
        proposed_rate_cents,
        cover_letter,
        status,
        applied_at
      ) VALUES (
        v_campaign1_id,
        v_creator2_profile_id,
        8000, -- $80
        'I specialize in street food and authentic cuisine content. Would love to feature your tapas selection!',
        'pending',
        NOW() - INTERVAL '1 day'
      ) ON CONFLICT (campaign_id, creator_id) DO UPDATE
      SET status = 'pending';
    END IF;

    RAISE NOTICE 'Added campaign applications for creator2@bypass.com';
  END IF;

  -- ================================================================
  -- Add Portfolio Items for Creators
  -- ================================================================
  
  IF v_creator1_profile_id IS NOT NULL THEN
    -- Portfolio items for creator1
    INSERT INTO portfolio_items (
      creator_id,
      content_type,
      content_url,
      thumbnail_url,
      caption,
      views,
      likes,
      comments,
      shares,
      restaurant_name,
      posted_at,
      created_at
    ) VALUES 
    (
      v_creator1_profile_id,
      'photo',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300',
      'Beautiful plating at Barcelona Wine Bar 🍷',
      5234,
      423,
      28,
      15,
      'Barcelona Wine Bar',
      NOW() - INTERVAL '10 days',
      NOW() - INTERVAL '10 days'
    ),
    (
      v_creator1_profile_id,
      'reel',
      'https://example.com/reel1',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300',
      'Behind the scenes at Charlotte''s finest restaurants',
      12500,
      1050,
      95,
      45,
      'Various Charlotte Restaurants',
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    ),
    (
      v_creator1_profile_id,
      'photo',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300',
      'Farm to table excellence 🌱',
      3200,
      280,
      15,
      8,
      'The Rustic Table',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days'
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Added portfolio items for creator1';
  END IF;

  IF v_creator2_profile_id IS NOT NULL THEN
    -- Portfolio items for creator2
    INSERT INTO portfolio_items (
      creator_id,
      content_type,
      content_url,
      thumbnail_url,
      caption,
      views,
      likes,
      comments,
      shares,
      restaurant_name,
      posted_at,
      created_at
    ) VALUES 
    (
      v_creator2_profile_id,
      'video',
      'https://example.com/video1',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=300',
      'Street food tour in NoDa district 🌮',
      18900,
      2100,
      156,
      87,
      'NoDa Street Food',
      NOW() - INTERVAL '8 days',
      NOW() - INTERVAL '8 days'
    ),
    (
      v_creator2_profile_id,
      'photo',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
      'Hidden gem alert! Best pizza in Charlotte 🍕',
      8700,
      690,
      42,
      35,
      'Portofino''s Pizza',
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '6 days'
    ),
    (
      v_creator2_profile_id,
      'reel',
      'https://example.com/reel2',
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=300',
      'Top 5 brunch spots you need to try',
      25600,
      3200,
      280,
      125,
      'Various Brunch Spots',
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Added portfolio items for creator2';
  END IF;

  -- ================================================================
  -- Summary
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE '✅ Creator test data added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Accounts with Full Data:';
  RAISE NOTICE '• creator1@bypass.com - 1 active campaign, 1 pending application';
  RAISE NOTICE '• creator2@bypass.com - 1 active campaign, 1 pending application';
  RAISE NOTICE '';
  RAISE NOTICE 'Both creators have:';
  RAISE NOTICE '• Portfolio items with engagement metrics';
  RAISE NOTICE '• Campaign applications in various states';
  RAISE NOTICE '• Mock earnings data (shown in app)';
  RAISE NOTICE '';
  RAISE NOTICE 'To test: Login and navigate to Creator Tools in More tab';
  
END $$;