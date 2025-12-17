-- =============================================
-- Payment Test Setup: Create All Test Campaigns
-- Purpose: Create the 6 holiday campaigns and assign to correct user
-- Run this ONCE to set up all test campaigns
-- =============================================

-- This script uses the existing create-payment-test-campaigns.sql
-- but ensures campaigns are assigned to test-business1@bypass.com

DO $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
  v_restaurant_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Find test-business1 user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-business1@bypass.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-business1@bypass.com not found. Please run test data setup first.';
  END IF;

  -- Get business profile
  SELECT id INTO v_business_profile_id
  FROM public.business_profiles
  WHERE user_id = v_user_id;

  -- Get or create restaurant
  SELECT restaurant_id INTO v_restaurant_id
  FROM business_profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    v_restaurant_id := gen_random_uuid();
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
      v_restaurant_id,
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

    IF v_business_profile_id IS NULL THEN
      v_business_profile_id := gen_random_uuid();
      INSERT INTO business_profiles (
        id,
        user_id,
        restaurant_id,
        business_name,
        verified,
        created_at,
        updated_at
      ) VALUES (
        v_business_profile_id,
        v_user_id,
        v_restaurant_id,
        'Test Business 1',
        true,
        NOW(),
        NOW()
      );
    ELSE
      UPDATE business_profiles
      SET restaurant_id = v_restaurant_id
      WHERE id = v_business_profile_id;
    END IF;
  END IF;

  RAISE NOTICE 'Using restaurant ID: %', v_restaurant_id;

  -- Campaign 1: Holiday Latte Crawl ☕✨
  INSERT INTO campaigns (
    id,
    owner_id,
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
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_restaurant_id,
    'Holiday Latte Crawl ☕✨',
    'Visit a local coffee shop and review their best holiday drink — ex. peppermint mocha, gingerbread latte, caramel brûlée, etc. Share what you ordered and how you liked it.

Required CTA:
"Follow me on Troodie to see more of my favorite Charlotte coffee shops. I got this opportunity on Troodie''s Creator Marketplace — download Troodie to join!"',
    3500,
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE owner_id = v_user_id 
      AND title = 'Holiday Latte Crawl ☕✨'
  );

  -- Campaign 2: Cozy Winter Date Night Pick ❄️❤️
  INSERT INTO campaigns (
    id,
    owner_id,
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
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_restaurant_id,
    'Cozy Winter Date Night Pick ❄️❤️',
    'Feature a Charlotte restaurant that gives "cozy holiday vibes." Show the ambience (lights, décor), what you ordered, and why it''s perfect for a December date night.

Required CTA:
"See my full Charlotte date-night list on Troodie. I got this opportunity on Troodie''s Creator Marketplace — download Troodie today!"',
    4000,
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE owner_id = v_user_id 
      AND title = 'Cozy Winter Date Night Pick ❄️❤️'
  );

  -- Campaign 3: Festive Cocktails Tour 🍹🎄
  INSERT INTO campaigns (
    id,
    owner_id,
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
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_restaurant_id,
    'Festive Cocktails Tour 🍹🎄',
    'Try one festive cocktail from a local bar or restaurant (spiked cider, cranberry fizz, holiday spritz). Highlight flavor notes + what makes it holiday-ready.

Required CTA:
"Find more holiday cocktail spots on my Troodie profile. I got this opportunity on Troodie''s Creator Marketplace — download Troodie to discover more!"',
    4500,
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE owner_id = v_user_id 
      AND title = 'Festive Cocktails Tour 🍹🎄'
  );

  -- Campaign 4: Best Holiday Dessert in Charlotte 🎂✨
  INSERT INTO campaigns (
    id,
    owner_id,
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
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_restaurant_id,
    'Best Holiday Dessert in Charlotte 🎂✨',
    'Pick a bakery or restaurant offering a seasonal dessert (gingerbread cookies, peppermint cheesecake, yule log, etc.). Rate the vibes, taste, and share who would love it.

Required CTA:
"See my list of holiday dessert spots on Troodie. This opportunity came from Troodie''s Creator Marketplace — download Troodie to join!"',
    3000,
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE owner_id = v_user_id 
      AND title = 'Best Holiday Dessert in Charlotte 🎂✨'
  );

  -- Campaign 5: My Favorite Black-Owned Spot for the Holidays 🎁🔥
  INSERT INTO campaigns (
    id,
    owner_id,
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
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_restaurant_id,
    'My Favorite Black-Owned Spot for the Holidays 🎁🔥',
    'Showcase a Black-owned Charlotte restaurant or café and why it''s perfect for the holiday season — gift vibes, family gathering vibes, winter comfort food, or festive menus.

Required CTA:
"Follow me on Troodie for my full list of Black-owned Charlotte gems. I got this opportunity on Troodie''s Creator Marketplace — download Troodie today!"',
    4000,
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE owner_id = v_user_id 
      AND title = 'My Favorite Black-Owned Spot for the Holidays 🎁🔥'
  );

  -- Campaign 6: Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️
  INSERT INTO campaigns (
    id,
    owner_id,
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
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_restaurant_id,
    'Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️',
    'Feature the best warm, comforting bowl in Charlotte — soup, ramen, pho, chili, curry, stew, etc. Highlight flavors + why it''s perfect for cold weather.

Required CTA:
"See more winter comfort eats on Troodie. I got this opportunity on Troodie''s Creator Marketplace — download Troodie to find spots like this!"',
    3500,
    1,
    'active',
    'unpaid',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE owner_id = v_user_id 
      AND title = 'Winter Warm-Up: Soup / Ramen / Pho Season 🍜❄️'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'All 6 test campaigns created/verified';
  RAISE NOTICE 'Assigned to: test-business1@bypass.com';
  RAISE NOTICE '========================================';

END $$;

-- Verification query
SELECT 
  c.id,
  c.title,
  c.budget_cents,
  c.status,
  c.payment_status,
  u.email as business_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE c.title LIKE '%Holiday%' 
   OR c.title LIKE '%Winter%' 
   OR c.title LIKE '%Festive%'
   OR c.title LIKE '%Dessert%'
   OR c.title LIKE '%Black-Owned%'
   OR c.title LIKE '%Warm-Up%'
ORDER BY c.created_at DESC;
