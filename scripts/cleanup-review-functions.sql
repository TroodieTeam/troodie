-- Cleanup script to remove the review account functions we created earlier
-- Run this if you want to clean up the unused functions

-- Drop the review account functions if they exist
DROP FUNCTION IF EXISTS public.review_account_save_restaurant CASCADE;
DROP FUNCTION IF EXISTS public.review_account_create_board CASCADE;
DROP FUNCTION IF EXISTS public.review_account_get_boards CASCADE;

-- Verify cleanup
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Cleanup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed unused review account functions.';
    RAISE NOTICE '';
    RAISE NOTICE 'The review account now uses pre-populated data';
    RAISE NOTICE 'instead of special functions.';
    RAISE NOTICE '============================================';
END $$;