-- Update profiles table with additional fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS persona TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"marketing": true, "social": true, "notifications": true}'::jsonb,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Add username index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

-- Add persona index for recommendations
CREATE INDEX IF NOT EXISTS profiles_persona_idx ON public.profiles (persona);

-- Create a storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create profile stats tracking function
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
  
  -- Calculate percentage
  NEW.profile_completion_percentage := (completion_score * 100) / total_fields;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile completion
CREATE TRIGGER update_profile_completion
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_completion_percentage();

-- Storage policies for profile images
CREATE POLICY "Users can upload own profile image" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profiles' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own profile image" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profiles' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Users can delete own profile image" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profiles' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );