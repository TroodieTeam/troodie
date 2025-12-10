-- ============================================================================
-- PART 4: Create Default Boards
-- ============================================================================
-- Run this part to create default "Quick Saves" boards for all test users
-- ============================================================================

INSERT INTO boards (user_id, title, description, created_at, updated_at)
SELECT 
  id, 
  'Quick Saves', 
  'Default board for quick saves', 
  NOW(), 
  NOW()
FROM users
WHERE id IN (
  'b22f710c-c15a-4ee1-bce4-061902b954cc'::uuid, -- prod-consumer1@bypass.com
  '2621c5c4-a6de-42e5-8f1d-b73039646403'::uuid, -- prod-consumer2@bypass.com
  '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid, -- prod-creator1@bypass.com
  '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid, -- prod-creator2@bypass.com
  '08f478e2-45b9-4ab2-a068-8276beb851c3'::uuid, -- prod-creator3@bypass.com
  'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid, -- prod-business1@bypass.com
  '0e281bb7-6867-40b4-afff-4e82608cc34d'::uuid  -- prod-business2@bypass.com
)
AND NOT EXISTS (
  SELECT 1 FROM boards WHERE user_id = users.id AND title = 'Quick Saves'
);
