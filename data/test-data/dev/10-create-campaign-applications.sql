-- ================================================================
-- Step 10: Create Campaign Applications
-- ================================================================
-- Creates campaign applications from creators
-- - Business 2 (MEDIUM): ~5-8 applications across 3 campaigns
-- - Business 3 (HIGH): Commented out - user doesn't exist yet
-- ================================================================

-- Business 2 (MEDIUM): Create applications for 3 campaigns
-- Each campaign gets 2-3 applications from different creators
WITH 
  -- Get creator profiles for existing creators
  creator_profiles AS (
    SELECT cp.id
    FROM public.creator_profiles cp
    JOIN public.users u ON cp.user_id = u.id
    WHERE u.email IN (
      'test-creator1@bypass.com',
      'test-creator2@bypass.com',
      'test-creator3@bypass.com'
    )
  ),
  -- Get campaigns for business 2
  campaigns AS (
    SELECT c.id, c.restaurant_id
    FROM public.campaigns c
    WHERE c.restaurant_id = '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid
    ORDER BY c.created_at DESC
    LIMIT 3
  ),
  -- Generate combinations of campaigns and creators
  -- Use row_number to limit to 2-3 applications per campaign
  ranked_combos AS (
    SELECT 
      c.id AS campaign_id,
      cp.id AS creator_id,
      ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY random()) AS rn
    FROM campaigns c
    CROSS JOIN creator_profiles cp
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.campaign_applications ca
      WHERE ca.campaign_id = c.id 
        AND ca.creator_id = cp.id
    )
  ),
  campaign_creator_combos AS (
    SELECT
      campaign_id,
      creator_id,
      rn,
      CASE 
        WHEN rn = 1 THEN 'accepted'
        WHEN rn = 2 THEN 'pending'
        ELSE 'rejected'
      END AS status,
      (50000 + (rn * 10000)) AS proposed_rate_cents,
      rn AS day_offset
    FROM ranked_combos
  )
-- Insert applications (2-3 per campaign)
INSERT INTO public.campaign_applications (
  campaign_id,
  creator_id,
  proposed_rate_cents,
  cover_letter,
  status,
  applied_at
)
SELECT
  campaign_id,
  creator_id,
  proposed_rate_cents,
  'I would love to work on this campaign! I have experience creating engaging food content and believe I can deliver high-quality results.',
  status,
  NOW() - (INTERVAL '1 day' * day_offset)
FROM campaign_creator_combos
WHERE rn <= 3  -- Up to 3 applications per campaign (will result in 2-3 per campaign typically)
ON CONFLICT (campaign_id, creator_id) DO NOTHING;

-- Business 3 (HIGH): Commented out - user doesn't exist yet
/*
WITH 
  creator_profiles AS (
    SELECT cp.id
    FROM public.creator_profiles cp
    JOIN public.users u ON cp.user_id = u.id
    WHERE u.email LIKE 'test-creator%@bypass.com'
  ),
  campaigns AS (
    SELECT c.id
    FROM public.campaigns c
    WHERE c.restaurant_id = '0557acdd-e8e8-473b-badb-913c624aa199'::uuid
    ORDER BY c.created_at DESC
    LIMIT 10
  ),
  campaign_creator_combos AS (
    SELECT 
      c.id AS campaign_id,
      cp.id AS creator_id,
      ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY random()) AS rn
    FROM campaigns c
    CROSS JOIN creator_profiles cp
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.campaign_applications ca
      WHERE ca.campaign_id = c.id 
        AND ca.creator_id = cp.id
    )
  )
INSERT INTO public.campaign_applications (
  campaign_id,
  creator_id,
  proposed_rate_cents,
  cover_letter,
  status,
  applied_at
)
SELECT
  campaign_id,
  creator_id,
  (40000 + (rn * 5000)),
  'Excited about this opportunity! I specialize in food content and would love to collaborate.',
  CASE 
    WHEN (rn % 4) = 1 THEN 'accepted'
    WHEN (rn % 4) = 2 THEN 'pending'
    WHEN (rn % 4) = 3 THEN 'accepted'
    ELSE 'rejected'
  END,
  NOW() - (INTERVAL '1 day' * rn)
FROM campaign_creator_combos
WHERE rn <= 2 + (random() * 3)::int  -- 2-4 applications per campaign
ON CONFLICT (campaign_id, creator_id) DO NOTHING;
*/
