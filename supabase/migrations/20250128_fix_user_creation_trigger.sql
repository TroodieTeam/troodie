-- Fix user creation trigger to automatically create public.users record
-- This resolves the "Database error saving new user" issue

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create public.users record
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policies for public.users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policy for users to insert their own profile (fallback)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.user_onboarding TO anon, authenticated;
GRANT ALL ON public.user_preferences TO anon, authenticated;
GRANT ALL ON public.user_achievements TO anon, authenticated;
GRANT ALL ON public.user_relationships TO anon, authenticated;
GRANT ALL ON public.user_referrals TO anon, authenticated;
GRANT ALL ON public.user_referral_conversions TO anon, authenticated;
GRANT ALL ON public.user_invite_shares TO anon, authenticated;
GRANT ALL ON public.user_events TO anon, authenticated;
GRANT ALL ON public.favorite_spots TO anon, authenticated;
GRANT ALL ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notification_preferences TO anon, authenticated;
GRANT ALL ON public.push_tokens TO anon, authenticated;
GRANT ALL ON public.boards TO anon, authenticated;
GRANT ALL ON public.board_members TO anon, authenticated;
GRANT ALL ON public.board_restaurants TO anon, authenticated;
GRANT ALL ON public.board_subscriptions TO anon, authenticated;
GRANT ALL ON public.restaurants TO anon, authenticated;
GRANT ALL ON public.restaurant_saves TO anon, authenticated;
GRANT ALL ON public.save_boards TO anon, authenticated;
GRANT ALL ON public.save_interactions TO anon, authenticated;
GRANT ALL ON public.posts TO anon, authenticated;
GRANT ALL ON public.post_likes TO anon, authenticated;
GRANT ALL ON public.post_saves TO anon, authenticated;
GRANT ALL ON public.post_comments TO anon, authenticated;
GRANT ALL ON public.communities TO anon, authenticated;
GRANT ALL ON public.community_members TO anon, authenticated;
GRANT ALL ON public.community_posts TO anon, authenticated;
GRANT ALL ON public.community_invites TO anon, authenticated;
GRANT ALL ON public.campaigns TO anon, authenticated;
GRANT ALL ON public.campaign_deliverables TO anon, authenticated;
GRANT ALL ON public.comments TO anon, authenticated;
GRANT ALL ON public.board_collaborators TO anon, authenticated;
GRANT ALL ON public.board_subscriptions TO anon, authenticated;

-- Enable RLS on all tables
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invite_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_subscriptions ENABLE ROW LEVEL SECURITY; 