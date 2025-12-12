-- ============================================================================
-- SETUP: Create Active Test Campaigns
-- 
-- Usage: Run this to create active campaigns for testing
-- ============================================================================

DO $$
DECLARE
  v_business_id UUID;
  v_restaurant_id UUID;
BEGIN
  SELECT id INTO v_business_id FROM users WHERE email = 'prod-business1@bypass.com';
  
  SELECT r.id INTO v_restaurant_id
  FROM restaurants r
  JOIN business_profiles bp ON bp.restaurant_id = r.id
  WHERE bp.user_id = v_business_id
  LIMIT 1;
  
  IF v_business_id IS NOT NULL AND v_restaurant_id IS NOT NULL THEN
    -- Campaign 1
    INSERT INTO campaigns (
      restaurant_id, owner_id, name, title, description,
      status, budget_cents, max_creators,
      start_date, end_date, created_at, updated_at
    )
    VALUES (
      v_restaurant_id, v_business_id,
      'Summer Menu Launch',
      'Summer Menu Launch',
      'Looking for food creators to showcase our new summer menu items.',
      'active',
      50000, -- $500
      3,
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '37 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Campaign 2
    INSERT INTO campaigns (
      restaurant_id, owner_id, name, title, description,
      status, budget_cents, max_creators,
      start_date, end_date, created_at, updated_at
    )
    VALUES (
      v_restaurant_id, v_business_id,
      'Grand Opening Campaign',
      'Grand Opening Campaign',
      'Celebrating our grand opening! Need creators to help spread the word.',
      'active',
      100000, -- $1000
      5,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created 2 active campaigns';
  ELSE
    RAISE NOTICE '❌ Business or restaurant not found. Run setup-business.sql first.';
  END IF;
END $$;
