-- ============================================================================
-- Create Troodie Originals Campaign: "Local Gems"
-- ============================================================================
--
-- This script creates the first Troodie-sponsored campaign using the
-- Troodie Originals preset. It's designed to be idempotent and can be
-- run multiple times safely.
--
-- Campaign Details:
-- - Name: "Troodie Creators: Local Gems"
-- - Budget: $250 ($50 per creator × 5 creators)
-- - Type: troodie_direct (Troodie-sponsored)
-- - Goal: Generate high-quality UGC to inspire restaurants
--
-- Prerequisites:
-- - Troodie system account exists (kouame@troodieapp.com)
-- - Troodie Community restaurant exists
-- - Enhanced deliverables migration applied
--
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- 1. VERIFY PREREQUISITES
-- ============================================================================

DO $$
DECLARE
  v_system_user_id UUID;
  v_troodie_restaurant_id UUID;
  v_business_profile_id UUID;
BEGIN
  -- Check for Troodie system user
  SELECT id INTO v_system_user_id
  FROM users
  WHERE email = 'kouame@troodieapp.com';

  IF v_system_user_id IS NULL THEN
    RAISE EXCEPTION 'Troodie system user not found. Run create_troodie_system_account.sql first.';
  END IF;

  RAISE NOTICE '✓ Troodie system user found: %', v_system_user_id;

  -- Check for Troodie Community restaurant
  SELECT id INTO v_troodie_restaurant_id
  FROM restaurants
  WHERE is_platform_managed = TRUE
  AND managed_by = 'troodie'
  LIMIT 1;

  IF v_troodie_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Troodie Community restaurant not found. Run create_troodie_system_account.sql first.';
  END IF;

  RAISE NOTICE '✓ Troodie Community restaurant found: %', v_troodie_restaurant_id;

  -- Check for business profile
  SELECT id INTO v_business_profile_id
  FROM business_profiles
  WHERE user_id = v_system_user_id
  AND restaurant_id = v_troodie_restaurant_id;

  IF v_business_profile_id IS NULL THEN
    RAISE EXCEPTION 'Troodie business profile not found. Run create_troodie_system_account.sql first.';
  END IF;

  RAISE NOTICE '✓ Troodie business profile found: %', v_business_profile_id;

  -- Check for enhanced deliverables migration
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'campaign_deliverables'
  ) THEN
    RAISE EXCEPTION 'Enhanced deliverables migration not applied. Run 20251016_enhanced_deliverables_system.sql first.';
  END IF;

  RAISE NOTICE '✓ Enhanced deliverables system installed';
END $$;

-- ============================================================================
-- 2. CREATE TROODIE ORIGINALS CAMPAIGN
-- ============================================================================

INSERT INTO campaigns (
  restaurant_id,
  title,
  description,
  requirements,
  budget,
  budget_cents,
  max_creators,
  start_date,
  end_date,
  status,
  campaign_type,
  campaign_source,
  is_subsidized,
  subsidy_amount_cents,
  deliverable_requirements
)
SELECT
  r.id as restaurant_id,
  'Troodie Creators: Local Gems' as title,
  'Create authentic, fun content featuring your favorite local spot! This is an opportunity to showcase a restaurant you genuinely love while helping promote the Troodie Creator Marketplace.

**What We''re Looking For:**
- Authentic reviews of local restaurants (coffee shops, brunch spots, dessert bars, etc.)
- Short, engaging vertical video content (15-45 seconds)
- Clear call-to-action mentioning Troodie Creator Marketplace
- High-quality food and atmosphere shots

**Perfect For:**
- Food creators building their portfolio
- Local influencers wanting to support neighborhood spots
- Content creators looking for platform opportunities' as description,
  ARRAY[
    '1 vertical video (15-45 seconds) for Instagram Reels or TikTok',
    'Must feature a local restaurant of your choice',
    'Show what makes the restaurant special (food, atmosphere, experience)',
    'Collaborate/tag @TroodieApp in your post',
    'Save the restaurant to Troodie and leave a review or post',
    'Use hashtag #TroodieCreatorMarketplace',
    'Include CTA at end: "I found this opportunity through the Troodie Creator Marketplace — if you''re a creator looking to collaborate with restaurants, download Troodie!"',
    'Post must be public on Instagram Reels or TikTok',
    'Submit post link once published'
  ] as requirements,
  250 as budget, -- $250 total
  25000 as budget_cents, -- $250 in cents
  5 as max_creators, -- 5 creators
  CURRENT_DATE as start_date,
  CURRENT_DATE + INTERVAL '30 days' as end_date, -- 30-day campaign
  'active' as status,
  'sponsored' as campaign_type,
  'troodie_direct' as campaign_source,
  TRUE as is_subsidized,
  25000 as subsidy_amount_cents, -- Troodie pays $250
  '{
    "title": "Authentic Local Spot Review",
    "goal": "brand_content",
    "type": "reel",
    "due_date": "Post within 2 weeks of acceptance",
    "compensation_type": "cash",
    "compensation_value": 5000,
    "visit_type": "other",
    "payment_timing": "after_post",
    "revisions_allowed": 1,
    "creative": {
      "tone": ["fun", "playful", "trendy"],
      "themes": ["food_closeups", "atmosphere", "customer_experience"],
      "voiceover": "creator_choice",
      "onscreen_text": "creator_choice",
      "cover_image": "creator_choice"
    },
    "approval": {
      "pre_approval_required": false,
      "handles": ["@TroodieApp"],
      "hashtags": ["#TroodieCreatorMarketplace"],
      "repost_rights": true,
      "extra_notes": "Be authentic! Choose a restaurant you genuinely love and want to share with your audience."
    }
  }'::jsonb as deliverable_requirements
FROM restaurants r
WHERE r.is_platform_managed = TRUE
AND NOT EXISTS (
  -- Only insert if campaign doesn't already exist
  SELECT 1 FROM campaigns
  WHERE title = 'Troodie Creators: Local Gems'
  AND campaign_source = 'troodie_direct'
)
RETURNING id, title, budget, max_creators, campaign_source;

-- ============================================================================
-- 3. CREATE PLATFORM_MANAGED_CAMPAIGNS TRACKING RECORD
-- ============================================================================

INSERT INTO platform_managed_campaigns (
  campaign_id,
  management_type,
  budget_source,
  approved_budget_cents,
  target_creators,
  target_content_pieces,
  target_reach,
  internal_notes
)
SELECT
  c.id as campaign_id,
  'direct' as management_type,
  'marketing' as budget_source,
  25000 as approved_budget_cents, -- $250
  5 as target_creators,
  5 as target_content_pieces, -- 1 per creator
  25000 as target_reach, -- Estimate: 5,000 avg reach × 5 creators
  'First Troodie Originals campaign - "Local Gems" initiative to generate high-quality UGC and demonstrate the creator marketplace value proposition to restaurants.' as internal_notes
FROM campaigns c
WHERE c.title = 'Troodie Creators: Local Gems'
AND c.campaign_source = 'troodie_direct'
AND NOT EXISTS (
  -- Only insert if tracking record doesn't exist
  SELECT 1 FROM platform_managed_campaigns pmc
  WHERE pmc.campaign_id = c.id
);

-- ============================================================================
-- 4. VERIFY CAMPAIGN CREATION
-- ============================================================================

DO $$
DECLARE
  v_campaign_id UUID;
  v_campaign_title TEXT;
  v_budget INTEGER;
  v_deliverable_req JSONB;
BEGIN
  -- Get campaign details
  SELECT id, title, budget, deliverable_requirements
  INTO v_campaign_id, v_campaign_title, v_budget, v_deliverable_req
  FROM campaigns
  WHERE title = 'Troodie Creators: Local Gems'
  AND campaign_source = 'troodie_direct'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campaign creation failed!';
  END IF;

  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ TROODIE ORIGINALS CAMPAIGN CREATED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaign Details:';
  RAISE NOTICE '  ID: %', v_campaign_id;
  RAISE NOTICE '  Title: %', v_campaign_title;
  RAISE NOTICE '  Budget: $%', v_budget;
  RAISE NOTICE '  Max Creators: 5';
  RAISE NOTICE '  Compensation per Creator: $50 (from deliverable_requirements)';
  RAISE NOTICE '  Campaign Type: troodie_direct (Troodie-sponsored)';
  RAISE NOTICE '  Status: active';
  RAISE NOTICE '';
  RAISE NOTICE 'Deliverable Requirements:';
  RAISE NOTICE '  Type: %', v_deliverable_req->>'type';
  RAISE NOTICE '  Goal: %', v_deliverable_req->>'goal';
  RAISE NOTICE '  Compensation: $%', (v_deliverable_req->>'compensation_value')::INTEGER / 100;
  RAISE NOTICE '  Revisions Allowed: %', v_deliverable_req->>'revisions_allowed';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Verify campaign in admin dashboard';
  RAISE NOTICE '  2. Share campaign with target creators';
  RAISE NOTICE '  3. Monitor applications';
  RAISE NOTICE '  4. Accept first 5 qualified creators';
  RAISE NOTICE '  5. Review deliverables as they come in';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaign URL (once app is live):';
  RAISE NOTICE '  troodie://campaigns/%', v_campaign_id;
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

-- Commit transaction
COMMIT;

-- ============================================================================
-- 5. OPTIONAL: QUERY CAMPAIGN DETAILS
-- ============================================================================

-- View complete campaign details
SELECT
  c.id,
  c.title,
  c.description,
  c.budget,
  c.max_creators,
  c.campaign_source,
  c.is_subsidized,
  c.status,
  c.deliverable_requirements,
  r.name as restaurant_name
FROM campaigns c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.title = 'Troodie Creators: Local Gems'
AND c.campaign_source = 'troodie_direct';

-- View platform tracking details
SELECT
  pmc.*,
  c.title as campaign_title,
  c.status as campaign_status
FROM platform_managed_campaigns pmc
JOIN campaigns c ON c.id = pmc.campaign_id
WHERE c.title = 'Troodie Creators: Local Gems';

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================

-- To delete the campaign and start over:
/*
DELETE FROM platform_managed_campaigns
WHERE campaign_id IN (
  SELECT id FROM campaigns
  WHERE title = 'Troodie Creators: Local Gems'
  AND campaign_source = 'troodie_direct'
);

DELETE FROM campaigns
WHERE title = 'Troodie Creators: Local Gems'
AND campaign_source = 'troodie_direct';
*/
