-- ================================================================
-- Step 5: Claim Existing Restaurants
-- ================================================================
-- Claims existing restaurants for business accounts
-- Currently claims 2 restaurants (business3 commented out)
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
    owner_id = '8e7df4ee-e180-427b-ad8d-e6ffcf41a03a'::uuid, -- test-business1
    updated_at = NOW()
  WHERE id = restaurant_id_1;

  UPDATE public.restaurants
  SET 
    is_claimed = true,
    owner_id = 'f456d1ea-96f0-4245-b420-4db4e6456def'::uuid, -- test-business2
    updated_at = NOW()
  WHERE id = restaurant_id_2;

  -- Business 3 commented out - user doesn't exist yet
  /*
  UPDATE public.restaurants
  SET 
    is_claimed = true,
    owner_id = 'b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, -- test-business3
    updated_at = NOW()
  WHERE id = restaurant_id_3;
  */

  -- Create business profiles and link to restaurants
  -- Note: Removed hardcoded 'id' values - letting them auto-generate
  INSERT INTO public.business_profiles (user_id, restaurant_id, verification_status, created_at, updated_at)
  VALUES
    ('8e7df4ee-e180-427b-ad8d-e6ffcf41a03a'::uuid, restaurant_id_1, 'verified', NOW(), NOW()), -- test-business1
    ('f456d1ea-96f0-4245-b420-4db4e6456def'::uuid, restaurant_id_2, 'verified', NOW(), NOW()) -- test-business2
  ON CONFLICT (user_id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    verification_status = EXCLUDED.verification_status,
    updated_at = NOW();

  RAISE NOTICE '✅ Step 5 Complete: Claimed 2 existing restaurants';
  RAISE NOTICE '   - test-business1: Penguin Drive In (NEW - no campaigns)';
  RAISE NOTICE '   - test-business2: Vicente (MEDIUM activity)';
  RAISE NOTICE '   - test-business3: Fin & Fino (will be added when user is created)';
  RAISE NOTICE '   - Other restaurants remain unclaimed for testing claim flow';
END $$;

