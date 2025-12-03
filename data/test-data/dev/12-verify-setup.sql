-- ================================================================
-- Step 12: Verify Test Data Setup
-- ================================================================
-- Provides a summary of all created test data
-- ================================================================

DO $$
DECLARE
  user_count INTEGER;
  consumer_count INTEGER;
  creator_count INTEGER;
  business_count INTEGER;
  board_count INTEGER;
  creator_profile_count INTEGER;
  restaurant_count INTEGER;
  claimed_restaurant_count INTEGER;
  business_profile_count INTEGER;
  post_count INTEGER;
  post_like_count INTEGER;
  post_comment_count INTEGER;
  post_save_count INTEGER;
  restaurant_save_count INTEGER;
  follow_count INTEGER;
  campaign_count INTEGER;
  application_count INTEGER;
  deliverable_count INTEGER;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO user_count FROM public.users WHERE email LIKE 'test-%@troodieapp.com';
  SELECT COUNT(*) INTO consumer_count FROM public.users WHERE email LIKE 'test-consumer%@troodieapp.com';
  SELECT COUNT(*) INTO creator_count FROM public.users WHERE email LIKE 'test-creator%@troodieapp.com';
  SELECT COUNT(*) INTO business_count FROM public.users WHERE email LIKE 'test-business%@troodieapp.com';
  
  -- Count boards
  SELECT COUNT(*) INTO board_count 
  FROM public.boards 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com');
  
  -- Count creator profiles
  SELECT COUNT(*) INTO creator_profile_count 
  FROM public.creator_profiles 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-creator%@troodieapp.com');
  
  -- Count restaurants
  SELECT COUNT(*) INTO restaurant_count 
  FROM public.restaurants 
  WHERE id IN (
    '0096f74c-76c6-4709-9670-ac940c5a16ca'::uuid, -- Penguin Drive In
    '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid, -- Vicente
    '0557acdd-e8e8-473b-badb-913c624aa199'::uuid  -- Fin & Fino
  );
  
  SELECT COUNT(*) INTO claimed_restaurant_count 
  FROM public.restaurants 
  WHERE is_claimed = true 
    AND id IN (
      '0096f74c-76c6-4709-9670-ac940c5a16ca'::uuid,
      '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid,
      '0557acdd-e8e8-473b-badb-913c624aa199'::uuid
    );
  
  -- Count business profiles
  SELECT COUNT(*) INTO business_profile_count 
  FROM public.business_profiles 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-business%@troodieapp.com');
  
  -- Count posts and engagement
  SELECT COUNT(*) INTO post_count 
  FROM public.posts 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com');
  
  SELECT COUNT(*) INTO post_like_count 
  FROM public.post_likes 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com');
  
  SELECT COUNT(*) INTO post_comment_count 
  FROM public.post_comments 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com');
  
  SELECT COUNT(*) INTO post_save_count 
  FROM public.post_saves 
  WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com');
  
  -- Count restaurant saves (from board_restaurants - the actual save mechanism)
  SELECT COUNT(*) INTO restaurant_save_count 
  FROM public.board_restaurants 
  WHERE restaurant_id IN (
    '0096f74c-76c6-4709-9670-ac940c5a16ca'::uuid,
    '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid,
    '0557acdd-e8e8-473b-badb-913c624aa199'::uuid
  );
  
  -- Count follows
  SELECT COUNT(*) INTO follow_count 
  FROM public.user_relationships 
  WHERE follower_id IN (SELECT id FROM public.users WHERE email LIKE 'test-%@troodieapp.com');
  
  -- Count campaigns
  SELECT COUNT(*) INTO campaign_count 
  FROM public.campaigns 
  WHERE restaurant_id IN (
    '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid, -- Vicente (MEDIUM)
    '0557acdd-e8e8-473b-badb-913c624aa199'::uuid  -- Fin & Fino (HIGH)
  );
  
  -- Count applications
  SELECT COUNT(*) INTO application_count 
  FROM public.campaign_applications 
  WHERE creator_id IN (
    SELECT id FROM public.creator_profiles 
    WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-creator%@troodieapp.com')
  );
  
  -- Count deliverables
  SELECT COUNT(*) INTO deliverable_count 
  FROM public.campaign_deliverables 
  WHERE creator_id IN (
    SELECT id FROM public.creator_profiles 
    WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE 'test-creator%@troodieapp.com')
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Data Setup Verification';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Users:';
  RAISE NOTICE '  - Total: %', user_count;
  RAISE NOTICE '  - Consumers: %', consumer_count;
  RAISE NOTICE '  - Creators: %', creator_count;
  RAISE NOTICE '  - Businesses: %', business_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Boards: %', board_count;
  RAISE NOTICE 'Creator Profiles: %', creator_profile_count;
  RAISE NOTICE 'Restaurants: % (Claimed: %)', restaurant_count, claimed_restaurant_count;
  RAISE NOTICE 'Business Profiles: %', business_profile_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Posts & Engagement:';
  RAISE NOTICE '  - Posts: %', post_count;
  RAISE NOTICE '  - Likes: %', post_like_count;
  RAISE NOTICE '  - Comments: %', post_comment_count;
  RAISE NOTICE '  - Saves: %', post_save_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Restaurant Saves: %', restaurant_save_count;
  RAISE NOTICE 'User Follows: %', follow_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Creator Marketplace:';
  RAISE NOTICE '  - Campaigns: %', campaign_count;
  RAISE NOTICE '  - Applications: %', application_count;
  RAISE NOTICE '  - Deliverables: %', deliverable_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Business Activity Levels:';
  RAISE NOTICE '  - test-business1@troodieapp.com (NEW): 1 restaurant, 0 campaigns';
  RAISE NOTICE '  - test-business2@troodieapp.com (MEDIUM): 1 restaurant, 3 campaigns';
  RAISE NOTICE '  - test-business3@troodieapp.com (HIGH): 1 restaurant, 10 campaigns';
  RAISE NOTICE '';
  RAISE NOTICE 'All accounts use OTP: 000000 for authentication';
  RAISE NOTICE '========================================';
END $$;

