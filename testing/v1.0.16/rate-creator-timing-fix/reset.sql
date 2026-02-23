-- WARNING: This script DELETES test data. Review before running.
-- Reset Script: Rate Creator Timing Fix
-- Date: 2026-02-18

-- 1. Clear ratings from test applications (preserves the application itself)
UPDATE campaign_applications
SET rating = NULL, rating_comment = NULL, rated_at = NULL
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE title ILIKE '%test%' OR name ILIKE '%test%'
);

-- 2. Reset deliverable statuses to pending_review for test campaigns
UPDATE campaign_deliverables
SET status = 'pending_review', reviewed_at = NULL, reviewer_id = NULL
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE title ILIKE '%test%' OR name ILIKE '%test%'
);
