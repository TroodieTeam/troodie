# PRD-013: Campaign Creation & Management

## Problem Statement
Restaurants need a self-service system to create, manage, and track creator marketing campaigns with targeting, budget control, and performance monitoring.

## Priority
**Critical** - MVP Pre-launch (By 9/16)

## Current State
- No campaign functionality exists
- No creator-restaurant connection
- No budget management
- No performance tracking
- Manual coordination required

## Assumptions
1. Restaurants want control over campaigns
2. Automated matching improves efficiency
3. Budget tracking is critical
4. Simple campaigns initially, complex later
5. Payment handled externally initially

## Questions for Founder
1. Minimum/maximum campaign budgets?
2. How many creators per campaign?
3. Campaign duration limits?
4. Approval workflow requirements?
5. Cancellation and refund policies?
6. Platform fee structure?

## Proposed Solution
1. Step-by-step campaign creation wizard
2. Creator discovery and invitation system
3. Application review interface
4. Budget tracking dashboard
5. Basic performance metrics
6. Communication tools

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Restaurant Campaign Management
  As a restaurant owner
  I want to create targeted campaigns
  So that I reach the right audience

  Background:
    Given I am a verified restaurant owner
    And I have claimed my restaurant

  Scenario: Creating a campaign
    Given I click "Create Campaign"
    When I go through the creation wizard
    Then I complete these steps:
      | Step | Fields |
      | 1. Basics | Name, Description, Goals |
      | 2. Budget | Total Budget, Per Creator Budget |
      | 3. Timeline | Start Date, End Date, Deadline |
      | 4. Requirements | Creator Type, Followers Min, Location |
      | 5. Deliverables | Content Type, Quantity, Guidelines |
      | 6. Review | Preview, Terms, Publish |
    And the campaign is saved as draft after each step
    And I can go back to edit any step

  Scenario: Campaign budget management
    Given I set a campaign budget of $1000
    When I configure creator limits
    Then I can set:
      - Maximum creators: 10
      - Budget per creator: $100
      - Payment terms: "Upon completion"
    And the system prevents over-allocation
    And shows remaining budget in real-time

  Scenario: Creator requirements
    Given I am setting creator requirements
    When I configure targeting
    Then I can specify:
      | Requirement | Options |
      | Location | Radius from restaurant |
      | Followers | Minimum count |
      | Engagement | Minimum rate |
      | Specialties | Cuisine types |
      | Rating | Minimum stars |
    And estimated reach is calculated
    And matching creators count shown

  Scenario: Publishing campaign
    Given I have completed all steps
    When I publish the campaign
    Then:
      - Campaign goes live immediately
      - Matching creators are notified
      - Campaign appears in marketplace
      - I receive confirmation email
      - Analytics tracking begins

  Scenario: Receiving applications
    Given creators have applied
    When I review applications
    Then I see:
      | Information | Action |
      | Creator profile | View full profile |
      | Portfolio samples | Browse work |
      | Proposed content | Read pitch |
      | Requested payment | See amount |
      | Availability | Check calendar |
    And I can:
      - Accept application
      - Reject with reason
      - Request more info
      - Save for later

  Scenario: Managing active campaign
    Given campaign is active
    When I view campaign dashboard
    Then I see:
      - Applications received/pending/approved
      - Budget spent/remaining
      - Content submitted/approved
      - Timeline progress
      - Quick actions menu
    And I can:
      - Pause campaign
      - Extend deadline
      - Message creators
      - Approve content

  Scenario: Campaign completion
    Given campaign deadline reached
    When all deliverables are submitted
    Then:
      - Campaign status changes to "Review"
      - I can approve/reject each submission
      - Payments are triggered upon approval
      - Final report is generated
      - Creators can be rated

  Scenario: Campaign templates
    Given I've run successful campaigns
    When I create a new campaign
    Then I can:
      - Use previous campaign as template
      - Save current settings as template
      - Use platform suggested templates
      - Modify template before publishing
```

## Technical Implementation

### Data Model
```typescript
interface Campaign {
  id: string;
  restaurant_id: string;

  // Basic Info
  name: string;
  description: string;
  goals: string[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

  // Budget
  budget: {
    total: number;
    allocated: number;
    spent: number;
    per_creator_max: number;
    currency: string;
  };

  // Timeline
  timeline: {
    start_date: Date;
    end_date: Date;
    application_deadline: Date;
    content_deadline: Date;
  };

  // Requirements
  creator_requirements: {
    location_radius_km?: number;
    min_followers?: number;
    min_engagement_rate?: number;
    specialties?: string[];
    min_rating?: number;
  };

  // Deliverables
  deliverables: {
    content_types: ('photo' | 'video' | 'reel' | 'story' | 'post')[];
    quantity_per_creator: number;
    guidelines: string;
    hashtags?: string[];
    mentions?: string[];
  };

  // Management
  max_creators: number;
  selected_creators: string[];
  applications: Application[];

  // Tracking
  metrics: CampaignMetrics;
  created_at: Date;
  updated_at: Date;
}

interface Application {
  id: string;
  campaign_id: string;
  creator_id: string;

  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';

  proposal: {
    content_ideas: string;
    timeline: string;
    requested_payment: number;
    portfolio_samples: string[];
  };

  submitted_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  rejection_reason?: string;
}
```

### UI Components

1. **Campaign Wizard**
   - Progress indicator
   - Step validation
   - Save draft functionality
   - Preview before publish

2. **Campaign Dashboard**
   - KPI cards
   - Application inbox
   - Timeline view
   - Budget tracker

3. **Application Review**
   - Swipe cards interface
   - Quick approve/reject
   - Bulk actions
   - Communication panel

4. **Creator Marketplace View**
   - Campaign cards
   - Quick apply
   - Saved campaigns
   - Filter by fit

## Success Metrics
- Campaign creation completion rate >70%
- Average applications per campaign >10
- Creator acceptance rate 20-30%
- Campaign completion rate >80%
- Restaurant satisfaction >4.0

## Testing Requirements
1. Wizard flow completion
2. Budget calculation accuracy
3. Creator matching algorithm
4. Notification delivery
5. Payment flow integration
6. Performance under load

## Dependencies
- Creator profile system
- Payment processing
- Notification service
- Analytics engine
- Email service
- Search infrastructure

## Edge Cases
- Budget exceeded scenarios
- No matching creators
- Campaign cancellation
- Disputed deliverables
- Creator withdrawals
- Technical failures

## MVP Limitations
- Basic campaign types only
- Manual payment processing
- Limited automation
- No A/B testing
- Simple approval flow
- Basic analytics

## Future Enhancements
- Campaign templates library
- Automated creator matching
- Performance optimization AI
- Multi-campaign management
- Advanced analytics
- Escrow payments
- Campaign insurance

## Risk Mitigation
- Clear terms of service
- Dispute resolution process
- Budget protection
- Quality guidelines
- Fraud detection
- Backup payment methods

## Notes
- Start simple, iterate based on feedback
- Focus on restaurant success
- Build trust through transparency
- Consider seasonal campaigns
- Enable quick wins for demos

---
*PRD Version: 1.0*
*Created: 2025-01-13*
*Target Completion: 9/16 (Pre-launch)*