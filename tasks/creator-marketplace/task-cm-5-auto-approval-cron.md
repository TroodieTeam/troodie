# Schedule Auto-Approval Cron Job for Deliverables

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.7

## Overview

The `auto_approve_deliverables()` PostgreSQL function exists but is not scheduled to run automatically. This means the 72-hour auto-approval window for deliverables will never trigger, leaving creators waiting indefinitely for unresponsive restaurants.

## Business Value

- **Creator Trust**: Creators expect payment within promised timeframe
- **Platform Credibility**: Auto-approval is a key marketplace feature
- **Restaurant Accountability**: Creates urgency for timely reviews
- **Revenue Flow**: Unblocks payment processing for completed work

## Current State

The function exists in the database:

```sql
-- From: 20251013_campaign_deliverables_schema.sql:314-335

CREATE OR REPLACE FUNCTION auto_approve_deliverables()
RETURNS INTEGER AS $$
DECLARE
  approved_count INTEGER;
BEGIN
  WITH approved AS (
    UPDATE campaign_deliverables
    SET
      status = 'auto_approved',
      auto_approved_at = NOW(),
      payment_status = 'processing',
      updated_at = NOW()
    WHERE
      status = 'pending_review'
      AND submitted_at < NOW() - INTERVAL '72 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO approved_count FROM approved;

  RETURN approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Problem**: No cron job is configured to call this function.

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Automatic Deliverable Approval
  As a creator
  I want my deliverables auto-approved after 72 hours
  So that I get paid even if the restaurant doesn't respond

  Scenario: Deliverable auto-approved after 72 hours
    Given I submitted a deliverable 73 hours ago
    And the restaurant has not reviewed it
    When the auto-approval job runs
    Then my deliverable status becomes 'auto_approved'
    And payment_status becomes 'processing'
    And I receive a notification

  Scenario: Deliverable reviewed before deadline
    Given I submitted a deliverable 48 hours ago
    And the restaurant approved it manually
    When the auto-approval job runs
    Then my deliverable is not affected
    And status remains 'approved'

  Scenario: Cron job logging
    Given the auto-approval job runs
    When it processes deliverables
    Then a log entry is created in cron_job_logs
    And the log includes count of approved deliverables
```

## Technical Implementation

### Option A: Supabase pg_cron (Recommended)

Supabase supports pg_cron for scheduled jobs. Enable it in the dashboard and create the schedule:

```sql
-- Migration: supabase/migrations/YYYYMMDD_schedule_auto_approval_cron.sql

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-approval job to run every hour
SELECT cron.schedule(
  'auto-approve-deliverables',    -- Job name
  '0 * * * *',                    -- Every hour at :00
  $$
  DO $$
  DECLARE
    approved_count INTEGER;
    start_time TIMESTAMP := clock_timestamp();
  BEGIN
    -- Run the auto-approval function
    SELECT auto_approve_deliverables() INTO approved_count;

    -- Log the execution
    INSERT INTO cron_job_logs (
      job_name,
      status,
      total_checked,
      success_count,
      execution_time_ms
    ) VALUES (
      'auto-approve-deliverables',
      CASE WHEN approved_count >= 0 THEN 'success' ELSE 'failed' END,
      (SELECT COUNT(*) FROM campaign_deliverables WHERE status = 'pending_review'),
      approved_count,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER
    );

    -- Optional: Raise notice for debugging
    RAISE NOTICE 'Auto-approved % deliverables', approved_count;
  END $$;
  $$
);

-- Verify the job is scheduled
SELECT * FROM cron.job WHERE jobname = 'auto-approve-deliverables';
```

### Option B: Supabase Edge Function with Scheduled Invocation

If pg_cron is not available, use an Edge Function:

```typescript
// supabase/functions/auto-approve-deliverables/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the auto-approval function
    const { data, error } = await supabase.rpc('auto_approve_deliverables');

    if (error) {
      console.error('Auto-approval error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the result
    await supabase.from('cron_job_logs').insert({
      job_name: 'auto-approve-deliverables-edge',
      status: 'success',
      success_count: data,
    });

    return new Response(JSON.stringify({ approved_count: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

Then schedule via external cron service (e.g., GitHub Actions, Render cron, etc.):

```yaml
# .github/workflows/auto-approve-cron.yml

name: Auto-Approve Deliverables
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  auto-approve:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/auto-approve-deliverables" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

### Option C: Manual Trigger with Monitoring

Create an admin endpoint to manually trigger and monitor:

```typescript
// Admin panel or internal tool
async function triggerAutoApproval() {
  const { data, error } = await supabase.rpc('auto_approve_deliverables');
  console.log(`Auto-approved ${data} deliverables`);
  return data;
}

// Call periodically via admin dashboard
```

### Send Notifications After Auto-Approval

Enhance the function to notify creators:

```sql
-- Enhanced auto-approval with notifications
CREATE OR REPLACE FUNCTION auto_approve_deliverables()
RETURNS INTEGER AS $$
DECLARE
  approved_count INTEGER;
  deliverable_record RECORD;
BEGIN
  -- Get deliverables to approve
  FOR deliverable_record IN
    SELECT cd.id, cd.creator_id, cp.user_id, c.title as campaign_title
    FROM campaign_deliverables cd
    JOIN creator_profiles cp ON cd.creator_id = cp.id
    JOIN campaigns c ON cd.campaign_id = c.id
    WHERE cd.status = 'pending_review'
      AND cd.submitted_at < NOW() - INTERVAL '72 hours'
  LOOP
    -- Update deliverable
    UPDATE campaign_deliverables
    SET
      status = 'auto_approved',
      auto_approved_at = NOW(),
      payment_status = 'processing',
      updated_at = NOW()
    WHERE id = deliverable_record.id;

    -- Create notification for creator
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      deliverable_record.user_id,
      'deliverable_auto_approved',
      'Content Auto-Approved',
      'Your deliverable for "' || deliverable_record.campaign_title || '" was auto-approved. Payment processing has begun.',
      jsonb_build_object(
        'deliverable_id', deliverable_record.id,
        'campaign_title', deliverable_record.campaign_title
      )
    );

    approved_count := COALESCE(approved_count, 0) + 1;
  END LOOP;

  RETURN COALESCE(approved_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Files to Create/Modify

1. **New Migration**: `supabase/migrations/YYYYMMDD_schedule_auto_approval_cron.sql`
2. **Optional Edge Function**: `supabase/functions/auto-approve-deliverables/`
3. **Optional GitHub Action**: `.github/workflows/auto-approve-cron.yml`
4. **Update Function**: Enhanced version with notifications

## Definition of Done

- [ ] Cron job scheduled (hourly)
- [ ] Job execution logged in cron_job_logs
- [ ] Creators notified on auto-approval
- [ ] Monitoring dashboard shows job status
- [ ] Manual trigger available for testing
- [ ] Verified: deliverables auto-approve after 72 hours
- [ ] Verified: manually reviewed deliverables not affected

## Monitoring

Add a view for monitoring auto-approvals:

```sql
CREATE VIEW auto_approval_status AS
SELECT
  DATE_TRUNC('day', submitted_at) as submission_date,
  COUNT(*) FILTER (WHERE status = 'pending_review' AND submitted_at < NOW() - INTERVAL '72 hours') as overdue,
  COUNT(*) FILTER (WHERE status = 'auto_approved') as auto_approved_today,
  COUNT(*) FILTER (WHERE status = 'pending_review') as pending
FROM campaign_deliverables
WHERE submitted_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', submitted_at)
ORDER BY submission_date DESC;
```

## Notes

- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.7
- Supabase pg_cron requires Pro plan or self-hosted
- Alternative: External cron service calling Edge Function
- Consider sending reminder to restaurant at 60 hours (12 hours before auto-approval)
