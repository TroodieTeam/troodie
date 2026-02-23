# Stakeholder Questions: Hide Communities for Business

> Feature: hide-communities-business
> Spec: `specs/features/hide-communities-business/spec.md`
> Created: 2026-02-22

## Priority Questions (Blocking)

### Q1: Should communities be hidden for ALL business accounts, or only for "pure" business accounts (not creator+business)?
- **Context**: A user could theoretically be both a creator and a business owner (though current `account_type` is single-value). In the future, if dual account types are supported, a creator who also owns a restaurant might want to see communities. For now, `account_type` is either `consumer`, `creator`, or `business`.
- **Options**:
  - A) Hide for all business accounts — simple, aligns with current single-type model
  - B) Hide only if user has no creator history — more nuanced but adds complexity
- **AI Recommendation**: A) Hide for all business accounts. The current model is single-type. If dual-type support comes later, this can be revisited as part of the "switch account" feature mentioned in the ticket.
- **Answer**: Option A.

## Design Tradeoffs (Affects Scope)

### Q2: Should we also hide communities from the Explore tab for business users?
- **Context**: The Explore tab (`app/(tabs)/explore.tsx`) may surface community content in search results or discovery. Hiding it there too would create a fully consistent experience, but adds more file changes.
- **Options**:
  - A) Hide from Home + Add only (spec scope) — minimal changes, addresses the reported issue
  - B) Also hide from Explore — fully consistent, but more changes
- **AI Recommendation**: A) Home + Add only for now. The Explore tab is a general search/discovery surface. If community results appear there, they're contextual and less confusing than dedicated community sections.
- **Default if unanswered**: A) Home + Add only
- **Answer**: Option B.

## Nice-to-Know (Non-blocking)

### Q3: Is there a timeline for the "switch account" feature that would let business owners toggle between their owner and social personas?
- **Context**: The ticket mentions "Switch account function for owners who also want to use the app socially." Knowing the timeline helps plan whether this communities hiding is temporary or permanent for business accounts.
- **Answer**: Not sure.

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve hide-communities-business Q1: [answer] Q2: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
