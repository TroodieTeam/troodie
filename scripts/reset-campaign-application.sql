-- Reset Campaign Application for Testing
-- This script removes a specific campaign application to allow re-testing
-- Usage: Update the email and campaign_id variables below

DO $$
DECLARE
  v_user_id UUID;
  v_creator_profile_id UUID;
  v_campaign_id UUID; -- Set this to the campaign ID you want to reset
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'test-creator1@bypass.com'; -- Change email as needed

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User test-creator1@bypass.com not found';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Get creator profile ID
  SELECT id INTO v_creator_profile_id
  FROM public.creator_profiles
  WHERE user_id = v_user_id;

  IF v_creator_profile_id IS NULL THEN
    RAISE EXCEPTION 'Creator profile not found for user';
  END IF;

  RAISE NOTICE 'Found creator profile ID: %', v_creator_profile_id;

  -- Delete all applications for this creator (or specify a campaign_id)
  -- Option 1: Delete all applications
  DELETE FROM public.campaign_applications
  WHERE creator_id = v_creator_profile_id;
  
  RAISE NOTICE 'Deleted all campaign applications for creator profile ID: %', v_creator_profile_id;

  -- Option 2: Delete specific campaign application (uncomment and set campaign_id)
  -- v_campaign_id := 'YOUR-CAMPAIGN-ID-HERE';
  -- DELETE FROM public.campaign_applications
  -- WHERE creator_id = v_creator_profile_id
  -- AND campaign_id = v_campaign_id;
  -- RAISE NOTICE 'Deleted application for campaign ID: %', v_campaign_id;

END $$;

-- Verification queries (run separately)
-- Check all applications for the user
SELECT 
  ca.id as application_id,
  ca.campaign_id,
  c.title as campaign_title,
  ca.status,
  ca.applied_at,
  ca.proposed_rate_cents,
  ca.cover_letter,
  ca.proposed_deliverables
FROM public.campaign_applications ca
JOIN public.creator_profiles cp ON ca.creator_id = cp.id
JOIN public.users u ON cp.user_id = u.id
LEFT JOIN public.campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'test-creator1@bypass.com'
ORDER BY ca.applied_at DESC;


