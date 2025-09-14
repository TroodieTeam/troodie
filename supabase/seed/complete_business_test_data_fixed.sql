-- ============================================
-- COMPLETE BUSINESS TEST DATA WITH FULL CAMPAIGNS
-- ============================================
-- This script creates a fully-featured business account with:
-- - Multiple campaigns (active, draft, completed)
-- - Creator applications with various statuses
-- - Portfolio items with engagement metrics
-- - Complete analytics data
-- ============================================

-- Clean up ALL test data related to this script
-- Delete test creator accounts first
DELETE FROM portfolio_items WHERE creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email IN (
      'creator_test_1@bypass.com',
      'creator_test_2@bypass.com', 
      'creator_test_3@bypass.com',
      'business_complete@bypass.com'
    )
  )
);

DELETE FROM campaign_applications WHERE creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email IN (
      'creator_test_1@bypass.com',
      'creator_test_2@bypass.com',
      'creator_test_3@bypass.com'
    )
  )
);

DELETE FROM campaign_applications WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE owner_id IN (
    SELECT id FROM auth.users WHERE email = 'business_complete@bypass.com'
  )
);

DELETE FROM campaigns WHERE owner_id IN (
  SELECT id FROM auth.users WHERE email = 'business_complete@bypass.com'
);

DELETE FROM business_profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'business_complete@bypass.com'
);

DELETE FROM creator_profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'creator_test_1@bypass.com',
    'creator_test_2@bypass.com',
    'creator_test_3@bypass.com',
    'business_complete@bypass.com'
  )
);

DELETE FROM users WHERE email IN (
  'creator_test_1@bypass.com',
  'creator_test_2@bypass.com',
  'creator_test_3@bypass.com',
  'business_complete@bypass.com'
);

DELETE FROM auth.users WHERE email IN (
  'creator_test_1@bypass.com',
  'creator_test_2@bypass.com',
  'creator_test_3@bypass.com',
  'business_complete@bypass.com'
);

DELETE FROM restaurants WHERE website = 'https://barcelonawine.complete.test';

-- Create temporary variables to store IDs
DO $$
DECLARE
  v_restaurant_id UUID;
  v_user_business_id UUID;
  v_business_profile_id UUID;
  v_user_creator1_id UUID;
  v_user_creator2_id UUID;
  v_user_creator3_id UUID;
  v_creator_profile1_id UUID;
  v_creator_profile2_id UUID;
  v_creator_profile3_id UUID;
  v_campaign1_id UUID;
  v_campaign2_id UUID;
  v_campaign3_id UUID;
  v_campaign4_id UUID;
  v_campaign5_id UUID;
BEGIN
  -- ============================================
  -- STEP 1: CREATE THE RESTAURANT
  -- ============================================
  INSERT INTO restaurants (
    id,
    name,
    address,
    city,
    state,
    zip_code,
    cuisine_types,
    price_range,
    phone,
    website,
    photos,
    cover_photo_url,
    troodie_rating,
    troodie_reviews_count,
    is_verified,
    is_claimed,
    data_source,
    total_ratings_count,
    green_ratings_count,
    yellow_ratings_count,
    red_ratings_count,
    overall_rating
  ) VALUES (
    gen_random_uuid(),
    'Barcelona Wine Bar & Restaurant',
    '1622 14th Street',
    'Denver',
    'CO',
    '80202',
    ARRAY['Spanish', 'Tapas', 'Wine Bar'],
    '3',
    '(303) 534-3535',
    'https://barcelonawine.complete.test',
    ARRAY[
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
    ],
    'https://images.unsplash.com/photo-1552566626-52f8b828add9',
    4.7,
    342,
    true,
    true,
    'seed',
    342,
    287,
    42,
    13,
    'green'
  ) RETURNING id INTO v_restaurant_id;

  -- ============================================
  -- STEP 2: CREATE THE BUSINESS OWNER
  -- ============================================
  -- First create the auth user
  v_user_business_id := gen_random_uuid();
  
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
    v_user_business_id,
    'business_complete@bypass.com',
    crypt('test123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Michael Rodriguez"}',
    'authenticated',
    'authenticated'
  );

  -- Then create the public users record
  INSERT INTO users (
    id,
    email,
    username,
    name,
    bio,
    avatar_url,
    account_type,
    account_status,
    is_restaurant,
    profile_completion,
    saves_count,
    followers_count,
    following_count
  ) VALUES (
    v_user_business_id,
    'business_complete@bypass.com',
    'barcelona_wine_denver',
    'Michael Rodriguez',
    'Owner of Barcelona Wine Bar & Restaurant in Denver. Passionate about Spanish cuisine and creating memorable dining experiences.',
    'https://ui-avatars.com/api/?name=Michael+Rodriguez&background=FFAD27&color=fff&size=200',
    'business',
    'active',
    true,
    100,
    0,
    1247,
    89
  );

  -- Create business profile
  INSERT INTO business_profiles (
    id,
    user_id,
    restaurant_id,
    verification_status,
    claimed_at,
    management_permissions,
    business_email,
    business_role,
    verification_method
  ) VALUES (
    gen_random_uuid(),
    v_user_business_id,
    v_restaurant_id,
    'verified',
    NOW() - INTERVAL '6 months',
    ARRAY['full_access', 'campaigns', 'analytics', 'settings'],
    'michael@barcelonawinedenver.com',
    'Owner',
    'domain_match'
  ) RETURNING id INTO v_business_profile_id;

  -- ============================================
  -- STEP 3: CREATE TEST CREATORS
  -- ============================================
  -- Creator 1: Food Blogger with high engagement
  v_user_creator1_id := gen_random_uuid();
  
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
    v_user_creator1_id,
    'creator_test_1@bypass.com',
    crypt('test123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Sarah Chen"}',
    'authenticated',
    'authenticated'
  );

  INSERT INTO users (
    id,
    email,
    username,
    name,
    bio,
    avatar_url,
    account_type,
    is_creator,
    followers_count
  ) VALUES (
    v_user_creator1_id,
    'creator_test_1@bypass.com',
    'denver_foodie_sarah',
    'Sarah Chen',
    'Denver food blogger | Exploring the best eats in the Mile High City 🍽️',
    'https://ui-avatars.com/api/?name=Sarah+Chen&background=6366F1&color=fff&size=200',
    'creator',
    true,
    12500
  );

  INSERT INTO creator_profiles (
    id,
    user_id,
    display_name,
    bio,
    specialties,
    location,
    verification_status,
    followers_count,
    content_count,
    account_status
  ) VALUES (
    gen_random_uuid(),
    v_user_creator1_id,
    'Denver Foodie Sarah',
    'Food blogger specializing in Denver dining scene',
    ARRAY['fine_dining', 'brunch', 'cocktails'],
    'Denver, CO',
    'verified',
    12500,
    156,
    'active'
  ) RETURNING id INTO v_creator_profile1_id;

  -- Creator 2: Instagram Influencer
  v_user_creator2_id := gen_random_uuid();
  
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
    v_user_creator2_id,
    'creator_test_2@bypass.com',
    crypt('test123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "James Miller"}',
    'authenticated',
    'authenticated'
  );

  INSERT INTO users (
    id,
    email,
    username,
    name,
    bio,
    avatar_url,
    account_type,
    is_creator,
    followers_count
  ) VALUES (
    v_user_creator2_id,
    'creator_test_2@bypass.com',
    'eat_drink_denver',
    'James Miller',
    'Capturing Denver''s culinary scene one bite at a time 📸',
    'https://ui-avatars.com/api/?name=James+Miller&background=10B981&color=fff&size=200',
    'creator',
    true,
    8300
  );

  INSERT INTO creator_profiles (
    id,
    user_id,
    display_name,
    bio,
    specialties,
    location,
    verification_status,
    followers_count,
    content_count,
    account_status
  ) VALUES (
    gen_random_uuid(),
    v_user_creator2_id,
    'Eat Drink Denver',
    'Instagram food photographer and reviewer',
    ARRAY['photography', 'wine', 'tapas'],
    'Denver, CO',
    'verified',
    8300,
    89,
    'active'
  ) RETURNING id INTO v_creator_profile2_id;

  -- Creator 3: TikTok Creator
  v_user_creator3_id := gen_random_uuid();
  
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
    v_user_creator3_id,
    'creator_test_3@bypass.com',
    crypt('test123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Emily Thompson"}',
    'authenticated',
    'authenticated'
  );

  INSERT INTO users (
    id,
    email,
    username,
    name,
    bio,
    avatar_url,
    account_type,
    is_creator,
    followers_count
  ) VALUES (
    v_user_creator3_id,
    'creator_test_3@bypass.com',
    'mile_high_eats',
    'Emily Thompson',
    'TikTok creator sharing hidden gems in Denver 🎬',
    'https://ui-avatars.com/api/?name=Emily+Thompson&background=EC4899&color=fff&size=200',
    'creator',
    true,
    25000
  );

  INSERT INTO creator_profiles (
    id,
    user_id,
    display_name,
    bio,
    specialties,
    location,
    verification_status,
    followers_count,
    content_count,
    account_status
  ) VALUES (
    gen_random_uuid(),
    v_user_creator3_id,
    'Mile High Eats',
    'TikTok food creator focused on Denver restaurants',
    ARRAY['video', 'trending', 'casual_dining'],
    'Denver, CO',
    'verified',
    25000,
    234,
    'active'
  ) RETURNING id INTO v_creator_profile3_id;

  -- ============================================
  -- STEP 4: CREATE CAMPAIGNS
  -- ============================================

  -- Campaign 1: ACTIVE - Summer Tapas Festival
  INSERT INTO campaigns (
    id,
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    budget_cents,
    spent_amount_cents,
    start_date,
    end_date,
    max_creators,
    selected_creators_count,
    total_deliverables,
    delivered_content_count,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_restaurant_id,
    v_user_business_id,
    'Summer Tapas Festival',
    'Summer Tapas Festival',
    'Showcase our special summer tapas menu and sangria selections. Looking for creators to capture the vibrant atmosphere and delicious small plates.',
    'active',
    50000,  -- $500
    35000,  -- $350 spent
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days',
    5,
    3,
    15,
    7,
    NOW() - INTERVAL '20 days'
  ) RETURNING id INTO v_campaign1_id;

  -- Campaign 2: ACTIVE - Happy Hour Spotlight
  INSERT INTO campaigns (
    id,
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    budget_cents,
    spent_amount_cents,
    start_date,
    end_date,
    max_creators,
    selected_creators_count,
    total_deliverables,
    delivered_content_count,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_restaurant_id,
    v_user_business_id,
    'Happy Hour Spotlight',
    'Happy Hour Spotlight',
    'Promote our new happy hour menu (3-6pm weekdays). Need content highlighting our cocktail specials and appetizer deals.',
    'active',
    30000,  -- $300
    15000,  -- $150 spent
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    3,
    2,
    9,
    3,
    NOW() - INTERVAL '10 days'
  ) RETURNING id INTO v_campaign2_id;

  -- Campaign 3: PENDING - Wine Tasting Event
  INSERT INTO campaigns (
    id,
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    budget_cents,
    spent_amount_cents,
    start_date,
    end_date,
    max_creators,
    selected_creators_count,
    total_deliverables,
    delivered_content_count,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_restaurant_id,
    v_user_business_id,
    'Wine Tasting Event',
    'Wine Tasting Event',
    'Monthly wine tasting event featuring Spanish wines. Looking for creators interested in wine education and pairings.',
    'pending',
    100000,  -- $1000
    0,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '60 days',
    10,
    0,
    30,
    0,
    NOW() - INTERVAL '2 days'
  ) RETURNING id INTO v_campaign3_id;

  -- Campaign 4: COMPLETED - Grand Opening Campaign
  INSERT INTO campaigns (
    id,
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    budget_cents,
    spent_amount_cents,
    start_date,
    end_date,
    max_creators,
    selected_creators_count,
    total_deliverables,
    delivered_content_count,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_restaurant_id,
    v_user_business_id,
    'Grand Opening Campaign',
    'Grand Opening Campaign',
    'Grand opening celebration content. Successfully generated buzz for our Denver location launch.',
    'completed',
    80000,  -- $800
    80000,  -- $800 fully spent
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '60 days',
    5,
    5,
    20,
    20,
    NOW() - INTERVAL '95 days'
  ) RETURNING id INTO v_campaign4_id;

  -- Campaign 5: COMPLETED - Valentine's Special
  INSERT INTO campaigns (
    id,
    restaurant_id,
    owner_id,
    name,
    title,
    description,
    status,
    budget_cents,
    spent_amount_cents,
    start_date,
    end_date,
    max_creators,
    selected_creators_count,
    total_deliverables,
    delivered_content_count,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_restaurant_id,
    v_user_business_id,
    'Valentine''s Special',
    'Valentine''s Special',
    'Romantic dinner promotion for Valentine''s Day. Featured our special prix fixe menu.',
    'completed',
    40000,  -- $400
    40000,  -- $400 fully spent
    '2025-02-10',
    '2025-02-15',
    2,
    2,
    6,
    6,
    '2025-02-01'
  ) RETURNING id INTO v_campaign5_id;

  -- ============================================
  -- STEP 5: CREATE CAMPAIGN APPLICATIONS
  -- ============================================

  -- Application 1: ACCEPTED - Sarah for Summer Tapas
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    proposed_rate_cents,
    proposed_deliverables,
    cover_letter,
    status,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign1_id,
    v_creator_profile1_id,
    15000,  -- $150
    '5 Instagram posts and 3 story sets',
    'I''d love to showcase your summer tapas menu! My audience loves Spanish cuisine and I have experience creating engaging food content.',
    'accepted',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '17 days',
    v_user_business_id
  );

  -- Application 2: ACCEPTED - James for Summer Tapas
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    proposed_rate_cents,
    proposed_deliverables,
    cover_letter,
    status,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign1_id,
    v_creator_profile2_id,
    10000,  -- $100
    '3 high-quality photo posts with professional editing',
    'My photography style would perfectly capture the vibrant colors of your tapas dishes.',
    'accepted',
    NOW() - INTERVAL '16 days',
    NOW() - INTERVAL '15 days',
    v_user_business_id
  );

  -- Application 3: PENDING - Emily for Summer Tapas
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    proposed_rate_cents,
    proposed_deliverables,
    cover_letter,
    status,
    applied_at
  ) VALUES (
    v_campaign1_id,
    v_creator_profile3_id,
    20000,  -- $200
    '2 TikTok videos and 1 Instagram Reel',
    'I can create viral-worthy videos showcasing your tapas in a fun, engaging way!',
    'pending',
    NOW() - INTERVAL '2 days'
  );

  -- Application 4: ACCEPTED - Sarah for Happy Hour
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    proposed_rate_cents,
    proposed_deliverables,
    cover_letter,
    status,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign2_id,
    v_creator_profile1_id,
    8000,  -- $80
    '3 posts focused on cocktails and appetizers',
    'Happy hour content performs great with my audience. I can highlight your specials effectively.',
    'accepted',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '3 days',
    v_user_business_id
  );

  -- Application 5: PENDING - James for Happy Hour
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    proposed_rate_cents,
    proposed_deliverables,
    cover_letter,
    status,
    applied_at
  ) VALUES (
    v_campaign2_id,
    v_creator_profile2_id,
    7000,  -- $70
    '2 cocktail photography posts',
    'I specialize in beverage photography and can make your cocktails look irresistible.',
    'pending',
    NOW() - INTERVAL '1 day'
  );

  -- Application 6: REJECTED - Emily for Happy Hour
  INSERT INTO campaign_applications (
    campaign_id,
    creator_id,
    proposed_rate_cents,
    proposed_deliverables,
    cover_letter,
    status,
    applied_at,
    reviewed_at,
    reviewer_id
  ) VALUES (
    v_campaign2_id,
    v_creator_profile3_id,
    15000,  -- $150
    '1 TikTok video',
    'Quick video showcasing the happy hour vibe',
    'rejected',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    v_user_business_id
  );

  -- ============================================
  -- STEP 6: CREATE PORTFOLIO ITEMS (Content Delivered)
  -- ============================================

  -- Portfolio 1: Sarah's content for Summer Tapas
  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile1_id,
    v_campaign1_id,
    'https://instagram.com/p/example1',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
    'photo',
    'Absolutely in love with these tapas at Barcelona Wine Bar! The flavors are incredible 🍷✨',
    5200,
    623,
    45,
    28,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  );

  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile1_id,
    v_campaign1_id,
    'https://instagram.com/p/example2',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
    'reel',
    'Summer vibes at Barcelona Wine Bar 🌞 Don''t miss their special tapas menu!',
    12000,
    1450,
    89,
    156,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
  );

  -- Portfolio 2: James's content for Summer Tapas
  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile2_id,
    v_campaign1_id,
    'https://instagram.com/p/example3',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    'photo',
    'Artfully crafted tapas that taste as good as they look 📸',
    3400,
    412,
    22,
    15,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
  );

  -- Portfolio 3: Sarah's content for Happy Hour
  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile1_id,
    v_campaign2_id,
    'https://instagram.com/p/example4',
    'https://images.unsplash.com/photo-1551024601-bec78aea704b',
    'story',
    'Happy Hour alert! 🍹 Amazing deals at Barcelona Wine Bar from 3-6pm',
    8900,
    890,
    34,
    67,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

  -- Portfolio 4: Content from completed Grand Opening campaign
  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile1_id,
    v_campaign4_id,
    'https://instagram.com/p/example5',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
    'reel',
    'Grand Opening at Barcelona Wine Bar! This place is going to be HUGE in Denver! 🎉',
    15000,
    2100,
    178,
    234,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    NOW() - INTERVAL '75 days',
    NOW() - INTERVAL '75 days'
  );

  -- Portfolio 5: Content from Valentine's campaign
  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile2_id,
    v_campaign5_id,
    'https://instagram.com/p/example6',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe',
    'photo',
    'Romance is in the air at Barcelona Wine Bar ❤️ Perfect spot for Valentine''s dinner',
    4500,
    567,
    45,
    23,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    '2025-02-14',
    '2025-02-14'
  );

  INSERT INTO portfolio_items (
    creator_id,
    campaign_id,
    content_url,
    thumbnail_url,
    content_type,
    caption,
    views,
    likes,
    comments,
    shares,
    restaurant_id,
    restaurant_name,
    posted_at,
    created_at
  ) VALUES (
    v_creator_profile3_id,
    v_campaign5_id,
    'https://tiktok.com/@example7',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445',
    'video',
    'Valentine''s Day date night sorted! Check out this amazing prix fixe menu',
    3800,
    423,
    28,
    45,
    v_restaurant_id,
    'Barcelona Wine Bar & Restaurant',
    '2025-02-13',
    '2025-02-13'
  );

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Business account: business_complete@bypass.com (OTP: 000000)';
  RAISE NOTICE 'Restaurant: Barcelona Wine Bar & Restaurant';
  RAISE NOTICE 'Campaigns: 5 (2 active, 1 pending, 2 completed)';
  RAISE NOTICE 'Applications: 6 (3 accepted, 2 pending, 1 rejected)';
  RAISE NOTICE 'Portfolio Items: 7 delivered content pieces';
  
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check the business user
SELECT 
  u.email,
  u.username,
  u.account_type,
  bp.restaurant_id,
  r.name as restaurant_name
FROM users u
JOIN business_profiles bp ON bp.user_id = u.id
JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email = 'business_complete@bypass.com';

-- Check campaigns
SELECT 
  name,
  status,
  budget_cents/100.0 as budget,
  spent_amount_cents/100.0 as spent,
  selected_creators_count,
  delivered_content_count
FROM campaigns
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'business_complete@bypass.com')
ORDER BY created_at DESC;

-- Check applications
SELECT 
  c.name as campaign,
  cp.display_name as creator,
  ca.status,
  ca.proposed_rate_cents/100.0 as proposed_rate
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
WHERE c.owner_id = (SELECT id FROM auth.users WHERE email = 'business_complete@bypass.com')
ORDER BY ca.applied_at DESC;

-- Check portfolio items
SELECT 
  cp.display_name as creator,
  pi.content_type,
  pi.views,
  pi.likes,
  c.name as campaign
FROM portfolio_items pi
JOIN creator_profiles cp ON pi.creator_id = cp.id
LEFT JOIN campaigns c ON pi.campaign_id = c.id
WHERE pi.restaurant_id = (
  SELECT restaurant_id FROM business_profiles 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'business_complete@bypass.com')
)
ORDER BY pi.posted_at DESC;