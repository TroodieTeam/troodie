# TRO-162: Claim Approval Refresh

> Spec: `specs/features/claim-approval-refresh/`
> Version: v1.0.17
> Date: 2026-02-22

## Ticket

| Ticket | Title |
|--------|-------|
| TRO-162 | Approval status not reflected in app without logout/login |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | 4 scenarios: realtime refresh, AppState refresh, throttle, subscription filter |
| `verify.sql` | Verification SQL | Check realtime publication, account type, claim status |
| `reset.sql` | Reset SQL | Revert user to consumer, reset claim to pending, delete business profile |
| `scenario-2.1-setup.sql` | Setup SQL | Create pending claim for prod-consumer2 (Scenario 2.1) |
| `scenario-2.1-approve.sql` | Approve SQL | Simulate admin approval, triggers realtime (Scenario 2.1) |
| `scenario-2.1-reset.sql` | Reset SQL | Revert prod-consumer2 to consumer after Scenario 2.1 |

## How to Run

```bash
# Verification SQL
node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/verify.sql

# Reset SQL (after testing - review before running)
node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/reset.sql
```

### Scenario 2.1: Real-time approval reflects without logout

```bash
# Step 1: Setup — create pending claim for prod-consumer2
node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/scenario-2.1-setup.sql

# Step 2: Log in as prod-consumer2@bypass.com (OTP: 000000) on Device A
#          Navigate to More tab — should show "Claim Status"

# Step 3: Approve — run from Device B (triggers realtime update)
node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/scenario-2.1-approve.sql

# Step 4: Observe Device A — More tab should show "Business Tools" (no logout needed)

# Step 5: Reset — revert to consumer for re-testing
node scripts/run-sql.js --prod testing/v1.0.17/TRO-162/scenario-2.1-reset.sql
```

## Notes

- No E2E test: Maestro cannot simulate AppState background/foreground transitions or trigger Supabase realtime events
- Manual testing requires two devices/sessions (one for the user, one for admin approval via SQL runner)
