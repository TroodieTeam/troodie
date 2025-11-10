# Task: Auto-Approval Cron Job

**Epic:** deliverable-submission
**Priority:** P0 - Critical
**Estimate:** 2 days
**Status:** 🔴 Not Started

---

## Overview

Implement automated cron job to auto-approve deliverables after 72 hours of no restaurant review. Uses Supabase Edge Functions with cron trigger.

## Business Value

Ensures creators get paid even if restaurant owners don't review deliverables promptly. Critical for creator trust and marketplace velocity. Prevents indefinite payment delays.

## Acceptance Criteria

```gherkin
Feature: Auto-Approval Cron Job

  Scenario: Deliverable auto-approved after 72 hours
    Given a deliverable submitted 72+ hours ago
    And status is still "pending_review"
    When the cron job runs
    Then deliverable status changes to "auto_approved"
    And auto_approved_at timestamp is set
    And payment status changes to "processing"
    And payment processing is triggered
    And creator is notified

  Scenario: Multiple deliverables auto-approved
    Given 5 deliverables past 72-hour threshold
    When the cron job runs
    Then all 5 are auto-approved
    And payments are triggered for each
    And creators are notified

  Scenario: Deliverable within 72-hour window
    Given a deliverable submitted 50 hours ago
    When the cron job runs
    Then deliverable status remains "pending_review"
    And no action is taken

  Scenario: Already reviewed deliverable
    Given a deliverable submitted 80 hours ago
    And status is "approved"
    When the cron job runs
    Then deliverable status remains "approved"
    And no duplicate action taken

  Scenario: Cron job logging
    Given the cron job runs successfully
    Then it logs total deliverables checked
    And count of auto-approved deliverables
    And any errors encountered
```

## Technical Implementation

### 1. Create Supabase Edge Function (`supabase/functions/auto-approve-deliverables/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    console.log('[Auto-Approve] Starting auto-approval process...');

    // Calculate 72 hours ago
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 72);

    console.log(`[Auto-Approve] Cutoff time: ${cutoffTime.toISOString()}`);

    // Find deliverables to auto-approve
    const { data: deliverablesToApprove, error: fetchError } = await supabase
      .from('campaign_deliverables')
      .select(`
        id,
        creator_id,
        restaurant_id,
        campaign_id,
        submitted_at,
        payment_amount_cents,
        creator_profiles!inner(user_id)
      `)
      .eq('status', 'pending_review')
      .lt('submitted_at', cutoffTime.toISOString());

    if (fetchError) {
      console.error('[Auto-Approve] Error fetching deliverables:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch deliverables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Auto-Approve] Found ${deliverablesToApprove?.length || 0} deliverables to auto-approve`);

    if (!deliverablesToApprove || deliverablesToApprove.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No deliverables to auto-approve',
          count: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auto-approve each deliverable
    const results = [];
    for (const deliverable of deliverablesToApprove) {
      try {
        // Update deliverable status
        const { error: updateError } = await supabase
          .from('campaign_deliverables')
          .update({
            status: 'auto_approved',
            auto_approved_at: new Date().toISOString(),
            payment_status: 'processing',
          })
          .eq('id', deliverable.id);

        if (updateError) {
          console.error(`[Auto-Approve] Error updating deliverable ${deliverable.id}:`, updateError);
          results.push({ id: deliverable.id, success: false, error: updateError.message });
          continue;
        }

        // Trigger payment processing
        // TODO: Call payment service
        // await processPayment(deliverable);

        // Send notification to creator
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: deliverable.creator_profiles.user_id,
            type: 'deliverable_auto_approved',
            title: 'Deliverable Auto-Approved',
            message: `Your deliverable was automatically approved. Payment is being processed.`,
            data: {
              deliverable_id: deliverable.id,
              campaign_id: deliverable.campaign_id,
            },
          });

        if (notificationError) {
          console.error(`[Auto-Approve] Error creating notification:`, notificationError);
        }

        console.log(`[Auto-Approve] Successfully auto-approved deliverable: ${deliverable.id}`);
        results.push({ id: deliverable.id, success: true });
      } catch (error) {
        console.error(`[Auto-Approve] Unexpected error for deliverable ${deliverable.id}:`, error);
        results.push({ id: deliverable.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(`[Auto-Approve] Completed: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-approved ${successCount} deliverables`,
        total_checked: deliverablesToApprove.length,
        approved_count: successCount,
        failed_count: failureCount,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Auto-Approve] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2. Configure Cron Trigger in Supabase

Add cron configuration to `supabase/functions/auto-approve-deliverables/cron.json`:

```json
{
  "schedule": "0 */6 * * *",
  "description": "Auto-approve deliverables after 72 hours every 6 hours"
}
```

This runs every 6 hours at the top of the hour (00:00, 06:00, 12:00, 18:00 UTC).

Alternative for hourly checks:
```json
{
  "schedule": "0 * * * *",
  "description": "Auto-approve deliverables after 72 hours every hour"
}
```

### 3. Deploy Edge Function

```bash
# Deploy the function
npx supabase functions deploy auto-approve-deliverables --project-ref tcultsriqunnxujqiwea

# Set up cron trigger (requires Supabase CLI >= 1.50.0)
npx supabase functions schedule auto-approve-deliverables --cron "0 */6 * * *"
```

### 4. Manual Testing Endpoint

Add test endpoint to verify logic works:

```typescript
// In the same edge function file, add a route handler
if (req.method === 'POST' && new URL(req.url).pathname.includes('/test')) {
  // Same logic as cron, but returns detailed results
  // Can be called manually via: POST /functions/v1/auto-approve-deliverables/test
}
```

### 5. Monitoring & Alerting

Create monitoring table for cron runs:

```sql
CREATE TABLE cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  total_checked INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cron_logs_job ON cron_job_logs(job_name, created_at DESC);
```

Update edge function to log each run:

```typescript
const startTime = Date.now();

// ... auto-approval logic ...

const executionTime = Date.now() - startTime;

await supabase.from('cron_job_logs').insert({
  job_name: 'auto-approve-deliverables',
  status: failureCount === 0 ? 'success' : failureCount === successCount ? 'failed' : 'partial',
  total_checked: deliverablesToApprove.length,
  success_count: successCount,
  failure_count: failureCount,
  error_message: failureCount > 0 ? JSON.stringify(results.filter(r => !r.success)) : null,
  execution_time_ms: executionTime,
});
```

## Files to Create/Modify

- ✅ `supabase/functions/auto-approve-deliverables/index.ts` - New edge function
- ✅ `supabase/functions/auto-approve-deliverables/cron.json` - Cron configuration
- ✅ `supabase/migrations/20251012_cron_job_logs.sql` - Monitoring table

## Dependencies

- ✅ task-cd-001-deliverable-submission-schema.md (Database schema with auto_approved_at field)
- 🔴 Payment processing service (future task)
- 🔴 Notification system

## Definition of Done

- [ ] Edge function created and deployed
- [ ] Cron trigger configured (every 6 hours)
- [ ] Function correctly identifies deliverables > 72 hours old
- [ ] Auto-approval updates status to "auto_approved"
- [ ] Auto-approval sets auto_approved_at timestamp
- [ ] Payment status changes to "processing"
- [ ] Creator notifications sent
- [ ] Monitoring logs created for each run
- [ ] Manual test endpoint works
- [ ] Edge function tested with mock data
- [ ] Verified no duplicate approvals
- [ ] Error handling works correctly
- [ ] Logs are detailed and useful for debugging

## Testing Checklist

- [ ] Create test deliverable with submitted_at = 75 hours ago
- [ ] Run edge function manually
- [ ] Verify deliverable status changed to "auto_approved"
- [ ] Verify auto_approved_at is set
- [ ] Verify payment_status is "processing"
- [ ] Check notification was created
- [ ] Check cron_job_logs entry
- [ ] Verify deliverable not processed twice
- [ ] Test with 0 deliverables (should return success with count 0)
- [ ] Test with database error (should handle gracefully)

## Related Tasks

- task-cd-001-deliverable-submission-schema.md (Prerequisites)
- task-cd-002-deliverable-submission-service.md (Uses similar logic)
- task-cd-006-payment-processing.md (Payment integration)
- task-cd-008-deliverable-notifications.md (Notifications)
