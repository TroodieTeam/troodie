-- ============================================================================
-- E2E TEST DATA: Deliverable Submission + Application Review
-- ============================================================================
-- Wrapper: runs all plain SQL steps from deliverable-submission/
-- Run from project root: psql $DATABASE_URL -f e2e/scripts/setup-deliverable-submission-test.sql
-- Or run steps individually: e2e/scripts/deliverable-submission/01-cleanup.sql etc.
-- ============================================================================

\ir deliverable-submission/01-cleanup.sql
\ir deliverable-submission/02-restaurant.sql
\ir deliverable-submission/03-campaign.sql
\ir deliverable-submission/04-campaign-payment.sql
\ir deliverable-submission/05-application-accepted.sql
\ir deliverable-submission/06-application-pending.sql
\ir deliverable-submission/07-stripe-accounts.sql
\ir deliverable-submission/08-verify.sql
