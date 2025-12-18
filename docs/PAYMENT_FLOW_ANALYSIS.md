# Payment Flow Analysis & Field Usage

## Current Payment Flow

### 1. Campaign Creation
- **Table**: `campaigns`
- **Fields Used**:
  - `budget_cents` - Total campaign budget (in cents)
  - `payment_status` - Status of business payment (`unpaid`, `pending`, `paid`, `failed`, `refunded`)

### 2. Business Payment (Restaurant Pays)
- **Table**: `campaign_payments`
- **Fields Used**:
  - `amount_cents` - Total amount business paid (in cents)
  - `platform_fee_cents` - Platform fee deducted (in cents)
  - `creator_payout_cents` - Amount available for creators (after platform fee)
  - `status` - Payment status (`pending`, `processing`, `succeeded`, `failed`, `refunded`)
  - `stripe_payment_intent_id` - Stripe Payment Intent ID

**Note**: `creator_payout_cents = amount_cents - platform_fee_cents`

### 3. Deliverable Submission
- **Table**: `campaign_deliverables`
- **Fields Used**:
  - `payment_amount_cents` - **NULL initially** - Amount this deliverable will pay out
  - `payment_status` - Payment status (`pending`, `pending_onboarding`, `processing`, `completed`, `failed`)
  - `status` - Deliverable status (`pending_review`, `approved`, `auto_approved`, `rejected`, etc.)

### 4. Deliverable Approval
- **Function**: `approveDeliverable()` in `deliverableReviewService.ts`
- **Logic**:
  1. Check if `campaign_deliverables.payment_amount_cents` is already set
  2. If not, try to get from `campaign_payments` where `status = 'succeeded'`:
     - Use `creator_payout_cents` if available
     - Fallback to `amount_cents`
  3. If no `campaign_payments` record, fallback to `campaigns.budget_cents`
  4. Set `campaign_deliverables.payment_amount_cents` = calculated amount
  5. Call `processDeliverablePayout()`

### 5. Payout Processing
- **Function**: `processDeliverablePayout()` in `payoutService.ts`
- **Logic**:
  1. Read `campaign_deliverables.payment_amount_cents`
  2. If NULL/0, fallback to `campaign_payments.amount_cents`
  3. Create Stripe Transfer via Edge Function
  4. Create `payment_transactions` record
  5. Update `campaign_deliverables.payment_status` = `'processing'`

### 6. Payments UI Display
- **Query**: `loadPendingDeliverables()` in `app/creator/payments/index.tsx`
- **Fields Used**:
  - `campaign_deliverables.payment_amount_cents` - **This is what displays $0.00 if NULL/0**
  - `campaign_deliverables.payment_status`
  - `campaign_deliverables.status`

## Problem: Why $0.00 Shows Up

### Root Cause
When `approveDeliverable()` runs, it tries to set `payment_amount_cents` but:
1. If `campaign_payments` doesn't exist or `status != 'succeeded'` → Falls back to `campaigns.budget_cents`
2. If `campaigns.budget_cents` is NULL or 0 → `payment_amount_cents` stays NULL/0
3. Payments UI reads `payment_amount_cents` → Shows $0.00

### Current Fallback Chain
```
payment_amount_cents = 
  campaign_deliverables.payment_amount_cents (if already set) OR
  campaign_payments.creator_payout_cents (if campaign_payments.status = 'succeeded') OR
  campaign_payments.amount_cents (if campaign_payments.status = 'succeeded') OR
  campaigns.budget_cents (if campaign_payments doesn't exist) OR
  NULL/0 (if all above fail)
```

## Field Usage Summary

### `campaigns` Table
- ✅ **KEEP**: `budget_cents` - Source of truth for campaign budget
- ✅ **KEEP**: `payment_status` - Tracks if business paid

### `campaign_payments` Table
- ✅ **KEEP**: `amount_cents` - Total amount business paid
- ✅ **KEEP**: `platform_fee_cents` - Platform fee
- ✅ **KEEP**: `creator_payout_cents` - Amount available for creators
- ✅ **KEEP**: `status` - Payment status

### `campaign_deliverables` Table
- ✅ **KEEP**: `payment_amount_cents` - **CRITICAL** - Amount this specific deliverable pays out
- ✅ **KEEP**: `payment_status` - Payment processing status
- ✅ **KEEP**: `payment_transaction_id` - Links to `payment_transactions.id`
- ✅ **KEEP**: `paid_at` - When payment completed
- ✅ **KEEP**: `payment_error` - Error messages
- ⚠️ **REVIEW**: `payment_retry_count` - May not be needed if using `payment_transactions` for retries
- ⚠️ **REVIEW**: `last_payment_retry_at` - May not be needed if using `payment_transactions` for retries

### `payment_transactions` Table
- ✅ **KEEP**: `amount_cents` - Total transaction amount
- ✅ **KEEP**: `creator_amount_cents` - Amount creator receives
- ✅ **KEEP**: `platform_fee_cents` - Platform fee
- ✅ **KEEP**: `status` - Transaction status
- ✅ **KEEP**: `transaction_type` - `'payout'` for creator payouts
- ✅ **KEEP**: `stripe_transfer_id` - Stripe Transfer ID

## Issues & Recommendations

### Issue 1: Missing Campaign Payment Record
**Problem**: If `campaign_payments` doesn't exist, approval falls back to `budget_cents`, but if that's also NULL, `payment_amount_cents` stays NULL.

**Fix**: Ensure `campaign_payments` record exists before allowing deliverable approval, OR ensure `budget_cents` is always set.

### Issue 2: Redundant Fields
**Problem**: `campaign_deliverables.payment_retry_count` and `last_payment_retry_at` may be redundant if retries are tracked in `payment_transactions`.

**Recommendation**: 
- If retries create new `payment_transactions` records → **REMOVE** these fields
- If retries update the same transaction → **KEEP** these fields

### Issue 3: Inconsistent Amount Sources
**Problem**: Multiple places calculate payout amount differently:
- `approveDeliverable()` uses: `creator_payout_cents` OR `amount_cents` OR `budget_cents`
- `processDeliverablePayout()` uses: `payment_amount_cents` OR `amount_cents`

**Recommendation**: 
- **Standardize**: Always use `campaign_deliverables.payment_amount_cents` once set
- **Fix**: Ensure `payment_amount_cents` is ALWAYS set during approval

### Issue 4: Missing Validation
**Problem**: No validation that `campaign_payments.status = 'succeeded'` before allowing approval.

**Recommendation**: Add validation in `approveDeliverable()` to ensure campaign is paid before approval.

## Proposed Fixes

1. **Fix `approveDeliverable()` to always set `payment_amount_cents`**:
   - Ensure it never leaves `payment_amount_cents` as NULL/0
   - Add validation that campaign payment exists and succeeded
   - Use `creator_payout_cents` from `campaign_payments` (not `amount_cents`)

2. **Add validation**:
   - Check `campaign_payments.status = 'succeeded'` before approval
   - Return error if campaign not paid

3. **Cleanup redundant fields** (after confirming retry strategy):
   - Remove `payment_retry_count` and `last_payment_retry_at` if not needed

4. **Standardize payout calculation**:
   - Always use `campaign_deliverables.payment_amount_cents` once set
   - Remove fallback logic in `processDeliverablePayout()`
