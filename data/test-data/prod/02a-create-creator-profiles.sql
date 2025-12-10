-- ============================================================================
-- PART 1: Create Creator Profiles
-- ============================================================================
-- Run this part first to create creator profiles for test accounts
-- ============================================================================

-- Creator 1: Available, ready for campaigns
INSERT INTO creator_profiles (
  user_id,
  display_name,
  bio,
  location,
  specialties,
  open_to_collabs,
  availability_status,
  instagram_followers,
  tiktok_followers,
  troodie_posts_count,
  troodie_likes_count,
  created_at,
  updated_at
)
SELECT
  '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid, -- prod-creator1@bypass.com
  'Prod Food Creator',
  'Production test creator for internal testing. Focuses on food photography and restaurant reviews.',
  'Charlotte, NC',
  ARRAY['Food Photography', 'Fine Dining', 'Local Restaurants'],
  true,
  'available',
  5000,
  3000,
  10,
  50,  -- Adjusted: (50/10)*100 = 500% engagement rate (under 999.99 limit)
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM users WHERE id = '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  specialties = EXCLUDED.specialties,
  open_to_collabs = EXCLUDED.open_to_collabs,
  availability_status = EXCLUDED.availability_status,
  updated_at = NOW();

-- Creator 2: Available, video content specialist
INSERT INTO creator_profiles (
  user_id,
  display_name,
  bio,
  location,
  specialties,
  open_to_collabs,
  availability_status,
  instagram_followers,
  tiktok_followers,
  troodie_posts_count,
  troodie_likes_count,
  created_at,
  updated_at
)
SELECT
  '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid, -- prod-creator2@bypass.com
  'Prod Content Creator',
  'Production test creator for internal testing. Video content specialist focusing on restaurant reviews.',
  'Atlanta, GA',
  ARRAY['Video Content', 'Restaurant Reviews', 'Street Food'],
  true,
  'available',
  8000,
  12000,
  25,
  200,  -- Adjusted: (200/25)*100 = 800% engagement rate (under 999.99 limit)
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM users WHERE id = '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  specialties = EXCLUDED.specialties,
  open_to_collabs = EXCLUDED.open_to_collabs,
  availability_status = EXCLUDED.availability_status,
  updated_at = NOW();

-- Creator 3: Busy status (for testing availability filtering)
INSERT INTO creator_profiles (
  user_id,
  display_name,
  bio,
  location,
  specialties,
  open_to_collabs,
  availability_status,
  instagram_followers,
  tiktok_followers,
  troodie_posts_count,
  troodie_likes_count,
  created_at,
  updated_at
)
SELECT
  '08f478e2-45b9-4ab2-a068-8276beb851c3'::uuid, -- prod-creator3@bypass.com
  'Prod Lifestyle Creator',
  'Production test creator - currently busy status for testing availability filtering.',
  'Raleigh, NC',
  ARRAY['Lifestyle', 'Brunch', 'Coffee'],
  true,
  'busy',
  3000,
  2000,
  5,
  30,  -- Adjusted: (30/5)*100 = 600% engagement rate (under 999.99 limit)
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM users WHERE id = '08f478e2-45b9-4ab2-a068-8276beb851c3'::uuid)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  specialties = EXCLUDED.specialties,
  open_to_collabs = EXCLUDED.open_to_collabs,
  availability_status = EXCLUDED.availability_status,
  updated_at = NOW();
