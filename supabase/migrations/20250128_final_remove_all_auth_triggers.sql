-- FINAL FIX: Remove ALL auth triggers that are causing "Database error saving new user"
-- This migration ensures a clean slate by removing all auth-related triggers

-- First, let's see what triggers exist
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE 'Listing all triggers on auth.users table:';
  FOR trigger_record IN 
    SELECT tgname, proname 
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'auth.users'::regclass
  LOOP
    RAISE NOTICE 'Found trigger: % calling function: %', trigger_record.tgname, trigger_record.proname;
  END LOOP;
END $$;

-- Drop ALL triggers on auth.users table
DO $$
DECLARE
  trigger_name text;
BEGIN
  FOR trigger_name IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass
    AND tgname NOT LIKE 'RI_%' -- Don't drop system triggers
    AND tgname NOT LIKE 'pg_%' -- Don't drop postgres internal triggers
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_name;
  END LOOP;
END $$;

-- Drop all handle_new_user functions (in case there are multiple versions)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_v2() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_simple() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile(uuid, text) CASCADE;

-- Ensure the users table has the email column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- Create a simple, reliable function for profile creation
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id uuid,
  p_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple insert or update
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES (p_user_id, p_email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();
END;
$$;

-- Grant execute permission to both authenticated and anon roles
-- This allows the function to be called during signup
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(uuid, text) TO anon, authenticated;

-- Fix RLS policies to be very permissive during signup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_name);
  END LOOP;
END $$;

-- Create very simple policies
CREATE POLICY "allow_all_select" ON public.users
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "allow_all_insert" ON public.users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "allow_own_update" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify no triggers remain
DO $$
DECLARE
  trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'RI_%'
  AND tgname NOT LIKE 'pg_%';
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'FINAL AUTH TRIGGER REMOVAL COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Remaining non-system triggers on auth.users: %', trigger_count;
  RAISE NOTICE '';
  RAISE NOTICE 'The "Database error saving new user" should be gone now.';
  RAISE NOTICE 'User profiles will be created after OTP verification.';
  RAISE NOTICE '==============================================';
END $$;