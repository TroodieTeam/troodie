# Push Notifications — Deployment Guide

## Edge Function: `push-notifications`

### Prerequisites

- Supabase CLI installed and linked to your project (`supabase link`)
- Supabase project with `push_tokens` and `notifications` tables
- Expo Push Notification credentials configured in your Expo project

### 1. Deploy the Edge Function

```bash
npm run functions:deploy:push
```

Or directly:

```bash
supabase functions deploy push-notifications
```

### 2. Configure the Database Webhook

The Edge Function is triggered by a **database webhook** that fires on every `INSERT` into the `notifications` table.

**Via Supabase Dashboard:**

1. Go to **Database → Webhooks** (or **Integrations → Webhooks**)
2. Click **Create a new webhook**
3. Configure:
   - **Name**: `push-notifications-on-insert`
   - **Table**: `notifications`
   - **Events**: `INSERT` only
   - **Type**: Supabase Edge Function
   - **Edge Function**: `push-notifications`
   - **HTTP Headers**: Add `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (auto-populated if using Edge Function type)
4. Click **Create webhook**

**Via SQL (alternative):**

```sql
-- Enable the pg_net extension (required for HTTP webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the webhook trigger function
CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  edge_function_url := current_setting('app.settings.supabase_url', true)
    || '/functions/v1/push-notifications';
  service_role_key := current_setting('app.settings.service_role_key', true);

  PERFORM extensions.http_post(
    edge_function_url,
    jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', row_to_json(NEW)::jsonb,
      'old_record', NULL
    )::text,
    'application/json',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || service_role_key)
    ]
  );

  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS push_notification_webhook ON notifications;
CREATE TRIGGER push_notification_webhook
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_insert();
```

> **Recommended**: Use the Dashboard method — it's simpler and doesn't require `pg_net` or storing keys in database settings.

### 3. Verify Deployment

Check function logs:

```bash
npm run functions:logs:push
```

Test manually by inserting a notification:

```sql
INSERT INTO notifications (user_id, type, title, message, priority)
VALUES (
  '<your-user-id>',
  'like',
  'Test Notification',
  'This is a test push notification',
  1
);
```

Then check the function logs for output like:

```
[PushNotifications] Function invoked
[PushNotifications] Processing notification: { id: '...', type: 'like', userId: '...' }
[PushNotifications] Sending to 1 token(s)
[PushNotifications] Complete: 1 sent, 0 failed
```

### 4. Environment Variables

The Edge Function uses these Supabase-provided environment variables (no manual setup needed):

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase |

No additional secrets are required — the Expo Push API is unauthenticated.

## Troubleshooting

### Function not firing

- Verify the webhook exists in Dashboard → Database → Webhooks
- Check that the webhook is enabled and targeting `INSERT` on `notifications`
- Check Edge Function logs: `npm run functions:logs:push`

### Notifications not arriving on device

- Verify the user has an active token in `push_tokens`: `SELECT * FROM push_tokens WHERE user_id = '...' AND is_active = true`
- Check that the token format is valid: `ExponentPushToken[...]` or `ExpoPushToken[...]`
- Verify the Expo project has push credentials configured (run `eas credentials`)

### Tokens being deactivated

- This is expected for uninstalled apps or expired tokens
- The function automatically marks `DeviceNotRegistered` tokens as `is_active = false`
- Users will get fresh tokens on next app launch via `usePushNotifications` hook
