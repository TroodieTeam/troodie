-- Enable realtime for users table (for account type change detection)
-- This allows the app to receive instant updates when account_type changes
-- (e.g., after a restaurant claim is approved)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'users'
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;
END $$;
