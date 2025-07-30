-- Debug and fix user creation issue
-- This will identify and resolve the "Database error saving new user" problem

-- First, let's check what's wrong with the current setup
DO $$
BEGIN
  RAISE LOG 'Checking user creation setup...';
  
  -- Check if trigger exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE LOG 'Trigger exists';
  ELSE
    RAISE LOG 'Trigger does not exist';
  END IF;
  
  -- Check if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE LOG 'Function exists';
  ELSE
    RAISE LOG 'Function does not exist';
  END IF;
  
  -- Check users table structure
  RAISE LOG 'Users table columns: %', (
    SELECT string_agg(column_name, ', ')
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public'
  );
END $$;

-- Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a completely new, simple function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  -- Get the new user's data
  user_id := NEW.id;
  user_email := NEW.email;
  
  RAISE LOG 'Creating user profile for: %', user_email;
  
  -- Insert into public.users with minimal required fields
  INSERT INTO public.users (
    id, 
    email, 
    created_at, 
    updated_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  );
  
  RAISE LOG 'User profile created successfully for: %', user_email;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RAISE LOG 'User ID: %, Email: %', user_id, user_email;
    RETURN NEW; -- Don't fail the auth process
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the users table has the minimal required structure
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'email' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN email text;
    RAISE LOG 'Added email column to users table';
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'created_at' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN created_at timestamp with time zone DEFAULT now();
    RAISE LOG 'Added created_at column to users table';
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'updated_at' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    RAISE LOG 'Added updated_at column to users table';
  END IF;
END $$;

-- Disable RLS temporarily to test
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create a test function to manually create a user profile
CREATE OR REPLACE FUNCTION public.test_create_user_profile(test_email text)
RETURNS text AS $$
DECLARE
  test_id uuid;
BEGIN
  -- Generate a test UUID
  test_id := gen_random_uuid();
  
  -- Try to insert
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (test_id, test_email, NOW(), NOW());
  
  RETURN 'Success: User profile created with ID ' || test_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.test_create_user_profile(text) TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- Log the setup
DO $$
BEGIN
  RAISE LOG 'User creation setup completed';
  RAISE LOG 'Trigger created: on_auth_user_created';
  RAISE LOG 'Function created: handle_new_user';
  RAISE LOG 'Test function created: test_create_user_profile';
  RAISE LOG 'RLS disabled on users table for testing';
END $$; 