-- Step 6: Create pending application for creator2 (prod-creator2@bypass.com)
-- Skips silently if creator2 profile does not exist

INSERT INTO public.campaign_applications (
  campaign_id,
  creator_id,
  status,
  cover_letter,
  applied_at
)
SELECT
  c.id,
  cp.id,
  'pending',
  'Would be a great opportunity! I have experience with restaurant content creation.',
  NOW() - INTERVAL '1 day'  -- applied_at
FROM public.campaigns c
CROSS JOIN public.creator_profiles cp
WHERE c.owner_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
  AND c.name = 'E2E Deliverable Test Campaign'
  AND cp.user_id = '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid
ORDER BY c.created_at DESC
LIMIT 1;