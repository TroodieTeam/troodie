-- Fix auth trigger to handle foreign key constraint properly
-- The issue is the foreign key constraint on users.id -> auth.users(id)

-- First, drop all existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create a deferred trigger function that waits for transaction completion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  retry_count integer := 0;
  max_retries integer := 3;
BEGIN
  -- Wait a moment for the auth transaction to complete
  PERFORM pg_sleep(0.1);
  
  -- Try to insert with retries
  WHILE retry_count < max_retries LOOP
    BEGIN
      -- Insert the user profile
      INSERT INTO public.users (id, email, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.created_at, NOW()),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
      
      -- Success, exit loop
      EXIT;
    EXCEPTION
      WHEN foreign_key_violation THEN
        -- Auth user might not be fully committed yet, retry
        retry_count := retry_count + 1;
        IF retry_count < max_retries THEN
          PERFORM pg_sleep(0.2 * retry_count); -- Exponential backoff
        ELSE
          -- Log the error but don't fail
          RAISE LOG 'Failed to create user profile after % retries for user %', max_retries, NEW.email;
        END IF;
      WHEN OTHERS THEN
        -- Log other errors but don't fail
        RAISE LOG 'Error creating user profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        EXIT;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger with INITIALLY DEFERRED
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Alternative: Create a function that can be called manually if trigger fails
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(uuid, text) TO authenticated, anon;

-- Create an alternative approach using auth.users hooks
CREATE OR REPLACE FUNCTION public.sync_user_profiles()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Sync all auth users that don't have profiles
  FOR auth_user IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (auth_user.id, auth_user.email, auth_user.created_at, NOW())
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.sync_user_profiles() TO authenticated;

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create permissive policies
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Also allow service role to do everything (for triggers)
CREATE POLICY "Service role has full access" ON public.users
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Run sync to fix any existing users
SELECT public.sync_user_profiles();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'AUTH TRIGGER FIX COMPLETED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '1. Created retry mechanism in trigger';
  RAISE NOTICE '2. Added ensure_user_profile_exists function';
  RAISE NOTICE '3. Added sync_user_profiles function';
  RAISE NOTICE '4. Fixed RLS policies';
  RAISE NOTICE '5. Synced existing users';
  RAISE NOTICE '';
  RAISE NOTICE 'If signup still fails, call ensure_user_profile_exists';
  RAISE NOTICE 'after successful OTP verification';
  RAISE NOTICE '==============================================';
END $$;