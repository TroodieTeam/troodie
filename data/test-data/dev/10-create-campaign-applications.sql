-- ================================================================
-- Step 10: Create Campaign Applications
-- ================================================================
-- Creates campaign applications from creators
-- - Business 2 (MEDIUM): ~8 applications across 3 campaigns
-- - Business 3 (HIGH): ~25 applications across 10 campaigns
-- ================================================================

DO $$
DECLARE
  campaign_id UUID;
  creator_profile_id UUID;
  application_id UUID;
  restaurant_id_2 UUID := '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid; -- Vicente (Business 2 - MEDIUM)
  restaurant_id_3 UUID := '0557acdd-e8e8-473b-badb-913c624aa199'::uuid; -- Fin & Fino (Business 3 - HIGH)
  creator_profile_ids UUID[];
  i INTEGER;
  j INTEGER;
  k INTEGER := 0;
BEGIN
  -- Get all creator profile IDs (test-creator1 through test-creator7)
  creator_profile_ids := ARRAY(
    SELECT id FROM public.creator_profiles
    WHERE user_id IN (
      SELECT id FROM public.users 
      WHERE email IN (
        'test-creator1@troodieapp.com',
        'test-creator2@troodieapp.com',
        'test-creator3@troodieapp.com',
        'test-creator4@troodieapp.com',
        'test-creator5@troodieapp.com',
        'test-creator6@troodieapp.com',
        'test-creator7@troodieapp.com'
      )
    )
  );

  -- Business 2 (MEDIUM): 5-8 applications across 3 campaigns
  FOR campaign_id IN 
    SELECT id FROM public.campaigns 
    WHERE restaurant_id = restaurant_id_2 
    ORDER BY created_at DESC 
    LIMIT 3
  LOOP
    -- 2-3 applications per campaign
    FOR j IN 1..(2 + (random() * 2)::int) LOOP
      creator_profile_id := creator_profile_ids[1 + (j % array_length(creator_profile_ids, 1))];
      
      INSERT INTO public.campaign_applications (
        id, campaign_id, creator_id, proposed_rate_cents, cover_letter, status, applied_at
      )
      VALUES (
        gen_random_uuid(),
        campaign_id,
        creator_profile_id,
        (50000 + (j * 10000)), -- $500-$700 in cents
        'I would love to work on this campaign! I have experience creating engaging food content and believe I can deliver high-quality results.',
        CASE 
          WHEN j = 1 THEN 'accepted'
          WHEN j = 2 THEN 'pending'
          ELSE 'rejected'
        END,
        NOW() - (INTERVAL '1 day' * j)
      )
      RETURNING id INTO application_id;
    END LOOP;
  END LOOP;

  -- Business 3 (HIGH): 20-30 applications across 10 campaigns
  FOR campaign_id IN 
    SELECT id FROM public.campaigns 
    WHERE restaurant_id = restaurant_id_3 
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    -- 2-4 applications per campaign
    FOR j IN 1..(2 + (random() * 3)::int) LOOP
      creator_profile_id := creator_profile_ids[1 + ((j + k) % array_length(creator_profile_ids, 1))];
      k := k + 1;
      
      INSERT INTO public.campaign_applications (
        id, campaign_id, creator_id, proposed_rate_cents, cover_letter, status, applied_at
      )
      VALUES (
        gen_random_uuid(),
        campaign_id,
        creator_profile_id,
        (40000 + (j * 5000)), -- $400-$600 in cents
        'Excited about this opportunity! I specialize in ' || CASE (j % 3) WHEN 0 THEN 'food photography' WHEN 1 THEN 'video content' ELSE 'restaurant reviews' END || ' and would love to collaborate.',
        CASE 
          WHEN (j % 4) = 1 THEN 'accepted'
          WHEN (j % 4) = 2 THEN 'pending'
          WHEN (j % 4) = 3 THEN 'accepted'
          ELSE 'rejected'
        END,
        NOW() - (INTERVAL '1 day' * j)
      )
      RETURNING id INTO application_id;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Step 10 Complete: Created campaign applications';
  RAISE NOTICE '   - Business 2 (MEDIUM): ~8 applications';
  RAISE NOTICE '   - Business 3 (HIGH): ~25 applications';
END $$;

