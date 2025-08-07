-- Check what create_notification functions exist in the database
SELECT 
    p.proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
    p.pronargs AS arg_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_notification'
    AND n.nspname = 'public'
ORDER BY p.pronargs;