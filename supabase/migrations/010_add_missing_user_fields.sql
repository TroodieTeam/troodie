-- Add missing fields to users table for profile functionality
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"marketing": true, "social": true, "notifications": true}'::jsonb,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Update the profile completion function to work with users table
CREATE OR REPLACE FUNCTION update_profile_completion_percentage()
RETURNS TRIGGER AS $$
DECLARE
  completion_score INTEGER := 0;
  total_fields INTEGER := 5; -- username, bio, profile_image_url, location, persona
BEGIN
  -- Calculate completion score
  IF NEW.username IS NOT NULL THEN
    completion_score := completion_score + 1;
  END IF;
  
  IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 0 THEN
    completion_score := completion_score + 1;
  END IF;
  
  IF NEW.profile_image_url IS NOT NULL THEN
    completion_score := completion_score + 1;
  END IF;
  
  IF NEW.location IS NOT NULL THEN
    completion_score := completion_score + 1;
  END IF;
  
  IF NEW.persona IS NOT NULL THEN
    completion_score := completion_score + 1;
  END IF;
  
  -- Calculate percentage and update profile_completion (existing column)
  NEW.profile_completion := (completion_score * 100) / total_fields;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile completion on users table
DROP TRIGGER IF EXISTS update_user_profile_completion ON public.users;
CREATE TRIGGER update_user_profile_completion
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_profile_completion_percentage();

-- Update functions to work with users table
CREATE OR REPLACE FUNCTION increment_saves_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET saves_count = COALESCE(saves_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_reviews_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET reviews_count = COALESCE(reviews_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 