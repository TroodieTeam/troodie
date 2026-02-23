# Creator Marketplace Name Fix

> Spec: `specs/features/creator-marketplace-name-fix/`
> Version: v1.0.15
> Date: 2026-02-09

## Description

Bug fix: Browse Creators showed "Creator" as fallback instead of actual display name. Bold text now shows first + last name, grey text shows username.

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Verify creator names display correctly in marketplace |
| `verify.sql` | Verification SQL | Check creators with NULL display_name |
| `reset.sql` | Reset SQL | Revert test creator name changes |
| `e2e/browse-creators-name-display.yaml` | E2E (Maestro) | Verifies no "Creator" fallback in browse list |

## How to Run

```bash
maestro test e2e/flows/creator-marketplace-name-fix/browse-creators-name-display.yaml
```
