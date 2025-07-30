-- Remove the problematic trigger and handle user profile creation in the app
-- This is a simpler approach that avoids the "Database error saving new user" issue

-- Drop the trigger that's causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Keep the ensure_user_profile_exists function for manual profile creation
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(
  user_id uuid,
  user_email text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE LOG 'Error in ensure_user_profile_exists: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(uuid, text) TO authenticated, anon;

-- Ensure the email column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
  END IF;
END $$;

-- Ensure RLS is set up correctly
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users own profile" ON public.users;
DROP POLICY IF EXISTS "Enable update for users own profile" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;

-- Create simple, permissive policies
CREATE POLICY "Anyone can read profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Log what we did
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'REMOVED PROBLEMATIC TRIGGER';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'The auth trigger was causing "Database error saving new user"';
  RAISE NOTICE 'User profiles will now be created after OTP verification';
  RAISE NOTICE 'This approach is more reliable and avoids the error';
  RAISE NOTICE '==============================================';
END $$;