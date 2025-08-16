-- Create reports table for user-generated content reporting
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'board', 'community')),
    target_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'sexual_content',
        'false_information',
        'intellectual_property',
        'self_harm',
        'illegal_activity',
        'other'
    )),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create blocked_users table for user blocking functionality
CREATE TABLE IF NOT EXISTS public.blocked_users (
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports table
-- Users can create reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

-- Admins can view all reports (you'll need to add an is_admin flag to users table)
-- CREATE POLICY "Admins can view all reports" ON public.reports
--     FOR SELECT
--     TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- RLS Policies for blocked_users table
-- Users can block other users
CREATE POLICY "Users can block others" ON public.blocked_users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock users they've blocked
CREATE POLICY "Users can unblock" ON public.blocked_users
    FOR DELETE
    TO authenticated
    USING (auth.uid() = blocker_id);

-- Users can view their own block list
CREATE POLICY "Users can view own blocks" ON public.blocked_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(
    p_blocker_id UUID,
    p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.blocked_users 
        WHERE blocker_id = p_blocker_id 
        AND blocked_id = p_blocked_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts excluding blocked users
CREATE OR REPLACE FUNCTION public.get_filtered_posts(
    p_user_id UUID,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    restaurant_id UUID,
    caption TEXT,
    photos TEXT[],
    rating NUMERIC,
    visit_date DATE,
    likes_count INT,
    comments_count INT,
    saves_count INT,
    created_at TIMESTAMPTZ,
    username VARCHAR,
    user_avatar VARCHAR,
    is_blocked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.restaurant_id,
        p.caption,
        p.photos,
        p.rating,
        p.visit_date,
        p.likes_count,
        p.comments_count,
        p.saves_count,
        p.created_at,
        u.username,
        u.avatar_url as user_avatar,
        FALSE as is_blocked
    FROM public.posts p
    LEFT JOIN public.users u ON p.user_id = u.id
    WHERE p.user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM public.blocked_users b 
        WHERE b.blocker_id = p_user_id 
        AND b.blocked_id = p.user_id
    )
    AND p.privacy = 'public'
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add report counts to users table (optional but useful for moderation)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS reports_received_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS reports_submitted_count INT DEFAULT 0;

-- Function to increment report counts
CREATE OR REPLACE FUNCTION public.update_report_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment reporter's submitted count
        UPDATE public.users 
        SET reports_submitted_count = reports_submitted_count + 1
        WHERE id = NEW.reporter_id;
        
        -- Increment target user's received count (if target is a user)
        IF NEW.target_type = 'user' THEN
            UPDATE public.users 
            SET reports_received_count = reports_received_count + 1
            WHERE id = NEW.target_id::UUID;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_report_counts
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_report_counts();