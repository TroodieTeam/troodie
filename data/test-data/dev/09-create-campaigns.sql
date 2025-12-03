-- ================================================================
-- Step 9: Create Campaigns for Business Accounts
-- ================================================================
-- Creates campaigns with different activity levels:
-- - Business 1 (NEW): 0 campaigns
-- - Business 2 (MEDIUM): 3 campaigns
-- - Business 3 (HIGH): 10 campaigns
-- ================================================================

DO $$
DECLARE
  campaign_id UUID;
  restaurant_id_2 UUID := '052bcb9b-66da-4aa6-b114-48df7309efb1'::uuid; -- Vicente (Business 2 - MEDIUM)
  restaurant_id_3 UUID := '0557acdd-e8e8-473b-badb-913c624aa199'::uuid; -- Fin & Fino (Business 3 - HIGH)
  business_user_2 UUID := 'a9b0c1d2-e3f4-4567-a890-123456789012'::uuid; -- test-business2
  business_user_3 UUID := 'b0c1d2e3-f4a5-4678-b901-234567890123'::uuid; -- test-business3
  i INTEGER;
BEGIN
  -- Business 2 (MEDIUM): 3 campaigns
  FOR i IN 1..3 LOOP
    INSERT INTO public.campaigns (
      id, restaurant_id, owner_id, title, description, budget_cents, status, start_date, end_date, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      restaurant_id_2,
      business_user_2,
      CASE i
        WHEN 1 THEN 'Spring Menu Launch Campaign'
        WHEN 2 THEN 'Weekend Brunch Promotion'
        WHEN 3 THEN 'Summer Patio Dining Feature'
      END,
      CASE i
        WHEN 1 THEN 'Looking for creators to showcase our new spring menu items. Focus on seasonal ingredients and fresh flavors.'
        WHEN 2 THEN 'Promoting our weekend brunch specials. Need engaging content for social media.'
        WHEN 3 THEN 'Highlight our beautiful outdoor patio space and summer dining experience.'
      END,
      (50000 + (i * 10000)), -- $500-$700 in cents
      CASE i WHEN 1 THEN 'active' WHEN 2 THEN 'active' ELSE 'completed' END,
      (NOW() - (INTERVAL '1 week' * i))::date,
      (NOW() + (INTERVAL '1 week' * (4 - i)))::date,
      NOW() - (INTERVAL '1 week' * i),
      NOW() - (INTERVAL '1 week' * i)
    )
    RETURNING id INTO campaign_id;
  END LOOP;

  -- Business 3 (HIGH): 10 campaigns
  FOR i IN 1..10 LOOP
    INSERT INTO public.campaigns (
      id, restaurant_id, owner_id, title, description, budget_cents, status, start_date, end_date, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      restaurant_id_3,
      business_user_3,
      'Campaign ' || i || ' - ' || CASE (i % 5)
        WHEN 0 THEN 'Sushi Special Feature'
        WHEN 1 THEN 'Date Night Promotion'
        WHEN 2 THEN 'Happy Hour Highlight'
        WHEN 3 THEN 'Chef''s Special Showcase'
        WHEN 4 THEN 'Holiday Menu Launch'
      END,
      'Detailed campaign description for campaign ' || i || '. Looking for talented creators to create engaging content.',
      (30000 + (i * 5000)), -- $300-$800 in cents
      CASE 
        WHEN i <= 3 THEN 'active'
        WHEN i <= 7 THEN 'completed'
        ELSE 'draft'  -- Now supported by database constraint
      END,
      (NOW() - (INTERVAL '1 week' * i))::date,
      (NOW() + (INTERVAL '1 week' * (11 - i)))::date,
      NOW() - (INTERVAL '1 week' * i),
      NOW() - (INTERVAL '1 week' * i)
    )
    RETURNING id INTO campaign_id;
  END LOOP;

  RAISE NOTICE '✅ Step 9 Complete: Created campaigns';
  RAISE NOTICE '   - Business 1 (NEW): 0 campaigns';
  RAISE NOTICE '   - Business 2 (MEDIUM): 3 campaigns';
  RAISE NOTICE '   - Business 3 (HIGH): 10 campaigns';
END $$;

