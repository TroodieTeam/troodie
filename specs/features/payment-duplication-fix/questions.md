# Stakeholder Questions: Payment Duplication Fix

> Feature: payment-duplication-fix
> Spec: `specs/features/payment-duplication-fix/spec.md`
> Created: 2026-02-17

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: How should partial approval be handled?
- **Context**: If a creator submits 3 deliverables and 2 are approved but 1 is rejected, payment currently never triggers (all-approved check fails). The creator did most of the work but gets $0.
- **Options**:
  - A) Pay only when ALL deliverables are approved (rejected ones must be resubmitted) — simpler, but blocks payment if restaurant rejects even one
  - B) Pay when all deliverables reach a terminal state (approved/rejected), with prorated amount — fairer, but more complex
  - C) Pay full amount if ANY deliverable is approved, treat remaining as bonus — simplest, but restaurants lose leverage
- **AI Recommendation**: Option A — it's the simplest fix and aligns with the stated requirement. Rejected deliverables already support resubmission (`revision_requested` status). The restaurant can reject and ask for revision, and once re-approved, payout triggers.
- **Answer**: Option A

### Q2: Should existing overpayments be reconciled?
- **Context**: This bug may have already caused overpayments in production. Multiple `campaign_deliverables` rows for the same `campaign_application_id` may have `payment_status = 'completed'` with full amounts.
- **Options**:
  - A) Fix forward only — don't touch historical data, just prevent future overpayments
  - B) Run an audit query to identify affected records and flag for manual review
  - C) Automatically initiate refunds for overpaid amounts
- **AI Recommendation**: Option B — run an audit to quantify the problem, but handle refunds manually. Automatic refunds via Stripe are risky and may cause disputes.
- **Answer**: Option B

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q3: Should the UI indicate partial approval progress?
- **Context**: Currently there's no UI feedback when a restaurant approves 1 of 3 deliverables — the restaurant doesn't know payment is "pending all approved." Adding a progress indicator ("2/3 approved — payment pending") would improve clarity.
- **Options**:
  - A) Add progress indicator to review UI
  - B) Add toast notification ("Payment will process once all deliverables are approved")
  - C) Both A and B
  - D) Skip — just fix the backend logic
- **AI Recommendation**: Option B — a toast is lightweight and informative. Full progress UI can come later.
- **Default if unanswered**: Option B
- **Answer**: Option C

## Nice-to-Know (Non-blocking)

These provide helpful context but won't block implementation.

### Q4: What is the typical number of deliverables per campaign?
- **Context**: This affects how often the "waiting for all approved" state occurs. If most campaigns have 1 deliverable, this fix is mostly a safety net. If most have 3+, it's a major behavior change.
- **Answer**: 3

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve payment-duplication-fix Q1: [answer] Q2: [answer] Q3: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
