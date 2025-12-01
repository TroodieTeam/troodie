CREATE OR REPLACE VIEW public.activity_feed AS
-- 1. POSTS
SELECT 'post'::text AS activity_type,
    p.id AS activity_id,
    p.user_id AS actor_id,
    u.name::text AS actor_name,
    u.username::text AS actor_username,
    u.avatar_url AS actor_avatar,
    u.is_verified AS actor_is_verified,
        CASE
            WHEN p.rating IS NOT NULL THEN 'wrote a review'::text
            ELSE 'shared a post'::text
        END AS action,
    r.name::text AS target_name,
    r.id AS target_id,
    'restaurant'::text AS target_type,
    p.rating,
    p.caption AS content,
    p.photos,
    NULL::uuid AS related_user_id,
    NULL::text AS related_user_name,
    NULL::text AS related_user_username,
    NULL::text AS related_user_avatar,
    p.privacy::text AS privacy,
    p.created_at,
    p.restaurant_id,
    r.cuisine_types,
    COALESCE((r.city::text || ', '::text) || r.state::text, r.address) AS restaurant_location,
    NULL::uuid AS community_id,
    NULL::text AS community_name,
    NULL::uuid AS board_id,
    NULL::text AS board_name
   FROM posts p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN restaurants r ON p.restaurant_id = r.id
  WHERE p.privacy::text = 'public'::text

UNION ALL

-- 2. SAVED RESTAURANTS (✅ FIXED THIS SECTION)
 SELECT 'save'::text AS activity_type,
    br.id AS activity_id,
    br.added_by AS actor_id,
    u.name::text AS actor_name,
    u.username::text AS actor_username,
    u.avatar_url AS actor_avatar,
    u.is_verified AS actor_is_verified,
    'saved'::text AS action,
    r.name::text AS target_name,
    r.id AS target_id,
    'restaurant'::text AS target_type,
    br.rating::numeric AS rating,
    br.notes AS content,
    
    -- ✅ FIX: Grab cover photo or first photo from restaurant
    CASE 
        WHEN r.cover_photo_url IS NOT NULL THEN ARRAY[r.cover_photo_url]
        WHEN r.photos IS NOT NULL AND array_length(r.photos, 1) > 0 THEN ARRAY[r.photos[1]]
        ELSE NULL::text[]
    END AS photos,

    NULL::uuid AS related_user_id,
    NULL::text AS related_user_name,
    NULL::text AS related_user_username,
    NULL::text AS related_user_avatar,
        CASE
            WHEN b.is_private = true THEN 'private'::text
            ELSE 'public'::text
        END AS privacy,
    COALESCE(br.added_at, br.created_at) AS created_at,
        CASE
            WHEN r.id IS NOT NULL THEN r.id
            ELSE br.restaurant_id
        END AS restaurant_id,
    r.cuisine_types,
    COALESCE((r.city::text || ', '::text) || r.state::text, r.address) AS restaurant_location,
    NULL::uuid AS community_id,
    NULL::text AS community_name,
    br.board_id,
    b.title::text AS board_name
   FROM board_restaurants br
     JOIN users u ON br.added_by = u.id
     JOIN boards b ON br.board_id = b.id
     LEFT JOIN restaurants r ON br.restaurant_id = r.id
  WHERE b.is_private = false

UNION ALL

-- 3. BOARD CREATION
 SELECT 'board_created'::text AS activity_type,
    b.id AS activity_id,
    b.user_id AS actor_id,
    u.name::text AS actor_name,
    u.username::text AS actor_username,
    u.avatar_url AS actor_avatar,
    u.is_verified AS actor_is_verified,
    'created new board'::text AS action,
    b.title::text AS target_name,
    b.id AS target_id,
    'board'::text AS target_type,
    NULL::numeric AS rating,
    b.description AS content,
        CASE
            WHEN b.cover_image_url IS NOT NULL THEN ARRAY[b.cover_image_url]
            ELSE NULL::text[]
        END AS photos,
    NULL::uuid AS related_user_id,
    NULL::text AS related_user_name,
    NULL::text AS related_user_username,
    NULL::text AS related_user_avatar,
        CASE
            WHEN b.is_private = true THEN 'private'::text
            ELSE 'public'::text
        END AS privacy,
    b.created_at,
    NULL::uuid AS restaurant_id,
    NULL::text[] AS cuisine_types,
    NULL::text AS restaurant_location,
    NULL::uuid AS community_id,
    NULL::text AS community_name,
    b.id AS board_id,
    b.title::text AS board_name
   FROM boards b
     JOIN users u ON b.user_id = u.id
  WHERE b.is_private = false

UNION ALL

-- 4. FOLLOWS
 SELECT 'follow'::text AS activity_type,
    ur.id AS activity_id,
    ur.follower_id AS actor_id,
    u1.name::text AS actor_name,
    u1.username::text AS actor_username,
    u1.avatar_url AS actor_avatar,
    u1.is_verified AS actor_is_verified,
    'started following'::text AS action,
    u2.name::text AS target_name,
    ur.following_id AS target_id,
    'user'::text AS target_type,
    NULL::numeric AS rating,
    NULL::text AS content,
    NULL::text[] AS photos,
    ur.following_id AS related_user_id,
    u2.name::text AS related_user_name,
    u2.username::text AS related_user_username,
    u2.avatar_url AS related_user_avatar,
    'public'::text AS privacy,
    ur.created_at,
    NULL::uuid AS restaurant_id,
    NULL::text[] AS cuisine_types,
    NULL::text AS restaurant_location,
    NULL::uuid AS community_id,
    NULL::text AS community_name,
    NULL::uuid AS board_id,
    NULL::text AS board_name
   FROM user_relationships ur
     JOIN users u1 ON ur.follower_id = u1.id
     JOIN users u2 ON ur.following_id = u2.id

UNION ALL

-- 5. COMMUNITY JOINS
 SELECT 'community_join'::text AS activity_type,
    cm.id AS activity_id,
    cm.user_id AS actor_id,
    u.name::text AS actor_name,
    u.username::text AS actor_username,
    u.avatar_url AS actor_avatar,
    u.is_verified AS actor_is_verified,
    'joined community'::text AS action,
    c.name::text AS target_name,
    c.id AS target_id,
    'community'::text AS target_type,
    NULL::numeric AS rating,
    c.description AS content,
    ARRAY[c.cover_image_url] AS photos,
    NULL::uuid AS related_user_id,
    NULL::text AS related_user_name,
    NULL::text AS related_user_username,
    NULL::text AS related_user_avatar,
    'public'::text AS privacy,
    cm.joined_at AS created_at,
    NULL::uuid AS restaurant_id,
    NULL::text[] AS cuisine_types,
    c.location::text AS restaurant_location,
    c.id AS community_id,
    c.name::text AS community_name,
    NULL::uuid AS board_id,
    NULL::text AS board_name
   FROM community_members cm
     JOIN users u ON cm.user_id = u.id
     JOIN communities c ON cm.community_id = c.id
  WHERE c.type::text = 'public'::text

UNION ALL

-- 6. LIKES
 SELECT 'like'::text AS activity_type,
    pl.id AS activity_id,
    pl.user_id AS actor_id,
    u.name::text AS actor_name,
    u.username::text AS actor_username,
    u.avatar_url AS actor_avatar,
    u.is_verified AS actor_is_verified,
        CASE
            WHEN p.rating IS NOT NULL THEN 'liked a review'::text
            ELSE 'liked a post'::text
        END AS action,
    COALESCE(r.name, 'Simple Post'::character varying)::text AS target_name,
    p.id AS target_id,
    'post'::text AS target_type,
    p.rating,
    p.caption AS content,
    p.photos,
    p.user_id AS related_user_id,
    u2.name::text AS related_user_name,
    u2.username::text AS related_user_username,
    u2.avatar_url AS related_user_avatar,
    p.privacy::text AS privacy,
    pl.created_at,
    p.restaurant_id,
    r.cuisine_types,
    COALESCE((r.city::text || ', '::text) || r.state::text, r.address) AS restaurant_location,
    NULL::uuid AS community_id,
    NULL::text AS community_name,
    NULL::uuid AS board_id,
    NULL::text AS board_name
   FROM post_likes pl
     JOIN users u ON pl.user_id = u.id
     JOIN posts p ON pl.post_id = p.id
     LEFT JOIN restaurants r ON p.restaurant_id = r.id
     JOIN users u2 ON p.user_id = u2.id
  WHERE p.privacy::text = 'public'::text

UNION ALL

-- 7. COMMENTS
 SELECT 'comment'::text AS activity_type,
    pc.id AS activity_id,
    pc.user_id AS actor_id,
    u.name::text AS actor_name,
    u.username::text AS actor_username,
    u.avatar_url AS actor_avatar,
    u.is_verified AS actor_is_verified,
        CASE
            WHEN p.rating IS NOT NULL THEN 'commented on a review'::text
            ELSE 'commented on a post'::text
        END AS action,
    COALESCE(r.name, 'Simple Post'::character varying)::text AS target_name,
    p.id AS target_id,
    'post'::text AS target_type,
    p.rating,
    pc.content,
    p.photos,
    p.user_id AS related_user_id,
    u2.name::text AS related_user_name,
    u2.username::text AS related_user_username,
    u2.avatar_url AS related_user_avatar,
    p.privacy::text AS privacy,
    pc.created_at,
    p.restaurant_id,
    r.cuisine_types,
    COALESCE((r.city::text || ', '::text) || r.state::text, r.address) AS restaurant_location,
    NULL::uuid AS community_id,
    NULL::text AS community_name,
    NULL::uuid AS board_id,
    NULL::text AS board_name
   FROM post_comments pc
     JOIN users u ON pc.user_id = u.id
     JOIN posts p ON pc.post_id = p.id
     LEFT JOIN restaurants r ON p.restaurant_id = r.id
     JOIN users u2 ON p.user_id = u2.id
  WHERE p.privacy::text = 'public'::text
  ORDER BY 20 DESC;