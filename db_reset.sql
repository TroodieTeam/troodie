-- Database Reset Script for Troodie
-- This script will clear all data from tables except restaurants and seed a new user
-- WARNING: This will delete ALL data except restaurants!

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all data from tables (in dependency order to avoid foreign key issues)
TRUNCATE TABLE public.user_relationships CASCADE;
TRUNCATE TABLE public.user_referrals CASCADE;
TRUNCATE TABLE public.user_referral_conversions CASCADE;
TRUNCATE TABLE public.user_preferences CASCADE;
TRUNCATE TABLE public.user_onboarding CASCADE;
TRUNCATE TABLE public.user_invite_shares CASCADE;
TRUNCATE TABLE public.user_events CASCADE;
TRUNCATE TABLE public.user_achievements CASCADE;
TRUNCATE TABLE public.save_interactions CASCADE;
TRUNCATE TABLE public.save_boards CASCADE;
TRUNCATE TABLE public.restaurant_saves CASCADE;
TRUNCATE TABLE public.push_tokens CASCADE;
TRUNCATE TABLE public.post_saves CASCADE;
TRUNCATE TABLE public.post_likes CASCADE;
TRUNCATE TABLE public.post_comments CASCADE;
TRUNCATE TABLE public.posts CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.notification_preferences CASCADE;
TRUNCATE TABLE public.favorite_spots CASCADE;
TRUNCATE TABLE public.community_posts CASCADE;
TRUNCATE TABLE public.community_members CASCADE;
TRUNCATE TABLE public.community_invites CASCADE;
TRUNCATE TABLE public.communities CASCADE;
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.campaigns CASCADE;
TRUNCATE TABLE public.campaign_deliverables CASCADE;
TRUNCATE TABLE public.board_subscriptions CASCADE;
TRUNCATE TABLE public.board_restaurants CASCADE;
TRUNCATE TABLE public.board_members CASCADE;
TRUNCATE TABLE public.board_collaborators CASCADE;
TRUNCATE TABLE public.boards CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Seed the new user FIRST
INSERT INTO public.users (
  id,
  phone,
  username,
  name,
  bio,
  avatar_url,
  persona,
  is_verified,
  is_restaurant,
  is_creator,
  profile_completion,
  created_at,
  updated_at,
  email,
  saves_count,
  reviews_count,
  followers_count,
  following_count,
  default_board_id,
  has_created_board,
  has_created_post,
  has_joined_community,
  network_progress
) VALUES (
  'cb1799bf-3afb-44ca-adec-9033f8ec077b',
  null,
  'jack_black',
  'Jack Black',
  '🌮 Always searching for the perfect taco spot',
  'https://cacrjcekanesymdzpjtt.supabase.co/storage/v1/object/public/avatars/cb1799bf-3afb-44ca-adec-9033f8ec077b/profile-1753140096991.jpg',
  'social_explorer',
  false,
  false,
  false,
  60,
  '2025-01-28 22:58:02.5571+00',
  '2025-01-28 22:58:02.5571+00',
  'jack@troodie.app',
  0,
  0,
  0,
  0,
  null, -- Set this to null initially, update after board is created
  false,
  false,
  false,
  0
);

-- Create a default board for the new user
INSERT INTO public.boards (
  id,
  user_id,
  title,
  description,
  type,
  is_private,
  created_at,
  updated_at
) VALUES (
  '89645b9c-dead-40a9-a429-3c48aee9beda',
  'cb1799bf-3afb-44ca-adec-9033f8ec077b',
  'Quick Saves',
  'Your personal collection of saved restaurants',
  'free',
  false,
  '2025-01-28 22:58:02.5571+00',
  '2025-01-28 22:58:02.5571+00'
);

-- Update the user's default_board_id
UPDATE public.users 
SET default_board_id = '89645b9c-dead-40a9-a429-3c48aee9beda'
WHERE id = 'cb1799bf-3afb-44ca-adec-9033f8ec077b';

-- Add the user as owner of their default board (with conflict handling)
INSERT INTO public.board_members (
  board_id,
  user_id,
  role,
  joined_at
) VALUES (
  '89645b9c-dead-40a9-a429-3c48aee9beda',
  'cb1799bf-3afb-44ca-adec-9033f8ec077b',
  'owner',
  '2025-01-28 22:58:02.5571+00'
) ON CONFLICT (board_id, user_id) DO NOTHING;

-- Success message
SELECT 'Database reset completed successfully! All data cleared and new user jack_black has been created with default board.' as status; 