-- =============================================
-- Payment System Test Campaigns Creation Script
-- Date: January 17, 2025
-- Purpose: Create 6 holiday-themed campaigns for payment system testing
-- =============================================

-- This script creates test campaigns from the Troodie admin account
-- Run this in Supabase SQL Editor after setting up test accounts

-- =============================================
-- STEP 1: Find or Create Troodie Admin Account
-- =============================================

-- Find existing admin account or use a test business account
DO $$
DECLARE
  admin_user_id UUID;
  admin_business_id UUID;
  fake_restaurant_id UUID;
  admin_email TEXT;
BEGIN
  -- Try to find admin account or use test-business1 as fallback
  -- Priority: admin accounts, then test-business1@bypass.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email IN (
    'admin@troodie.test',
    'admin@troodieapp.com', 
    'troodie-admin@troodieapp.com',
    'test-business1@bypass.com'  -- Use existing test account as fallback
  )
  ORDER BY CASE 
    WHEN email = 'admin@troodie.test' THEN 1
    WHEN email = 'admin@troodieapp.com' THEN 2
    WHEN email = 'troodie-admin@troodieapp.com' THEN 3
    WHEN email = 'test-business1@bypass.com' THEN 4
  END
  LIMIT 1;

  -- If still no user found, create one
  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      admin_user_id,
      'troodie-admin@bypass.com',
      crypt('BypassPassword123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Troodie Admin", "account_type": "business"}'::jsonb,
      'authenticated',
      'authenticated'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Get email from auth.users
  SELECT email INTO admin_email FROM auth.users WHERE id = admin_user_id;
  
  -- Ensure user record exists in public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    account_type,
    is_verified,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    COALESCE(admin_email, 'troodie-admin@bypass.com'),
    'Troodie Admin',
    'business',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    account_type = 'business',
    is_verified = true,
    updated_at = NOW();

  -- Find or create business profile
  SELECT id INTO admin_business_id
  FROM business_profiles
  WHERE user_id = admin_user_id
  LIMIT 1;

  -- If no business profile, create one
  IF admin_business_id IS NULL THEN
    admin_business_id := gen_random_uuid();
    INSERT INTO business_profiles (
      id,
      user_id,
      business_name,
      verified,
      created_at,
      updated_at
    ) VALUES (
      admin_business_id,
      admin_user_id,
      'Troodie Test Restaurant',
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- Find or create fake restaurant
  SELECT id INTO fake_restaurant_id
  FROM restaurants
  WHERE name ILIKE '%Troodie%' OR name ILIKE '%Test%'
  LIMIT 1;

  -- If no fake restaurant, create one
  IF fake_restaurant_id IS NULL THEN
    fake_restaurant_id := gen_random_uuid();
    INSERT INTO restaurants (
      id,
      name,
      address,
      city,
      state,
      zip_code,
      phone,
      cuisine_type,
      price_range,
      created_at,
      updated_at
    ) VALUES (
      fake_restaurant_id,
      'Troodie Test Restaurant',
      '123 Test Street',
      'Charlotte',
      'NC',
      '28202',
      '(704) 555-0100',
      'American',
      2,
      NOW(),
      NOW()
    );

    -- Link restaurant to business profile
    UPDATE business_profiles
    SET restaurant_id = fake_restaurant_id,
        updated_at = NOW()
    WHERE id = admin_business_id;
  END IF;

  -- Store IDs for use in campaign creation
  PERFORM set_config('app.admin_user_id', admin_user_id::text, false);
  PERFORM set_config('app.admin_business_id', admin_business_id::text, false);
  PERFORM set_config('app.fake_restaurant_id', fake_restaurant_id::text, false);

  RAISE NOTICE 'Admin User ID: %', admin_user_id;
  RAISE NOTICE 'Business Profile ID: %', admin_business_id;
  RAISE NOTICE 'Restaurant ID: %', fake_restaurant_id;
END $$;

-- =============================================
-- STEP 2: Create Test Campaigns
-- =============================================

-- Get the IDs we just set
DO $$
DECLARE
  admin_user_id UUID;
  admin_business_id UUID;
  fake_restaurant_id UUID;
  campaign_id UUID;
BEGIN
  -- Retrieve IDs from config
  admin_user_id := (current_setting('app.admin_user_id', true))::UUID;
  admin_business_id := (current_setting('app.admin_business_id', true))::UUID;
  fake_restaurant_id := (current_setting('app.fake_restaurant_id', true))::UUID;

  -- Campaign 1: Holiday Latte Crawl ☕✨
  campaign_id := gen_random_uuid();
  INSERT INTO campaigns (
    id,
    business_id,
    restaurant_id,
    title,
    description,
    budget_cents,
    max_creators,
    status,
    payment_status,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    campaign_id,
    admin_user_id,
    fake_restaurant_id,
    'Holiday Latte Crawl ☕✨',
    'Visit a local coffee shop and review their best holiday drink — ex. peppermint mocha, gingerbread latte, caramel brûlée, etc. Share what you ordered and how you liked it.

Required CTA:
"Follow me on Troodie to see more of my favorite Charlotte coffee shops. I got this opportunity on Troodie''s Creator Marketplace — download Troodie to join!"',
    3500, -- $35
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    budget_cents = EXCLUDED.budget_cents,
    updated_at = NOW();

  -- Campaign 2: Cozy Winter Date Night Pick ❄️❤️
  campaign_id := gen_random_uuid();
  INSERT INTO campaigns (
    id,
    business_id,
    restaurant_id,
    title,
    description,
    budget_cents,
    max_creators,
    status,
    payment_status,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    campaign_id,
    admin_user_id,
    fake_restaurant_id,
    'Cozy Winter Date Night Pick ❄️❤️',
    'Feature a Charlotte restaurant that gives "cozy holiday vibes." Show the ambience (lights, décor), what you ordered, and why it''s perfect for a December date night.

Required CTA:
"See my full Charlotte date-night list on Troodie. I got this opportunity on Troodie''s Creator Marketplace — download Troodie today!"',
    4000, -- $40
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    budget_cents = EXCLUDED.budget_cents,
    updated_at = NOW();

  -- Campaign 3: Festive Cocktails Tour 🍹🎄
  campaign_id := gen_random_uuid();
  INSERT INTO campaigns (
    id,
    business_id,
    restaurant_id,
    title,
    description,
    budget_cents,
    max_creators,
    status,
    payment_status,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    campaign_id,
    admin_user_id,
    fake_restaurant_id,
    'Festive Cocktails Tour 🍹🎄',
    'Try one festive cocktail from a local bar or restaurant (spiked cider, cranberry fizz, holiday spritz). Highlight flavor notes + what makes it holiday-ready.

Required CTA:
"Find more holiday cocktail spots on my Troodie profile. I got this opportunity on Troodie''s Creator Marketplace — download Troodie to discover more!"',
    4500, -- $45
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    budget_cents = EXCLUDED.budget_cents,
    updated_at = NOW();

  -- Campaign 4: Best Holiday Dessert in Charlotte 🎂✨
  campaign_id := gen_random_uuid();
  INSERT INTO campaigns (
    id,
    business_id,
    restaurant_id,
    title,
    description,
    budget_cents,
    max_creators,
    status,
    payment_status,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    campaign_id,
    admin_user_id,
    fake_restaurant_id,
    'Best Holiday Dessert in Charlotte 🎂✨',
    'Pick a bakery or restaurant offering a seasonal dessert (gingerbread cookies, peppermint cheesecake, yule log, etc.). Rate the vibes, taste, and share who would love it.

Required CTA:
"See my list of holiday dessert spots on Troodie. This opportunity came from Troodie''s Creator Marketplace — download Troodie to join!"',
    3000, -- $30
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    budget_cents = EXCLUDED.budget_cents,
    updated_at = NOW();

  -- Campaign 5: My Favorite Black-Owned Spot for the Holidays 🎁🔥
  campaign_id := gen_random_uuid();
  INSERT INTO campaigns (
    id,
    business_id,
    restaurant_id,
    title,
    description,
    budget_cents,
    max_creators,
    status,
    payment_status,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    campaign_id,
    admin_user_id,
    fake_restaurant_id,
    'My Favorite Black-Owned Spot for the Holidays 🎁🔥',
    'Showcase a Black-owned Charlotte restaurant or café and why it''s perfect for the holiday season — gift vibes, family gathering vibes, winter comfort food, or festive menus.

Required CTA:
"Follow me on Troodie for my full list of Black-owned Charlotte gems. I got this opportunity on Troodie''s Creator Marketplace — download Troodie today!"',
    4000, -- $40
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    budget_cents = EXCLUDED.budget_cents,
    updated_at = NOW();

  -- Campaign 6: Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️
  campaign_id := gen_random_uuid();
  INSERT INTO campaigns (
    id,
    business_id,
    restaurant_id,
    title,
    description,
    budget_cents,
    max_creators,
    status,
    payment_status,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    campaign_id,
    admin_user_id,
    fake_restaurant_id,
    'Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️',
    'Feature the best warm, comforting bowl in Charlotte — soup, ramen, pho, chili, curry, stew, etc. Highlight flavors + why it''s perfect for cold weather.

Required CTA:
"See more winter comfort eats on Troodie. I got this opportunity on Troodie''s Creator Marketplace — download Troodie to find spots like this!"',
    3500, -- $35
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    budget_cents = EXCLUDED.budget_cents,
    updated_at = NOW();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Payment Test Campaigns Created Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 6 test campaigns:';
  RAISE NOTICE '1. Holiday Latte Crawl ☕✨ - $35';
  RAISE NOTICE '2. Cozy Winter Date Night Pick ❄️❤️ - $40';
  RAISE NOTICE '3. Festive Cocktails Tour 🍹🎄 - $45';
  RAISE NOTICE '4. Best Holiday Dessert in Charlotte 🎂✨ - $30';
  RAISE NOTICE '5. My Favorite Black-Owned Spot for the Holidays 🎁🔥 - $40';
  RAISE NOTICE '6. Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️ - $35';
  RAISE NOTICE '';
  RAISE NOTICE 'All campaigns are in "active" status with "unpaid" payment_status';
  RAISE NOTICE 'Ready for payment testing!';
  RAISE NOTICE '========================================';

END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- View all created campaigns
SELECT 
  id,
  title,
  budget_cents,
  status,
  payment_status,
  created_at
FROM campaigns
WHERE title LIKE '%Holiday%' 
   OR title LIKE '%Winter%' 
   OR title LIKE '%Festive%'
   OR title LIKE '%Dessert%'
   OR title LIKE '%Black-Owned%'
   OR title LIKE '%Warm-Up%'
ORDER BY created_at DESC;

-- Count campaigns by status
SELECT 
  status,
  payment_status,
  COUNT(*) as count,
  SUM(budget_cents) as total_budget_cents
FROM campaigns
WHERE title LIKE '%Holiday%' 
   OR title LIKE '%Winter%' 
   OR title LIKE '%Festive%'
   OR title LIKE '%Dessert%'
   OR title LIKE '%Black-Owned%'
   OR title LIKE '%Warm-Up%'
GROUP BY status, payment_status;
