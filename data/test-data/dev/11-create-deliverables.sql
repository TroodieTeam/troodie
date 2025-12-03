-- ================================================================
-- Step 11: Create Deliverables
-- ================================================================
-- Creates deliverables for accepted campaign applications
-- - Business 2 (MEDIUM): ~5 deliverables
-- - Business 3 (HIGH): ~15 deliverables
-- ================================================================

DO $$
DECLARE
  application_id UUID;
  creator_profile_id UUID;
  campaign_id UUID;
  restaurant_id UUID;
  deliverable_id UUID;
  i INTEGER := 0;
  j INTEGER;
  restaurant_id_2 UUID := '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid; -- Vicente (Business 2 - MEDIUM)
  restaurant_id_3 UUID := '0557acdd-e8e8-473b-badb-913c624aa199'::uuid; -- Fin & Fino (Business 3 - HIGH)
BEGIN
  -- Business 2 (MEDIUM): 3-5 deliverables
  FOR application_id IN 
    SELECT ca.id 
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE c.restaurant_id = restaurant_id_2
      AND ca.status = 'accepted'
    LIMIT 3
  LOOP
    SELECT ca.creator_id, ca.campaign_id, c.restaurant_id
    INTO creator_profile_id, campaign_id, restaurant_id
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE ca.id = application_id;

    -- 1-2 deliverables per application
    FOR j IN 1..(1 + (random() * 2)::int) LOOP
      DECLARE
        deliverable_status VARCHAR(50);
        auto_approved_timestamp TIMESTAMP WITH TIME ZONE;
      BEGIN
        deliverable_status := CASE 
          WHEN j = 1 THEN 'approved'
          WHEN j = 2 THEN 'pending_review'
          ELSE 'auto_approved'
        END;
        
        -- Set auto_approved_at if status is auto_approved (required by constraint)
        IF deliverable_status = 'auto_approved' THEN
          auto_approved_timestamp := NOW() - (INTERVAL '1 day' * j);
        ELSE
          auto_approved_timestamp := NULL;
        END IF;
        
        INSERT INTO public.campaign_deliverables (
          id, campaign_application_id, creator_id, restaurant_id, campaign_id,
          content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url,
          status, submitted_at, auto_approved_at, payment_status, payment_amount_cents
        )
        VALUES (
          gen_random_uuid(),
          application_id,
          creator_profile_id,
          restaurant_id,
          campaign_id,
          CASE (j % 3) WHEN 0 THEN 'photo' WHEN 1 THEN 'reel' ELSE 'post' END,
          'https://example.com/deliverable' || j || '.jpg',
          'https://images.unsplash.com/photo-' || (1700000000000 + j) || '?w=800',
          'Amazing experience! Check out this content for the campaign.',
          CASE (j % 2) WHEN 0 THEN 'instagram' ELSE 'tiktok' END,
          'https://instagram.com/p/ABC' || j,
          deliverable_status,
          NOW() - (INTERVAL '1 day' * j),
          auto_approved_timestamp,
          CASE 
            WHEN j = 1 THEN 'completed'
            WHEN j = 2 THEN 'pending'
            ELSE 'processing'
          END,
          CASE WHEN j = 1 THEN 50000 ELSE 60000 END
        )
        RETURNING id INTO deliverable_id;
      END;
    END LOOP;
  END LOOP;

  -- Business 3 (HIGH): 15-20 deliverables
  FOR application_id IN 
    SELECT ca.id 
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE c.restaurant_id = restaurant_id_3
      AND ca.status = 'accepted'
    LIMIT 10
  LOOP
    SELECT ca.creator_id, ca.campaign_id, c.restaurant_id
    INTO creator_profile_id, campaign_id, restaurant_id
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON ca.campaign_id = c.id
    WHERE ca.id = application_id;

    -- 1-2 deliverables per application
    FOR j IN 1..(1 + (random() * 2)::int) LOOP
      DECLARE
        deliverable_status VARCHAR(50);
        auto_approved_timestamp TIMESTAMP WITH TIME ZONE;
      BEGIN
        deliverable_status := CASE (j % 5)
          WHEN 0 THEN 'approved'
          WHEN 1 THEN 'pending_review'
          WHEN 2 THEN 'auto_approved'
          WHEN 3 THEN 'approved'
          ELSE 'pending_review'
        END;
        
        -- Set auto_approved_at if status is auto_approved (required by constraint)
        IF deliverable_status = 'auto_approved' THEN
          auto_approved_timestamp := NOW() - (INTERVAL '1 day' * (i * 2 + j));
        ELSE
          auto_approved_timestamp := NULL;
        END IF;
        
        INSERT INTO public.campaign_deliverables (
          id, campaign_application_id, creator_id, restaurant_id, campaign_id,
          content_type, content_url, thumbnail_url, caption, social_platform, platform_post_url,
          status, submitted_at, auto_approved_at, payment_status, payment_amount_cents
        )
        VALUES (
          gen_random_uuid(),
          application_id,
          creator_profile_id,
          restaurant_id,
          campaign_id,
          CASE (j % 4) WHEN 0 THEN 'photo' WHEN 1 THEN 'reel' WHEN 2 THEN 'video' ELSE 'post' END,
          'https://example.com/deliverable' || (i * 10 + j) || '.jpg',
          'https://images.unsplash.com/photo-' || (1700000000000 + i * 10 + j) || '?w=800',
          'Great collaboration! Here''s the content for this campaign.',
          CASE (j % 3) WHEN 0 THEN 'instagram' WHEN 1 THEN 'tiktok' ELSE 'youtube' END,
          'https://instagram.com/p/XYZ' || (i * 10 + j),
          deliverable_status,
          NOW() - (INTERVAL '1 day' * (i * 2 + j)),
          auto_approved_timestamp,
          CASE (j % 4)
            WHEN 0 THEN 'completed'
            WHEN 1 THEN 'processing'
            WHEN 2 THEN 'completed'
            ELSE 'pending'
          END,
          (40000 + (j * 5000))
        )
        RETURNING id INTO deliverable_id;
        
        i := i + 1;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Step 11 Complete: Created deliverables';
  RAISE NOTICE '   - Business 2 (MEDIUM): ~5 deliverables';
  RAISE NOTICE '   - Business 3 (HIGH): ~15 deliverables';
END $$;

