# TRO-168: Hide Communities for Business Accounts

> Spec: `specs/features/hide-communities-business/`
> Version: v1.0.17
> Date: 2026-02-22

## Ticket

| Ticket | Title |
|--------|-------|
| TRO-168 | Hide Communities tab for restaurant accounts |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | 4 scenarios: Home, Add, Explore hidden for business; visible for consumer |
| `verify.sql` | Verification SQL | Check account type, confirm communities data still exists |
| `e2e/no-communities-for-business.yaml` | E2E (Maestro) | Verifies communities hidden across Home, Explore, Add for business |
| `e2e/consumer-sees-communities.yaml` | E2E (Maestro) | Counter-test: consumer sees communities on Explore and Add |

## How to Run

```bash
# E2E tests
maestro test e2e/flows/hide-communities-business/no-communities-for-business.yaml
maestro test e2e/flows/hide-communities-business/consumer-sees-communities.yaml

# Verification SQL (replace <user_id>)
node scripts/run-sql.js --prod testing/TRO-168/verify.sql
```

## Notes

- UI-only feature: no database changes, no migration needed
- Conditional rendering driven by `useAccountType().isBusiness` hook
