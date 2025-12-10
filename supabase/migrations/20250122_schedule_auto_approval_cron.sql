-- ============================================================================
-- Schedule Auto-Approval Cron Job for Deliverables
-- ============================================================================
-- This migration schedules the auto_approve_deliverables() function to run
-- automatically every hour to auto-approve deliverables that have been
-- pending for more than 72 hours.
--
-- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.7
-- Task: CM-5
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
-- Note: This requires Supabase Pro plan or self-hosted instance
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron_job_logs table for monitoring (if it doesn't exist)
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  total_checked INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name_created
ON cron_job_logs(job_name, created_at DESC);

-- Drop existing job if it exists (to allow re-running migration)
SELECT cron.unschedule('auto-approve-deliverables') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-approve-deliverables'
);

-- Schedule the auto-approval job to run every hour
SELECT cron.schedule(
  'auto-approve-deliverables',    -- Job name
  '0 * * * *',                    -- Every hour at :00 (cron format: minute hour day month weekday)
  $sql$
  DO
  $do$
  DECLARE
    approved_count INTEGER;
    start_time TIMESTAMP := clock_timestamp();
    end_time TIMESTAMP;
    execution_time_ms INTEGER;
  BEGIN
    -- Run the auto-approval function
    SELECT auto_approve_deliverables() INTO approved_count;

    -- Calculate execution time
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;

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
      execution_time_ms
    );

    -- Optional: Raise notice for debugging (visible in Supabase logs)
    RAISE NOTICE 'Auto-approved % deliverables in % ms', approved_count, execution_time_ms;
  EXCEPTION WHEN OTHERS THEN
    -- Log errors
    INSERT INTO cron_job_logs (
      job_name,
      status,
      error_message,
      execution_time_ms
    ) VALUES (
      'auto-approve-deliverables',
      'failed',
      SQLERRM,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER
    );
    RAISE;
  END;
  $do$;
  $sql$
);

-- Verify the job is scheduled
-- This will show the job details if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'Auto-approval cron job scheduled successfully';
    RAISE NOTICE 'Job will run every hour at :00 minutes';
  ELSE
    RAISE WARNING 'pg_cron extension not available. Cron job not scheduled.';
    RAISE WARNING 'This requires Supabase Pro plan or self-hosted instance.';
    RAISE WARNING 'Consider using an external cron service to call the auto_approve_deliverables() function.';
  END IF;
END $$;

-- Create a view for monitoring auto-approval status
CREATE OR REPLACE VIEW auto_approval_status AS
SELECT
  DATE_TRUNC('day', submitted_at) as submission_date,
  COUNT(*) FILTER (WHERE status = 'pending_review' AND submitted_at < NOW() - INTERVAL '72 hours') as overdue,
  COUNT(*) FILTER (WHERE status = 'auto_approved') as auto_approved_today,
  COUNT(*) FILTER (WHERE status = 'pending_review') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as manually_approved_today
FROM campaign_deliverables
WHERE submitted_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', submitted_at)
ORDER BY submission_date DESC;

COMMENT ON VIEW auto_approval_status IS
'Shows daily statistics for deliverable approvals including overdue items and auto-approvals.';

-- Create a function to manually trigger auto-approval (for testing)
CREATE OR REPLACE FUNCTION trigger_auto_approval_manually()
RETURNS JSON AS $$
DECLARE
  approved_count INTEGER;
  result JSON;
BEGIN
  SELECT auto_approve_deliverables() INTO approved_count;
  
  result := json_build_object(
    'success', true,
    'approved_count', approved_count,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_auto_approval_manually IS
'Manually trigger auto-approval for testing purposes. Returns count of approved deliverables.';

