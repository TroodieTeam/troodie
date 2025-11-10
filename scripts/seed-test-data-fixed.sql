-- ================================================================
-- Test Data Seeding SQL for Troodie (Fixed for Actual Schema)
-- ================================================================
-- This script creates test users and restaurants for development
-- All test accounts use emails ending with @bypass.com
-- Use OTP code: 000000 for authentication
-- ================================================================

-- Clean up existing test data (optional - uncomment if needed)
-- DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
-- DELETE FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
-- DELETE FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
-- DELETE FROM users WHERE email LIKE '%@bypass.com';
-- DELETE FROM restaurants WHERE website LIKE '%.test';

DO $$
DECLARE
    user_id1 UUID;
    user_id2 UUID;
    user_id3 UUID;
    user_id4 UUID;
    user_id5 UUID;
    user_id6 UUID;
    user_id7 UUID;
    user_id8 UUID;
    restaurant_id1 UUID;
    restaurant_id2 UUID;
    restaurant_id3 UUID;
    board_id1 UUID;
    board_id2 UUID;
BEGIN
    -- ================================================================
    -- STEP 1: Check for existing users or use provided UUIDs
    -- ================================================================
    
    -- Consumer 1
    SELECT id INTO user_id1 FROM users WHERE email = 'consumer1@bypass.com';
    IF user_id1 IS NULL THEN
        SELECT id INTO user_id1 FROM auth.users WHERE email = 'consumer1@bypass.com';
        IF user_id1 IS NULL THEN
            user_id1 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for consumer1@bypass.com: %', user_id1;
            RAISE NOTICE 'Please create auth user with this UUID first!';
        END IF;
    END IF;

    -- Consumer 2
    SELECT id INTO user_id2 FROM users WHERE email = 'consumer2@bypass.com';
    IF user_id2 IS NULL THEN
        SELECT id INTO user_id2 FROM auth.users WHERE email = 'consumer2@bypass.com';
        IF user_id2 IS NULL THEN
            user_id2 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for consumer2@bypass.com: %', user_id2;
        END IF;
    END IF;

    -- Consumer 3
    SELECT id INTO user_id3 FROM users WHERE email = 'consumer3@bypass.com';
    IF user_id3 IS NULL THEN
        SELECT id INTO user_id3 FROM auth.users WHERE email = 'consumer3@bypass.com';
        IF user_id3 IS NULL THEN
            user_id3 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for consumer3@bypass.com: %', user_id3;
        END IF;
    END IF;

    -- Creator 1
    SELECT id INTO user_id4 FROM users WHERE email = 'creator1@bypass.com';
    IF user_id4 IS NULL THEN
        SELECT id INTO user_id4 FROM auth.users WHERE email = 'creator1@bypass.com';
        IF user_id4 IS NULL THEN
            user_id4 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for creator1@bypass.com: %', user_id4;
        END IF;
    END IF;

    -- Creator 2
    SELECT id INTO user_id5 FROM users WHERE email = 'creator2@bypass.com';
    IF user_id5 IS NULL THEN
        SELECT id INTO user_id5 FROM auth.users WHERE email = 'creator2@bypass.com';
        IF user_id5 IS NULL THEN
            user_id5 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for creator2@bypass.com: %', user_id5;
        END IF;
    END IF;

    -- Business 1
    SELECT id INTO user_id6 FROM users WHERE email = 'business1@bypass.com';
    IF user_id6 IS NULL THEN
        SELECT id INTO user_id6 FROM auth.users WHERE email = 'business1@bypass.com';
        IF user_id6 IS NULL THEN
            user_id6 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for business1@bypass.com: %', user_id6;
        END IF;
    END IF;

    -- Business 2
    SELECT id INTO user_id7 FROM users WHERE email = 'business2@bypass.com';
    IF user_id7 IS NULL THEN
        SELECT id INTO user_id7 FROM auth.users WHERE email = 'business2@bypass.com';
        IF user_id7 IS NULL THEN
            user_id7 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for business2@bypass.com: %', user_id7;
        END IF;
    END IF;

    -- Multi-role
    SELECT id INTO user_id8 FROM users WHERE email = 'multi_role@bypass.com';
    IF user_id8 IS NULL THEN
        SELECT id INTO user_id8 FROM auth.users WHERE email = 'multi_role@bypass.com';
        IF user_id8 IS NULL THEN
            user_id8 := gen_random_uuid();
            RAISE NOTICE 'Generated UUID for multi_role@bypass.com: %', user_id8;
        END IF;
    END IF;

    -- ================================================================
    -- STEP 2: Create auth.users entries if they don't exist
    -- NOTE: This requires service role access
    -- ================================================================
    
    -- Try to create auth users (will fail if you don't have service role access)
    BEGIN
        -- Consumer 1
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id1,
            'consumer1@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Consumer One"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'consumer1@bypass.com');

        -- Consumer 2
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id2,
            'consumer2@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Consumer Two"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'consumer2@bypass.com');

        -- Consumer 3
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id3,
            'consumer3@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Consumer Three"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'consumer3@bypass.com');

        -- Creator 1
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id4,
            'creator1@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Creator One"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'creator1@bypass.com');

        -- Creator 2
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id5,
            'creator2@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Creator Two"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'creator2@bypass.com');

        -- Business 1
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id6,
            'business1@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Business One"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'business1@bypass.com');

        -- Business 2
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id7,
            'business2@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Business Two"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'business2@bypass.com');

        -- Multi-role
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        SELECT 
            user_id8,
            'multi_role@bypass.com',
            crypt('TestPass123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"display_name": "Test Multi Role"}'::jsonb,
            'authenticated',
            'authenticated'
        WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'multi_role@bypass.com');

        RAISE NOTICE 'Auth users created successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create auth users (requires service role): %', SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANT: Create auth users manually in Supabase Dashboard first!';
        RAISE NOTICE 'Use these UUIDs for the test accounts:';
        RAISE NOTICE '  consumer1@bypass.com: %', user_id1;
        RAISE NOTICE '  consumer2@bypass.com: %', user_id2;
        RAISE NOTICE '  consumer3@bypass.com: %', user_id3;
        RAISE NOTICE '  creator1@bypass.com: %', user_id4;
        RAISE NOTICE '  creator2@bypass.com: %', user_id5;
        RAISE NOTICE '  business1@bypass.com: %', user_id6;
        RAISE NOTICE '  business2@bypass.com: %', user_id7;
        RAISE NOTICE '  multi_role@bypass.com: %', user_id8;
        RAISE NOTICE '';
        RETURN; -- Exit if we can't create auth users
    END;

    -- ================================================================
    -- STEP 3: Create public.users entries
    -- ================================================================
    
    -- Consumer 1
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion)
    SELECT 
        user_id1,
        'consumer1@bypass.com',
        'test_consumer_1',
        'Test Consumer One',
        'I love exploring new restaurants and sharing my food adventures!',
        'consumer',
        'active',
        'https://ui-avatars.com/api/?name=Test+Consumer+One&background=FF6B6B&color=fff',
        true,
        100
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id1);
    
    -- Consumer 2
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion)
    SELECT 
        user_id2,
        'consumer2@bypass.com',
        'test_consumer_2',
        'Test Consumer Two',
        'Foodie at heart, always searching for the next great meal.',
        'consumer',
        'active',
        'https://ui-avatars.com/api/?name=Test+Consumer+Two&background=4ECDC4&color=fff',
        true,
        100
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id2);
    
    -- Consumer 3
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion)
    SELECT 
        user_id3,
        'consumer3@bypass.com',
        'test_consumer_3',
        'Test Consumer Three',
        'Weekend brunch enthusiast and coffee addict.',
        'consumer',
        'active',
        'https://ui-avatars.com/api/?name=Test+Consumer+Three&background=FFE66D&color=333',
        true,
        100
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id3);
    
    -- Creator 1
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion, is_creator, account_upgraded_at)
    SELECT 
        user_id4,
        'creator1@bypass.com',
        'test_creator_1',
        'Test Creator One',
        'Food blogger and content creator. Sharing the best eats in town!',
        'creator',
        'active',
        'https://ui-avatars.com/api/?name=Test+Creator+One&background=A8E6CF&color=333',
        true,
        100,
        true,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id4);
    
    -- Create creator profile for Creator 1
    INSERT INTO creator_profiles (user_id, bio, specialties, social_links, verification_status, metrics)
    SELECT 
        user_id4,
        'Food blogger and content creator. Sharing the best eats in town!',
        ARRAY['Restaurant Reviews', 'Food Photography', 'Local Cuisine'],
        '{"instagram": "@test_creator_1", "tiktok": "@test_creator_1", "youtube": "TestCreatorOne"}'::jsonb,
        'verified',
        '{"followers": 5000, "engagement_rate": 4.5, "avg_views": 2500}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM creator_profiles WHERE user_id = user_id4);
    
    -- Creator 2
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion, is_creator, account_upgraded_at)
    SELECT 
        user_id5,
        'creator2@bypass.com',
        'test_creator_2',
        'Test Creator Two',
        'Travel and food influencer. Discovering hidden gems worldwide.',
        'creator',
        'active',
        'https://ui-avatars.com/api/?name=Test+Creator+Two&background=FFD3B6&color=333',
        true,
        100,
        true,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id5);
    
    -- Create creator profile for Creator 2
    INSERT INTO creator_profiles (user_id, bio, specialties, social_links, verification_status, metrics)
    SELECT 
        user_id5,
        'Travel and food influencer. Discovering hidden gems worldwide.',
        ARRAY['Travel Food', 'Street Food', 'Cultural Cuisine'],
        '{"instagram": "@test_creator_2", "tiktok": "@test_creator_2"}'::jsonb,
        'verified',
        '{"followers": 8000, "engagement_rate": 5.2, "avg_views": 4000}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM creator_profiles WHERE user_id = user_id5);
    
    -- ================================================================
    -- Create Test Restaurants (Using actual schema columns)
    -- ================================================================
    
    -- Restaurant 1: The Rustic Table
    INSERT INTO restaurants (
        name, address, city, state, zip_code,
        cuisine_types, price_range, phone, website, hours,
        photos, google_rating, google_reviews_count,
        is_claimed, is_verified, data_source
    )
    SELECT 
        'The Rustic Table',
        '123 Farm Road',
        'Portland',
        'OR',
        '97201',
        ARRAY['American', 'Farm-to-Table'],
        '3',
        '(503) 555-0101',
        'www.therustictable.test',
        '{"monday": "11:00 AM - 9:00 PM", "tuesday": "11:00 AM - 9:00 PM", "wednesday": "11:00 AM - 9:00 PM", "thursday": "11:00 AM - 10:00 PM", "friday": "11:00 AM - 11:00 PM", "saturday": "10:00 AM - 11:00 PM", "sunday": "10:00 AM - 9:00 PM"}'::jsonb,
        ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'],
        4.5,
        127,
        false,
        false,
        'seed'
    WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name = 'The Rustic Table')
    RETURNING id INTO restaurant_id1;
    
    -- Restaurant 2: Sakura Sushi
    INSERT INTO restaurants (
        name, address, city, state, zip_code,
        cuisine_types, price_range, phone, website, hours,
        photos, google_rating, google_reviews_count,
        is_claimed, is_verified, data_source
    )
    SELECT 
        'Sakura Sushi',
        '456 Cherry Blossom Lane',
        'Seattle',
        'WA',
        '98101',
        ARRAY['Japanese', 'Sushi'],
        '4',
        '(206) 555-0202',
        'www.sakurasushi.test',
        '{"monday": "Closed", "tuesday": "5:00 PM - 10:00 PM", "wednesday": "5:00 PM - 10:00 PM", "thursday": "5:00 PM - 10:00 PM", "friday": "5:00 PM - 11:00 PM", "saturday": "12:00 PM - 11:00 PM", "sunday": "12:00 PM - 9:00 PM"}'::jsonb,
        ARRAY['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800', 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800'],
        4.8,
        256,
        false,
        false,
        'seed'
    WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name = 'Sakura Sushi')
    RETURNING id INTO restaurant_id2;
    
    -- Restaurant 3: Bella Vista Italian Kitchen
    INSERT INTO restaurants (
        name, address, city, state, zip_code,
        cuisine_types, price_range, phone, website, hours,
        photos, google_rating, google_reviews_count,
        is_claimed, is_verified, data_source
    )
    SELECT 
        'Bella Vista Italian Kitchen',
        '789 Vineyard Way',
        'San Francisco',
        'CA',
        '94102',
        ARRAY['Italian', 'Pizza'],
        '3',
        '(415) 555-0303',
        'www.bellavista.test',
        '{"monday": "11:30 AM - 10:00 PM", "tuesday": "11:30 AM - 10:00 PM", "wednesday": "11:30 AM - 10:00 PM", "thursday": "11:30 AM - 10:00 PM", "friday": "11:30 AM - 11:00 PM", "saturday": "11:30 AM - 11:00 PM", "sunday": "11:30 AM - 10:00 PM"}'::jsonb,
        ARRAY['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800'],
        4.6,
        189,
        false,
        false,
        'seed'
    WHERE NOT EXISTS (SELECT 1 FROM restaurants WHERE name = 'Bella Vista Italian Kitchen')
    RETURNING id INTO restaurant_id3;
    
    -- Add more restaurants (simplified for brevity)
    INSERT INTO restaurants (name, address, city, state, zip_code, cuisine_types, price_range, phone, website, google_rating, google_reviews_count, data_source)
    SELECT * FROM (VALUES
    ('Taco Libre', '321 Fiesta St', 'Austin', 'TX', '78701', ARRAY['Mexican', 'Tacos'], '2', '(512) 555-0404', 'www.tacolibre.test', 4.4, 312, 'seed'),
    ('The Green Garden', '555 Wellness Way', 'Los Angeles', 'CA', '90001', ARRAY['Vegetarian', 'Vegan'], '3', '(310) 555-0505', 'www.greengarden.test', 4.7, 198, 'seed'),
    ('Bombay Spice House', '888 Curry Court', 'Chicago', 'IL', '60601', ARRAY['Indian', 'Curry'], '2', '(312) 555-0606', 'www.bombayspice.test', 4.5, 234, 'seed'),
    ('Le Petit Bistro', '222 Champs Ave', 'New York', 'NY', '10001', ARRAY['French', 'Bistro'], '4', '(212) 555-0707', 'www.lepetitbistro.test', 4.9, 167, 'seed'),
    ('Dragon Palace', '999 Dynasty Dr', 'Boston', 'MA', '02101', ARRAY['Chinese', 'Szechuan'], '3', '(617) 555-0808', 'www.dragonpalace.test', 4.4, 289, 'seed'),
    ('BBQ Pit Master', '777 Smokehouse Ln', 'Nashville', 'TN', '37201', ARRAY['BBQ', 'Southern'], '2', '(615) 555-0909', 'www.bbqpitmaster.test', 4.6, 423, 'seed'),
    ('Pho Saigon', '333 Noodle St', 'Houston', 'TX', '77001', ARRAY['Vietnamese', 'Pho'], '1', '(713) 555-1010', 'www.phosaigon.test', 4.7, 356, 'seed'),
    ('Mediterranean Mezze', '100 Test St', 'Miami', 'FL', '33101', ARRAY['Mediterranean', 'Greek'], '3', '(305) 555-1100', 'www.medmezze.test', 4.3, 145, 'seed'),
    ('Seoul Kitchen', '101 Test St', 'Denver', 'CO', '80201', ARRAY['Korean', 'BBQ'], '3', '(303) 555-1101', 'www.seoulkitchen.test', 4.5, 223, 'seed'),
    ('The Breakfast Club', '102 Test St', 'Phoenix', 'AZ', '85001', ARRAY['American', 'Breakfast'], '2', '(602) 555-1102', 'www.breakfastclub.test', 4.6, 389, 'seed')
    ) AS t(name, address, city, state, zip_code, cuisine_types, price_range, phone, website, google_rating, google_reviews_count, data_source)
    WHERE NOT EXISTS (SELECT 1 FROM restaurants r WHERE r.name = t.name);
    
    -- ================================================================
    -- Create Business Users (with Restaurant Claims)
    -- ================================================================
    
    -- Business Owner 1 (will claim The Rustic Table)
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion, is_restaurant, account_upgraded_at)
    SELECT 
        user_id6,
        'business1@bypass.com',
        'test_business_1',
        'Test Business Owner One',
        'Owner of The Rustic Table - Farm to table dining experience.',
        'business',
        'active',
        'https://ui-avatars.com/api/?name=Test+Business+One&background=95A9FF&color=fff',
        true,
        100,
        true,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id6);
    
    -- Create business profile and claim restaurant if restaurant was created
    IF restaurant_id1 IS NOT NULL THEN
        INSERT INTO business_profiles (user_id, restaurant_id, verification_status, claimed_at, management_permissions)
        SELECT 
            user_id6,
            restaurant_id1,
            'verified',
            NOW(),
            ARRAY['full_access', 'manage_menu', 'manage_hours', 'respond_reviews']
        WHERE NOT EXISTS (SELECT 1 FROM business_profiles WHERE user_id = user_id6);
        
        -- Mark restaurant as claimed
        UPDATE restaurants 
        SET is_claimed = true, owner_id = user_id6, is_verified = true 
        WHERE id = restaurant_id1;
    END IF;
    
    -- Business Owner 2 (will claim Sakura Sushi)
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion, is_restaurant, account_upgraded_at)
    SELECT 
        user_id7,
        'business2@bypass.com',
        'test_business_2',
        'Test Business Owner Two',
        'Managing partner at Sakura Sushi - Authentic Japanese cuisine.',
        'business',
        'active',
        'https://ui-avatars.com/api/?name=Test+Business+Two&background=FF95BA&color=fff',
        true,
        100,
        true,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id7);
    
    -- Create business profile and claim restaurant if restaurant was created
    IF restaurant_id2 IS NOT NULL THEN
        INSERT INTO business_profiles (user_id, restaurant_id, verification_status, claimed_at, management_permissions)
        SELECT 
            user_id7,
            restaurant_id2,
            'verified',
            NOW(),
            ARRAY['full_access', 'manage_menu', 'manage_hours', 'respond_reviews']
        WHERE NOT EXISTS (SELECT 1 FROM business_profiles WHERE user_id = user_id7);
        
        -- Mark restaurant as claimed
        UPDATE restaurants 
        SET is_claimed = true, owner_id = user_id7, is_verified = true 
        WHERE id = restaurant_id2;
    END IF;
    
    -- ================================================================
    -- Create Multi-Role User (Creator + Business Owner)
    -- ================================================================
    
    -- Multi-role user (creator who also owns Bella Vista)
    INSERT INTO users (id, email, username, name, bio, account_type, account_status, profile_image_url, is_verified, profile_completion, is_creator, is_restaurant, account_upgraded_at)
    SELECT 
        user_id8,
        'multi_role@bypass.com',
        'test_multi_role',
        'Test Multi Role User',
        'Food blogger and restaurant owner. Living the dream!',
        'business',
        'active',
        'https://ui-avatars.com/api/?name=Test+Multi+Role&background=B395FF&color=fff',
        true,
        100,
        true,
        true,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = user_id8);
    
    -- Create creator profile for multi-role user
    INSERT INTO creator_profiles (user_id, bio, specialties, social_links, verification_status, metrics)
    SELECT 
        user_id8,
        'Food blogger and restaurant owner. Living the dream!',
        ARRAY['Restaurant Management', 'Recipe Development', 'Food Trends'],
        '{"instagram": "@test_multi_role", "website": "www.testmultirole.com"}'::jsonb,
        'verified',
        '{"followers": 12000, "engagement_rate": 6.1, "avg_views": 7500}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM creator_profiles WHERE user_id = user_id8);
    
    -- Create business profile and claim restaurant if restaurant was created
    IF restaurant_id3 IS NOT NULL THEN
        INSERT INTO business_profiles (user_id, restaurant_id, verification_status, claimed_at, management_permissions)
        SELECT 
            user_id8,
            restaurant_id3,
            'verified',
            NOW(),
            ARRAY['full_access', 'manage_menu', 'manage_hours', 'respond_reviews']
        WHERE NOT EXISTS (SELECT 1 FROM business_profiles WHERE user_id = user_id8);
        
        -- Mark restaurant as claimed
        UPDATE restaurants 
        SET is_claimed = true, owner_id = user_id8, is_verified = true 
        WHERE id = restaurant_id3;
    END IF;
    
    -- ================================================================
    -- Create Sample Boards for Users
    -- ================================================================
    
    -- Create boards for Consumer 1
    INSERT INTO boards (user_id, title, description, is_private)
    SELECT 
        user_id1,
        'Favorites',
        'My all-time favorite restaurants',
        false
    WHERE NOT EXISTS (SELECT 1 FROM boards WHERE user_id = user_id1 AND title = 'Favorites')
    RETURNING id INTO board_id1;
    
    INSERT INTO boards (user_id, title, description, is_private)
    SELECT 
        user_id1,
        'Date Night',
        'Perfect spots for a romantic evening',
        false
    WHERE NOT EXISTS (SELECT 1 FROM boards WHERE user_id = user_id1 AND title = 'Date Night');
    
    -- Create boards for Creator 1
    INSERT INTO boards (user_id, title, description, is_private)
    SELECT 
        user_id4,
        'Hidden Gems',
        'Off the beaten path discoveries',
        false
    WHERE NOT EXISTS (SELECT 1 FROM boards WHERE user_id = user_id4 AND title = 'Hidden Gems')
    RETURNING id INTO board_id2;
    
    -- ================================================================
    -- Display Summary
    -- ================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '======================================';
    RAISE NOTICE '✅ Test Data Seeding Complete!';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created Test Accounts:';
    RAISE NOTICE '------------------------';
    RAISE NOTICE 'CONSUMERS:';
    RAISE NOTICE '  • consumer1@bypass.com (ID: %)', user_id1;
    RAISE NOTICE '  • consumer2@bypass.com (ID: %)', user_id2;
    RAISE NOTICE '  • consumer3@bypass.com (ID: %)', user_id3;
    RAISE NOTICE '';
    RAISE NOTICE 'CREATORS:';
    RAISE NOTICE '  • creator1@bypass.com (ID: %)', user_id4;
    RAISE NOTICE '  • creator2@bypass.com (ID: %)', user_id5;
    RAISE NOTICE '';
    RAISE NOTICE 'BUSINESS OWNERS:';
    RAISE NOTICE '  • business1@bypass.com (ID: %)', user_id6;
    RAISE NOTICE '  • business2@bypass.com (ID: %)', user_id7;
    RAISE NOTICE '';
    RAISE NOTICE 'MULTI-ROLE:';
    RAISE NOTICE '  • multi_role@bypass.com (ID: %)', user_id8;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Authentication:';
    RAISE NOTICE '  All accounts use OTP code: 000000';
    RAISE NOTICE '';
    RAISE NOTICE '======================================';
    
END $$;

-- ================================================================
-- Verification Queries
-- ================================================================

-- Check created users
SELECT 
    email,
    account_type,
    CASE 
        WHEN is_creator THEN '✓ Creator'
        ELSE ''
    END as creator_status,
    CASE 
        WHEN is_restaurant THEN '✓ Business'
        ELSE ''
    END as business_status
FROM users 
WHERE email LIKE '%@bypass.com'
ORDER BY account_type, email;

-- Check if auth users exist
SELECT 
    au.email,
    CASE 
        WHEN pu.id IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_public_user
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@bypass.com';

-- Count test restaurants
SELECT COUNT(*) as total_test_restaurants 
FROM restaurants 
WHERE website LIKE '%.test';

-- Show claimed restaurants
SELECT 
    r.name,
    r.is_claimed,
    u.email as owner_email
FROM restaurants r
LEFT JOIN users u ON r.owner_id = u.id
WHERE r.website LIKE '%.test' AND r.is_claimed = true;