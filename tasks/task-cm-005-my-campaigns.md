# My Campaigns Screen

- Epic: Creator Marketplace (cm)
- Priority: High
- Estimate: 3 days
- Status: 🔄 Review
- Assignee: -
- Dependencies: task-cm-004-creator-dashboard.md

## Overview
Build the My Campaigns screen where creators can view, manage, and apply to restaurant marketing campaigns. This screen shows active campaigns, pending applications, completed campaigns, and available opportunities.

## Business Value
The My Campaigns screen is critical for creator monetization, allowing them to discover earning opportunities, track campaign progress, and manage their workload. This directly impacts creator revenue and platform engagement.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: My Campaigns Management
  As a creator
  I want to manage my restaurant campaigns
  So that I can track my work and maximize earnings

  Scenario: View active campaigns
    Given I have active campaigns
    When I navigate to My Campaigns screen
    Then I see a list of my active campaigns with status badges
    And each campaign shows restaurant name, deadline, and payout amount
    And I can tap a campaign to see full details

  Scenario: Browse available campaigns
    Given there are open campaigns I haven't applied to
    When I view the "Available" tab
    Then I see campaigns I'm eligible for
    And I can filter by location, payout, and category
    And I can apply directly from the list

  Scenario: Track campaign applications
    Given I have pending campaign applications
    When I view the "Pending" tab
    Then I see my applications with status (under review, accepted, rejected)
    And I see the submission date for each

  Scenario: Complete campaign deliverables
    Given I have an active campaign with requirements
    When I tap on the campaign
    Then I see a checklist of deliverables
    And I can mark items as complete
    And I can upload proof of completion (screenshots, links)
```

## Technical Implementation

### UI Components (following v1_component_reference.html)
- Tab navigation for campaign states (Active, Available, Pending, Completed)
- Use card components from v1_component_reference.html for campaign items
- Status badges with appropriate colors:
  - Active: #10B981 (green)
  - Pending: #F59E0B (amber)
  - Completed: #737373 (gray)
- Filter chips for Available campaigns
- Pull-to-refresh on all lists

### Screen Structure
```
MyCampaigns/
├── index.tsx                    # Main campaigns screen with tabs
├── components/
│   ├── CampaignCard.tsx        # Individual campaign display
│   ├── CampaignFilters.tsx    # Filter UI for available campaigns
│   ├── ApplicationModal.tsx    # Quick apply modal
│   ├── DeliverablesList.tsx   # Campaign requirements checklist
│   └── StatusBadge.tsx         # Reusable status indicator
├── screens/
│   ├── ActiveCampaigns.tsx    # Active campaigns list
│   ├── AvailableCampaigns.tsx # Browse new opportunities
│   ├── PendingApplications.tsx # Track applications
│   └── CompletedCampaigns.tsx # History and earnings
└── hooks/
    └── useCampaigns.ts         # Campaign data management
```

### Data Model
```typescript
interface Campaign {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image: string;
  title: string;
  description: string;
  requirements: string[];
  payout_amount: number;
  deadline: Date;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  category: string[];
  location: string;
}

interface CreatorCampaign {
  campaign_id: string;
  creator_id: string;
  status: 'applied' | 'accepted' | 'active' | 'completed' | 'rejected';
  applied_at: Date;
  accepted_at?: Date;
  completed_at?: Date;
  deliverables_status: Record<string, boolean>;
  proof_urls: string[];
  earnings: number;
}
```

### Services
- Extend `campaignService` with creator-specific methods
- Add filtering and sorting capabilities
- Implement application submission flow
- Add deliverable tracking functionality

### Key Features
1. **Campaign Discovery**: Browse and filter available opportunities
2. **Application Management**: Track application status
3. **Deliverable Tracking**: Checklist with progress indicators
4. **Proof Upload**: Submit screenshots and links
5. **Earnings Preview**: Show potential and actual earnings
6. **Smart Sorting**: Prioritize by deadline, payout, or match score

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Follows v1_component_reference.html styling guidelines
- [ ] Tab navigation works smoothly
- [ ] Filter functionality operates correctly
- [ ] Campaign cards display all required information
- [ ] Application flow completes successfully
- [ ] Deliverable tracking updates in real-time
- [ ] Pull-to-refresh works on all tabs
- [ ] Empty states for each tab implemented
- [ ] Loading and error states handled
- [ ] Campaign details modal/screen implemented

## Notes
- Reference docs/v1_component_reference.html for component styling
- Use consistent card layouts across all tabs
- Implement optimistic UI updates for better UX
- Consider adding push notifications for campaign updates
- Cache campaign data for offline viewing
- Add analytics tracking for campaign interactions