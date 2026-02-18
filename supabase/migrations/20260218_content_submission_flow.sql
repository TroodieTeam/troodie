-- Migration: Content Submission Flow
-- Stage 1: Creator uploads video/photo for restaurant review
-- Stage 2: After approval, creator submits proof links

ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS content_file_url TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS content_file_type TEXT;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ;
ALTER TABLE campaign_deliverables ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'upload';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-content', 'campaign-content', false, 104857600,
  ARRAY['video/mp4', 'video/quicktime', 'video/mov', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload campaign content"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campaign-content');

CREATE POLICY "Authenticated users can view campaign content"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'campaign-content');

CREATE POLICY "Authenticated users can delete campaign content"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'campaign-content');

CREATE POLICY "Authenticated users can update campaign content"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'campaign-content');

CREATE POLICY "Creators can update own deliverables for workflow"
ON campaign_deliverables FOR UPDATE TO authenticated
USING (creator_id = auth.uid() AND status IN ('draft', 'pending_review', 'approved', 'auto_approved'))
WITH CHECK (creator_id = auth.uid() AND status IN ('draft', 'pending_review', 'approved', 'auto_approved'));
