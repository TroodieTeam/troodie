# Stakeholder Questions: Restaurant Onboarding UX Fixes

> Feature: restaurant-onboarding-ux-fixes
> Spec: `specs/features/restaurant-onboarding-ux-fixes/spec.md`
> Created: 2026-02-22

## Priority Questions (Blocking)

### Q1: Should the beta passcode gate be removed from the Creator Onboarding flow too, or only from the Claim Restaurant flow?
- **Context**: Currently both "Become a Creator" (`app/creator/onboarding.tsx`) and "Claim Your Restaurant" (`app/business/claim.tsx`) use the same `BetaAccessGate` component with passcode `TROODIE2025`. TRO-163 only mentions removing it from the claim flow. The creator flow may still need gating.
- **Options**:
  - A) Remove beta gate from Claim flow only — creator onboarding keeps it
  - B) Remove beta gate from both flows — both are manually approved anyway
- **AI Recommendation**: A) Remove from Claim flow only. Creator onboarding has different approval criteria (follower count, content samples) and may still benefit from gating. The claim flow is simpler and manually approved.
- **Answer**: Option B.

### Q2: When a user has a pending claim, should tapping "Claim Status" show a dedicated status screen or reuse the existing claim.tsx pending step?
- **Context**: The claim.tsx pending step (lines 430-475) already shows "Claim Submitted Successfully!" with next steps and "Back to More" button. We could either route users to this same screen or create a new dedicated status view.
- **Options**:
  - A) Reuse existing pending step in claim.tsx via query param — simple, no new screen needed
  - B) Create a new `/business/claim-status` screen — more flexibility for future status updates (e.g., showing rejection, re-submission)
- **AI Recommendation**: A) Reuse existing pending step. It already has the right content. If we need a richer status view later, we can create one in a future iteration.
- **Answer**: Option A.

## Design Tradeoffs (Affects Scope)

### Q3: Should "Become a Creator" be hidden for ALL users with pending claims, or only hidden for users who explicitly went through the restaurant claim path?
- **Context**: A user could theoretically want to be both a creator AND a restaurant owner. Hiding "Become a Creator" prevents this dual-path during the pending period. However, the app currently only supports one `account_type` at a time (consumer → creator → business), so pursuing both simultaneously would be confusing.
- **Options**:
  - A) Hide "Become a Creator" when any claim is pending — simpler, prevents confusion
  - B) Keep "Become a Creator" visible even with pending claim — allows dual-path
- **AI Recommendation**: A) Hide it. The account_type model is single-value (`consumer`/`creator`/`business`), so dual-path isn't supported. Showing it would create confusion.
- **Default if unanswered**: A) Hide "Become a Creator" when pending claim exists
- **Answer**: Option A.

### Q4: Should the "Claim Status" item show the restaurant name in the subtitle?
- **Context**: `hasPendingClaim()` can return the restaurant name from the join. Showing "PIE.ZAA Charlotte — under review" is more informative than just "Your claim is under review".
- **Options**:
  - A) Show restaurant name: "PIE.ZAA Charlotte — under review"
  - B) Generic: "Your claim is under review"
- **AI Recommendation**: A) Show the restaurant name — more personal and informative
- **Default if unanswered**: A) Show restaurant name
- **Answer**: Option A.

## Nice-to-Know (Non-blocking)

### Q5: Is there a plan to re-enable the beta gate for any future feature launch, or can we consider deprecating the BetaAccessGate component entirely?
- **Context**: If the gate is removed from the claim flow and potentially the creator flow, the component may become unused. Knowing long-term plans helps decide whether to keep or remove it.
- **Answer**: No sure - keep the component.

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve restaurant-onboarding-ux-fixes Q1: [answer] Q2: [answer] Q3: [answer or "use default"] Q4: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
