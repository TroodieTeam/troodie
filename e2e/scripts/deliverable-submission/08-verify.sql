-- Step 8: Verify setup

SELECT
  'Setup Complete' AS status,
  (SELECT COUNT(*) FROM campaigns
   WHERE status = 'active'
     AND payment_status = 'paid'
     AND owner_id = 'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid) AS active_campaigns,
  (SELECT COUNT(*) FROM campaign_applications ca
   JOIN creator_profiles cp ON cp.id = ca.creator_id
   WHERE ca.status = 'accepted'
     AND cp.user_id = '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid) AS accepted_applications,
  (SELECT COUNT(*) FROM campaign_applications ca
   JOIN creator_profiles cp ON cp.id = ca.creator_id
   WHERE ca.status = 'pending'
     AND cp.user_id = '6740e5be-c1ca-444c-b100-6122c3dd8273'::uuid) AS pending_applications;
