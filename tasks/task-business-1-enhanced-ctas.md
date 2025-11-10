# Implement Enhanced Psychological CTAs for Business Admin

- Epic: Restaurant Admin
- Priority: Medium
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Implement enhanced psychological CTAs from the redesign doc to increase business owner engagement with the admin portal.

## Business Value
Better CTAs drive business owner activation. Active business owners = more campaigns = more creator engagement = network effects. Psychological triggers increase conversion.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Enhanced business admin CTAs
  As a business owner
  I want clear, compelling actions to take
  So that I know how to get value from the platform

  Scenario: Dashboard entry point
    Given I just claimed my restaurant
    When I view the business dashboard
    Then I see a prominent CTA "Get your first customers this week"
    And secondary CTA "See what influencers are saying"

  Scenario: Campaign creation
    Given I'm on the campaigns tab
    And I have no active campaigns
    When I view the screen
    Then I see "Bring in 50+ diners this month - Create your first campaign"
    And the button says "Start Attracting Foodies"

  Scenario: Social proof
    Given other restaurants in my area have campaigns
    When I view campaign creation
    Then I see "[Restaurant Name] got 100 new customers last month"
    And "Join 500+ restaurants growing with Troodie"
```

## Technical Implementation

### CTA Copy Framework
Use psychological triggers:
- **Social proof**: "Join 500+ restaurants"
- **Specificity**: "Get 50+ customers" not "Get more customers"
- **Urgency**: "This week" / "This month"
- **Outcome-focused**: "Attract Foodies" not "Create Campaign"
- **Loss aversion**: "Don't miss out on weekend crowd"

### Dashboard CTAs
```typescript
const dashboardCTAs = {
  new_business: {
    primary: "Get your first customers this week",
    secondary: "See what influencers are saying about you",
    action: () => router.push('/business/campaigns/create'),
  },
  no_campaigns: {
    primary: "Bring in 50+ diners this month",
    secondary: "See how it works",
    action: () => router.push('/business/campaigns/create'),
  },
  active_campaign: {
    primary: "Your campaign is live! Track results",
    secondary: "Share on social media",
    action: () => router.push('/business/campaigns/active'),
  },
};
```

### Social Proof Components
- Fetch aggregate stats:
  - Total restaurants using platform
  - Average new customers per campaign
  - Success stories from similar restaurants
- Display testimonials from other business owners
- Show "trending" campaigns in area

### Button Design
- Use action-oriented copy
- Add subtle animations (pulse, glow)
- Use contrasting colors (green for success)
- Show benefits in button hover states
- Add icons (arrow, sparkle, star)

### A/B Testing Framework
- Test different CTA variations
- Track click-through rates
- Measure conversion to campaign creation
- Optimize based on data

## Definition of Done
- [ ] New CTA copy implemented across dashboard
- [ ] Social proof components added
- [ ] Button designs enhanced
- [ ] Analytics tracking for each CTA
- [ ] A/B testing framework set up
- [ ] Conversion rates improved by 20%+
- [ ] Copy reviewed and approved
- [ ] Works on all screen sizes

## Notes
From feedback: "I like the Enhanced Psychological CTAs from the redesign doc"

Reference the redesign doc for specific copy suggestions. This is about conversion optimization through better messaging.
