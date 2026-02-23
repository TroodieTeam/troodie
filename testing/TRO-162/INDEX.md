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

## How to Run

```bash
# Verification SQL
node scripts/run-sql.js --prod testing/TRO-162/verify.sql

# Reset SQL (after testing - review before running)
node scripts/run-sql.js --prod testing/TRO-162/reset.sql
```

## Notes

- No E2E test: Maestro cannot simulate AppState background/foreground transitions or trigger Supabase realtime events
- Manual testing requires two devices/sessions (one for the user, one for admin approval)
