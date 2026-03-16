# Notifications Release Runbook

> Scope: notification production readiness + trigger hotfixes  
> Environments: `dev`, `prod`  
> Owner: Mobile + Backend

## 1) Preflight

- Ensure app build includes:
  - `app/(tabs)/_layout.tsx` notification tab badge wiring
  - `app/(tabs)/activity.tsx` redirect to `/notifications`
  - `components/NotificationSettings.tsx` preference state sync
  - `e2e/flows/notifications/notification-settings.yaml` updated selectors
- Confirm SQL fix files exist:
  - `data/fixes/fix-notification-production-blockers.sql`
  - `data/fixes/fix-campaign-application-owner-column.sql`
  - `data/fixes/verify-notification-production-blockers.sql`
  - `data/fixes/verify-notification-production-readiness.sql`

## 2) Deploy SQL Fixes

Run in this order:

```bash
# 1) Preference model + revision status compatibility
node scripts/run-sql.js --dev  data/fixes/fix-notification-production-blockers.sql
node scripts/run-sql.js --prod data/fixes/fix-notification-production-blockers.sql

# 2) campaign application owner/name column alignment
node scripts/run-sql.js --dev  data/fixes/fix-campaign-application-owner-column.sql
node scripts/run-sql.js --prod data/fixes/fix-campaign-application-owner-column.sql
```

## 3) Verify SQL State

```bash
node scripts/run-sql.js --dev  data/fixes/verify-notification-production-blockers.sql
node scripts/run-sql.js --prod data/fixes/verify-notification-production-blockers.sql

node scripts/run-sql.js --dev  data/fixes/verify-notification-production-readiness.sql
node scripts/run-sql.js --prod data/fixes/verify-notification-production-readiness.sql
```

Expected signals:

- `notify_application_rejected` -> uses campaign category preference checks
- `notify_revision_requested` -> uses campaign category preference checks + supports `needs_revision`
- `notify_campaign_application` -> uses `owner_id` and `users.name`

## 4) Functional Smoke Tests

### Dev DB trigger smoke

```bash
node scripts/run-sql.js --dev data/test-data/dev/verify-campaign-notification-triggers.sql
```

Expected: command exits successfully (HTTP 201).

### App-level smoke

- Open Notifications tab from tab bar bell
- Confirm unread badge appears and updates
- Open Settings from notifications screen
- Toggle category + master push switches and verify state persists
- Tap campaign notifications (`application_rejected`, `revision_requested`) and confirm navigation

## 5) Test Suite Gate

```bash
npm test -- __tests__/services/notificationService.test.ts __tests__/components/NotificationItem.test.tsx --runInBand
```

Expected: both suites pass.

## 6) Rollback

If release needs immediate rollback:

- **App rollback**: ship previous stable mobile build/channel
- **DB rollback**:
  - Re-apply prior migration/function definitions from known-good commit
  - Or re-run previous comprehensive trigger script used by team:
    - `data/fixes/fix-notification-triggers-comprehensive.sql`

Notes:

- This runbook hotfixes only trigger logic and preference enforcement compatibility.
- No schema-destructive changes are introduced in the new hotfix scripts.

## 7) Release Sign-off Checklist

- [ ] SQL fixes applied to dev
- [ ] SQL fixes applied to prod
- [ ] Verification scripts pass in dev/prod
- [ ] Dev trigger smoke test passes
- [ ] Notification unit tests pass
- [ ] Manual app smoke completed
- [ ] Stakeholder sign-off recorded
