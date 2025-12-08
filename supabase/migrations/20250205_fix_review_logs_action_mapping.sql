-- ============================================================================
-- Fix Review Logs Action Mapping
-- ============================================================================
-- The trigger was using status values directly as action values, but
-- review_logs.action constraint only allows: 'created', 'viewed', 'approved',
-- 'rejected', 'noted', 'escalated', 'updated'
-- 
-- This migration fixes the trigger to map status values to valid actions:
-- - 'verified' -> 'approved'
-- - 'rejected' -> 'rejected'
-- - 'pending' -> 'created' (on insert)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_action TEXT;
  v_actor_id UUID;
BEGIN
  -- Determine entity type from table name
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'restaurant_claims' THEN 'restaurant_claim'
    WHEN 'creator_applications' THEN 'creator_application'
    ELSE TG_TABLE_NAME
  END;

  -- Determine action - map status values to valid action values
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Map status values to valid action values
    v_action := CASE NEW.status
      WHEN 'verified' THEN 'approved'  -- restaurant_claims uses 'verified'
      WHEN 'approved' THEN 'approved'  -- creator_applications uses 'approved'
      WHEN 'rejected' THEN 'rejected'
      WHEN 'expired' THEN 'rejected'   -- treat expired as rejected
      ELSE 'updated'  -- fallback for other status changes
    END;
  ELSE
    v_action := 'updated';
  END IF;

  -- Get actor ID (use reviewed_by if available, otherwise current user)
  v_actor_id := COALESCE(NEW.reviewed_by, auth.uid());

  -- Insert log entry
  INSERT INTO review_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    previous_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    v_entity_type,
    NEW.id,
    v_action,
    v_actor_id,
    COALESCE(
      (SELECT account_type FROM users WHERE id = v_actor_id),
      'system'
    ),
    OLD.status,
    NEW.status,
    NEW.review_notes,
    jsonb_build_object(
      'rejection_reason', NEW.rejection_reason,
      'can_resubmit', NEW.can_resubmit
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION log_review_action() IS 
  'Logs review actions, mapping status values (verified/approved/rejected) to valid action values (approved/rejected)';
