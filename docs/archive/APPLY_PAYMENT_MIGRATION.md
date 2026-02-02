# Apply Payment System Migration

The `stripe_accounts` table doesn't exist in your database. You need to apply the migration.

## Quick Fix: Apply via Supabase SQL Editor

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. **Copy and paste the migration:**
   - Open: `supabase/migrations/20251210_payment_system.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify it worked:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name = 'stripe_accounts'
   );
   ```
   Should return `true`

## Alternative: Apply via CLI

```bash
# Apply the migration directly
supabase db execute --linked --file supabase/migrations/20251210_payment_system.sql
```

## What This Migration Creates

- `stripe_accounts` table - Stores Stripe Connect account info
- `campaign_payments` table - Tracks campaign payments
- `payment_transactions` table - Detailed transaction log
- Adds payment columns to `campaigns` table
- Adds Stripe columns to `business_profiles` table
- Sets up RLS policies for all payment tables
