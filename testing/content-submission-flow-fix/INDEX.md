# Content Submission Flow Fix

> Version: v1.0.16
> Date: 2026-02-18

## Description

Redesigned content submission flow so creators upload video/content for restaurant review before posting to social platforms.

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Two-step deliverable workflow: upload content, then submit proof |
| `verify.sql` | Verification SQL | Check new columns on campaign_deliverables, storage bucket |
| `reset.sql` | Reset SQL | Revert deliverable workflow state |
| `e2e/v1016-content-submission.yaml` | E2E (Maestro) | Creator view of two-step deliverable workflow |
| `e2e/v1016-content-review.yaml` | E2E (Maestro) | Business view of content review + payment guard |

## How to Run

```bash
maestro test e2e/flows/production/v1016-content-submission.yaml
maestro test e2e/flows/production/v1016-content-review.yaml
```
