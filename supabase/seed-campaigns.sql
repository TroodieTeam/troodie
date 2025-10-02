-- Seed script for campaigns with realistic data
-- Run this in Supabase SQL editor

-- First, let's get or create a business user and some restaurants
DO $$
DECLARE
  v_user_id uuid;
  v_restaurant_id uuid;
  v_restaurant_count int;
BEGIN
  -- Get a business user (or use a default UUID)
  SELECT id INTO v_user_id FROM auth.users WHERE email LIKE '%business%' LIMIT 1;

  -- If no business user exists, you can manually set one
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid(); -- You might want to replace with an actual user ID
  END IF;

  -- Create restaurants and campaigns

  -- Restaurant 1: The Garden Table
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'The Garden Table', ARRAY['Farm-to-Table American'], 'Portland', 'OR', '$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    '123 Garden Street', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Spring Menu Launch - Content Creation',
    'We''re launching our new spring menu featuring locally-sourced ingredients and need stunning visual content. Looking for creators to capture our seasonal dishes, cocktails, and the vibrant atmosphere. Must showcase farm-to-table story.',
    ARRAY[
      'Minimum 10K followers on Instagram/TikTok',
      'Experience with food photography/videography',
      'Create 3 Reels and 5 static posts',
      'Highlight seasonal ingredients story',
      'Available for 2 visits in March'
    ],
    150000, NOW() + INTERVAL '2 days', NOW() + INTERVAL '21 days',
    'active', 'seasonal_launch', 3, 1, NOW(), NOW()
  );

  -- Restaurant 2: Sunny Side Café
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Sunny Side Café', ARRAY['Brunch & Breakfast'], 'Austin', 'TX', '$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
    '456 Morning Avenue', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Weekend Brunch Experience',
    'Capture our legendary weekend brunch scene! We need content creators to showcase our bottomless mimosa brunch, signature eggs benedict variations, and lively weekend atmosphere. Perfect for lifestyle and food creators.',
    ARRAY[
      '5K+ engaged followers',
      'Weekend availability',
      'Create Instagram Stories series',
      '1 TikTok showing brunch preparation',
      'Tag location and use campaign hashtag'
    ],
    75000, NOW() + INTERVAL '3 days', NOW() + INTERVAL '17 days',
    'active', 'brunch_promo', 5, 2, NOW(), NOW()
  );

  -- Restaurant 3: La Calle Tacos
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'La Calle Tacos', ARRAY['Mexican Street Food'], 'Los Angeles', 'CA', '$', true,
    v_user_id, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
    '789 Taco Way', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Taco Tuesday Takeover',
    'Join our Taco Tuesday celebration! We''re looking for creators to showcase our authentic street tacos, craft margaritas, and vibrant atmosphere. Must capture the energy of our Tuesday night crowd and highlight our taco varieties.',
    ARRAY[
      '3K+ followers minimum',
      'Available Tuesday evenings',
      'Create engaging Reels/TikToks',
      'Showcase at least 3 taco varieties',
      'Include margarita pairings'
    ],
    50000, NOW() + INTERVAL '1 day', NOW() + INTERVAL '14 days',
    'active', 'weekly_special', 8, 5, NOW(), NOW()
  );

  -- Restaurant 4: Le Bernardin NYC
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Le Bernardin NYC', ARRAY['French Fine Dining'], 'New York', 'NY', '$$$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    '155 West 51st Street', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Michelin Star Experience Documentation',
    'Document an exclusive dining experience at our Michelin-starred restaurant. Looking for sophisticated content creators who can capture the artistry of fine dining, from amuse-bouche to dessert. Black-tie dress code required.',
    ARRAY[
      '50K+ followers with luxury lifestyle audience',
      'Professional photography equipment',
      'Experience with fine dining content',
      'Create long-form YouTube video or IG series',
      'Available for 3-hour dinner service'
    ],
    500000, NOW() + INTERVAL '5 days', NOW() + INTERVAL '25 days',
    'active', 'luxury_dining', 2, 0, NOW(), NOW()
  );

  -- Restaurant 5: Nobu Downtown
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Nobu Downtown', ARRAY['Japanese Sushi'], 'Miami', 'FL', '$$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80',
    '195 Broadway', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Sushi Making Masterclass',
    'Join our head chef for an exclusive sushi-making masterclass and omakase experience. Create educational content showing traditional techniques, knife skills, and the art of sushi preparation.',
    ARRAY[
      '15K+ followers interested in Japanese culture',
      'Ability to create educational content',
      '4-hour time commitment',
      'Create tutorial-style content',
      'Professional video equipment preferred'
    ],
    200000, NOW() + INTERVAL '4 days', NOW() + INTERVAL '20 days',
    'active', 'educational', 4, 1, NOW(), NOW()
  );

  -- Restaurant 6: Brick Oven Brewhouse
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Brick Oven Brewhouse', ARRAY['Pizza & Brewery'], 'Denver', 'CO', '$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    '321 Brew Street', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Pizza & Craft Beer Pairing Night',
    'Showcase our artisanal pizza and craft beer pairings! We''re hosting a special tasting event for creators to experience our wood-fired pizzas paired with local craft beers. Great for food and beverage enthusiasts.',
    ARRAY[
      '8K+ followers',
      '21+ years old',
      'Create content for both food and drinks',
      'Available Thursday evening',
      'Include beer tasting notes'
    ],
    100000, NOW() + INTERVAL '2 days', NOW() + INTERVAL '15 days',
    'active', 'event_coverage', 6, 3, NOW(), NOW()
  );

  -- Restaurant 7: Planted Kitchen
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Planted Kitchen', ARRAY['Upscale Vegan'], 'San Francisco', 'CA', '$$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    '555 Green Avenue', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Vegan Restaurant Grand Opening',
    'Be part of our grand opening celebration! We''re launching the city''s first 100% plant-based fine dining restaurant. Looking for creators passionate about sustainability, health, and innovative vegan cuisine.',
    ARRAY[
      'Interest in vegan/sustainable lifestyle',
      '10K+ health-conscious followers',
      'Create opening week content series',
      'Highlight sustainability practices',
      'Available for soft opening event'
    ],
    125000, NOW(), NOW() + INTERVAL '10 days',
    'active', 'grand_opening', 10, 4, NOW(), NOW()
  );

  -- Restaurant 8: Smokey Joe's BBQ
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Smokey Joe''s BBQ', ARRAY['Texas BBQ'], 'Houston', 'TX', '$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80',
    '888 Pitmaster Lane', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'BBQ Pitmaster Challenge',
    'Join our weekend BBQ challenge! Document the smoking process, meat preparation, and the ultimate BBQ feast. We need creators who can capture the authentic Texas BBQ experience from pit to plate.',
    ARRAY[
      '5K+ followers',
      'Available for full-day shoot',
      'Create behind-the-scenes content',
      'Showcase different meat cuts',
      'Include pitmaster interview'
    ],
    80000, NOW() + INTERVAL '6 days', NOW() + INTERVAL '18 days',
    'active', 'behind_scenes', 4, 2, NOW(), NOW()
  );

  -- Restaurant 9: Sky Lounge
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Sky Lounge', ARRAY['Cocktail Bar'], 'Chicago', 'IL', '$$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    '100 Skyline Drive', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Cocktail Hour Stories',
    'Create stunning content during our golden hour cocktail service. Focus on our signature cocktails, rooftop views, and sophisticated ambiance. Perfect for lifestyle and nightlife content creators.',
    ARRAY[
      '21+ years old',
      '7K+ followers',
      'Golden hour availability (5-7 PM)',
      'Create cocktail preparation videos',
      'Capture rooftop ambiance'
    ],
    90000, NOW() + INTERVAL '3 days', NOW() + INTERVAL '16 days',
    'active', 'drinks_feature', 5, 1, NOW(), NOW()
  );

  -- Restaurant 10: Golden Dragon
  INSERT INTO restaurants (
    name, cuisine_types, city, state, price_range, is_claimed,
    owner_id, cover_photo_url, address, created_at, updated_at
  ) VALUES (
    'Golden Dragon', ARRAY['Cantonese Dim Sum'], 'San Francisco', 'CA', '$$', true,
    v_user_id, 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
    '777 Chinatown Street', NOW(), NOW()
  ) RETURNING id INTO v_restaurant_id;

  INSERT INTO campaigns (
    restaurant_id, owner_id, title, description, requirements,
    budget_cents, start_date, end_date, status, campaign_type,
    max_creators, selected_creators_count, created_at, updated_at
  ) VALUES (
    v_restaurant_id, v_user_id,
    'Dim Sum Sunday Special',
    'Showcase our traditional dim sum service! We need creators to capture the variety of dumplings, the tea ceremony, and the authentic Cantonese dining experience. Family-friendly content encouraged.',
    ARRAY[
      'Experience with Asian cuisine content',
      'Sunday morning availability',
      'Create educational content about dim sum',
      'Family-friendly content welcome',
      'Minimum 3 posts required'
    ],
    60000, NOW() + INTERVAL '4 days', NOW() + INTERVAL '19 days',
    'active', 'cultural_cuisine', 7, 4, NOW(), NOW()
  );

END $$;

-- Verify the campaigns were created
SELECT
  c.title,
  c.budget_cents / 100 as budget_dollars,
  c.campaign_type,
  r.name as restaurant_name,
  r.cover_photo_url
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.status = 'active'
ORDER BY c.created_at DESC
LIMIT 10;