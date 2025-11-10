# Add Pending State Schema to Claims and Applications

- Epic: PS (Pending State)
- Priority: Critical
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Add status fields to restaurant_claims and creator_applications tables to support pending review workflow. This enables manual review of submissions before approval.

## Business Value
- Prevents fraudulent or incorrect claims from being automatically approved
- Ensures quality control for creator applications
- Provides audit trail for all review decisions
- Protects platform integrity and user trust

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Pending State Database Schema
  As a platform administrator
  I want to track the review status of claims and applications
  So that I can manually review submissions before approval

  Scenario: Restaurant claim with pending status
    Given a user submits a restaurant claim
    When the claim is created in the database
    Then the status should be set to "pending"
    And the restaurant should not be linked to the user
    And the claim should have a submitted_at timestamp

  Scenario: Creator application with pending status
    Given a user submits a creator application
    When the application is created in the database
    Then the status should be set to "pending"
    And the user should not have creator privileges
    And the application should have a submitted_at timestamp

  Scenario: Status transition tracking
    Given a pending claim or application
    When an admin changes the status
    Then the reviewed_at timestamp should be set
    And the reviewed_by user id should be recorded
    And the previous status should be logged
```

## Technical Implementation

### Database Changes

1. **restaurant_claims table modifications**:
```sql
ALTER TABLE restaurant_claims ADD COLUMN IF NOT EXISTS
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  review_notes TEXT;

CREATE INDEX idx_restaurant_claims_status ON restaurant_claims(status);
CREATE INDEX idx_restaurant_claims_submitted ON restaurant_claims(submitted_at);
```

2. **creator_applications table modifications**:
```sql
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  review_notes TEXT;

CREATE INDEX idx_creator_applications_status ON creator_applications(status);
CREATE INDEX idx_creator_applications_submitted ON creator_applications(submitted_at);
```

3. **Update existing records** (if any):
```sql
-- Set existing claims to approved if they have linked restaurants
UPDATE restaurant_claims
SET status = 'approved', reviewed_at = updated_at
WHERE restaurant_id IS NOT NULL AND status IS NULL;

-- Set existing applications to approved if users have creator role
UPDATE creator_applications ca
SET status = 'approved', reviewed_at = ca.updated_at
FROM user_profiles up
WHERE ca.user_id = up.user_id
  AND up.is_creator = true
  AND ca.status IS NULL;
```

### Migration File Structure
- `supabase/migrations/[timestamp]_add_pending_states.sql`
- Include rollback instructions in comments
- Test migration in development environment first

## Definition of Done
- [ ] Migration script created and tested
- [ ] Indexes created for performance
- [ ] Existing data migrated correctly
- [ ] Schema changes deployed to staging
- [ ] RLS policies updated (see PS-003)
- [ ] Documentation updated
- [ ] Rollback plan documented

## Notes
- Consider adding a status_history JSONB column for full audit trail
- May need to add notification preferences for status changes
- Future enhancement: Add auto-approval rules for trusted users