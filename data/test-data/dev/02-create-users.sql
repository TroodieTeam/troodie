-- ================================================================
-- Step 2: Create 20 Test Users (Auth + Public)
-- ================================================================
-- Creates all test accounts: 10 consumers, 7 creators, 3 businesses
-- All accounts use OTP: 000000 for authentication
-- ================================================================

-- Consumers (test-consumer1 through test-consumer10)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('a1b2c3d4-e5f6-4789-a012-345678901234'::uuid, 'test-consumer1@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 1", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('b2c3d4e5-f6a7-4890-b123-456789012345'::uuid, 'test-consumer2@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 2", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('c3d4e5f6-a7b8-4901-c234-567890123456'::uuid, 'test-consumer3@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 3", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('d4e5f6a7-b8c9-4012-d345-678901234567'::uuid, 'test-consumer4@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 4", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('e5f6a7b8-c9d0-4123-e456-789012345678'::uuid, 'test-consumer5@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 5", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('f6a7b8c9-d0e1-4234-f567-890123456789'::uuid, 'test-consumer6@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 6", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('a7b8c9d0-e1f2-4345-a678-901234567890'::uuid, 'test-consumer7@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 7", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('b8c9d0e1-f2a3-4456-b789-012345678901'::uuid, 'test-consumer8@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 8", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('c9d0e1f2-a3b4-4567-c890-123456789012'::uuid, 'test-consumer9@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 9", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  ('d0e1f2a3-b4c5-4678-d901-234567890123'::uuid, 'test-consumer10@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Consumer 10", "account_type": "consumer"}'::jsonb, 'authenticated', 'authenticated'),
  -- Creators (test-creator1 through test-creator7)
  ('e1f2a3b4-c5d6-4789-e012-345678901234'::uuid, 'test-creator1@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 1", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('f2a3b4c5-d6e7-4890-f123-456789012345'::uuid, 'test-creator2@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 2", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('a3b4c5d6-e7f8-4901-a234-567890123456'::uuid, 'test-creator3@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 3", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, 'test-creator4@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 4", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, 'test-creator5@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 5", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('d6e7f8a9-b0c1-4234-d567-890123456789'::uuid, 'test-creator6@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 6", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  ('e7f8a9b0-c1d2-4345-e678-901234567890'::uuid, 'test-creator7@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Creator 7", "account_type": "creator"}'::jsonb, 'authenticated', 'authenticated'),
  -- Businesses (test-business1=New, test-business2=Medium, test-business3=High)
  ('f8a9b0c1-d2e3-4456-f789-012345678901'::uuid, 'test-business1@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 1 (New)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('a9b0c1d2-e3f4-4567-a890-123456789012'::uuid, 'test-business2@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 2 (Medium)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated'),
  ('b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, 'test-business3@bypass.com', crypt('BypassPassword123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "Test Business 3 (High)", "account_type": "business"}'::jsonb, 'authenticated', 'authenticated')
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Create public.users records
INSERT INTO public.users (id, email, name, account_type, is_creator, created_at, updated_at)
VALUES
  ('273eb12a-09c8-47f9-894b-58c4861fa651'::uuid, 'test-consumer1@bypass.com', 'Test Consumer 1', 'consumer', false, NOW(), NOW()),
  ('5ed86604-5b63-47aa-9d30-2ea0b0c3a6c2'::uuid, 'test-consumer2@bypass.com', 'Test Consumer 2', 'consumer', false, NOW(), NOW()),
  ('6c1eeeb9-4be4-4129-bfca-19b4a163a45e'::uuid, 'test-consumer3@bypass.com', 'Test Consumer 3', 'consumer', false, NOW(), NOW()),
  ('87464291-d9b2-4935-b29f-416328bdd43e'::uuid, 'test-consumer4@bypass.com', 'Test Consumer 4', 'consumer', false, NOW(), NOW()),
  ('ec03ddc6-c3f2-4c82-9d4d-620928284bca'::uuid, 'test-consumer5@bypass.com', 'Test Consumer 5', 'consumer', false, NOW(), NOW()),
  ('f6a7b8c9-d0e1-4234-f567-890123456789'::uuid, 'test-consumer6@bypass.com', 'Test Consumer 6', 'consumer', false, NOW(), NOW()),
  ('a7b8c9d0-e1f2-4345-a678-901234567890'::uuid, 'test-consumer7@bypass.com', 'Test Consumer 7', 'consumer', false, NOW(), NOW()),
  ('b8c9d0e1-f2a3-4456-b789-012345678901'::uuid, 'test-consumer8@bypass.com', 'Test Consumer 8', 'consumer', false, NOW(), NOW()),
  ('c9d0e1f2-a3b4-4567-c890-123456789012'::uuid, 'test-consumer9@bypass.com', 'Test Consumer 9', 'consumer', false, NOW(), NOW()),
  ('d0e1f2a3-b4c5-4678-d901-234567890123'::uuid, 'test-consumer10@bypass.com', 'Test Consumer 10', 'consumer', false, NOW(), NOW()),
  ('4a797077-116e-4a3a-bc43-a71ae18963d8'::uuid, 'test-creator1@bypass.com', 'Test Creator 1', 'creator', true, NOW(), NOW()),
  ('381d705b-d5d1-4e44-85fc-b772d68921ba'::uuid, 'test-creator2@bypass.com', 'Test Creator 2', 'creator', true, NOW(), NOW()),
  ('e50f6c6f-9487-4ff2-acd0-3542fdd46dd1'::uuid, 'test-creator3@bypass.com', 'Test Creator 3', 'creator', true, NOW(), NOW()),
  ('b4c5d6e7-f8a9-4012-b345-678901234567'::uuid, 'test-creator4@bypass.com', 'Test Creator 4', 'creator', true, NOW(), NOW()),
  ('c5d6e7f8-a9b0-4123-c456-789012345678'::uuid, 'test-creator5@bypass.com', 'Test Creator 5', 'creator', true, NOW(), NOW()),
  ('d6e7f8a9-b0c1-4234-d567-890123456789'::uuid, 'test-creator6@bypass.com', 'Test Creator 6', 'creator', true, NOW(), NOW()),
  ('e7f8a9b0-c1d2-4345-e678-901234567890'::uuid, 'test-creator7@bypass.com', 'Test Creator 7', 'creator', true, NOW(), NOW()),
  ('8e7df4ee-e180-427b-ad8d-e6ffcf41a03a'::uuid, 'test-business1@bypass.com', 'Test Business 1 (New)', 'business', false, NOW(), NOW()),
  ('f456d1ea-96f0-4245-b420-4db4e6456def'::uuid, 'test-business2@bypass.com', 'Test Business 2 (Medium)', 'business', false, NOW(), NOW()),
  ('b0c1d2e3-f4a5-4678-b901-234567890123'::uuid, 'test-business3@bypass.com', 'Test Business 3 (High)', 'business', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  is_creator = EXCLUDED.is_creator,
  updated_at = NOW();

-- Verification
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users WHERE email LIKE 'test-%@bypass.com';
  RAISE NOTICE '✅ Step 2 Complete: Created % test users', user_count;
  RAISE NOTICE '   - 10 consumers (test-consumer1 through test-consumer10)';
  RAISE NOTICE '   - 7 creators (test-creator1 through test-creator7)';
  RAISE NOTICE '   - 3 businesses (test-business1, test-business2, test-business3)';
  RAISE NOTICE '   All accounts use OTP: 000000';
END $$;

