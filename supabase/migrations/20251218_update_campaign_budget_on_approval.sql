-- Update campaign deliverable counts function to also update spent_amount_cents and delivered_content_count
-- This ensures that when deliverables are approved, the campaign budget and count are updated

CREATE OR REPLACE FUNCTION update_campaign_deliverable_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET
    deliverables_submitted = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    deliverables_pending = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
      AND status = 'pending_review'
    ),
    deliverables_approved = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
      AND status IN ('approved', 'auto_approved')
    ),
    -- Update delivered_content_count to match deliverables_approved
    delivered_content_count = (
      SELECT COUNT(*) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
      AND status IN ('approved', 'auto_approved')
    ),
    -- Update spent_amount_cents to sum of payment_amount_cents for approved deliverables
    spent_amount_cents = (
      SELECT COALESCE(SUM(payment_amount_cents), 0) FROM campaign_deliverables
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
      AND status IN ('approved', 'auto_approved')
      AND payment_amount_cents IS NOT NULL
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
