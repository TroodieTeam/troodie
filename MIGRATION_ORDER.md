# Production Migration Order

## Migration Files to Apply

Apply migrations in the following order:

### 1. `supabase/migrations/20251210_payment_system.sql`
**Priority: HIGH** - Required for payment functionality

**What it does:**
- Creates `stripe_accounts` table for Stripe Connect accounts
- Creates `campaign_payments` table for tracking business payments
- Creates `payment_transactions` table for detailed transaction logs
- Adds payment columns to `campaigns` table (`payment_status`, `payment_intent_id`, `paid_at`)
- Adds Stripe columns to `business_profiles` table (`stripe_account_id`, `stripe_onboarding_completed`)
- Sets up RLS policies for all payment tables
- Creates helper functions for fee calculations
- Creates trigger to sync campaign payment status

**Safety checks:**
- ✅ Uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
- ✅ Uses `DO $$ BEGIN ... END $$` blocks with existence checks for ALTER TABLE
- ✅ Uses `CREATE INDEX IF NOT EXISTS` - safe
- ✅ Uses `DROP POLICY IF EXISTS` before creating policies - safe
- ✅ Uses `DROP TRIGGER IF EXISTS` before creating triggers - safe
- ✅ All foreign keys reference existing tables (`campaigns`, `auth.users`, `restaurants`, `creator_profiles`)
- ✅ Default values provided for all new columns
- ✅ No data migration required - all new tables start empty

**Dependencies:**
- Requires `campaigns` table (exists in production)
- Requires `business_profiles` table (exists in production)
- Requires `creator_profiles` table (exists in production)
- Requires `restaurants` table (exists in production)
- Requires `campaign_deliverables` table (exists in production)

**Estimated execution time:** ~5-10 seconds

---

### 2. `supabase/migrations/20251217_saved_campaigns.sql`
**Priority: MEDIUM** - Feature enhancement

**What it does:**
- Creates `saved_campaigns` table for creators to save/bookmark campaigns
- Sets up RLS policies for saved campaigns

**Safety checks:**
- ✅ Uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
- ✅ Uses `DROP POLICY IF EXISTS` before creating policies - safe
- ✅ Foreign keys reference existing tables (`creator_profiles`, `campaigns`)
- ✅ Unique constraint prevents duplicate saves
- ✅ No data migration required

**Dependencies:**
- Requires `creator_profiles` table (exists in production)
- Requires `campaigns` table (exists in production)

**Estimated execution time:** ~2-3 seconds

---

## Migration Safety Verification

### ✅ Production-Safe Features

1. **Idempotent Operations**
   - All `CREATE TABLE` statements use `IF NOT EXISTS`
   - All `ALTER TABLE` statements check for column existence first
   - All `CREATE INDEX` statements use `IF NOT EXISTS`
   - All `DROP POLICY` statements use `IF EXISTS`
   - All `DROP TRIGGER` statements use `IF EXISTS`

2. **No Data Loss**
   - No `DROP TABLE` statements
   - No `DROP COLUMN` statements
   - No data deletion operations
   - All new columns have default values or are nullable

3. **Backward Compatible**
   - New columns added to existing tables are nullable or have defaults
   - No changes to existing column types
   - No changes to existing constraints that would break existing data

4. **Transaction Safety**
   - All operations are wrapped in transactions (PostgreSQL default)
   - If any operation fails, entire migration rolls back

### ⚠️ Pre-Migration Checklist

Before applying migrations to production:

- [ ] Verify Stripe API keys are configured in production environment
- [ ] Verify Stripe webhook endpoints are configured in Stripe Dashboard
- [ ] Test migrations on staging environment first
- [ ] Ensure database backup is taken before migration
- [ ] Verify all referenced tables exist in production:
  - [ ] `campaigns`
  - [ ] `business_profiles`
  - [ ] `creator_profiles`
  - [ ] `restaurants`
  - [ ] `campaign_deliverables`
  - [ ] `auth.users`

### 🔄 Rollback Plan

If migration needs to be rolled back:

1. **Payment System Migration Rollback:**
   ```sql
   -- Drop trigger
   DROP TRIGGER IF EXISTS update_campaign_payment_status_trigger ON campaign_payments;
   
   -- Drop functions
   DROP FUNCTION IF EXISTS update_campaign_payment_status();
   DROP FUNCTION IF EXISTS calculate_creator_payout(INTEGER, INTEGER);
   DROP FUNCTION IF EXISTS calculate_platform_fee(INTEGER, INTEGER);
   
   -- Drop tables (will cascade delete related records)
   DROP TABLE IF EXISTS payment_transactions CASCADE;
   DROP TABLE IF EXISTS campaign_payments CASCADE;
   DROP TABLE IF EXISTS stripe_accounts CASCADE;
   
   -- Remove columns from campaigns table
   ALTER TABLE campaigns DROP COLUMN IF EXISTS payment_status;
   ALTER TABLE campaigns DROP COLUMN IF EXISTS payment_intent_id;
   ALTER TABLE campaigns DROP COLUMN IF EXISTS paid_at;
   
   -- Remove columns from business_profiles table
   ALTER TABLE business_profiles DROP COLUMN IF EXISTS stripe_account_id;
   ALTER TABLE business_profiles DROP COLUMN IF EXISTS stripe_onboarding_completed;
   
   -- Drop indexes
   DROP INDEX IF EXISTS idx_campaigns_payment_status;
   DROP INDEX IF EXISTS idx_campaigns_payment_intent;
   ```

2. **Saved Campaigns Migration Rollback:**
   ```sql
   DROP TABLE IF EXISTS saved_campaigns CASCADE;
   ```

**Note:** Rollback will delete all payment and saved campaign data. Only rollback if absolutely necessary.

---

## Application Code Dependencies

After migrations are applied, the following application code will be functional:

- ✅ Stripe Connect onboarding flows (business & creator)
- ✅ Campaign payment processing
- ✅ Creator payout processing
- ✅ Payment webhook handlers
- ✅ Saved campaigns feature
- ✅ Payment status tracking
- ✅ Transaction history

---

## Post-Migration Verification

After applying migrations, verify:

```sql
-- Check payment tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stripe_accounts', 'campaign_payments', 'payment_transactions', 'saved_campaigns');

-- Check campaigns table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('payment_status', 'payment_intent_id', 'paid_at');

-- Check business_profiles table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'business_profiles' 
AND column_name IN ('stripe_account_id', 'stripe_onboarding_completed');

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('stripe_accounts', 'campaign_payments', 'payment_transactions', 'saved_campaigns');
```

All queries should return expected results.

