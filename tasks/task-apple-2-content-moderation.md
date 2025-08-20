# Implement Content Moderation System

- Epic: APPLE (Apple Review Compliance)
- Priority: Critical
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Implement comprehensive content moderation features to comply with Apple's Guideline 1.2 for user-generated content, including reporting, blocking, and content filtering.

## Business Value
- **Compliance:** Required to pass Apple review
- **User Safety:** Protects users from inappropriate content
- **Legal Protection:** Reduces liability for harmful content
- **Trust:** Builds user confidence in the platform

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Content Moderation System
  As a user
  I want to report inappropriate content and block abusive users
  So that I can have a safe experience on the platform

  Scenario: Accept terms of service
    Given I am creating a new account
    When I complete the signup process
    Then I must accept the Terms of Service
    And the terms clearly state no tolerance for objectionable content

  Scenario: Report inappropriate content
    Given I am viewing a post or review
    When I long press or tap the report option
    Then I can select a reason for reporting
    And the report is submitted to moderation queue
    And I receive confirmation the report was received

  Scenario: Block abusive user
    Given I am viewing a user's profile
    When I tap the three dots menu and select "Block User"
    Then I no longer see content from that user
    And they cannot interact with my content
    And the block is immediately effective

  Scenario: Filter objectionable content
    Given a user posts content with profanity
    When the content is submitted
    Then the system automatically filters inappropriate words
    And the content is flagged for review if necessary

  Scenario: Admin moderation response
    Given a content report has been submitted
    When an admin reviews the report
    Then they can remove the content
    And ban the offending user
    And this must happen within 24 hours
```

## Technical Implementation

### 1. Terms of Service Enforcement
- Update onboarding flow to require TOS acceptance
- Add checkbox: "I agree to the Terms of Service"
- Store acceptance timestamp in user profile
- Update TOS to include content policy

### 2. Content Reporting System

#### Frontend Components
- `ReportModal` component with categories:
  - Inappropriate content
  - Spam
  - Harassment
  - False information
  - Other (with text input)
- Add report option to all user-generated content:
  - Posts (long press menu)
  - Reviews (three dots menu)
  - Comments (if applicable)
- Success confirmation toast

#### Backend Implementation
- Create `content_reports` table:
  ```sql
  - id (uuid)
  - content_type (post/review/comment)
  - content_id (uuid)
  - reporter_id (uuid)
  - reason (text)
  - details (text)
  - status (pending/reviewed/resolved)
  - created_at (timestamp)
  - resolved_at (timestamp)
  - resolved_by (uuid)
  ```
- API endpoints:
  - POST `/api/reports/content`
  - GET `/api/admin/reports` (admin only)
  - PUT `/api/admin/reports/:id/resolve`

### 3. User Blocking System

#### Database Schema
- Create `user_blocks` table:
  ```sql
  - id (uuid)
  - blocker_id (uuid)
  - blocked_id (uuid)
  - created_at (timestamp)
  ```

#### Implementation
- Add "Block User" to profile three-dots menu
- Update RLS policies to filter blocked users
- Hide content from blocked users in:
  - Feed
  - Search results
  - Comments/reviews
  - Follower/following lists

### 4. Content Filtering

#### Profanity Filter
- Implement client-side filtering library
- Server-side validation before saving
- Flag content with profanity for review
- Consider using: `bad-words` npm package

#### Auto-moderation Rules
- Detect spam patterns (repeated text, excessive links)
- Flag suspicious new accounts
- Rate limiting for posts/reviews

### 5. Admin Dashboard

#### Moderation Queue
- View all pending reports
- Filter by type, date, severity
- Bulk actions for efficiency

#### Actions Available
- Remove content
- Warn user
- Suspend account (temporary)
- Ban user (permanent)
- Dismiss report

#### 24-Hour SLA Monitoring
- Dashboard shows reports age
- Alerts for reports > 20 hours old
- Track resolution metrics

### 6. User Notifications
- Notify when content is removed
- Notify when account action taken
- Clear explanation of violation

## Database Changes
```sql
-- Reports table
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  reporter_id UUID REFERENCES auth.users(id),
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- User blocks table
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES auth.users(id),
  blocked_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Add to user profiles
ALTER TABLE profiles ADD COLUMN 
  terms_accepted_at TIMESTAMPTZ;
```

## Definition of Done
- [ ] Terms of Service acceptance required at signup
- [ ] Report feature available on all content
- [ ] Block user feature functional
- [ ] Profanity filter active
- [ ] Admin can moderate within 24 hours
- [ ] Database migrations complete
- [ ] RLS policies updated for blocks
- [ ] User notifications implemented
- [ ] Tested reporting flow end-to-end
- [ ] Tested blocking flow end-to-end
- [ ] Admin dashboard functional
- [ ] Apple guideline 1.2 compliance verified

## Testing Checklist
- [ ] Can't sign up without accepting TOS
- [ ] Can report posts/reviews
- [ ] Reports show in admin dashboard
- [ ] Blocked users' content hidden
- [ ] Profanity filtered correctly
- [ ] Admin can remove content
- [ ] Admin can ban users
- [ ] 24-hour SLA trackable

## Notes
- Reference: Apple Guideline 1.2 - Apps with user-generated content must have moderation
- Consider implementing shadow banning for repeat offenders
- May need to hire community moderators as we scale
- Document moderation guidelines for consistency