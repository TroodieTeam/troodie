# Stakeholder Questions: Rate Creator Timing Fix

> Feature: rate-creator-timing-fix
> Spec: `specs/features/rate-creator-timing-fix/spec.md`
> Created: 2026-02-17

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: Should "Rate Creator" appear per-deliverable or once per application?
- **Context**: Currently, `DeliverableCard.tsx:250` shows a "Rate Creator" button on each individual approved deliverable card, AND `ApplicationsList.tsx:78` shows one on the application card. This means a restaurant could see 4 "Rate Creator" buttons (3 deliverables + 1 application). The rating itself is stored once per application, so only one button is needed.
- **Options**:
  - A) Show "Rate Creator" only on the application card (in `ApplicationsList.tsx`) — cleaner, single CTA
  - B) Show "Rate Creator" only on the last approved deliverable card — contextual, but odd UX
  - C) Keep both but only after all deliverables approved — redundant but harmless
- **AI Recommendation**: Option A — one button on the application card is clearest. Remove the per-deliverable "Rate Creator" button entirely.
- **Answer**: Option A

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q2: What status label should show for accepted-but-incomplete applications?
- **Context**: When "Rate Creator" is hidden, the accepted application card will have no action. We should show something to indicate progress.
- **Options**:
  - A) "Awaiting Content" (when 0 deliverables submitted) / "2/3 Approved" (when partial)
  - B) Just the "Accepted" status badge (already shown)
  - C) A progress bar showing deliverable completion
- **AI Recommendation**: Option A — simple text labels that give actionable context without requiring new UI components.
- **Default if unanswered**: Option A
- **Answer**: Option A.

## Nice-to-Know (Non-blocking)

### Q3: Should the application detail screen (`app/(tabs)/business/applications/[id].tsx`) also be updated?
- **Context**: This screen currently uses mock data and doesn't show real deliverables or ratings. It has Accept/Reject buttons for `status === 'pending'` but no post-acceptance flow.
- **Answer**: Yes, please update.

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve rate-creator-timing-fix Q1: [answer] Q2: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
