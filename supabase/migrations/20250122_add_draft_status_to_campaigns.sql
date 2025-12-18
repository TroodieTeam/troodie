-- ============================================================================
-- Migration: Add 'draft' Status to Campaigns
-- Date: 2025-01-22
-- Description: Adds 'draft' status to campaigns_status_check constraint
--              to align with UI and TypeScript types that already support it.
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Add updated constraint with 'draft' status
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check
    CHECK ((status)::text = ANY (ARRAY[
      'pending'::text,
      'draft'::text,
      'active'::text,
      'review'::text,
      'completed'::text,
      'cancelled'::text
    ]));

COMMENT ON CONSTRAINT campaigns_status_check ON public.campaigns IS
  'Campaign status values: pending (initial), draft (work in progress), active (live), review (under review), completed (ended), cancelled (terminated)';

