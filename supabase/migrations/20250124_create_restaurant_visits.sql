-- Create restaurant_visits table to track user visits to restaurants
-- This table is used to mark restaurants as "visited" when users submit reviews

CREATE TABLE IF NOT EXISTS restaurant_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    visit_type VARCHAR(20) CHECK (visit_type IN ('check_in', 'review', 'save')),
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- Link to the post/review that triggered this visit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id, post_id) -- Prevent duplicate visits from same post
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_visits_user_id ON restaurant_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_visits_restaurant_id ON restaurant_visits(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_visits_created_at ON restaurant_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_visits_user_restaurant ON restaurant_visits(user_id, restaurant_id);

-- Enable RLS
ALTER TABLE restaurant_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all visits (for social features)
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can view all restaurant visits" ON restaurant_visits;
CREATE POLICY "Users can view all restaurant visits"
    ON restaurant_visits
    FOR SELECT
    USING (true);

-- Users can insert their own visits
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can insert their own visits" ON restaurant_visits;
CREATE POLICY "Users can insert their own visits"
    ON restaurant_visits
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own visits
-- Drop policy if it exists to make migration idempotent
DROP POLICY IF EXISTS "Users can delete their own visits" ON restaurant_visits;
CREATE POLICY "Users can delete their own visits"
    ON restaurant_visits
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON restaurant_visits TO authenticated;
GRANT SELECT ON restaurant_visits TO anon;



