-- Accept a Campaign Application for Testing
-- This script accepts a pending application so it appears in the "Active" tab
-- Usage: Update the email and optionally the campaign_id below

DO $$
DECLARE
  v_user_id UUID;
  v_creator_profile_id UUID;
  v_application_id UUID;
  v_campaign_id UUID; -- Optional: Set to specific campaign ID, or leave NULL to accept first pending
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

  RAISE NOTICE 'Found creator profile ID: %', v_creator_profile_id;

  -- Find a pending application
  -- Option 1: Accept first pending application
  SELECT id, campaign_id INTO v_application_id, v_campaign_id
  FROM public.campaign_applications
  WHERE creator_id = v_creator_profile_id
    AND status = 'pending'
  ORDER BY applied_at DESC
  LIMIT 1;

  -- Option 2: Accept specific campaign application (uncomment and set campaign_id)
  -- v_campaign_id := 'YOUR-CAMPAIGN-ID-HERE';
  -- SELECT id INTO v_application_id
  -- FROM public.campaign_applications
  -- WHERE creator_id = v_creator_profile_id
  --   AND campaign_id = v_campaign_id
  --   AND status = 'pending'
  -- LIMIT 1;

  IF v_application_id IS NULL THEN
    RAISE EXCEPTION 'No pending application found';
  END IF;

  RAISE NOTICE 'Found pending application ID: % for campaign: %', v_application_id, v_campaign_id;

  -- Accept the application
  UPDATE public.campaign_applications
  SET 
    status = 'accepted',
    reviewed_at = NOW(),
    reviewer_id = v_user_id -- Using user_id as reviewer for testing
  WHERE id = v_application_id;

  RAISE NOTICE 'Application % accepted successfully!', v_application_id;

  -- Update campaign accepted_creators_count
  UPDATE public.campaigns
  SET 
    accepted_creators_count = COALESCE(accepted_creators_count, 0) + 1,
    updated_at = NOW()
  WHERE id = v_campaign_id;

  RAISE NOTICE 'Campaign % updated with new accepted creator count', v_campaign_id;

END $$;

-- Verification: Check the accepted application
SELECT 
  ca.id as application_id,
  c.title as campaign_title,
  ca.status,
  ca.reviewed_at,
  u.email as creator_email
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'test-creator1@bypass.com'
  AND ca.status = 'accepted'
ORDER BY ca.reviewed_at DESC;


