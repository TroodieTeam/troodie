-- Verification SQL: Content Submission Flow Fix
-- Run these queries to verify the implementation is working correctly.

-- 1. Verify new columns exist on campaign_deliverables
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'campaign_deliverables'
  AND column_name IN ('content_file_url', 'content_file_type', 'proof_submitted_at', 'workflow_stage');

-- 2. Verify campaign-content storage bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'campaign-content';

-- 3. Verify storage RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%campaign content%';

-- 4. Check deliverables with workflow stages
SELECT id, creator_id, status, workflow_stage, content_file_url, content_file_type,
       proof_submitted_at, submitted_at
FROM campaign_deliverables
WHERE workflow_stage IS NOT NULL
  AND workflow_stage != 'upload'
ORDER BY submitted_at DESC
LIMIT 20;

-- 5. Check deliverables awaiting proof submission (approved but no proof yet)
SELECT id, creator_id, status, workflow_stage, submitted_at
FROM campaign_deliverables
WHERE status IN ('approved', 'auto_approved')
  AND workflow_stage = 'approved'
  AND proof_submitted_at IS NULL;

-- 6. Check completed flow (proof submitted)
SELECT id, creator_id, status, workflow_stage, platform_post_url,
       proof_submitted_at, content_file_url
FROM campaign_deliverables
WHERE workflow_stage = 'proof'
  AND proof_submitted_at IS NOT NULL;
