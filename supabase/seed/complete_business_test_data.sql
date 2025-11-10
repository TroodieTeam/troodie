-- ============================================
-- COMPLETE BUSINESS TEST DATA WITH FULL CAMPAIGNS
-- ============================================
-- This script creates a fully-featured business account with:
-- - Multiple campaigns (active, draft, completed)
-- - Creator applications with various statuses
-- - Portfolio items with engagement metrics
-- - Complete analytics data
-- ============================================

-- Clean up existing test business data
DELETE FROM portfolio_items WHERE creator_id IN (
  SELECT id FROM creator_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%complete@bypass.com'
  )
);
DELETE FROM campaign_applications WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE owner_id IN (
    SELECT id FROM users WHERE email LIKE '%complete@bypass.com'
  )
);
DELETE FROM campaigns WHERE owner_id IN (
  SELECT id FROM users WHERE email LIKE '%complete@bypass.com'
);
DELETE FROM business_profiles WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%complete@bypass.com'
);
DELETE FROM creator_profiles WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%complete@bypass.com'
);
DELETE FROM users WHERE email LIKE '%complete@bypass.com';
DELETE FROM restaurants WHERE website = 'https://barcelonawine.complete.test';

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
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  '1622 14th Street',
  'Denver',
  'CO',
  '80202',
  ARRAY['Spanish', 'Tapas', 'Wine Bar'],
  '$$$',
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
);

-- ============================================
-- STEP 2: CREATE THE BUSINESS OWNER
-- ============================================
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
  'user-business-complete',
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
  'bp-complete-001',
  'user-business-complete',
  'rest-complete-001',
  'verified',
  NOW() - INTERVAL '6 months',
  ARRAY['full_access', 'campaigns', 'analytics', 'settings'],
  'michael@barcelonawinedenver.com',
  'Owner',
  'domain_match'
);

-- ============================================
-- STEP 3: CREATE TEST CREATORS
-- ============================================
-- Creator 1: Food Blogger with high engagement
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
  'user-creator-test-1',
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
  'cp-test-001',
  'user-creator-test-1',
  'Denver Foodie Sarah',
  'Food blogger specializing in Denver dining scene',
  ARRAY['fine_dining', 'brunch', 'cocktails'],
  'Denver, CO',
  'verified',
  12500,
  156,
  'active'
);

-- Creator 2: Instagram Influencer
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
  'user-creator-test-2',
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
  'cp-test-002',
  'user-creator-test-2',
  'Eat Drink Denver',
  'Instagram food photographer and reviewer',
  ARRAY['photography', 'wine', 'tapas'],
  'Denver, CO',
  'verified',
  8300,
  89,
  'active'
);

-- Creator 3: TikTok Creator
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
  'user-creator-test-3',
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
  'cp-test-003',
  'user-creator-test-3',
  'Mile High Eats',
  'TikTok food creator focused on Denver restaurants',
  ARRAY['video', 'trending', 'casual_dining'],
  'Denver, CO',
  'verified',
  25000,
  234,
  'active'
);

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
  budget,
  budget_cents,
  spent_amount_cents,
  start_date,
  end_date,
  max_creators,
  selected_creators_count,
  total_deliverables,
  delivered_content_count,
  campaign_type,
  requirements,
  created_at,
  updated_at
) VALUES (
  'camp-001',
  'rest-complete-001',
  'user-business-complete',
  'Summer Tapas Festival 2025',
  'Summer Tapas Festival 2025',
  'Promote our special summer tapas menu featuring seasonal ingredients and new Spanish wines. Looking for creators to showcase the authentic Spanish dining experience.',
  'active',
  2500,
  250000,
  75000,
  '2025-09-01',
  '2025-09-30',
  5,
  2,
  10,
  3,
  'seasonal_promotion',
  ARRAY['Must visit during dinner service', 'Include photos of at least 5 tapas dishes', 'Mention our wine pairing options', 'Tag @barcelonawinedenver'],
  NOW() - INTERVAL '15 days',
  NOW()
);

-- Campaign 2: ACTIVE - Happy Hour Promotion
INSERT INTO campaigns (
  id,
  restaurant_id,
  owner_id,
  name,
  title,
  description,
  status,
  budget,
  budget_cents,
  spent_amount_cents,
  start_date,
  end_date,
  max_creators,
  selected_creators_count,
  total_deliverables,
  delivered_content_count,
  campaign_type,
  created_at,
  updated_at
) VALUES (
  'camp-002',
  'rest-complete-001',
  'user-business-complete',
  'Happy Hour Spotlight',
  'Happy Hour Spotlight',
  'Showcase our daily happy hour specials (3-6pm). Focus on our $5 tapas and half-price sangria pitchers.',
  'active',
  1500,
  150000,
  30000,
  '2025-09-10',
  '2025-10-10',
  3,
  1,
  6,
  1,
  'recurring_promotion',
  NOW() - INTERVAL '5 days',
  NOW()
);

-- Campaign 3: DRAFT - Fall Wine Dinner
INSERT INTO campaigns (
  id,
  restaurant_id,
  owner_id,
  name,
  title,
  description,
  status,
  budget,
  budget_cents,
  start_date,
  end_date,
  max_creators,
  campaign_type,
  created_at,
  updated_at
) VALUES (
  'camp-003',
  'rest-complete-001',
  'user-business-complete',
  'Fall Wine Pairing Dinner',
  'Fall Wine Pairing Dinner',
  'Special 5-course wine pairing dinner event on October 15th. Need creators to build anticipation and cover the event.',
  'draft',
  3500,
  350000,
  '2025-10-01',
  '2025-10-20',
  8,
  'special_event',
  NOW() - INTERVAL '2 days',
  NOW()
);

-- Campaign 4: COMPLETED - Grand Opening Anniversary
INSERT INTO campaigns (
  id,
  restaurant_id,
  owner_id,
  name,
  title,
  description,
  status,
  budget,
  budget_cents,
  spent_amount_cents,
  start_date,
  end_date,
  max_creators,
  selected_creators_count,
  total_deliverables,
  delivered_content_count,
  campaign_type,
  created_at,
  updated_at
) VALUES (
  'camp-004',
  'rest-complete-001',
  'user-business-complete',
  '5 Year Anniversary Celebration',
  '5 Year Anniversary Celebration',
  'Celebrated our 5 year anniversary with special menu items and events throughout the month.',
  'completed',
  5000,
  500000,
  485000,
  '2025-08-01',
  '2025-08-31',
  10,
  9,
  20,
  20,
  'special_event',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '15 days'
);

-- Campaign 5: COMPLETED - Valentine's Special
INSERT INTO campaigns (
  id,
  restaurant_id,
  owner_id,
  name,
  title,
  description,
  status,
  budget,
  budget_cents,
  spent_amount_cents,
  start_date,
  end_date,
  max_creators,
  selected_creators_count,
  total_deliverables,
  delivered_content_count,
  campaign_type,
  created_at,
  updated_at
) VALUES (
  'camp-005',
  'rest-complete-001',
  'user-business-complete',
  'Valentine''s Day Romance Package',
  'Valentine''s Day Romance Package',
  'Promoted our special Valentine''s prix fixe menu and wine pairings for couples.',
  'completed',
  2000,
  200000,
  200000,
  '2025-02-01',
  '2025-02-14',
  4,
  4,
  8,
  8,
  'holiday_promotion',
  NOW() - INTERVAL '8 months',
  NOW() - INTERVAL '7 months'
);

-- ============================================
-- STEP 5: CREATE CAMPAIGN APPLICATIONS
-- ============================================

-- Applications for Campaign 1 (Summer Tapas)
-- Accepted application from Sarah
INSERT INTO campaign_applications (
  id,
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
  'app-001',
  'camp-001',
  'cp-test-001',
  50000,
  '3 Instagram posts, 5 stories, 1 reel showcasing the summer menu',
  'I''d love to showcase your summer tapas menu! My audience loves Spanish cuisine and I have experience creating engaging content for upscale dining.',
  'accepted',
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '13 days',
  'user-business-complete'
);

-- Accepted application from James
INSERT INTO campaign_applications (
  id,
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
  'app-002',
  'camp-001',
  'cp-test-002',
  25000,
  '2 Instagram posts with professional photography, 3 stories',
  'Your tapas look amazing! I specialize in food photography and can create stunning visuals that highlight the artistry of your dishes.',
  'accepted',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '11 days',
  'user-business-complete'
);

-- Pending application from Emily
INSERT INTO campaign_applications (
  id,
  campaign_id,
  creator_id,
  proposed_rate_cents,
  proposed_deliverables,
  cover_letter,
  status,
  applied_at
) VALUES (
  'app-003',
  'camp-001',
  'cp-test-003',
  75000,
  '2 TikTok videos, 1 Instagram reel, cross-posting to all platforms',
  'I can create viral TikTok content showcasing your tapas in a fun, engaging way that resonates with younger audiences!',
  'pending',
  NOW() - INTERVAL '2 days'
);

-- Rejected application for Campaign 1
INSERT INTO campaign_applications (
  id,
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
  'app-004',
  'camp-001',
  'cp-test-003',
  150000,
  '1 post only',
  'I can do one post for $1500',
  'rejected',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '9 days',
  'user-business-complete'
);

-- Applications for Campaign 2 (Happy Hour)
-- Accepted application
INSERT INTO campaign_applications (
  id,
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
  'app-005',
  'camp-002',
  'cp-test-001',
  30000,
  '2 Instagram posts during happy hour, stories showing the atmosphere',
  'Happy hour content performs really well with my audience. I can showcase the vibe and value!',
  'accepted',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '3 days',
  'user-business-complete'
);

-- Pending applications for Campaign 2
INSERT INTO campaign_applications (
  id,
  campaign_id,
  creator_id,
  proposed_rate_cents,
  proposed_deliverables,
  cover_letter,
  status,
  applied_at
) VALUES (
  'app-006',
  'camp-002',
  'cp-test-002',
  25000,
  'Photo series of happy hour specials with detailed captions',
  'I can capture the perfect golden hour lighting during your happy hour!',
  'pending',
  NOW() - INTERVAL '1 day'
);

-- ============================================
-- STEP 6: CREATE PORTFOLIO ITEMS (Content)
-- ============================================

-- Portfolio items for Sarah (Campaign 1)
INSERT INTO portfolio_items (
  id,
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
  'port-001',
  'cp-test-001',
  'camp-001',
  'https://instagram.com/p/sample1',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
  'photo',
  'Incredible evening at @barcelonawinedenver! The summer tapas menu is a must-try 🍷✨',
  3456,
  287,
  23,
  45,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
);

INSERT INTO portfolio_items (
  id,
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
  'port-002',
  'cp-test-001',
  'camp-001',
  'https://instagram.com/p/sample2',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187',
  'reel',
  'Tapas tour at Barcelona Wine Bar! Which dish would you try first? 🥘',
  8923,
  652,
  89,
  123,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
);

-- Portfolio items for James (Campaign 1)
INSERT INTO portfolio_items (
  id,
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
  'port-003',
  'cp-test-002',
  'camp-001',
  'https://instagram.com/p/sample3',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
  'photo',
  'The art of Spanish tapas at @barcelonawinedenver 📸 Every dish is a masterpiece!',
  2341,
  198,
  15,
  28,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
);

-- Portfolio item for Happy Hour campaign
INSERT INTO portfolio_items (
  id,
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
  'port-004',
  'cp-test-001',
  'camp-002',
  'https://instagram.com/p/sample4',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
  'photo',
  'Happy Hour heaven! $5 tapas and half-price sangria at Barcelona Wine Bar 🍷 3-6pm daily!',
  4567,
  423,
  67,
  89,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
);

-- Historical portfolio items (for completed campaigns)
INSERT INTO portfolio_items (
  id,
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
  'port-005',
  'cp-test-001',
  'camp-004',
  'https://instagram.com/p/anniversary1',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
  'photo',
  'Celebrating 5 years of incredible Spanish cuisine at Barcelona Wine Bar! 🎉',
  12456,
  1823,
  234,
  345,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
),
(
  'port-006',
  'cp-test-002',
  'camp-004',
  'https://instagram.com/p/anniversary2',
  'https://images.unsplash.com/photo-1529042410759-befb1204b468',
  'video',
  '5 Year Anniversary special menu tasting @barcelonawinedenver 🥂',
  8901,
  967,
  112,
  198,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '28 days',
  NOW() - INTERVAL '28 days'
),
(
  'port-007',
  'cp-test-003',
  'camp-005',
  'https://tiktok.com/@sample/valentine',
  'https://images.unsplash.com/photo-1481931098730-318b6f776db0',
  'video',
  'Valentine''s Day at Barcelona Wine Bar was pure romance! 💕',
  45678,
  5234,
  678,
  892,
  'rest-complete-001',
  'Barcelona Wine Bar & Restaurant',
  NOW() - INTERVAL '7 months',
  NOW() - INTERVAL '7 months'
);

-- ============================================
-- STEP 7: UPDATE CAMPAIGN METRICS
-- ============================================

-- Update metrics based on applications (triggers should handle this, but setting explicitly)
UPDATE campaigns SET 
  selected_creators_count = 2,
  spent_amount_cents = 75000
WHERE id = 'camp-001';

UPDATE campaigns SET 
  selected_creators_count = 1,
  spent_amount_cents = 30000
WHERE id = 'camp-002';

UPDATE campaigns SET 
  selected_creators_count = 9,
  spent_amount_cents = 485000,
  delivered_content_count = 20
WHERE id = 'camp-004';

UPDATE campaigns SET 
  selected_creators_count = 4,
  spent_amount_cents = 200000,
  delivered_content_count = 8
WHERE id = 'camp-005';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check the complete business user
SELECT 
  u.email,
  u.name,
  u.account_type,
  r.name as restaurant_name,
  bp.verification_status
FROM users u
JOIN business_profiles bp ON bp.user_id = u.id
JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email = 'business_complete@bypass.com';

-- Check campaigns summary
SELECT 
  name,
  status,
  budget_cents/100 as budget,
  spent_amount_cents/100 as spent,
  selected_creators_count as creators,
  delivered_content_count as content_delivered,
  CASE 
    WHEN end_date < CURRENT_DATE THEN 'Ended'
    WHEN start_date > CURRENT_DATE THEN 'Upcoming'
    ELSE (end_date - CURRENT_DATE)::text || ' days left'
  END as timeline
FROM campaigns
WHERE owner_id = 'user-business-complete'
ORDER BY created_at DESC;

-- Check pending applications
SELECT 
  c.name as campaign_name,
  cp.display_name as creator_name,
  ca.proposed_rate_cents/100 as proposed_rate,
  ca.status,
  ca.applied_at
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
WHERE c.owner_id = 'user-business-complete'
  AND ca.status = 'pending'
ORDER BY ca.applied_at DESC;

-- Analytics overview
SELECT 
  COUNT(DISTINCT c.id) as total_campaigns,
  COUNT(DISTINCT ca.creator_id) FILTER (WHERE ca.status = 'accepted') as total_creators,
  COUNT(DISTINCT pi.id) as total_content,
  SUM(c.spent_amount_cents)/100 as total_spent,
  SUM(pi.views) as total_views,
  SUM(pi.likes) as total_engagement
FROM campaigns c
LEFT JOIN campaign_applications ca ON c.id = ca.campaign_id
LEFT JOIN portfolio_items pi ON c.id = pi.campaign_id
WHERE c.owner_id = 'user-business-complete';

-- ============================================
-- OUTPUT MESSAGE
-- ============================================
SELECT '✅ Complete business test data created successfully!' as status,
       'Email: business_complete@bypass.com' as login,
       'OTP: 000000' as otp,
       'Restaurant: Barcelona Wine Bar & Restaurant' as restaurant,
       '5 campaigns, 6 applications, 7 content pieces' as data_summary;