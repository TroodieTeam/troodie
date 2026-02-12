-- Step 5: Create accepted application for creator1 (prod-creator1@bypass.com)

INSERT INTO campaign_applications (
  campaign_id,
  creator_id,
  status,
  cover_letter,
  applied_at,
  reviewed_at,
  created_at,
  updated_at
)
SELECT
  c.id,
  cp.id,
  'accepted',
  'I would love to create content for your restaurant! I specialize in food photography and short-form video.',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 days',
  NOW()
FROM campaigns c
CROSS JOIN creator_profiles cp
WHERE c.owner_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
  AND c.name = 'E2E Deliverable Test Campaign'
  AND cp.user_id = '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid
ORDER BY c.created_at DESC
LIMIT 1;
