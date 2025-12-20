# Payment Field Cleanup Recommendations

## Summary

After reviewing the payment flow, here are the fields/columns being used and recommendations for cleanup.

## Field Usage by Table

### `campaigns` Table
| Field | Purpose | Status | Recommendation |
|-------|---------|--------|----------------|
| `budget_cents` | Total campaign budget | ✅ **KEEP** | Source of truth for campaign budget |
| `payment_status` | Business payment status | ✅ **KEEP** | Tracks if restaurant paid (`unpaid`, `pending`, `paid`, `failed`, `refunded`) |

### `campaign_payments` Table
| Field | Purpose | Status | Recommendation |
|-------|---------|--------|----------------|
| `amount_cents` | Total amount business paid | ✅ **KEEP** | Total payment from restaurant |
| `platform_fee_cents` | Platform fee deducted | ✅ **KEEP** | Platform revenue |
| `creator_payout_cents` | Amount available for creators | ✅ **KEEP** | **PRIMARY SOURCE** for deliverable payouts (after platform fee) |
| `status` | Payment status | ✅ **KEEP** | Must be `'succeeded'` for payouts to work |
| `stripe_payment_intent_id` | Stripe Payment Intent ID | ✅ **KEEP** | Links to Stripe |

**Formula**: `creator_payout_cents = amount_cents - platform_fee_cents`

### `campaign_deliverables` Table
| Field | Purpose | Status | Recommendation |
|-------|---------|--------|----------------|
| `payment_amount_cents` | **CRITICAL** - Amount this deliverable pays out | ✅ **KEEP** | **MUST BE SET** during approval. This is what displays in UI. |
| `payment_status` | Payment processing status | ✅ **KEEP** | (`pending`, `pending_onboarding`, `processing`, `completed`, `failed`) |
| `payment_transaction_id` | Links to `payment_transactions.id` | ✅ **KEEP** | Foreign key to transaction record |
| `paid_at` | When payment completed | ✅ **KEEP** | Timestamp of completion |
| `payment_error` | Error messages | ✅ **KEEP** | Useful for debugging |
| `payment_retry_count` | Retry counter | ⚠️ **REVIEW** | See "Redundant Fields" below |
| `last_payment_retry_at` | Last retry timestamp | ⚠️ **REVIEW** | See "Redundant Fields" below |

### `payment_transactions` Table
| Field | Purpose | Status | Recommendation |
|-------|---------|--------|----------------|
| `amount_cents` | Total transaction amount | ✅ **KEEP** | Transaction total |
| `creator_amount_cents` | Amount creator receives | ✅ **KEEP** | **Used for earnings calculation** |
| `platform_fee_cents` | Platform fee | ✅ **KEEP** | Platform revenue tracking |
| `status` | Transaction status | ✅ **KEEP** | (`pending`, `processing`, `completed`, `failed`) |
| `transaction_type` | Type of transaction | ✅ **KEEP** | `'payout'` for creator payouts |
| `stripe_transfer_id` | Stripe Transfer ID | ✅ **KEEP** | Links to Stripe |

## Redundant Fields Analysis

### `campaign_deliverables.payment_retry_count` & `last_payment_retry_at`

**Current Usage**: Not actively used in codebase.

**Recommendation**: 
- **If retries create new `payment_transactions` records** → ✅ **REMOVE** these fields (retry count = count of transactions)
- **If retries update same transaction** → ⚠️ **KEEP** these fields (but implement retry logic)

**Action**: Search codebase for usage:
```sql
-- Check if these fields are used anywhere
SELECT 
    COUNT(*) as usage_count
FROM campaign_deliverables
WHERE payment_retry_count > 0 OR last_payment_retry_at IS NOT NULL;
```

If count = 0 → Safe to remove.

## Payment Flow Summary

### Correct Flow:
1. **Campaign Created** → `campaigns.budget_cents` set
2. **Business Pays** → `campaign_payments` record created with `status = 'succeeded'`
3. **Deliverable Approved** → `campaign_deliverables.payment_amount_cents` = `campaign_payments.creator_payout_cents` (or fallback to `budget_cents`)
4. **Payout Processed** → Uses `campaign_deliverables.payment_amount_cents` → Creates `payment_transactions` record
5. **UI Displays** → Reads `campaign_deliverables.payment_amount_cents`

### Amount Priority (During Approval):
```
payment_amount_cents = 
  campaign_payments.creator_payout_cents (if campaign_payments.status = 'succeeded') OR
  campaign_payments.amount_cents (if campaign_payments.status = 'succeeded') OR
  campaigns.budget_cents (if campaign_payments doesn't exist) OR
  0 (error - will cause payout to fail)
```

### Amount Priority (During Payout):
```
payoutAmountCents = 
  campaign_deliverables.payment_amount_cents (set during approval) OR
  campaign_payments.creator_payout_cents (fallback) OR
  campaign_payments.amount_cents (fallback) OR
  ERROR (invalid amount)
```

## Issues Fixed

### Issue 1: `payment_amount_cents` Not Set During Approval
**Problem**: If `campaign_payments` doesn't exist or `budget_cents` is NULL, `payment_amount_cents` stayed NULL/0.

**Fix**: 
- Added better error logging
- Always set `payment_amount_cents` (even if 0, which will cause clear error)
- Improved fallback chain

### Issue 2: Inconsistent Amount Calculation
**Problem**: `processDeliverablePayout()` had different fallback logic than `approveDeliverable()`.

**Fix**: 
- Standardized to use `campaign_deliverables.payment_amount_cents` as primary source
- Added validation to ensure amount > 0
- Better error messages

## Cleanup Actions

### Immediate Actions:
1. ✅ **Fixed**: `approveDeliverable()` to always set `payment_amount_cents`
2. ✅ **Fixed**: `processDeliverablePayout()` to validate amount > 0
3. ✅ **Created**: Diagnostic SQL script (`scripts/diagnose-new-campaign-payment.sql`)

### Future Cleanup (After Testing):
1. **Review**: `payment_retry_count` and `last_payment_retry_at` usage
2. **Remove**: If not used, drop these columns:
   ```sql
   ALTER TABLE campaign_deliverables 
   DROP COLUMN IF EXISTS payment_retry_count,
   DROP COLUMN IF EXISTS last_payment_retry_at;
   ```

## Testing Checklist

After fixes, test:
- [ ] New campaign → Business pays → Deliverable approved → `payment_amount_cents` is set correctly
- [ ] Payments UI shows correct amount (not $0.00)
- [ ] Payout processing uses `payment_amount_cents` correctly
- [ ] Error handling when `campaign_payments` doesn't exist
- [ ] Error handling when `budget_cents` is NULL/0

## Schema Changes Needed

None required immediately. Optional cleanup:
- Remove `payment_retry_count` and `last_payment_retry_at` if confirmed unused

