# Application Form Schema Changes

**Date:** December 17, 2025  
**Status:** ✅ No Schema Changes Needed

## Summary

After simplifying the application form to match the fixed-budget, fixed-requirements model, **no database schema changes are required**.

## Current Schema Status

### `campaign_applications` Table

| Column | Type | Nullable | Status |
|--------|------|----------|--------|
| `proposed_rate_cents` | INTEGER | ✅ Yes | Already nullable - no change needed |
| `proposed_deliverables` | TEXT | ✅ Yes | Already nullable - no change needed |
| `cover_letter` | TEXT | ✅ Yes | Already nullable - no change needed |

**Conclusion:** All three columns are already nullable, so they can accept `NULL` values from the simplified form.

## Code Changes Required

### ✅ Completed
- [x] Application form simplified (`app/creator/explore-campaigns.tsx`)
- [x] Form now sets `proposed_rate_cents: null` and `proposed_deliverables: null`

### ⚠️ Needs Fixing

#### 1. Business View Display (`app/(tabs)/business/campaigns/[id].tsx`)
**Issue:** Line 1496 displays `proposed_rate_cents` which will be `null` for new applications.

**Fix Applied:** ✅ **Option A** - Removed proposed rate display completely
- Removed from campaign detail view
- Removed from dashboard
- Campaigns have fixed budgets, so proposed rate is not relevant

#### 2. Deliverable Service (`services/deliverableService.ts`)
**Issue:** Lines 131 and 188 use `application.proposed_rate_cents` to set `payment_amount_cents`. This is **WRONG** - should use campaign budget or payment amount.

**Current Code:**
```typescript
payment_amount_cents: application.proposed_rate_cents, // ❌ WRONG
```

**Fix:** Should use `campaign.budget_cents` or `campaign_payments.creator_payout_cents` (like `deliverableReviewService.ts` does correctly).

#### 3. Dashboard Display (`app/(tabs)/business/dashboard.tsx`)
**Issue:** Line 220 displays `proposed_rate` which will be `null` for new applications.

**Current Code:**
```typescript
proposed_rate: a.proposed_rate_cents / 100,
```

**Fix:** Handle null or remove from display.

## Recommendations

### Short Term (Immediate)
1. ✅ **Keep columns in database** - Backward compatibility for existing applications
2. ⚠️ **Fix `deliverableService.ts`** - Stop using `proposed_rate_cents` for payment amounts
3. ⚠️ **Update business views** - Handle null `proposed_rate_cents` gracefully

### Long Term (Future Cleanup)
1. Consider deprecating `proposed_rate_cents` and `proposed_deliverables` columns
2. Add migration to set all existing `NULL` values to `NULL` explicitly (no-op, but documents intent)
3. Eventually remove columns if not needed for historical data

## Migration Script (If Needed)

If you want to explicitly document that these fields are deprecated:

```sql
-- No-op migration - columns already nullable
-- This just documents that proposed_rate_cents and proposed_deliverables
-- are deprecated and should not be used for new applications

COMMENT ON COLUMN campaign_applications.proposed_rate_cents IS 
'DEPRECATED: Campaigns have fixed budgets. This field is kept for backward compatibility but should be NULL for new applications.';

COMMENT ON COLUMN campaign_applications.proposed_deliverables IS 
'DEPRECATED: Campaigns have fixed requirements. This field is kept for backward compatibility but should be NULL for new applications.';
```

## Conclusion

**No schema migration needed** - columns are already nullable. Focus on fixing code that incorrectly uses these deprecated fields.
