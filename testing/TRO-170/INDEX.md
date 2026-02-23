# TRO-170: Multi-Restaurant Claims

> Spec: `specs/features/multi-restaurant-claims/`
> Version: v1.0.17
> Date: 2026-02-22

## Ticket

| Ticket | Title |
|--------|-------|
| TRO-170 | Allow restaurant owners to claim and manage multiple locations |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | 7 scenarios: Claim Location, multi-profile, switcher, campaign filter, dupe reject, max 10 |
| `verify.sql` | Verification SQL | Check composite unique, trigger, profile counts, campaigns by restaurant |
| `reset.sql` | Reset SQL | Delete extra business profiles and claims (keep first) |
| `e2e/dashboard-claim-location.yaml` | E2E (Maestro) | Verifies dashboard loads and no beta gate blocks access |

## How to Run

```bash
# E2E test
maestro test e2e/flows/multi-restaurant/dashboard-claim-location.yaml

# Verification SQL (replace <restaurant_id> in query 6)
node scripts/run-sql.js --prod testing/TRO-170/verify.sql

# Reset SQL (after testing - review before running)
node scripts/run-sql.js --prod testing/TRO-170/reset.sql
```

## Migrations

| File | Status |
|------|--------|
| `supabase/migrations/20260222000001_allow_multi_restaurant_profiles.sql` | Deployed to dev + prod |

## Notes

- Dashboard shows empty state for test accounts without restaurant data
- E2E "Quick Actions" and "Claim Location" assertions are `optional: true` until test accounts have deployed migration data
