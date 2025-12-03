-- ================================================================
-- Step 7: Create Restaurant Saves (via board_restaurants)
-- ================================================================
-- Creates restaurant saves for analytics testing using board_restaurants
-- This matches the actual save mechanism used in the app
-- Different activity levels: NEW (5), MEDIUM (15), HIGH (25)
-- Cycles through all test users to distribute saves
-- ================================================================

-- Restaurant 1 (NEW - 5 saves)
INSERT INTO public.board_restaurants (id, board_id, restaurant_id, added_by, rating, visit_date, added_at)
SELECT
  gen_random_uuid(),
  u.default_board_id,
  '0096f74c-76c6-4709-9670-ac940c5a16ca'::uuid, -- Penguin Drive In
  u.id,
  4,
  (NOW() - (INTERVAL '1 day' * rn))::date,
  NOW() - (INTERVAL '1 day' * rn)
FROM (
  SELECT 
    id, 
    default_board_id,
    row_number() OVER (ORDER BY id) as rn
  FROM public.users
  WHERE email LIKE 'test-%@troodieapp.com'
    AND default_board_id IS NOT NULL
) u
WHERE u.rn <= 5
ON CONFLICT (board_id, restaurant_id) DO NOTHING;

-- Restaurant 2 (MEDIUM activity - 15 saves)
-- Cycles through all users multiple times using modulo
WITH all_users AS (
  SELECT 
    id, 
    default_board_id,
    row_number() OVER (ORDER BY id) as user_num
  FROM public.users
  WHERE email LIKE 'test-%@troodieapp.com'
    AND default_board_id IS NOT NULL
),
user_counts AS (
  SELECT COUNT(*) as total FROM all_users
)
INSERT INTO public.board_restaurants (id, board_id, restaurant_id, added_by, rating, visit_date, added_at)
SELECT
  gen_random_uuid(),
  au.default_board_id,
  '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid, -- Vicente
  au.id,
  4 + (gs % 2),
  (NOW() - (INTERVAL '1 day' * (gs % 30)))::date,
  NOW() - (INTERVAL '1 day' * (gs % 30))
FROM generate_series(1, 15) gs
CROSS JOIN user_counts uc
JOIN all_users au ON ((gs - 1) % uc.total) + 1 = au.user_num
ON CONFLICT (board_id, restaurant_id) DO NOTHING;

-- Restaurant 3 (HIGH activity - 25 saves)
-- Cycles through all users multiple times using modulo
WITH all_users AS (
  SELECT 
    id, 
    default_board_id,
    row_number() OVER (ORDER BY id) as user_num
  FROM public.users
  WHERE email LIKE 'test-%@troodieapp.com'
    AND default_board_id IS NOT NULL
),
user_counts AS (
  SELECT COUNT(*) as total FROM all_users
)
INSERT INTO public.board_restaurants (id, board_id, restaurant_id, added_by, rating, visit_date, added_at)
SELECT
  gen_random_uuid(),
  au.default_board_id,
  '0557acdd-e8e8-473b-badb-913c624aa199'::uuid, -- Fin & Fino
  au.id,
  4 + (gs % 2),
  (NOW() - (INTERVAL '1 day' * (gs % 30)))::date,
  NOW() - (INTERVAL '1 day' * (gs % 30))
FROM generate_series(1, 25) gs
CROSS JOIN user_counts uc
JOIN all_users au ON ((gs - 1) % uc.total) + 1 = au.user_num
ON CONFLICT (board_id, restaurant_id) DO NOTHING;
