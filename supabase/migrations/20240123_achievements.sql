-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON public.user_achievements (user_id);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON public.user_achievements (achievement_id);
CREATE INDEX IF NOT EXISTS user_achievements_unlocked_at_idx ON public.user_achievements (unlocked_at DESC);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for incrementing profile stats
CREATE OR REPLACE FUNCTION increment_saves_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET saves_count = COALESCE(saves_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_reviews_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET reviews_count = COALESCE(reviews_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_saves_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_reviews_count TO authenticated;