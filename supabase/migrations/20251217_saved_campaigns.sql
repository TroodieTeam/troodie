CREATE TABLE IF NOT EXISTS saved_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, campaign_id)
);

-- RLS: Creators can only see/manage their own saves
ALTER TABLE saved_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own saves" ON saved_campaigns
  FOR SELECT USING (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Creators can insert own saves" ON saved_campaigns
  FOR INSERT WITH CHECK (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Creators can delete own saves" ON saved_campaigns
  FOR DELETE USING (creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  ));
