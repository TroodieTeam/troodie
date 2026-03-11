-- Reset Script: Payment Duplication Fix
-- WARNING: Resets test data. Review before running.

UPDATE campaign_deliverables
SET status = 'pending', payment_status = NULL, payment_amount_cents = NULL,
    payment_error = NULL, payment_transaction_id = NULL, payment_retry_count = 0,
    reviewer_id = NULL, reviewed_at = NULL, auto_approved = FALSE, updated_at = NOW()
WHERE campaign_application_id = '<application_id>';
