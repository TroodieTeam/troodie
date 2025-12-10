-- ============================================================================
-- PART 7: Create Restaurant Analytics Test Data (CM-6)
-- ============================================================================
-- Run this part to populate analytics data for testing CM-6: Restaurant Analytics Dashboard
-- This creates saves, posts, and engagement data for the test restaurants
-- ============================================================================

DO $$
DECLARE
  business1_id UUID := 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid; -- prod-business1@bypass.com
  business2_id UUID := '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid; -- prod-business2@bypass.com
  creator1_id UUID := '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid; -- prod-creator1@bypass.com
  creator2_id UUID := '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid; -- prod-creator2@bypass.com
  creator3_id UUID := '08f478e2-45b9-4ab2-a068-8276beb851c3'::uuid; -- prod-creator3@bypass.com
  restaurant1_id UUID;
  restaurant2_id UUID;
  board1_id UUID;
  board2_id UUID;
  board3_id UUID;
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
  
  IF restaurant1_id IS NULL OR restaurant2_id IS NULL THEN
    RAISE EXCEPTION 'Restaurants not found. Please run 02b-create-restaurants.sql first.';
  END IF;
  
  -- Get or create "Quick Saves" boards for test users
  SELECT id INTO board1_id
  FROM boards
  WHERE user_id = creator1_id AND title = 'Quick Saves'
  LIMIT 1;
  
  SELECT id INTO board2_id
  FROM boards
  WHERE user_id = creator2_id AND title = 'Quick Saves'
  LIMIT 1;
  
  SELECT id INTO board3_id
  FROM boards
  WHERE user_id = creator3_id AND title = 'Quick Saves'
  LIMIT 1;
  
  IF board1_id IS NULL OR board2_id IS NULL OR board3_id IS NULL THEN
    RAISE EXCEPTION 'Quick Saves boards not found. Please run 02d-create-boards.sql first.';
  END IF;
  
  RAISE NOTICE 'Found restaurants: % and %', restaurant1_id, restaurant2_id;
  RAISE NOTICE 'Found boards: %, %, %', board1_id, board2_id, board3_id;
  
  -- ============================================================================
  -- CREATE SAVES (board_restaurants) - Spread over time for analytics
  -- ============================================================================
  
  -- Restaurant 1: ~25 saves (some recent for trending badge)
  -- Creator 1 saves (10 saves, some recent)
  INSERT INTO board_restaurants (board_id, restaurant_id, added_by, added_at)
  VALUES
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '2 hours'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '5 hours'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '12 hours'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '1 day'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '2 days'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '5 days'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '7 days'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '10 days'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '15 days'),
    (board1_id, restaurant1_id, creator1_id, NOW() - INTERVAL '20 days')
  ON CONFLICT DO NOTHING;
  
  -- Creator 2 saves (8 saves)
  INSERT INTO board_restaurants (board_id, restaurant_id, added_by, added_at)
  VALUES
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '3 hours'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '6 hours'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '1 day'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '3 days'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '6 days'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '9 days'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '12 days'),
    (board2_id, restaurant1_id, creator2_id, NOW() - INTERVAL '18 days')
  ON CONFLICT DO NOTHING;
  
  -- Creator 3 saves (7 saves, some very recent for trending)
  INSERT INTO board_restaurants (board_id, restaurant_id, added_by, added_at)
  VALUES
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '1 hour'),
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '4 hours'),
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '8 hours'),
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '11 hours'),
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '1 day'),
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '4 days'),
    (board3_id, restaurant1_id, creator3_id, NOW() - INTERVAL '8 days')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created saves for Restaurant 1';
  
  -- Restaurant 2: ~15 saves
  INSERT INTO board_restaurants (board_id, restaurant_id, added_by, added_at)
  VALUES
    (board1_id, restaurant2_id, creator1_id, NOW() - INTERVAL '1 day'),
    (board1_id, restaurant2_id, creator1_id, NOW() - INTERVAL '3 days'),
    (board1_id, restaurant2_id, creator1_id, NOW() - INTERVAL '5 days'),
    (board1_id, restaurant2_id, creator1_id, NOW() - INTERVAL '7 days'),
    (board1_id, restaurant2_id, creator1_id, NOW() - INTERVAL '10 days'),
    (board2_id, restaurant2_id, creator2_id, NOW() - INTERVAL '2 days'),
    (board2_id, restaurant2_id, creator2_id, NOW() - INTERVAL '4 days'),
    (board2_id, restaurant2_id, creator2_id, NOW() - INTERVAL '6 days'),
    (board2_id, restaurant2_id, creator2_id, NOW() - INTERVAL '8 days'),
    (board2_id, restaurant2_id, creator2_id, NOW() - INTERVAL '12 days'),
    (board3_id, restaurant2_id, creator3_id, NOW() - INTERVAL '1 day'),
    (board3_id, restaurant2_id, creator3_id, NOW() - INTERVAL '3 days'),
    (board3_id, restaurant2_id, creator3_id, NOW() - INTERVAL '5 days'),
    (board3_id, restaurant2_id, creator3_id, NOW() - INTERVAL '9 days'),
    (board3_id, restaurant2_id, creator3_id, NOW() - INTERVAL '14 days')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created saves for Restaurant 2';
  
  -- ============================================================================
  -- CREATE POSTS WITH RESTAURANT MENTIONS
  -- ============================================================================
  
  -- Restaurant 1: 5 posts (3 from creators, 2 from regular users)
  INSERT INTO posts (id, user_id, restaurant_id, caption, photos, likes_count, created_at, updated_at)
  VALUES
    (gen_random_uuid(), creator1_id, restaurant1_id, 'Amazing food at Prod Test Restaurant 1! 🍕', ARRAY['https://example.com/photo1.jpg'], 45, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), creator2_id, restaurant1_id, 'Best brunch spot! Highly recommend 🥞', ARRAY['https://example.com/photo2.jpg'], 32, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), creator3_id, restaurant1_id, 'Perfect date night location ✨', ARRAY['https://example.com/photo3.jpg'], 28, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), business1_id, restaurant1_id, 'Check out our new menu!', ARRAY['https://example.com/photo4.jpg'], 15, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    (gen_random_uuid(), business2_id, restaurant1_id, 'Weekend specials available', ARRAY['https://example.com/photo5.jpg'], 12, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
  ON CONFLICT DO NOTHING;
  
  -- Restaurant 2: 3 posts
  INSERT INTO posts (id, user_id, restaurant_id, caption, photos, likes_count, created_at, updated_at)
  VALUES
    (gen_random_uuid(), creator1_id, restaurant2_id, 'Great atmosphere! 🎉', ARRAY['https://example.com/photo6.jpg'], 38, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), creator2_id, restaurant2_id, 'Love the cocktails here 🍹', ARRAY['https://example.com/photo7.jpg'], 25, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    (gen_random_uuid(), creator3_id, restaurant2_id, 'Must try dessert menu! 🍰', ARRAY['https://example.com/photo8.jpg'], 19, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created posts for restaurants';
  
  -- ============================================================================
  -- VERIFICATION QUERY
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Restaurant Analytics Test Data Created!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Restaurant 1 Analytics Summary:';
  RAISE NOTICE '  - Total Saves: ~25';
  RAISE NOTICE '  - Saves Last 24h: ~12 (should show trending badge)';
  RAISE NOTICE '  - Creator Posts: 3';
  RAISE NOTICE '  - Total Posts: 5';
  RAISE NOTICE '  - Total Likes: ~132';
  RAISE NOTICE '';
  RAISE NOTICE 'Restaurant 2 Analytics Summary:';
  RAISE NOTICE '  - Total Saves: ~15';
  RAISE NOTICE '  - Saves Last 24h: ~1';
  RAISE NOTICE '  - Creator Posts: 3';
  RAISE NOTICE '  - Total Posts: 3';
  RAISE NOTICE '  - Total Likes: ~82';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Log in as prod-business1@bypass.com (OTP: 000000)';
  RAISE NOTICE '  2. Navigate to More → Restaurant Analytics';
  RAISE NOTICE '  3. Verify all metrics display correctly';
  RAISE NOTICE '  4. Check trending badge appears (Restaurant 1 has >10 saves in 24h)';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  r.name as restaurant_name,
  r.id as restaurant_id,
  COUNT(DISTINCT br.id) as total_saves,
  COUNT(DISTINCT br.id) FILTER (WHERE br.added_at >= NOW() - INTERVAL '24 hours') as saves_24h,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT p.id) FILTER (WHERE u.is_creator = true) as creator_posts,
  COALESCE(SUM(p.likes_count), 0) as total_likes
FROM restaurants r
LEFT JOIN board_restaurants br ON br.restaurant_id = r.id
LEFT JOIN posts p ON p.restaurant_id = r.id
LEFT JOIN users u ON p.user_id = u.id
WHERE r.name IN ('Prod Test Restaurant 1', 'Prod Test Restaurant 2')
GROUP BY r.id, r.name
ORDER BY r.name;
