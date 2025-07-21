-- Remove unused columns from users table
ALTER TABLE public.users 
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS instagram_handle,
DROP COLUMN IF EXISTS email_preferences;

-- Update the updated_at timestamp for all affected rows
UPDATE public.users SET updated_at = NOW();