# Stakeholder Questions: Remove Join Team Button

> Feature: remove-join-team-button
> Spec: `specs/features/remove-join-team-button/spec.md`
> Created: 2026-02-09

## Priority Questions (Blocking)

_None — the requirement is clear: remove the button._

## Design Tradeoffs (Affects Scope)

### Q1: Should the InviteCodeModal component file be deleted?
- **Context**: `components/InviteCodeModal.tsx` is currently only imported in `app/(tabs)/index.tsx`. However, it could potentially be useful if a manual code entry fallback is ever needed.
- **Options**:
  - A) Keep the component file — zero risk, just remove the usage from the home screen
  - B) Delete the component file entirely — cleaner codebase, less dead code
- **AI Recommendation**: Option A (keep) — the file isn't hurting anything and provides a fallback if magic links fail for some users
- **Default if unanswered**: Option A (keep)
- **Answer**: Use default — Option A (keep the component file)

## Nice-to-Know (Non-blocking)

_None_

---

## How to Approve

```
/groom --approve remove-join-team-button Q1: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
