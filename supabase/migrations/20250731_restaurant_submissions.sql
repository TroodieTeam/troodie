-- Create restaurant_submissions table for tracking user submissions
CREATE TABLE IF NOT EXISTS restaurant_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    google_place_id VARCHAR(255),
    submission_data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
    rejection_reason TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_restaurant_submissions_status ON restaurant_submissions(status);
CREATE INDEX idx_restaurant_submissions_submitted_by ON restaurant_submissions(submitted_by);
CREATE INDEX idx_restaurant_submissions_google_place_id ON restaurant_submissions(google_place_id);

-- Enable RLS
ALTER TABLE restaurant_submissions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own submissions
CREATE POLICY "Users can view own submissions" ON restaurant_submissions
    FOR SELECT USING (auth.uid() = submitted_by);

-- Allow authenticated users to create submissions
CREATE POLICY "Users can create submissions" ON restaurant_submissions
    FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Service role can do everything
CREATE POLICY "Service role has full access" ON restaurant_submissions
    FOR ALL USING (auth.role() = 'service_role');