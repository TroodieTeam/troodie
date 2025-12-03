-- ================================================================
-- Step 5: Claim Existing Restaurants
-- ================================================================
-- Claims 3 existing restaurants (one per business account)
-- Leaves other restaurants unclaimed for testing claim flow
-- ================================================================

DO $$
DECLARE
  restaurant_id_1 UUID := '0096f74c-76c6-4709-9670-ac940c5a16ca'::uuid; -- Penguin Drive In (for test-business1 - NEW)
  restaurant_id_2 UUID := '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid; -- Vicente (for test-business2 - MEDIUM)
  restaurant_id_3 UUID := '0557acdd-e8e8-473b-badb-913c624aa199'::uuid; -- Fin & Fino (for test-business3 - HIGH)
BEGIN
  -- Update restaurants to be claimed
  UPDATE public.restaurants
  SET 
    is_claimed = true,
    owner_id = 'f8a9b0c1-d2e3-4456-f789-012345678901'::uuid, -- test-business1
    updated_at = NOW()
  WHERE id = restaurant_id_1;

  UPDATE public.restaurants
  SET 
    is_claimed = true,
    owner_id = 'a9b0c1d2-e3f4-4567-a890-123456789012'::uuid, -- test-business2
    updated_at = NOW()
  WHERE id = restaurant_id_2;

  UPDATE public.restaurants
  SET 
    is_claimed = true,
    owner_id = 'b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, -- test-business3
    updated_at = NOW()
  WHERE id = restaurant_id_3;

  -- Create business profiles and link to restaurants
  INSERT INTO public.business_profiles (id, user_id, restaurant_id, verification_status, created_at, updated_at)
  VALUES
    ('0d1e2f3a-4b5c-4678-d901-234567890123'::uuid, 'f8a9b0c1-d2e3-4456-f789-012345678901'::uuid, restaurant_id_1, 'verified', NOW(), NOW()), -- test-business1
    ('1e2f3a4b-5c6d-4789-e012-345678901234'::uuid, 'a9b0c1d2-e3f4-4567-a890-123456789012'::uuid, restaurant_id_2, 'verified', NOW(), NOW()), -- test-business2
    ('2f3a4b5c-6d7e-4890-f123-456789012345'::uuid, 'b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, restaurant_id_3, 'verified', NOW(), NOW()) -- test-business3
  ON CONFLICT (user_id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    verification_status = EXCLUDED.verification_status,
    updated_at = NOW();

  RAISE NOTICE '✅ Step 5 Complete: Claimed 3 existing restaurants';
  RAISE NOTICE '   - test-business1: Penguin Drive In (NEW - no campaigns)';
  RAISE NOTICE '   - test-business2: Vicente (MEDIUM activity)';
  RAISE NOTICE '   - test-business3: Fin & Fino (HIGH activity)';
  RAISE NOTICE '   - Other restaurants remain unclaimed for testing claim flow';
END $$;

