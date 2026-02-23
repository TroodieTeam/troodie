# TRO-160, TRO-161, TRO-163, TRO-169: Restaurant Onboarding UX Fixes

> Spec: `specs/features/restaurant-onboarding-ux-fixes/`
> Version: v1.0.17
> Date: 2026-02-22

## Tickets

| Ticket | Title |
|--------|-------|
| TRO-160 | Remove "View Business Dashboard" button from Claim Submitted screen |
| TRO-161 | Hide "Become a Creator" and "Claim Your Restaurant" on More tab post-submission |
| TRO-163 | "Claim My Restaurant" flow requires code while awaiting approval |
| TRO-169 | Check if X works on 'Beta access' screen |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | 6 scenarios covering beta gate removal, business More tab, pending claim UI |
| `verify.sql` | Verification SQL | Queries to check claim status, business profiles, account type |
| `e2e/no-beta-gate.yaml` | E2E (Maestro) | Verifies claim + creator flows skip beta gate |
| `e2e/more-tab-business-no-growth.yaml` | E2E (Maestro) | Verifies business users see Business Tools, not growth items |

## How to Run

```bash
# E2E tests (requires Expo dev server + iOS simulator)
maestro test e2e/flows/restaurant-onboarding-ux-fixes/no-beta-gate.yaml
maestro test e2e/flows/restaurant-onboarding-ux-fixes/more-tab-business-no-growth.yaml

# Verification SQL (replace <user_id>)
node scripts/run-sql.js --prod testing/TRO-160-161-163-169/verify.sql
```
