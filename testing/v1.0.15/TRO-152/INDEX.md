# TRO-152: Update Toast Banner

> Spec: `specs/features/update-toast-banner/`
> Version: v1.0.15
> Date: 2026-02-09

## Ticket

| Ticket | Title |
|--------|-------|
| TRO-152 | New update toast/banner to notify users of newer app store version |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Verify update banner appears when App Store version > installed version |
| `e2e/update-banner-display.yaml` | E2E (Maestro) | Validates update banner infrastructure on home screen |

## How to Run

```bash
maestro test e2e/flows/update-banner/update-banner-display.yaml
```
