-- Reset SQL: Content Submission Flow Fix
-- WARNING: This will reset test data. Use with caution.

-- Reset workflow_stage for all deliverables back to 'upload'
UPDATE campaign_deliverables
SET workflow_stage = 'upload',
    content_file_url = NULL,
    content_file_type = NULL,
    proof_submitted_at = NULL
WHERE workflow_stage IS NOT NULL
  AND workflow_stage != 'upload';

-- Delete uploaded content from storage bucket (manual step)
-- Run: SELECT * FROM storage.objects WHERE bucket_id = 'campaign-content';
-- Then delete as needed
