-- Step 1: Clean up previous deliverable submission test data
-- Run independently or as first step in sequence

-- Prod test user IDs
-- creator1: 348be0b5-eef5-41be-8728-84c4d09d2bf2
-- creator2: 6740e5be-c1ca-444c-b100-6122c3dd8273
-- business1: cfd8cdb5-a227-42bd-8040-cd4fb965b58e

DELETE FROM campaign_deliverables
WHERE creator_id IN (
  SELECT id FROM creator_profiles
  WHERE user_id IN (
    '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid,
    '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid
  )
);

DELETE FROM campaign_applications
WHERE creator_id IN (
  SELECT id FROM creator_profiles
  WHERE user_id IN (
    '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid,
    '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid
  )
);

DELETE FROM campaign_payments
WHERE business_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid;

DELETE FROM payment_transactions
WHERE business_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid;

-- Remove our test campaign so we get a fresh one
DELETE FROM campaigns
WHERE owner_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid
  AND name = 'E2E Deliverable Test Campaign';
