-- ================================================================
-- Step 6: Create Posts with Engagement
-- ================================================================
-- Creates posts from creators and consumers with likes, comments, and saves
-- ================================================================

DO $$
DECLARE
  post_id UUID;
  restaurant_id_1 UUID := '0096f74c-76c6-4709-9670-ac940c5a16ca'::uuid; -- Penguin Drive In (Business 1 - NEW)
  restaurant_id_2 UUID := '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid; -- Vicente (Business 2 - MEDIUM)
  restaurant_id_3 UUID := '0557acdd-e8e8-473b-badb-913c624aa199'::uuid; -- Fin & Fino (Business 3 - HIGH)
  creator_user_ids UUID[] := ARRAY[
    '4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid, -- test-creator1
    '381d705b-d5d1-4e44-85fc-b772d68921ba'::uuid, -- test-creator2
    'e50f6c6f-9487-4ff2-acd0-3542fdd46dd1'::uuid, -- test-creator3
    'b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, -- test-creator4
    'c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, -- test-creator5
    'd6e7f8a9-b0c1-4234-d567-890123456789'::uuid, -- test-creator6
    'e7f8a9b0-c1d2-4345-e678-901234567890'::uuid  -- test-creator7
  ];
  consumer_user_ids UUID[] := ARRAY[
    '273eb12a-09c8-47f9-894b-58c4861fa651'::uuid, -- test-consumer1
    '5ed86604-5b63-47aa-9d30-2ea0b0c3a6c2'::uuid, -- test-consumer2
    '6c1eeeb9-4be4-4129-bfca-19b4a163a45e'::uuid, -- test-consumer3
    '87464291-d9b2-4935-b29f-416328bdd43e'::uuid, -- test-consumer4
    'ec03ddc6-c3f2-4c82-9d4d-620928284bca'::uuid, -- test-consumer5
    'f6a7b8c9-d0e1-4234-f567-890123456789'::uuid, -- test-consumer6
    'a7b8c9d0-e1f2-4345-a678-901234567890'::uuid, -- test-consumer7
    'b8c9d0e1-f2a3-4456-b789-012345678901'::uuid, -- test-consumer8
    'c9d0e1f2-a3b4-4567-c890-123456789012'::uuid, -- test-consumer9
    'd0e1f2a3-b4c5-4678-d901-234567890123'::uuid  -- test-consumer10
  ];
  all_user_ids UUID[];
  i INTEGER;
  j INTEGER;
  k INTEGER;
  like_count INTEGER;
  comment_count INTEGER;
  save_count INTEGER;
  post_author UUID;
  commenter_ids UUID[];
  liker_ids UUID[];
  saver_ids UUID[];
  board_id UUID;
BEGIN
  all_user_ids := creator_user_ids || consumer_user_ids;

  -- Create posts from creators (3-8 posts each, mentioning restaurants)
  -- Note: Only 3 creators exist currently, adjust loop if more are added
  FOR i IN 1..3 LOOP
    post_author := creator_user_ids[i];
    
    -- Get creator's default board
    SELECT default_board_id INTO board_id FROM public.users WHERE id = post_author;
    
    -- Create 3-8 posts per creator
    FOR j IN 1..(3 + (i % 6)) LOOP
      -- Determine restaurant (rotate through the 3 claimed restaurants)
      DECLARE
        target_restaurant_id UUID;
        restaurant_name TEXT;
      BEGIN
        CASE (j % 3)
          WHEN 0 THEN target_restaurant_id := restaurant_id_1; restaurant_name := 'Penguin Drive In';
          WHEN 1 THEN target_restaurant_id := restaurant_id_2; restaurant_name := 'Vicente';
          WHEN 2 THEN target_restaurant_id := restaurant_id_3; restaurant_name := 'Fin & Fino';
        END CASE;

        -- Create post
        INSERT INTO public.posts (
          id, user_id, restaurant_id, caption, photos, rating, visit_date, price_range, visit_type, tags, privacy,
          likes_count, comments_count, saves_count, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          post_author,
          target_restaurant_id, -- posts.restaurant_id is UUID
          (CASE (j % 5)
            WHEN 0 THEN 'Amazing experience at ' || restaurant_name || '! The food was incredible and the service was top-notch. Highly recommend! 🍽️✨'
            WHEN 1 THEN 'Just tried ' || restaurant_name || ' for the first time. The pasta was perfection! #foodie #charlotte'
            WHEN 2 THEN 'Date night at ' || restaurant_name || ' did not disappoint. The ambiance and food quality are unmatched. 💕'
            WHEN 3 THEN 'If you''re looking for authentic cuisine, ' || restaurant_name || ' is the place to be. Every dish tells a story!'
            WHEN 4 THEN 'Quick lunch at ' || restaurant_name || '. The flavors are bold and the presentation is beautiful. 📸'
          END)::text,
          ARRAY['https://images.unsplash.com/photo-' || ((1500000000000 + (i * 100) + j)::text) || '?w=800']::text[],
          (4 + (j % 2))::integer,
          (NOW() - (INTERVAL '1 day' * (j * 2)))::date,
          (CASE WHEN (j % 2) = 0 THEN '$' || '$' ELSE '$' || '$' || '$' END)::varchar(10),
          (CASE ((j % 3))
            WHEN 0 THEN 'dine_in'
            WHEN 1 THEN 'takeout'
            ELSE 'delivery'
          END)::varchar(20),
          ARRAY['foodie', 'restaurant', 'charlotte', 'food']::text[],
          'public'::varchar(20),
          0::integer, -- Will be updated by likes
          0::integer, -- Will be updated by comments
          0::integer, -- Will be updated by saves
          NOW() - (INTERVAL '1 day' * (j * 2)),
          NOW() - (INTERVAL '1 day' * (j * 2))
        )
        RETURNING id INTO post_id;

        -- Add likes (5-50 per post, from random users)
        like_count := 5 + (j * 3) + (i * 2);
        IF like_count > 50 THEN like_count := 50; END IF;
        
        liker_ids := ARRAY(SELECT unnest(all_user_ids) ORDER BY random() LIMIT like_count);
        
        FOR k IN 1..array_length(liker_ids, 1) LOOP
          INSERT INTO public.post_likes (id, post_id, user_id, created_at)
          VALUES (gen_random_uuid(), post_id, liker_ids[k], NOW() - (INTERVAL '1 hour' * k))
          ON CONFLICT DO NOTHING;
        END LOOP;

        -- Add comments (2-10 per post, from random users)
        comment_count := 2 + (j % 8);
        commenter_ids := ARRAY(SELECT unnest(all_user_ids) ORDER BY random() LIMIT comment_count);
        
        FOR k IN 1..array_length(commenter_ids, 1) LOOP
          INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
          VALUES (
            gen_random_uuid(),
            post_id,
            commenter_ids[k],
            CASE (k % 4)
              WHEN 0 THEN 'This looks amazing! I need to try this place!'
              WHEN 1 THEN 'Great review! Adding this to my list. 👍'
              WHEN 2 THEN 'I''ve been there too! The food is incredible.'
              WHEN 3 THEN 'Thanks for sharing! Can''t wait to visit.'
            END,
            NOW() - (INTERVAL '1 hour' * k)
          ) ON CONFLICT DO NOTHING;
        END LOOP;

        -- Add saves (3-15 per post)
        save_count := 3 + (j % 12);
        saver_ids := ARRAY(SELECT unnest(all_user_ids) ORDER BY random() LIMIT save_count);
        
        FOR k IN 1..array_length(saver_ids, 1) LOOP
          DECLARE
            saver_board_id UUID;
          BEGIN
            SELECT default_board_id INTO saver_board_id FROM public.users WHERE id = saver_ids[k];
            IF saver_board_id IS NOT NULL THEN
              INSERT INTO public.post_saves (id, post_id, user_id, board_id, created_at)
              VALUES (gen_random_uuid(), post_id, saver_ids[k], saver_board_id, NOW() - (INTERVAL '1 hour' * k))
              ON CONFLICT DO NOTHING;
            END IF;
          END;
        END LOOP;
      END;
    END LOOP;
  END LOOP;

  -- Create posts from consumers (1-3 posts each)
  -- Note: Only 5 consumers exist currently, adjust loop if more are added
  FOR i IN 1..5 LOOP
    post_author := consumer_user_ids[i];
    
    FOR j IN 1..(1 + (i % 3)) LOOP
      DECLARE
        target_restaurant_id UUID;
        restaurant_name TEXT;
      BEGIN
        CASE (j % 3)
          WHEN 0 THEN target_restaurant_id := restaurant_id_1; restaurant_name := 'Penguin Drive In';
          WHEN 1 THEN target_restaurant_id := restaurant_id_2; restaurant_name := 'Vicente';
          WHEN 2 THEN target_restaurant_id := restaurant_id_3; restaurant_name := 'Fin & Fino';
        END CASE;

        INSERT INTO public.posts (
          id, user_id, restaurant_id, caption, photos, rating, visit_date, price_range, visit_type, tags, privacy,
          likes_count, comments_count, saves_count, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          post_author,
          target_restaurant_id, -- posts.restaurant_id is UUID
          ('Had a great meal at ' || restaurant_name || '!')::text,
          ARRAY['https://images.unsplash.com/photo-' || ((1600000000000 + (i * 100) + j)::text) || '?w=800']::text[],
          4::integer,
          (NOW() - (INTERVAL '1 day' * j))::date,
          ('$' || '$')::varchar(10),
          (CASE ((j % 3))
            WHEN 0 THEN 'dine_in'
            WHEN 1 THEN 'takeout'
            ELSE 'delivery'
          END)::varchar(20),
          ARRAY['food']::text[],
          'public'::varchar(20),
          0::integer, 0::integer, 0::integer,
          NOW() - (INTERVAL '1 day' * j),
          NOW() - (INTERVAL '1 day' * j)
        )
        RETURNING id INTO post_id;

        -- Add some engagement (fewer than creator posts)
        FOR k IN 1..(3 + (j * 2)) LOOP
          INSERT INTO public.post_likes (id, post_id, user_id, created_at)
          VALUES (gen_random_uuid(), post_id, all_user_ids[1 + (k % array_length(all_user_ids, 1))], NOW() - (INTERVAL '1 hour' * k))
          ON CONFLICT DO NOTHING;
        END LOOP;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Step 6 Complete: Created posts with engagement (likes, comments, saves)';
END $$;

