# Update RLS Policies for Pending States

- Epic: PS (Pending State)
- Priority: Critical
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: PS-001, PS-002

## Overview
Update Row Level Security policies to properly handle pending states, ensuring users can only see appropriate data based on their role and the review status.

## Business Value
- Secure access control for sensitive review data
- Privacy protection for users during review process
- Proper admin access for review workflows
- Prevention of data leaks or unauthorized access

## Acceptance Criteria (Gherkin)
```gherkin
Feature: RLS Policies for Pending States
  As a platform with review workflows
  I want proper access control for pending items
  So that data is secure and private

  Scenario: User access to own pending claims
    Given I submitted a restaurant claim
    When I query my claims
    Then I should see my pending claim
    But I should not see claims from other users

  Scenario: Admin access to all pending items
    Given I am an admin user
    When I query pending claims or applications
    Then I should see all pending items
    And I should be able to update their status

  Scenario: Public user cannot see pending items
    Given I am a public user
    When I try to query claims or applications
    Then I should not see any pending items
    And I should only see approved public data

  Scenario: Review logs access control
    Given review logs exist
    When a non-admin queries review logs
    Then they should not see any data
    But admins should see all review logs
```

## Technical Implementation

### RLS Policies

1. **Restaurant Claims Policies**:
```sql
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Users can create claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON restaurant_claims;
DROP POLICY IF EXISTS "Admins can update claims" ON restaurant_claims;

-- Users can view their own claims (any status)
CREATE POLICY "Users can view own claims"
ON restaurant_claims FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create new claims
CREATE POLICY "Users can create claims"
ON restaurant_claims FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
ON restaurant_claims FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Admins can update claim status
CREATE POLICY "Admins can update claims"
ON restaurant_claims FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);
```

2. **Creator Applications Policies**:
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own applications" ON creator_applications;
DROP POLICY IF EXISTS "Users can create applications" ON creator_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON creator_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON creator_applications;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
ON creator_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create applications"
ON creator_applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM creator_applications
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'approved')
  )
);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON creator_applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Admins can update applications
CREATE POLICY "Admins can update applications"
ON creator_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);
```

3. **Review Logs Policies**:
```sql
-- Enable RLS on review_logs
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view review logs
CREATE POLICY "Admins can view review logs"
ON review_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- System can insert review logs (via triggers)
CREATE POLICY "System can insert review logs"
ON review_logs FOR INSERT
TO authenticated
WITH CHECK (true); -- Triggers run with SECURITY DEFINER
```

4. **Helper Functions**:
```sql
-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_uuid
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check claim ownership
CREATE OR REPLACE FUNCTION owns_claim(user_uuid UUID, claim_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM restaurant_claims
    WHERE id = claim_uuid
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Testing Requirements
- Test user can only see own claims/applications
- Test admin can see all claims/applications
- Test non-owners cannot see others' pending items
- Test review logs are admin-only
- Test status updates are admin-only

## Definition of Done
- [ ] All RLS policies created and enabled
- [ ] Helper functions created for complex checks
- [ ] Policies tested with different user roles
- [ ] No data leaks in pending state
- [ ] Admin workflows functioning correctly
- [ ] Performance impact assessed
- [ ] Security review completed

## Notes
- Consider adding moderator role with limited review permissions
- May need to add bulk operation policies for admin efficiency
- Future: Add delegated review permissions for trusted users