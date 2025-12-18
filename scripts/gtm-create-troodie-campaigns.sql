-- ============================================================================
-- GTM: Create Troodie Paid Opportunities
-- ============================================================================
-- Purpose: Create Troodie-branded paid campaigns for creators to apply to
-- Owner: team@troodieapp.com
-- Run this AFTER archiving non-Troodie campaigns
-- ============================================================================

DO $$
DECLARE
  v_team_admin_id UUID;
  v_troodie_restaurant_id UUID;
  v_campaign1_id UUID;
  v_campaign2_id UUID;
  v_campaign3_id UUID;
BEGIN
  -- Get team admin ID
  SELECT id INTO v_team_admin_id
  FROM users
  WHERE email = 'team@troodieapp.com';
  
  IF v_team_admin_id IS NULL THEN
    RAISE EXCEPTION 'team@troodieapp.com not found. Create admin account first (see docs/ADMIN_ACCOUNT_SETUP_GUIDE.md)';
  END IF;
  
  -- Get Troodie Restaurant ID
  SELECT r.id INTO v_troodie_restaurant_id
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = v_team_admin_id
    AND r.name ILIKE '%troodie%'
  LIMIT 1;
  
  IF v_troodie_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Troodie Restaurant not found. Run Troodie Restaurant setup first.';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GTM: CREATING TROODIE CAMPAIGNS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Team Admin ID: %', v_team_admin_id;
  RAISE NOTICE 'Troodie Restaurant ID: %', v_troodie_restaurant_id;
  RAISE NOTICE '';
  
  -- ============================================================================
  -- CAMPAIGN 1: Featured Creator Partnership ($500)
  -- ============================================================================
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
    v_team_admin_id,
    'Featured Creator Partnership',
    'Featured Creator Partnership 🎬',
    E'Looking for talented food creators to become featured partners at Troodie!\n\n💰 PAID OPPORTUNITY - $250 per creator\n\nWhat we need:\n• 1 Instagram Reel (30-60 seconds)\n• 1 TikTok video\n• Stories coverage of your visit\n\nRequirements:\n• 5,000+ followers on Instagram or TikTok\n• Food content focus\n• Authentic voice and engaging content\n\nPerks:\n• Paid partnership\n• Featured on Troodie socials\n• Potential for ongoing collaboration\n• Build your creator portfolio',
    'active',
    'paid',
    50000, -- $500 total (2 creators × $250)
    2,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    ARRAY['Tag @troodieapp in all content', 'Post within 7 days of visit', 'Include location tag'],
    'Food enthusiasts, content creators, local foodies, Charlotte community',
    ARRAY['Reels', 'TikTok', 'Stories'],
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign1_id;
  
  IF v_campaign1_id IS NOT NULL THEN
    RAISE NOTICE '✅ Created: Featured Creator Partnership ($500)';
  ELSE
    SELECT id INTO v_campaign1_id FROM campaigns 
    WHERE owner_id = v_team_admin_id AND name = 'Featured Creator Partnership' LIMIT 1;
    RAISE NOTICE '⚠️ Featured Creator Partnership already exists';
  END IF;
  
  -- ============================================================================
  -- CAMPAIGN 2: Menu Launch Content Creator ($300)
  -- ============================================================================
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
    v_team_admin_id,
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
    RAISE NOTICE '✅ Created: New Menu Launch ($300)';
  ELSE
    SELECT id INTO v_campaign2_id FROM campaigns 
    WHERE owner_id = v_team_admin_id AND name = 'New Menu Launch' LIMIT 1;
    RAISE NOTICE '⚠️ New Menu Launch already exists';
  END IF;
  
  -- ============================================================================
  -- CAMPAIGN 3: UGC Video Creator ($400)
  -- ============================================================================
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
    v_team_admin_id,
    'UGC Video Creator',
    'UGC Video Creator - Paid Partnership 🎥',
    E'Seeking skilled UGC creators for professional-quality video content!\n\n💰 $400 PAID OPPORTUNITY\n\nWhat we''re looking for:\n• 2-3 short-form videos (15-30 seconds each)\n• Can be used for ads and socials\n• Professional quality with good lighting and audio\n\nRequirements:\n• Experience creating UGC content\n• Portfolio showing previous work\n• Own filming equipment\n\nBonus: If content performs well, potential for retainer agreement!',
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
    RAISE NOTICE '✅ Created: UGC Video Creator ($400)';
  ELSE
    SELECT id INTO v_campaign3_id FROM campaigns 
    WHERE owner_id = v_team_admin_id AND name = 'UGC Video Creator' LIMIT 1;
    RAISE NOTICE '⚠️ UGC Video Creator already exists';
  END IF;
  
  -- ============================================================================
  -- CREATE PAYMENT RECORDS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Creating payment records...';
  
  -- Campaign 1 payment
  INSERT INTO campaign_payments (
    campaign_id,
    business_id,
    amount_cents,
    creator_payout_cents,
    platform_fee_cents,
    stripe_payment_intent_id,
    status,
    created_at,
    updated_at
  )
  SELECT 
    v_campaign1_id,
    v_team_admin_id,
    50000,
    50000,  -- Full amount to creators (no platform fee)
    0,
    'pi_troodie_' || v_campaign1_id::text,
    'succeeded',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaign_payments WHERE campaign_id = v_campaign1_id
  );
  
  -- Campaign 2 payment
  INSERT INTO campaign_payments (
    campaign_id,
    business_id,
    amount_cents,
    creator_payout_cents,
    platform_fee_cents,
    stripe_payment_intent_id,
    status,
    created_at,
    updated_at
  )
  SELECT 
    v_campaign2_id,
    v_team_admin_id,
    30000,
    30000,
    0,
    'pi_troodie_' || v_campaign2_id::text,
    'succeeded',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaign_payments WHERE campaign_id = v_campaign2_id
  );
  
  -- Campaign 3 payment
  INSERT INTO campaign_payments (
    campaign_id,
    business_id,
    amount_cents,
    creator_payout_cents,
    platform_fee_cents,
    stripe_payment_intent_id,
    status,
    created_at,
    updated_at
  )
  SELECT 
    v_campaign3_id,
    v_team_admin_id,
    40000,
    40000,
    0,
    'pi_troodie_' || v_campaign3_id::text,
    'succeeded',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaign_payments WHERE campaign_id = v_campaign3_id
  );
  
  RAISE NOTICE '✅ Payment records created';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TROODIE CAMPAIGNS CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaigns:';
  RAISE NOTICE '  1. Featured Creator Partnership - $500 (2 creators)';
  RAISE NOTICE '  2. New Menu Launch - $300 (1 creator)';
  RAISE NOTICE '  3. UGC Video Creator - $400 (1 creator)';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Available: $1,200 in paid opportunities!';
  RAISE NOTICE '';
  RAISE NOTICE 'All campaigns are:';
  RAISE NOTICE '  ✅ Active';
  RAISE NOTICE '  ✅ Pre-paid';
  RAISE NOTICE '  ✅ Ready for creator applications';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all Troodie campaigns
SELECT 
  'Troodie Campaigns' as info,
  c.title,
  c.status,
  c.payment_status,
  c.budget_cents / 100.0 as budget_dollars,
  c.max_creators,
  c.start_date,
  c.end_date,
  CASE 
    WHEN cp.id IS NOT NULL THEN '✅ Payment Record Exists'
    ELSE '❌ Missing Payment Record'
  END as payment_status_check
FROM campaigns c
JOIN users u ON c.owner_id = u.id
LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id
WHERE u.email = 'team@troodieapp.com'
  AND c.status = 'active'
ORDER BY c.budget_cents DESC;

-- Count active campaigns (should only be Troodie)
SELECT 
  'Campaign Visibility' as check_name,
  COUNT(*) as total_active,
  COUNT(CASE WHEN u.email = 'team@troodieapp.com' THEN 1 END) as troodie_campaigns,
  COUNT(CASE WHEN u.email != 'team@troodieapp.com' THEN 1 END) as other_campaigns,
  CASE 
    WHEN COUNT(CASE WHEN u.email != 'team@troodieapp.com' THEN 1 END) = 0 
    THEN '✅ PASS - Only Troodie campaigns visible'
    ELSE '❌ FAIL - Other campaigns still visible'
  END as status
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE c.status = 'active'
  AND c.payment_status = 'paid';
