# Setup Account Type System

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 3 days
- Status: 🔄 Needs Review
- Assignee: -
- Dependencies: -

## Overview
Extend the existing AuthContext to support different account types (consumer, creator, business owner). Each user has one primary account type that determines their app experience and available features. Creators and business owners still have access to consumer features as part of their enhanced experience.

## Business Value
- Core foundation for Creator Marketplace functionality
- Clear differentiation between account types and their capabilities
- Creators and businesses can still discover and save restaurants (consumer features)
- Simplified mental model - users understand their account type and its purpose

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Account Type System
  As a Troodie user
  I want to have a specific account type
  So that I can access features relevant to my primary use case

  Scenario: Consumer upgrades to creator account
    Given I am logged in as a consumer
    When I complete creator onboarding
    Then my account type becomes "creator"
    And I see creator tools in the More tab
    And I still have access to all consumer features (explore, save, etc.)
    And my saved restaurants remain accessible

  Scenario: Business owner claims restaurant
    Given I am logged in as a consumer or creator
    When I successfully claim and verify a restaurant
    Then my account type becomes "business"
    And I see business management tools in the More tab
    And I can manage my restaurant listing
    And I still have access to explore and discovery features

  Scenario: Account type determines feature access
    Given I am logged in as a creator
    When I navigate through the app
    Then I see creator-specific features (campaign management, analytics)
    And I see all consumer features (explore, save, profile)
    And I do NOT see business owner features (restaurant management)
    
  Scenario: Account type persistence
    Given I have a creator account type
    When I close and reopen the app
    Then I remain logged in as a creator
    And all my creator features are immediately available
```

## Technical Implementation

### Data Model Changes
```typescript
interface User {
  id: string;
  email: string;
  accountType: 'consumer' | 'creator' | 'business';
  accountStatus: 'active' | 'suspended' | 'pending_verification';
  accountUpgradedAt?: timestamp; // When they upgraded from consumer
  // existing fields...
}

interface CreatorProfile {
  userId: string;
  bio: string;
  specialties: string[];
  socialLinks: SocialLinks;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  metrics: CreatorMetrics;
}

interface BusinessProfile {
  userId: string;
  restaurantId: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  claimedAt: timestamp;
  managementPermissions: string[];
}
```

### AuthContext Extensions
- Add `accountType` to user context
- Add `hasFeatureAccess(feature)` permission checking
- Add `upgradeAccount(type)` function for account upgrades
- Update `useAuth()` hook to expose account type info
- Maintain backward compatibility for existing consumer accounts

### Database Schema
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'consumer';
ALTER TABLE users ADD COLUMN account_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE users ADD COLUMN account_upgraded_at TIMESTAMP;

-- Create creator_profiles table
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  bio TEXT,
  specialties TEXT[],
  social_links JSONB DEFAULT '{}',
  verification_status VARCHAR(20) DEFAULT 'pending',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create business_profiles table
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  restaurant_id UUID REFERENCES restaurants(id),
  verification_status VARCHAR(20) DEFAULT 'pending',
  claimed_at TIMESTAMP DEFAULT NOW(),
  management_permissions TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### UI Components
- More tab section organization based on account type
- Account type-based feature visibility
- Permission-based component rendering
- Clear visual indicators of account type (badges, icons)

### Services/Hooks
- `useAccountType()` hook for account type access
- `usePermissions()` hook for feature access checks
- `AccountService` for account upgrade flows
- Update More tab configuration for account type awareness

### Analytics/Telemetry
- Track account upgrade events
- Monitor account type distribution
- Track feature usage by account type
- Conversion funnel from consumer to creator/business

### Error States
- Handle verification failures during upgrade
- Manage suspended account states
- Prevent downgrades (creator -> consumer not allowed)
- Clear messaging about feature availability by account type

## Definition of Done
- [ ] Users have a single, clear account type (consumer/creator/business)
- [ ] Account upgrades work seamlessly (consumer -> creator/business)
- [ ] More tab sections appear based on account type
- [ ] Account type persists across app sessions
- [ ] All existing consumer flows continue to work
- [ ] Creators retain access to all consumer features
- [ ] Business owners retain access to discovery features
- [ ] Unit tests cover account type logic
- [ ] Integration tests verify account upgrades
- [ ] No performance degradation from account type checks
- [ ] Error states are handled gracefully
- [ ] Migration script sets existing users as 'consumer' type

## Notes
- Build on existing AuthContext patterns to minimize breaking changes
- Account types are hierarchical: Business and Creator accounts include all Consumer features
- Once upgraded, users cannot downgrade (creator cannot become consumer again)
- Plan for future account types (moderator, admin, verified creator, etc.)
- Ensure backward compatibility - all existing users default to 'consumer' type
- Consider offering different tiers within account types (e.g., creator vs creator pro)
- Reference: Simplified More tab approach with account-based sections
- Related: CM-003 More Tab Navigation System