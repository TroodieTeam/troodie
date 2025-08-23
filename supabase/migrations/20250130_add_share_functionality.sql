-- Create share analytics table
CREATE TABLE IF NOT EXISTS share_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('board', 'post', 'profile', 'restaurant')),
    content_id TEXT NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('initiated', 'completed', 'failed')),
    platform VARCHAR(20),
    method VARCHAR(50),
    error TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_share_analytics_user_id ON share_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_content ON share_analytics(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_created_at ON share_analytics(created_at DESC);

-- Add share count columns to posts and boards if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'shares_count') THEN
        ALTER TABLE posts ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boards' AND column_name = 'share_count') THEN
        ALTER TABLE boards ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to increment share counts
CREATE OR REPLACE FUNCTION increment_share_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action = 'completed' THEN
        IF NEW.content_type = 'post' THEN
            UPDATE posts 
            SET shares_count = COALESCE(shares_count, 0) + 1 
            WHERE id = NEW.content_id::UUID;
        ELSIF NEW.content_type = 'board' THEN
            UPDATE boards 
            SET share_count = COALESCE(share_count, 0) + 1 
            WHERE id = NEW.content_id::UUID;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic share count updates
DROP TRIGGER IF EXISTS update_share_counts ON share_analytics;
CREATE TRIGGER update_share_counts
    AFTER INSERT ON share_analytics
    FOR EACH ROW
    EXECUTE FUNCTION increment_share_count();

-- RLS policies for share_analytics
ALTER TABLE share_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own share analytics
CREATE POLICY "Users can insert own share analytics" ON share_analytics
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own share analytics
CREATE POLICY "Users can view own share analytics" ON share_analytics
    FOR SELECT
    USING (auth.uid() = user_id);

-- Ensure table exists before creating views
DO $$
BEGIN
    -- Create views for analytics
    EXECUTE 'CREATE OR REPLACE VIEW share_analytics_funnel AS
    SELECT 
        content_type,
        COUNT(CASE WHEN action = ''initiated'' THEN 1 END) as shares_initiated,
        COUNT(CASE WHEN action = ''completed'' THEN 1 END) as shares_completed,
        COUNT(CASE WHEN action = ''failed'' THEN 1 END) as shares_failed,
        ROUND(
            COUNT(CASE WHEN action = ''completed'' THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN action = ''initiated'' THEN 1 END), 0) * 100, 
            2
        ) as completion_rate
    FROM share_analytics
    GROUP BY content_type';

    -- Top shared content view
    EXECUTE 'CREATE OR REPLACE VIEW top_shared_content AS
    SELECT 
        content_type,
        content_id,
        COUNT(*) as share_count,
        COUNT(DISTINCT user_id) as unique_sharers
    FROM share_analytics
    WHERE action = ''completed''
    GROUP BY content_type, content_id
    ORDER BY share_count DESC';
END $$;

-- Grant access to views
GRANT SELECT ON share_analytics_funnel TO authenticated;
GRANT SELECT ON top_shared_content TO authenticated;