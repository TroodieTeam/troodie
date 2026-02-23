# TRO-154: Campaign Detail Scroll Fix

> Spec: `specs/features/campaign-detail-scroll-fix/`
> Version: v1.0.15
> Date: 2026-02-09

## Ticket

| Ticket | Title |
|--------|-------|
| TRO-154 | Applicant cards and overview content clipped behind tab bar |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Verify campaign detail screen scrolls fully without clipping |
| `e2e/campaign-detail-scroll.yaml` | E2E (Maestro) | Validates applicant cards visible and content not clipped |

## How to Run

```bash
maestro test e2e/flows/campaign-scroll-fix/campaign-detail-scroll.yaml
```
