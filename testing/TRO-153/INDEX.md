# TRO-153: Remove Join Team Button

> Spec: `specs/features/remove-join-team-button/`
> Version: v1.0.15
> Date: 2026-02-09

## Ticket

| Ticket | Title |
|--------|-------|
| TRO-153 | Remove "Join Team" button from home screen |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Verify Join Team button removed, InviteCodeModal not rendered |
| `e2e/no-join-team-button.yaml` | E2E (Maestro) | Verifies button absent from home screen |

## How to Run

```bash
maestro test e2e/flows/home-screen-cleanup/no-join-team-button.yaml
```
