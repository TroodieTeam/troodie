-- Cleanup Duplicate Campaign Applications
-- This removes duplicate applications, keeping only the most recent one
-- Use for test-creator1@bypass.com (or update email)

DO $$
DECLARE
  v_user_id UUID;
  v_creator_profile_id UUID;
  v_duplicate_count INTEGER;
  v_kept_applications INTEGER;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-creator1@bypass.com'; -- Change email as needed

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator1@bypass.com not found';
  END IF;

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for user';
  END IF;

  -- Find and delete duplicates, keeping the most recent application per campaign
  WITH ranked_applications AS (
    SELECT 
      id,
      campaign_id,
      applied_at,
      ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY applied_at DESC) as rn
    FROM public.campaign_applications
    WHERE creator_id = v_creator_profile_id
      AND status = 'pending' -- Only cleanup pending duplicates
  ),
  duplicates_to_delete AS (
    SELECT id
    FROM ranked_applications
    WHERE rn > 1
  )
  SELECT COUNT(*) INTO v_duplicate_count
  FROM duplicates_to_delete;

  IF v_duplicate_count > 0 THEN
    -- Delete duplicates
    WITH ranked_applications AS (
      SELECT 
        id,
        campaign_id,
        applied_at,
        ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY applied_at DESC) as rn
      FROM public.campaign_applications
      WHERE creator_id = v_creator_profile_id
        AND status = 'pending'
    )
    DELETE FROM public.campaign_applications
    WHERE id IN (
      SELECT id
      FROM ranked_applications
      WHERE rn > 1
    );

    RAISE NOTICE 'Deleted % duplicate application(s), kept the most recent one(s)', v_duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicate applications found';
  END IF;

  -- Count remaining applications
  SELECT COUNT(*) INTO v_kept_applications
  FROM public.campaign_applications
  WHERE creator_id = v_creator_profile_id
    AND status = 'pending';

  RAISE NOTICE 'Remaining pending applications: %', v_kept_applications;

END $$;

-- Verification: Check remaining applications
SELECT 
  ca.id,
  c.title as campaign_title,
  ca.status,
  ca.applied_at,
  ROW_NUMBER() OVER (PARTITION BY ca.campaign_id ORDER BY ca.applied_at DESC) as application_number
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.status = 'pending'
ORDER BY ca.campaign_id, ca.applied_at DESC;


