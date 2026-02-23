# Stakeholder Questions: Multi-Restaurant Claims

> Feature: multi-restaurant-claims
> Spec: `specs/features/multi-restaurant-claims/spec.md`
> Created: 2026-02-22

## Priority Questions (Blocking)

### Q1: Should owners be able to submit additional claims while their first (or any) claim is still pending, or must they wait for approval first?
- **Context**: The ticket says "After claiming their first restaurant, an owner should be able to claim additional locations." This implies first claim must be approved before claiming more. However, a strict owner with 5 locations might want to submit all claims at once.
- **Options**:
  - A) Must have at least one approved claim before claiming another — simpler, prevents spam
  - B) Can submit multiple claims simultaneously — more flexible for multi-location owners
- **AI Recommendation**: A) Require at least one approved claim first. This ensures the user is a verified business owner before allowing multiple claims. It also keeps the UX simple — the "Claim Another Location" button only appears in the Business Dashboard, which requires an approved claim.
- **Answer**: Option A.

### Q2: Where should "Claim Another Location" appear in the Business Dashboard?
- **Context**: The dashboard has multiple sections: restaurant info card, performance metrics, quick actions, active campaigns, recent applications. The "Claim Another Location" CTA needs a natural home.
- **Options**:
  - A) In the Quick Actions horizontal scroll (alongside "New Campaign", "Find Creators", "Analytics") — consistent with existing CTAs
  - B) Below the Restaurant Switcher / restaurant info card — prominent, directly related to restaurant management
  - C) In Restaurant Settings — tucked away, less discoverable but cleaner dashboard
- **AI Recommendation**: A) In Quick Actions. It fits the existing pattern and is discoverable without cluttering the main dashboard layout.
- **Answer**: Option A.

### Q3: Is this feature needed for the current release (v1.0.17), or can it be planned for a future version?
- **Context**: This is the most complex task in the batch — it requires a schema migration, service updates, and UI changes across multiple screens. The other 6 tasks are smaller UX fixes. Shipping this together could delay the UX fixes.
- **Options**:
  - A) Include in v1.0.17 — address Tyler's immediate need
  - B) Defer to v1.0.18+ — ship UX fixes first, plan multi-restaurant separately
- **AI Recommendation**: B) Defer. The UX fixes (TRO-160/161/162/163/168/169) directly impact current restaurant owner onboarding and should ship first. Multi-restaurant is an enhancement that can be planned for the next cycle.
- **Answer**: Option A. 
- 
## Design Tradeoffs (Affects Scope)

### Q4: How should the "primary" business profile be determined when a user has multiple?
- **Context**: `useAccountType.ts` currently reads `accountInfo?.business_profile` (singular). With multiple profiles, we need a strategy for which one is "primary" — used for the More tab subtitle, initial dashboard load, etc.
- **Options**:
  - A) First approved profile (chronological) — simple, deterministic
  - B) Currently selected restaurant in RestaurantContext — dynamic, matches user intent
  - C) Most recently claimed restaurant — reflects latest activity
- **AI Recommendation**: B) Use RestaurantContext's `currentRestaurant` to determine the active business profile. The context already handles selection persistence. Fallback to first approved if none selected.
- **Default if unanswered**: B) Currently selected restaurant
- **Answer**: Option B.

### Q5: Should pending additional claims be visible somewhere in the dashboard?
- **Context**: After submitting a claim for a second restaurant, the owner has no visibility into that claim's status from the Business Dashboard. They'd need to go to More tab → growth items or a submissions page.
- **Options**:
  - A) Show pending claims as a banner/card in the dashboard — "PIE.ZAA Asheville — claim pending"
  - B) No dashboard indication — rely on More tab "Claim Status" or a submissions page
- **AI Recommendation**: A) Show a subtle card in the dashboard. Owners will expect to see their pending claims where they manage their business.
- **Default if unanswered**: A) Show pending claims in dashboard
- **Answer**: Option A.

## Nice-to-Know (Non-blocking)

### Q6: Are there plans for a maximum number of restaurants an owner can claim?
- **Context**: Without a limit, a user could theoretically claim hundreds of restaurants. Most multi-location owners have 2-10 locations.
- **Answer**: Limit to 10.

### Q7: Should the "Promote My Restaurant" onboarding flow (separate from More tab) also support multi-restaurant in the future?
- **Context**: The current onboarding flow is designed for first-time claim. Multi-restaurant claims go through the dashboard. Just checking if there's a need to align these flows.
- **Answer**: Keep as is.

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve multi-restaurant-claims Q1: [answer] Q2: [answer] Q3: [answer] Q4: [answer or "use default"] Q5: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
