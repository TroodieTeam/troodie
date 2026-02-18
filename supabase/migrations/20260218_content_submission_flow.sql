-- =============================================
-- Content Submission Flow Fix
-- Date: 2026-02-18
-- Feature: content-submission-flow-fix
-- Description: Add columns to support two-stage submission workflow
--   Stage 1: Creator uploads content for review (video/photo)
--   Stage 2: After approval, creator submits proof links (post URLs)
-- =============================================

-- =============================================
-- ADD NEW COLUMNS TO campaign_deliverables
-- =============================================

-- content_file_url: URL to uploaded content file in Supabase Storage (for review)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaign_deliverables' AND column_name='content_file_url') THEN
    ALTER TABLE campaign_deliverables ADD COLUMN content_file_url TEXT;
  END IF;
END $$;

-- content_file_type: MIME type of uploaded content ('video/mp4', 'image/jpeg', etc.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaign_deliverables' AND column_name='content_file_type') THEN
    ALTER TABLE campaign_deliverables ADD COLUMN content_file_type TEXT;
  END IF;
END $$;

-- proof_submitted_at: When proof links were submitted (Stage 2 completion)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaign_deliverables' AND column_name='proof_submitted_at') THEN
    ALTER TABLE campaign_deliverables ADD COLUMN proof_submitted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- workflow_stage: Tracks current position in the two-stage workflow
-- 'upload' -> 'review' -> 'approved' -> 'posting' -> 'proof'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='campaign_deliverables' AND column_name='workflow_stage') THEN
    ALTER TABLE campaign_deliverables ADD COLUMN workflow_stage TEXT DEFAULT 'upload';
  END IF;
END $$;

-- Add index on workflow_stage for filtering
CREATE INDEX IF NOT EXISTS idx_deliverables_workflow_stage ON campaign_deliverables(workflow_stage);

-- =============================================
-- CREATE STORAGE BUCKET FOR CAMPAIGN CONTENT
-- =============================================

-- Create the campaign-content bucket (private - not publicly accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'campaign-content', 'campaign-content', false, 104857600,
  ARRAY['video/mp4', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/png']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'campaign-content');

-- =============================================
-- STORAGE RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Creators can upload campaign content" ON storage.objects;
CREATE POLICY "Creators can upload campaign content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-content'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Creators can view own campaign content" ON storage.objects;
CREATE POLICY "Creators can view own campaign content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-content'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Creators can delete own campaign content" ON storage.objects;
CREATE POLICY "Creators can delete own campaign content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-content'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Creators can update own campaign content" ON storage.objects;
CREATE POLICY "Creators can update own campaign content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-content'
  AND auth.uid() IS NOT NULL
);

-- =============================================
-- UPDATE RLS POLICY FOR CREATOR UPDATES
-- =============================================

DROP POLICY IF EXISTS "Creators can update own deliverables for workflow" ON campaign_deliverables;
CREATE POLICY "Creators can update own deliverables for workflow" ON campaign_deliverables
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    AND status IN ('draft', 'pending_review', 'approved', 'auto_approved')
  );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN campaign_deliverables.content_file_url IS 'URL to uploaded content file in Supabase Storage (video/photo for restaurant review)';
COMMENT ON COLUMN campaign_deliverables.content_file_type IS 'MIME type of uploaded content (video/mp4, image/jpeg, etc.)';
COMMENT ON COLUMN campaign_deliverables.proof_submitted_at IS 'Timestamp when creator submitted post proof links (Stage 2)';
COMMENT ON COLUMN campaign_deliverables.workflow_stage IS 'Two-stage workflow: upload -> review -> approved -> posting -> proof';
