# Stakeholder Questions: Creator Marketplace Name Fix

> Feature: creator-marketplace-name-fix
> Spec: `specs/features/creator-marketplace-name-fix/spec.md`
> Created: 2026-02-09

## Priority Questions (Blocking)

### Q1: Should `users.name` be treated as "First Last" or should we add separate first_name/last_name fields?
- **Context**: The `users` table has a single `name` field (string), not separate `first_name`/`last_name`. The ticket says "bold text should be first name last name." Currently `users.name` stores a full name (e.g. "Taylor Arielle"). There are no `first_name`/`last_name` columns.
- **Options**:
  - A) Use `users.name` as-is (single field, already contains full name like "Taylor Arielle") — no schema change needed
  - B) Add `first_name` and `last_name` columns to `users` table and migrate existing `name` data — requires migration + onboarding updates
- **AI Recommendation**: Option A. The `users.name` field already stores full names. Adding separate fields is a larger scope change that isn't needed to fix this bug. The second creator in the screenshot already shows "taylor_arielle" (a username) working fine — the issue is just the first creator whose `display_name` and `name` are both null.
- **Answer**: **Option A — Use `users.name` as-is.** No schema change needed. The single `name` field already stores full names.

### Q2: What should the final fallback be when ALL name fields are null?
- **Context**: Currently falls back to "Creator". The spec proposes "Unknown Creator" for clarity, but other options exist.
- **Options**:
  - A) "Unknown Creator" — clear that something is missing
  - B) Show just the @username (skip bold name entirely) — cleaner if username exists
  - C) Keep "Creator" — no visible change for the fallback case
- **AI Recommendation**: Option B — if we can't find a real name, just show the @username as the primary bold text. This is what the second card in the screenshot effectively does (shows "taylor_arielle" which is actually a username-style name). Only show "Unknown Creator" if username is also null.
- **Answer**: **Option B — Show @username as bold text.** If no display_name or users.name, promote username to bold. Only show "Unknown Creator" if username is also null.

## Design Tradeoffs (Affects Scope)

### Q3: Should we also populate `creator_profiles.display_name` when creators sign up or upgrade?
- **Context**: The root cause is that `display_name` is null in `creator_profiles`. We could fix this at the source by auto-populating `display_name` from `users.name` during creator profile creation/upgrade, preventing the issue for new creators.
- **Options**:
  - A) Fix display-only (this spec) — quick fix, doesn't prevent future occurrences
  - B) Also add a trigger/service update to populate `display_name` from `users.name` on creator profile creation — prevents future null display_names
- **AI Recommendation**: Option B (do both) — the display fix is the priority, but adding auto-population is a small addition that prevents recurrence.
- **Default if unanswered**: Option A (display fix only, keep scope minimal)
- **Answer**: *Unanswered — using default: Option A (display fix only)*

## Nice-to-Know (Non-blocking)

### Q4: Is the `users.name` field reliably populated during onboarding?
- **Context**: If `users.name` is also commonly null, even fixing the fallback chain won't help for those users. Need to confirm that the onboarding flow collects and stores the user's name.
- **Answer**: *Not answered — non-blocking*

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve creator-marketplace-name-fix Q1: [answer] Q2: [answer] Q3: [answer or "use default"] Q4: [answer or skip]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
