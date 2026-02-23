# TRO-148, TRO-149: Campaign Acceptance RLS Fix

> Spec: `specs/features/campaign-acceptance-rls-fix/`
> Version: v1.0.15
> Date: 2026-02-09

## Tickets

| Ticket | Title |
|--------|-------|
| TRO-148 | Application approval error (RLS blocking admin accept) |
| TRO-149 | Content approval error (RLS blocking deliverable approval) |

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Scenarios for admin accepting applications and approving deliverables |
| `verify.sql` | Verification SQL | Check RLS policies on campaign_applications and campaign_deliverables |
| `reset.sql` | Reset SQL | Revert test application/deliverable status |
