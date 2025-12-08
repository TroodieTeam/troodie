-- ============================================================================
-- PART 6: Create Test Campaigns
-- ============================================================================
-- Run this part to create test campaigns for business accounts
-- ============================================================================

DO $$
DECLARE
  business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1@bypass.com
  business2_id UUID := '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid; -- prod-business2@bypass.com
  restaurant1_id UUID;
  restaurant2_id UUID;
BEGIN
  -- Get restaurant IDs
  SELECT id INTO restaurant1_id
  FROM restaurants
  WHERE name = 'Prod Test Restaurant 1'
  ORDER BY created_at DESC
  LIMIT 1;
  
  SELECT id INTO restaurant2_id
  FROM restaurants
  WHERE name = 'Prod Test Restaurant 2'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- ============================================================================
  -- RESTAURANT 1 CAMPAIGNS (prod-business1) - 5 campaigns
  -- ============================================================================
  
  IF restaurant1_id IS NOT NULL THEN
    -- Campaign 1: Active campaign - seeking creators
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
      restaurant1_id,
      business1_id,
      'Summer Menu Launch',
      'Summer Menu Launch',
      'Looking for food creators to showcase our new summer menu items. Focus on Instagram Reels and TikTok content.',
      'active',
      50000, -- $500
      3,
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '37 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 2: Active campaign - high budget
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
      restaurant1_id,
      business1_id,
      'Grand Opening Campaign',
      'Grand Opening Campaign',
      'Celebrating our grand opening! Need creators to help spread the word about our new location.',
      'active',
      100000, -- $1000
      5,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 3: Draft campaign
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
      restaurant1_id,
      business1_id,
      'Holiday Special Promotion',
      'Holiday Special Promotion',
      'Planning a holiday campaign - draft for review.',
      'draft',
      75000, -- $750
      4,
      CURRENT_DATE + INTERVAL '60 days',
      CURRENT_DATE + INTERVAL '90 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 4: Completed campaign
    INSERT INTO campaigns (
      restaurant_id,
      owner_id,
      name,
      title,
      description,
      status,
      budget_cents,
      spent_amount_cents,
      max_creators,
      selected_creators_count,
      start_date,
      end_date,
      created_at,
      updated_at
    )
    VALUES (
      restaurant1_id,
      business1_id,
      'Spring Menu Feature',
      'Spring Menu Feature',
      'Completed campaign featuring our spring menu items.',
      'completed',
      40000, -- $400
      38000, -- $380 spent
      2,
      2,
      CURRENT_DATE - INTERVAL '60 days',
      CURRENT_DATE - INTERVAL '30 days',
      NOW() - INTERVAL '60 days',
      NOW() - INTERVAL '30 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 5: Review campaign (under review)
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
      restaurant1_id,
      business1_id,
      'Weekend Brunch Promotion',
      'Weekend Brunch Promotion',
      'Campaign under review before going live.',
      'review',
      30000, -- $300
      2,
      CURRENT_DATE + INTERVAL '14 days',
      CURRENT_DATE + INTERVAL '44 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- ============================================================================
  -- RESTAURANT 2 CAMPAIGNS (prod-business2) - 5 campaigns
  -- ============================================================================
  
  IF restaurant2_id IS NOT NULL THEN
    -- Campaign 6: Active campaign - video focus
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
      restaurant2_id,
      business2_id,
      'Fine Dining Experience',
      'Fine Dining Experience',
      'Seeking experienced food creators for fine dining content. Video content preferred.',
      'active',
      80000, -- $800
      3,
      CURRENT_DATE + INTERVAL '3 days',
      CURRENT_DATE + INTERVAL '33 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 7: Active campaign - multiple creators
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
      restaurant2_id,
      business2_id,
      'Italian Cuisine Showcase',
      'Italian Cuisine Showcase',
      'Looking for creators to showcase our authentic Italian dishes.',
      'active',
      60000, -- $600
      4,
      CURRENT_DATE + INTERVAL '10 days',
      CURRENT_DATE + INTERVAL '40 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 8: Draft campaign
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
      restaurant2_id,
      business2_id,
      'Wine Pairing Event',
      'Wine Pairing Event',
      'Planning a wine pairing event campaign - draft.',
      'draft',
      90000, -- $900
      2,
      CURRENT_DATE + INTERVAL '45 days',
      CURRENT_DATE + INTERVAL '75 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 9: Completed campaign
    INSERT INTO campaigns (
      restaurant_id,
      owner_id,
      name,
      title,
      description,
      status,
      budget_cents,
      spent_amount_cents,
      max_creators,
      selected_creators_count,
      start_date,
      end_date,
      created_at,
      updated_at
    )
    VALUES (
      restaurant2_id,
      business2_id,
      'Valentine''s Day Special',
      'Valentine''s Day Special',
      'Completed Valentine''s Day campaign.',
      'completed',
      45000, -- $450
      42000, -- $420 spent
      2,
      2,
      CURRENT_DATE - INTERVAL '90 days',
      CURRENT_DATE - INTERVAL '60 days',
      NOW() - INTERVAL '90 days',
      NOW() - INTERVAL '60 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 10: Active campaign - quick turnaround
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
      restaurant2_id,
      business2_id,
      'New Chef Special',
      'New Chef Special',
      'Promoting our new chef''s signature dishes.',
      'active',
      35000, -- $350
      2,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '21 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Test Campaigns Created';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaigns created for:';
  IF restaurant1_id IS NOT NULL THEN
    RAISE NOTICE '  - Restaurant 1: 5 campaigns';
  END IF;
  IF restaurant2_id IS NOT NULL THEN
    RAISE NOTICE '  - Restaurant 2: 5 campaigns';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  r.name as restaurant_name,
  u.email as business_email,
  c.name as campaign_name,
  c.status,
  c.budget_cents / 100.0 as budget_dollars,
  c.max_creators,
  c.start_date,
  c.end_date
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
JOIN restaurant_claims rc ON rc.restaurant_id = r.id
JOIN users u ON rc.user_id = u.id
WHERE u.email LIKE 'prod-business%@bypass.com'
ORDER BY u.email, c.created_at DESC;
