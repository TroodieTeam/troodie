-- Verify notification production blocker hotfixes are applied

SELECT
  proname,
  POSITION('np.category = ''campaigns''' IN pg_get_functiondef(oid)) > 0 AS uses_category_preferences,
  POSITION('needs_revision' IN pg_get_functiondef(oid)) > 0 AS supports_legacy_needs_revision
FROM pg_proc
WHERE proname IN ('notify_application_rejected', 'notify_revision_requested')
ORDER BY proname;
