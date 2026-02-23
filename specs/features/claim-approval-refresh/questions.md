# Stakeholder Questions: Claim Approval Refresh

> Feature: claim-approval-refresh
> Spec: `specs/features/claim-approval-refresh/spec.md`
> Created: 2026-02-22

## Priority Questions (Blocking)

### Q1: Is the AppState foreground refresh (Option A) sufficient for MVP, or do you also need real-time in-app updates (Option B)?
- **Context**: Option A (AppState listener) refreshes when the user backgrounds and re-opens the app — this covers the demo scenario where an admin approves a claim and the owner re-opens the app. Option B (real-time subscription) provides instant updates even while the app is open, but adds a persistent WebSocket connection on the `users` table.
- **Options**:
  - A) AppState foreground refresh only (MVP) — covers the primary use case, simpler
  - B) Both AppState + real-time subscription — instant updates but more complexity
- **AI Recommendation**: A) Start with AppState only. This directly addresses the reported issue (close/reopen not refreshing). Real-time can be added later if needed.
- **Answer**: Option B.

### Q2: What throttle interval is appropriate for the foreground refresh?
- **Context**: We need to prevent excessive API calls when users rapidly switch between apps. Too short (5s) means frequent calls; too long (5min) means delayed updates.
- **Options**:
  - A) 30 seconds — good balance of freshness vs. efficiency
  - B) 60 seconds — more conservative on API usage
  - C) 10 seconds — more responsive but higher API load
- **AI Recommendation**: A) 30 seconds. It's responsive enough for the approval use case while preventing abuse.
- **Answer**: Option A.

## Design Tradeoffs (Affects Scope)

### Q3: Should we also refresh the full user profile on foreground, or just account info?
- **Context**: `loadAccountInfo()` fetches account type, business profile, and managed restaurants. `loadUserProfile()` also fetches the basic user profile (name, avatar, etc.). Refreshing both catches more edge cases but doubles the API calls.
- **Options**:
  - A) Account info only — sufficient for claim approval detection
  - B) Full profile + account info — catches all profile changes
- **AI Recommendation**: A) Account info only. The claim approval flow only changes `account_type` and `business_profile`, both covered by `loadAccountInfo()`.
- **Default if unanswered**: A) Account info only
- **Answer**: Option A.

## Nice-to-Know (Non-blocking)

### Q4: What's the status of ER-001 (notification RLS audit)? Is Phase 3 (push notification on approval) on the roadmap?
- **Context**: Push notifications for claim approval are currently disabled in `adminReviewService.ts` (lines 324-343) due to an RLS audit requirement. Knowing if this will be resolved soon affects whether to plan for it.
- **Answer**: Not know.

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve claim-approval-refresh Q1: [answer] Q2: [answer] Q3: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
