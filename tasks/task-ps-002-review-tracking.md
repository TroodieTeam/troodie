# Create Review Tracking Tables for Audit Trail

- Epic: PS (Pending State)
- Priority: Critical
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: PS-001

## Overview
Create dedicated review_logs table to track all review actions, decisions, and state changes for compliance and audit purposes.

## Business Value
- Complete audit trail for all review decisions
- Compliance with data governance requirements
- Analytics on review turnaround times and approval rates
- Ability to track reviewer performance and patterns

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Review Activity Tracking
  As a platform administrator
  I want to track all review actions and decisions
  So that I have a complete audit trail

  Scenario: Log review action
    Given an admin is reviewing a claim or application
    When they perform any review action
    Then a log entry should be created
    And it should include timestamp, actor, action, and entity details

  Scenario: Track status changes
    Given a claim or application changes status
    When the status transition occurs
    Then the previous and new status should be logged
    And any associated notes should be captured
    And the change cannot be deleted

  Scenario: Query review history
    Given multiple review actions on an entity
    When I query the review history
    Then I should see all actions in chronological order
    And each action should show who performed it and when
```

## Technical Implementation

### Database Schema

1. **Create review_logs table**:
```sql
CREATE TABLE review_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('restaurant_claim', 'creator_application')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'viewed', 'approved', 'rejected', 'noted', 'escalated')),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent deletion
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Indexes for performance
CREATE INDEX idx_review_logs_entity ON review_logs(entity_type, entity_id);
CREATE INDEX idx_review_logs_actor ON review_logs(actor_id);
CREATE INDEX idx_review_logs_created ON review_logs(created_at DESC);
CREATE INDEX idx_review_logs_action ON review_logs(action);

-- Make table append-only (no updates or deletes)
CREATE TRIGGER prevent_review_log_changes
BEFORE UPDATE OR DELETE ON review_logs
FOR EACH ROW EXECUTE FUNCTION raise_exception('Review logs cannot be modified or deleted');
```

2. **Create review statistics view**:
```sql
CREATE VIEW review_statistics AS
SELECT
  entity_type,
  action,
  DATE(created_at) as review_date,
  COUNT(*) as action_count,
  COUNT(DISTINCT actor_id) as unique_reviewers,
  AVG(CASE
    WHEN action IN ('approved', 'rejected')
    THEN EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY entity_id ORDER BY created_at)))
    ELSE NULL
  END) as avg_review_time_seconds
FROM review_logs
GROUP BY entity_type, action, DATE(created_at);
```

3. **Create trigger function for automatic logging**:
```sql
CREATE OR REPLACE FUNCTION log_review_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO review_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    previous_status,
    new_status,
    notes
  ) VALUES (
    TG_ARGV[0], -- entity_type passed as argument
    NEW.id,
    CASE
      WHEN OLD IS NULL THEN 'created'
      WHEN NEW.status != OLD.status THEN NEW.status
      ELSE 'updated'
    END,
    COALESCE(NEW.reviewed_by, auth.uid()),
    'admin', -- TODO: Get actual role from user_profiles
    OLD.status,
    NEW.status,
    NEW.review_notes
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

4. **Attach triggers to tracked tables**:
```sql
CREATE TRIGGER log_restaurant_claim_reviews
AFTER INSERT OR UPDATE ON restaurant_claims
FOR EACH ROW EXECUTE FUNCTION log_review_action('restaurant_claim');

CREATE TRIGGER log_creator_application_reviews
AFTER INSERT OR UPDATE ON creator_applications
FOR EACH ROW EXECUTE FUNCTION log_review_action('creator_application');
```

### API Integration
- Add review_logs to Supabase client types
- Create read-only access for review logs
- Implement filtering and pagination for log queries

## Definition of Done
- [ ] review_logs table created with proper constraints
- [ ] Append-only protection implemented
- [ ] Automatic logging triggers created
- [ ] Statistics view created for analytics
- [ ] Indexes optimized for common queries
- [ ] Migration tested in development
- [ ] RLS policies configured for read access
- [ ] API types generated

## Notes
- Consider partitioning review_logs by month for large-scale operations
- May want to add data retention policy (e.g., archive after 2 years)
- Future: Add review_templates table for standardized rejection reasons