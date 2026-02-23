# Rate Creator Timing Fix

> Spec: `specs/features/rate-creator-timing-fix/`
> Version: v1.0.16
> Date: 2026-02-18

## Description

Bug fix: "Rate Creator" prompt appeared before work was completed. Now only shows after all deliverables are reviewed/approved.

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Verify rating prompt timing tied to deliverable completion |
| `verify.sql` | Verification SQL | Check accepted applications with deliverable counts |
| `reset.sql` | Reset SQL | Revert test rating/deliverable state |
| `e2e/v1016-rate-creator.yaml` | E2E (Maestro) | Campaign management, application review, rating timing |

## How to Run

```bash
maestro test e2e/flows/production/v1016-rate-creator.yaml
```
