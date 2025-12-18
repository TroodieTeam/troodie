-- Insert 3 test posts for comment count testing
-- These posts will be used as primary focus for testing comment functionality

INSERT INTO posts (
  user_id,
  restaurant_id,
  caption,
  content_type,
  photos,
  tags,
  price_range,
  visit_type,
  privacy,
  likes_count,
  comments_count,
  saves_count,
  share_count,
  created_at,
  updated_at
) VALUES
  (
    (SELECT id FROM auth.users WHERE email = 'test-consumer1@bypass.com' LIMIT 1),
    (SELECT id FROM restaurants LIMIT 1),
    'Test Post #1 - Comment Testing',
    'original',
    ARRAY[]::text[],
    ARRAY['test', 'comments']::text[],
    '$$',
    'dine_in',
    'public',
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'test-consumer1@bypass.com' LIMIT 1),
    (SELECT id FROM restaurants LIMIT 1),
    'Test Post #2 - Comment Testing',
    'original',
    ARRAY[]::text[],
    ARRAY['test', 'comments']::text[],
    '$$',
    'dine_in',
    'public',
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'test-consumer1@bypass.com' LIMIT 1),
    (SELECT id FROM restaurants LIMIT 1),
    'Test Post #3 - Comment Testing',
    'original',
    ARRAY[]::text[],
    ARRAY['test', 'comments']::text[],
    '$$',
    'dine_in',
    'public',
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Return the IDs of the inserted posts for reference
SELECT 
  id,
  caption,
  comments_count,
  created_at
FROM posts
WHERE caption LIKE 'Test Post%Comment Testing'
ORDER BY created_at DESC
LIMIT 3;

