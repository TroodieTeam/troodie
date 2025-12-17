# Payment Model Consideration

**Date:** December 17, 2025  
**Status:** Under Consideration

## Current Model: Pay Per Deliverable

**How it works:**
1. Business pays for campaign upfront → Funds held in platform account
2. Creator submits deliverable → Status: `pending_review`
3. Business approves deliverable → **Payout triggered immediately** → Creator receives payment
4. Each approved deliverable gets paid separately

**Pros:**
- ✅ Creators get paid immediately upon approval
- ✅ No waiting for campaign completion
- ✅ Clear payment per deliverable
- ✅ Works well for campaigns with multiple deliverables

**Cons:**
- ⚠️ Business pays upfront but can't change deliverables after payment
- ⚠️ If business wants to modify deliverables, they've already paid
- ⚠️ No protection against deliverable changes after payment

## Proposed Alternative Models

### Option A: Pay Once When Campaign Completed

**How it would work:**
1. Business creates campaign → No payment yet
2. Creators submit deliverables → Business reviews
3. Business approves/rejects deliverables
4. **When campaign is marked "completed"** → Single payment processes → All approved creators get paid

**Pros:**
- ✅ Business can modify deliverables before final payment
- ✅ Single payment transaction
- ✅ Clear completion milestone

**Cons:**
- ❌ Creators wait longer for payment (until campaign completion)
- ❌ More complex state management (tracking completion)
- ❌ What if campaign never completes?

### Option B: Lock Deliverables After Payment

**How it would work:**
1. Business pays for campaign upfront → Funds held
2. **Deliverables become locked** → Cannot be modified after payment
3. Business can only approve/reject, not change requirements
4. Each approval triggers payout as current model

**Pros:**
- ✅ Keeps current fast payout model
- ✅ Prevents changes after payment
- ✅ Clear contract: "You paid for X, you get X"

**Cons:**
- ⚠️ Less flexibility for businesses
- ⚠️ Need to implement locking mechanism
- ⚠️ What if legitimate changes needed?

## Recommendation

**Keep current model** (Pay Per Deliverable) **BUT** note that locking deliverables is effectively the same as locking campaign requirements:

### Current Understanding

- **Campaigns have fixed requirements** - Set when campaign is created
- **Campaigns have fixed budget** - Paid upfront by business
- **Deliverables = Campaign Requirements** - They're the same thing
- **Locking deliverables = Locking campaign requirements** - Same effect

### Implementation Plan (If Needed)

Since deliverables are essentially the campaign requirements, locking would happen at the campaign level:

1. **Lock campaign requirements when payment succeeds:**
   - In webhook `handlePaymentIntentSucceeded()`
   - Set `campaigns.requirements_locked = true` (or similar flag)

2. **Prevent requirement modifications after payment:**
   - In campaign edit/update functions - check if `requirements_locked = true`
   - Block changes to `requirements` or `deliverable_requirements` fields
   - Allow other edits (title, description, dates, etc.)

3. **UI Indication:**
   - Show "Requirements Locked" badge on campaign after payment
   - Disable requirement editing in campaign edit form
   - Show message: "Campaign paid - requirements cannot be modified"

**Benefits:**
- ✅ Keeps fast payout model (creators happy)
- ✅ Prevents requirement changes after payment (businesses protected)
- ✅ Clear contract enforcement
- ✅ Simpler than deliverable-level locking

### Application Form Simplification (✅ COMPLETED)

**Changes Made:**
- ✅ Removed "Proposed Rate" field (campaigns have fixed budget)
- ✅ Removed "Proposed Deliverables" field (campaigns have fixed requirements)
- ✅ Made "Why interested" optional (was required but not shown in main business view)
- ✅ Added read-only display of campaign requirements
- ✅ Added read-only display of fixed payment amount
- ✅ Simplified to just "Apply" button with optional message

**Result:** Application form now matches the fixed-budget, fixed-requirements model.

## Decision Needed

**Question:** Which model do you prefer?
- [ ] Keep current (pay per deliverable) + add locking
- [ ] Switch to pay-on-completion model
- [ ] Other approach?

---

**Current Status:** Pay-per-deliverable model is working and tested. Locking mechanism can be added as enhancement.
