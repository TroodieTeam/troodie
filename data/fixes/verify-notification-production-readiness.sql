-- Verify notification trigger hotfixes are present

SELECT
  proname,
  POSITION('owner_id' IN pg_get_functiondef(oid)) > 0 AS uses_owner_id,
  POSITION('u.name' IN pg_get_functiondef(oid)) > 0 AS uses_user_name_column,
  POSITION('category = ''campaigns''' IN pg_get_functiondef(oid)) > 0 AS uses_campaign_category_preference,
  POSITION('needs_revision' IN pg_get_functiondef(oid)) > 0 AS supports_needs_revision
FROM pg_proc
WHERE proname IN (
  'notify_campaign_application',
  'notify_application_rejected',
  'notify_revision_requested'
)
ORDER BY proname;
