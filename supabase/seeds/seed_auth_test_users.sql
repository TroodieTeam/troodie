-- Idempotent seed for Supabase auth-backed test users (OTP-first, dev password fallback)
-- Run in Supabase SQL Editor. Requires pgcrypto for crypt() / gen_salt('bf').

-- Ensure required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: upsert a user into auth.users by email
-- Note: direct INSERT into auth.users is supported on hosted Supabase with RLS disabled for auth schema.

-- Admin / Review
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  COALESCE((SELECT id FROM auth.users WHERE email = 'admin@troodie.test'), gen_random_uuid()),
  'admin@troodie.test',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(),
  '{"role":"admin"}'
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Creator 1
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  COALESCE((SELECT id FROM auth.users WHERE email = 'creator1@troodie.test'), gen_random_uuid()),
  'creator1@troodie.test',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(),
  '{"role":"creator"}'
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Restaurant 1
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  COALESCE((SELECT id FROM auth.users WHERE email = 'restaurant1@troodie.test'), gen_random_uuid()),
  'restaurant1@troodie.test',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(),
  '{"role":"restaurant"}'
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Multi-role
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
SELECT
  COALESCE((SELECT id FROM auth.users WHERE email = 'multi_role@troodie.test'), gen_random_uuid()),
  'multi_role@troodie.test',
  crypt('BypassPassword123', gen_salt('bf')),
  NOW(),
  '{"role":"creator_business"}'
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Mirror to public.users (profiles) if missing; basic upserts
INSERT INTO public.users (id, email, username, name, account_type, role, is_verified, created_at, updated_at)
SELECT u.id, u.email, split_part(u.email,'@',1), split_part(u.email,'@',1),
  CASE WHEN u.email LIKE 'creator%' THEN 'creator'
       WHEN u.email LIKE 'restaurant%' THEN 'business'
       WHEN u.email LIKE 'admin%' THEN 'business'
       ELSE 'consumer' END,
  CASE WHEN u.email LIKE 'admin@%' THEN 'admin' ELSE NULL END,
  TRUE, NOW(), NOW()
FROM auth.users u
WHERE u.email IN ('admin@troodie.test','creator1@troodie.test','restaurant1@troodie.test','multi_role@troodie.test')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Minimal role-table stubs (safe if tables exist)
-- Creator profile
INSERT INTO public.creator_profiles (user_id, specialties, social_links, verification_status, created_at, updated_at)
SELECT id, ARRAY['Restaurant Reviews','Food Photography'], '{"instagram":"@creator1"}'::jsonb, 'verified', NOW(), NOW()
FROM public.users WHERE email = 'creator1@troodie.test'
ON CONFLICT (user_id) DO NOTHING;

-- Business profile
-- Requires a restaurant to exist; if not, this can be re-run later.
-- The linking will be handled by higher-level seeds if needed.

-- Done

