# Troodie-Managed Campaigns: Testing & Deployment

- Epic: TMC (Troodie-Managed Campaigns)
- Priority: Critical
- Estimate: 1.5 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: TMC-001, TMC-002, TMC-003, TMC-004, TMC-005, TMC-006

## Overview
Comprehensive testing strategy and deployment checklist for the Troodie-Managed Campaigns feature. Includes unit tests, integration tests, E2E tests using Maestro, manual QA scenarios, and production deployment steps. Ensures the feature is production-ready, stable, and meets all acceptance criteria across all tasks.

## Business Value
- Prevents bugs and regressions in critical revenue-generating feature
- Ensures smooth creator and admin experience at launch
- Validates budget tracking accuracy for financial reporting
- Builds confidence in platform-managed campaign infrastructure
- Enables safe rollout to production without disrupting existing campaigns
- Critical for MVP launch success

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Testing & Deployment Readiness
  As a platform engineer
  I want comprehensive test coverage for Troodie-managed campaigns
  So that we can deploy safely to production

  Scenario: Database migration succeeds
    Given I have a clean database instance
    When I run the TMC-001 migration
    Then all tables, columns, and indexes are created
    And RLS policies are applied correctly
    And Triggers fire when expected
    And Sample data is inserted
    And Migration can be rolled back cleanly

  Scenario: System account creation succeeds
    Given the database migration has run
    When I run the system account seed script
    Then Troodie user account exists
    And Troodie restaurant exists with is_platform_managed=true
    And Business profile links user to restaurant
    And Account has proper admin permissions

  Scenario: Admin can create all campaign types
    Given I am logged in as an admin user
    When I create a Direct campaign
    Then campaign appears in creator marketplace with "Troodie Official" badge
    When I create a Partnership campaign
    Then campaign appears as restaurant campaign (no badge)
    When I create a Community Challenge
    Then campaign appears with "Challenge" badge

  Scenario: Creator can view and apply to Troodie campaigns
    Given Troodie campaigns exist
    When I browse campaigns as a creator
    Then I see Troodie badges on appropriate campaigns
    And I can filter by campaign source
    And I can apply to any campaign type
    And Application flow is identical across types

  Scenario: Deliverable submission works for platform campaigns
    Given I have been accepted to a Troodie campaign
    When I submit deliverables with URL + screenshot
    Then deliverable status is "pending_review"
    And Admin receives notification
    And Auto-approve timer starts (72 hours)

  Scenario: Budget tracking is accurate
    Given multiple platform campaigns with applications
    When creators are accepted to campaigns
    Then actual_spend_cents updates automatically
    And Budget analytics dashboard shows correct totals
    And Cost per creator is calculated correctly

  Scenario: Auto-approval works correctly
    Given a deliverable has been pending for 72 hours
    When the auto-approval cron job runs
    Then deliverable status changes to "completed"
    And Creator is marked for payment
    And Notification is sent to creator

  Scenario: Performance is acceptable
    Given 100+ campaigns in the database (mix of restaurant and Troodie)
    When I load the campaign browse screen
    Then results load in under 2 seconds
    When I load the analytics dashboard
    Then analytics load in under 3 seconds
```

## Technical Implementation

### Unit Tests
Create: `__tests__/services/platformCampaignService.test.ts`

```typescript
import { createPlatformCampaign, getPlatformCampaigns } from '@/services/platformCampaignService';
import { createMockSupabaseClient } from '@/tests/helpers/supabaseMocks';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

describe('platformCampaignService', () => {
  describe('createPlatformCampaign', () => {
    it('should create a direct Troodie campaign', async () => {
      const campaignData = {
        managementType: 'direct' as const,
        title: 'Test Campaign',
        description: 'Test description',
        requirements: 'Test requirements',
        contentGuidelines: 'Test guidelines',
        budgetSource: 'marketing' as const,
        approvedBudgetCents: 500000,
        targetCreators: 10,
        targetContentPieces: 10,
        targetReach: 50000,
        durationDays: 30,
        maxApplications: 50,
        proposedRateCents: 2500,
      };

      const { data, error } = await createPlatformCampaign(campaignData);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.campaign_source).toBe('troodie_direct');
      expect(data?.platform_campaign).toBeDefined();
    });

    it('should create a partnership campaign with subsidy tracking', async () => {
      const campaignData = {
        managementType: 'partnership' as const,
        title: 'Partner Campaign',
        description: 'Partner description',
        requirements: 'Partner requirements',
        contentGuidelines: 'Partner guidelines',
        budgetSource: 'partnerships' as const,
        approvedBudgetCents: 1000000,
        targetCreators: 20,
        targetContentPieces: 20,
        targetReach: 100000,
        durationDays: 30,
        maxApplications: 100,
        proposedRateCents: 5000,
        partnerRestaurantId: 'partner-restaurant-id',
        subsidyAmountCents: 500000,
        partnershipAgreementSigned: true,
      };

      const { data, error } = await createPlatformCampaign(campaignData);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.campaign_source).toBe('troodie_partnership');
      expect(data?.is_subsidized).toBe(true);
      expect(data?.subsidy_amount_cents).toBe(500000);
    });
  });

  describe('getPlatformCampaigns', () => {
    it('should retrieve all platform-managed campaigns', async () => {
      const { data, error } = await getPlatformCampaigns();

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      // Should only include campaigns where campaign_source != 'restaurant'
      data?.forEach((campaign) => {
        expect(campaign.campaign_source).not.toBe('restaurant');
      });
    });
  });
});
```

Create: `__tests__/services/analyticsService.test.ts`

```typescript
import { getCampaignAnalytics } from '@/services/analyticsService';
import { createMockSupabaseClient } from '@/tests/helpers/supabaseMocks';

jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

describe('analyticsService', () => {
  describe('getCampaignAnalytics', () => {
    it('should calculate budget metrics correctly', async () => {
      const { data, error } = await getCampaignAnalytics();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.totalApprovedBudget).toBeGreaterThanOrEqual(0);
      expect(data?.totalActualSpend).toBeGreaterThanOrEqual(0);
      expect(data?.remainingBudget).toBe(
        data.totalApprovedBudget - data.totalActualSpend
      );
    });

    it('should calculate utilization percentage correctly', async () => {
      const { data, error } = await getCampaignAnalytics();

      expect(error).toBeNull();
      expect(data?.budgetUtilization).toBeGreaterThanOrEqual(0);
      expect(data?.budgetUtilization).toBeLessThanOrEqual(100);
    });

    it('should calculate cost per creator correctly', async () => {
      const { data, error } = await getCampaignAnalytics();

      expect(error).toBeNull();
      if (data?.totalCreators > 0) {
        const expectedCostPerCreator = data.totalActualSpend / data.totalCreators;
        expect(data.costPerCreator).toBeCloseTo(expectedCostPerCreator, 2);
      }
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const { data, error } = await getCampaignAnalytics(startDate, endDate);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // All campaigns should be within date range
      data?.campaigns.forEach((campaign) => {
        const campaignDate = new Date(campaign.created_at);
        expect(campaignDate >= startDate).toBe(true);
        expect(campaignDate <= endDate).toBe(true);
      });
    });
  });
});
```

### Integration Tests
Create: `__tests__/integration/troodie-campaigns-flow.test.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { createPlatformCampaign } from '@/services/platformCampaignService';
import { submitCampaignDeliverables } from '@/services/campaignApplicationService';
import { reviewDeliverable } from '@/services/deliverableReviewService';

describe('Troodie Campaigns Integration Flow', () => {
  let testCampaignId: string;
  let testApplicationId: string;

  beforeAll(async () => {
    // Setup: Create test data
    // Note: This requires a test database or mocked Supabase client
  });

  afterAll(async () => {
    // Cleanup: Delete test data
  });

  it('should complete full campaign lifecycle', async () => {
    // 1. Admin creates campaign
    const { data: campaign, error: createError } = await createPlatformCampaign({
      managementType: 'direct',
      title: 'Integration Test Campaign',
      description: 'Test',
      requirements: 'Test requirements',
      contentGuidelines: 'Test guidelines',
      budgetSource: 'marketing',
      approvedBudgetCents: 100000,
      targetCreators: 5,
      targetContentPieces: 5,
      targetReach: 10000,
      durationDays: 30,
      maxApplications: 10,
      proposedRateCents: 2500,
    });

    expect(createError).toBeNull();
    expect(campaign).toBeDefined();
    testCampaignId = campaign!.id;

    // 2. Creator applies to campaign
    // (Would use campaign application service)

    // 3. Admin accepts creator
    // (Would use campaign management service)

    // 4. Creator submits deliverables
    const { data: deliverable, error: deliverableError } = await submitCampaignDeliverables(
      testApplicationId,
      {
        type: 'social_post',
        platform: 'instagram',
        proof: {
          url: 'https://instagram.com/p/test',
          screenshot_url: 'https://example.com/screenshot.jpg',
        },
        submitted_at: new Date().toISOString(),
      }
    );

    expect(deliverableError).toBeNull();

    // 5. Admin approves deliverable
    const { data: review, error: reviewError } = await reviewDeliverable(
      testApplicationId,
      'approved',
      null
    );

    expect(reviewError).toBeNull();

    // 6. Verify budget tracking updated
    // (Would query platform_managed_campaigns table)
  });
});
```

### E2E Tests (Maestro)
Create: `e2e/flows/admin/create-troodie-campaign.yaml`

```yaml
appId: com.troodie.troodie.com
---
# Test: Admin can create a Troodie-direct campaign
- launchApp
- tapOn: "More"
- tapOn: "Admin Panel"
- tapOn: "Create Platform Campaign"

# Step 1: Select campaign type
- assertVisible: "Select Campaign Type"
- tapOn: "Direct (Troodie-branded)"
- tapOn: "Next"

# Step 2: Enter campaign details
- assertVisible: "Campaign Details"
- tapOn: "Campaign Title"
- inputText: "E2E Test Campaign"
- tapOn: "Description"
- inputText: "This is a test campaign created by E2E tests"
- tapOn: "Requirements"
- inputText: "Test requirements"
- tapOn: "Next"

# Step 3: Set budget
- assertVisible: "Budget & Tracking"
- tapOn: "Budget Source"
- tapOn: "Marketing"
- tapOn: "Approved Budget"
- inputText: "5000"
- tapOn: "Target Creators"
- inputText: "10"
- tapOn: "Next"

# Step 4: Preview and submit
- assertVisible: "Preview"
- assertVisible: "E2E Test Campaign"
- tapOn: "Create Campaign"

# Verify success
- assertVisible: "Success!"
- assertVisible: "Platform campaign created successfully"
- tapOn: "View Campaign"
- assertVisible: "E2E Test Campaign"
- assertVisible: "Troodie Official Campaign"
```

Create: `e2e/flows/creator/browse-troodie-campaigns.yaml`

```yaml
appId: com.troodie.troodie.com
---
# Test: Creator can browse and filter Troodie campaigns
- launchApp
- tapOn: "Campaigns"

# Verify Troodie badge appears on platform campaigns
- assertVisible: "Troodie Official"

# Open filters
- tapOn: "Filter"
- assertVisible: "Filter Campaigns"
- assertVisible: "Campaign Source"

# Filter to Troodie Official only
- tapOn: "Troodie Official"
- tapOn: "Apply Filters"

# Verify only Troodie campaigns shown
- assertVisible: "Troodie Official"

# Open campaign detail
- tapOn:
    point: "50%,30%"
- assertVisible: "Campaign Details"
- assertVisible: "Troodie Official Campaign"
- assertVisible: "Guaranteed Payment"
- assertVisible: "Fast Approval"
- assertVisible: "Platform Managed"

# Verify apply button works
- tapOn: "Apply Now"
- assertVisible: "Application"
```

### Manual QA Checklist

Create: `docs/QA_CHECKLIST_TROODIE_CAMPAIGNS.md`

```markdown
# Troodie-Managed Campaigns QA Checklist

## Pre-Deployment Checks

### Database (TMC-001)
- [ ] Migration runs successfully on fresh database
- [ ] All new columns exist with correct data types
- [ ] Indexes created for performance
- [ ] RLS policies restrict access appropriately
- [ ] Triggers fire when applications are accepted/completed
- [ ] Migration can be rolled back cleanly
- [ ] Sample data inserted (Troodie restaurant)

### System Account (TMC-002)
- [ ] Troodie user account created
- [ ] Troodie restaurant marked as is_platform_managed=true
- [ ] Business profile links user to restaurant
- [ ] Verification screen shows all green checks
- [ ] Admin permissions work correctly

### Admin Campaign Creation (TMC-003)
- [ ] Campaign creation wizard loads
- [ ] All 3 campaign types can be created (Direct, Partnership, Challenge)
- [ ] Form validation prevents invalid submissions
- [ ] Budget tracking record created in platform_managed_campaigns
- [ ] Created campaigns appear in creator marketplace
- [ ] Preview shows how campaign appears to creators
- [ ] Error handling works (network errors, validation errors)

### Creator Campaign UI (TMC-004)
- [ ] Troodie-direct campaigns show "Troodie Official" badge
- [ ] Partnership campaigns appear as regular restaurant campaigns (no badge)
- [ ] Community challenges show "Challenge" badge
- [ ] Guaranteed payment indicator shows for platform campaigns
- [ ] Campaign filters work (All, Troodie Official, Challenges, Restaurants)
- [ ] Detail screen shows trust indicators for Troodie campaigns
- [ ] Apply flow works identically across all campaign types

### Budget Analytics (TMC-005)
- [ ] Analytics dashboard loads with correct metrics
- [ ] Budget overview shows approved, spent, remaining
- [ ] Utilization percentage calculated correctly
- [ ] Cost per creator accurate
- [ ] Budget source breakdown correct
- [ ] Campaign performance list shows all campaigns
- [ ] Date range filtering works
- [ ] Export report generates valid CSV
- [ ] Real-time updates when new applications accepted

### Deliverables (TMC-006)
- [ ] Creator can submit deliverables for Troodie campaigns
- [ ] URL and screenshot upload work
- [ ] Engagement metrics can be entered
- [ ] Admin review dashboard shows pending deliverables
- [ ] Auto-approve timer displays correctly
- [ ] Approve/reject actions work
- [ ] Rejection reason captured
- [ ] Creator notified of approval/rejection
- [ ] Auto-approval cron job works after 72 hours

## Functional Testing

### Happy Paths
- [ ] Admin creates Direct campaign → Creator applies → Admin accepts → Creator submits deliverables → Admin approves → Budget tracking updates
- [ ] Admin creates Partnership campaign → Appears as restaurant campaign → Creator applies → Restaurant reviews (not Troodie) → Payment processed
- [ ] Admin creates Challenge → Multiple creators apply → Creators submit → Voting/judging works → Winners selected

### Edge Cases
- [ ] Campaign with 0 budget allowed?
- [ ] Campaign with very high budget ($100K+) works?
- [ ] Campaign with 1 creator target works?
- [ ] Campaign with 1000 max applications works?
- [ ] Very long campaign titles/descriptions display correctly
- [ ] Special characters in campaign text work
- [ ] Invalid URLs in deliverable submission rejected
- [ ] Missing screenshot in deliverable submission blocked
- [ ] Deliverable auto-approval exactly at 72 hours

### Error Scenarios
- [ ] Network failure during campaign creation handled gracefully
- [ ] Database timeout during budget calculation handled
- [ ] Image upload failure during deliverable submission handled
- [ ] Admin tries to approve already-approved deliverable (idempotent)
- [ ] Creator tries to submit deliverables twice (prevented)

## Performance Testing
- [ ] Campaign browse screen loads in <2s with 100+ campaigns
- [ ] Analytics dashboard loads in <3s with 50+ campaigns
- [ ] Campaign creation completes in <5s
- [ ] Deliverable submission completes in <10s (including image upload)
- [ ] Auto-approve cron job processes 100+ deliverables in <1 minute

## Security Testing
- [ ] Non-admin users cannot access admin campaign creation
- [ ] Non-admin users cannot view platform_managed_campaigns data
- [ ] Creators cannot see internal notes/budget details
- [ ] RLS policies prevent unauthorized data access
- [ ] XSS attempts in campaign titles/descriptions sanitized
- [ ] SQL injection attempts in filters blocked

## Accessibility Testing
- [ ] All buttons have proper touch targets (44x44px minimum)
- [ ] Text is readable at default font size
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader labels present for important actions
- [ ] Keyboard navigation works (if applicable)

## Browser/Device Testing (if web view exists)
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] Desktop Firefox

## Integration Testing
- [ ] Campaign notifications sent correctly
- [ ] Push notifications work for deliverable approvals
- [ ] Email notifications (if applicable)
- [ ] Sentry error tracking works
- [ ] Analytics events fire correctly

## Data Integrity
- [ ] Budget totals match sum of individual campaigns
- [ ] actual_spend_cents equals sum of accepted application payments
- [ ] Creator counts match number of unique accepted applicants
- [ ] Content piece counts match number of completed applications

## Rollback Plan
- [ ] Database migration can be rolled back
- [ ] Feature flag to disable Troodie campaigns if needed
- [ ] Clear communication plan if rollback required
- [ ] Data export before deployment in case rollback needed
```

### Deployment Checklist

Create: `docs/DEPLOYMENT_CHECKLIST_TROODIE_CAMPAIGNS.md`

```markdown
# Troodie-Managed Campaigns Deployment Checklist

## Pre-Deployment

### Code Review
- [ ] All code reviewed by at least 2 engineers
- [ ] All tests passing in CI/CD
- [ ] No console.log or debug code left in
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with no warnings
- [ ] Code coverage >80% for new code

### Database Preparation
- [ ] Migration tested on staging database
- [ ] Migration rollback tested
- [ ] Database backup created
- [ ] RLS policies tested and verified secure
- [ ] Indexes verified to improve query performance

### Environment Configuration
- [ ] Environment variables configured (if any new ones)
- [ ] Supabase project has sufficient resources
- [ ] CDN configured for new images (badges, logos)
- [ ] Feature flags configured (if using gradual rollout)

### Documentation
- [ ] README updated with new features
- [ ] API documentation updated
- [ ] Admin user guide created
- [ ] Creator FAQ updated with Troodie campaigns info
- [ ] Internal runbook created for troubleshooting

## Deployment Steps

### Step 1: Database Migration (Non-Breaking)
- [ ] Run TMC-001 migration on production database
- [ ] Verify migration success
- [ ] Run TMC-002 seed script to create system account
- [ ] Verify system account created correctly

### Step 2: Backend Deployment
- [ ] Deploy backend services (if any)
- [ ] Verify auto-approval cron job configured
- [ ] Verify notification services updated

### Step 3: Mobile App Deployment
- [ ] Build and submit iOS app to TestFlight
- [ ] Build and submit Android app to internal testing
- [ ] Test admin flows on staging build
- [ ] Test creator flows on staging build
- [ ] Submit to App Store/Play Store for review
- [ ] Phased rollout: 10% → 25% → 50% → 100%

### Step 4: Verification
- [ ] Admin can create Troodie campaigns
- [ ] Creators can see and apply to campaigns
- [ ] Budget tracking works in real-time
- [ ] Deliverables submission works
- [ ] Auto-approval system running
- [ ] Analytics dashboard shows correct data

## Post-Deployment

### Monitoring (First 24 Hours)
- [ ] Watch error rates in Sentry
- [ ] Monitor database query performance
- [ ] Check API latency metrics
- [ ] Review user feedback/support tickets
- [ ] Monitor campaign creation rate
- [ ] Monitor creator application rate

### Success Metrics (First Week)
- [ ] Target: 5+ Troodie campaigns created
- [ ] Target: 50+ creator applications to Troodie campaigns
- [ ] Target: 10+ deliverables submitted
- [ ] Target: 90%+ deliverable approval rate
- [ ] Target: <2s average page load time
- [ ] Target: <1% error rate

### Communication
- [ ] Announce feature to creators via in-app notification
- [ ] Email announcement to verified creators
- [ ] Social media announcement (if applicable)
- [ ] Internal team announcement
- [ ] Update FAQ and help center

## Rollback Procedure (If Needed)

- [ ] Disable feature flag (if using)
- [ ] Revert mobile app to previous version
- [ ] Roll back database migration (if safe)
- [ ] Communicate rollback to users
- [ ] Document issues for post-mortem
```

## Definition of Done
- [ ] All unit tests written and passing
- [ ] Integration tests cover full campaign lifecycle
- [ ] Maestro E2E tests created and passing
- [ ] Manual QA checklist completed with 0 critical issues
- [ ] Performance benchmarks met (load times, query speeds)
- [ ] Security review completed
- [ ] Database migration tested on staging
- [ ] System account verified on staging
- [ ] All 6 previous tasks (TMC-001 through TMC-006) complete
- [ ] Documentation complete (QA checklist, deployment checklist)
- [ ] Feature deployed to staging and validated
- [ ] Ready for production deployment

## Notes
- **Test Coverage Goal**: >80% for new code
- **E2E Test Framework**: Maestro (already set up in project)
- **Staging Environment**: Test on staging before production
- **Phased Rollout**: Deploy to 10% of users first, monitor, then scale up
- **Monitoring**: Use Sentry for error tracking, Supabase for database metrics
- **Feature Flag**: Consider using feature flag for gradual rollout
- **Communication Plan**: Announce to creators when live
- **Reference**: All previous TMC tasks (TMC-001 through TMC-006)
- **Related Tasks**: All TMC tasks depend on this for production readiness
- **Future Enhancement**: Automated regression testing, load testing with K6, chaos engineering tests
