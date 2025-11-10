# Creator Dashboard Screen

- Epic: Creator Marketplace (cm)
- Priority: High
- Estimate: 2 days
- Status: 🔄 Review
- Assignee: -
- Dependencies: task-cm-003-more-tab-navigation.md

## Overview
Build the main Creator Dashboard screen that provides creators with an overview of their performance metrics, recent activity, and quick actions. This is the landing screen for creators when they access Creator Tools from the More tab.

## Business Value
The Creator Dashboard serves as the central hub for creators to monitor their performance, understand their impact, and quickly access key features. This drives creator engagement and retention by providing clear visibility into their success metrics and earning potential.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Dashboard
  As a creator
  I want to see an overview of my performance and activity
  So that I can understand my impact and earnings

  Scenario: View dashboard with metrics
    Given I am a verified creator
    When I navigate to Creator Dashboard from the More tab
    Then I see my key performance metrics (views, saves, engagement rate)
    And I see my current month earnings
    And I see my active campaigns count
    And I see recent activity feed

  Scenario: Quick actions navigation
    Given I am viewing the Creator Dashboard
    When I tap on a quick action card (campaigns, earnings, analytics)
    Then I am navigated to the respective screen

  Scenario: Empty state for new creators
    Given I am a new creator with no activity
    When I view the Creator Dashboard
    Then I see an encouraging empty state with tips to get started
    And I see links to browse available campaigns
```

## Technical Implementation

### UI Components (following v1_component_reference.html)
- Use standard layout container with SafeAreaView
- Implement metric cards using the card component pattern from v1_component_reference.html
- Use consistent typography: 32px for main numbers, 14px for labels
- Color scheme: #10B981 for positive metrics, #737373 for neutral text
- Grid layout for metric cards (2 columns on mobile)
- ScrollView for vertical scrolling

### Data Requirements
- Fetch creator profile data from `creator_profiles` table
- Aggregate campaign data from `campaigns` table
- Calculate earnings from `creator_earnings` table  
- Get engagement metrics from `creator_analytics` view

### Screen Structure
```
CreatorDashboard/
├── index.tsx                 # Main dashboard component
├── components/
│   ├── MetricCard.tsx       # Reusable metric display card
│   ├── ActivityFeed.tsx    # Recent activity list
│   ├── QuickActions.tsx    # Navigation cards
│   └── EmptyState.tsx      # New creator empty state
└── hooks/
    └── useCreatorMetrics.ts # Data fetching hook
```

### Key Metrics to Display
1. Total Views (this month)
2. Total Saves (this month)
3. Engagement Rate %
4. Current Month Earnings
5. Active Campaigns Count
6. Pending Payouts

### Services/Hooks
- Create `creatorAnalyticsService` for fetching metrics
- Create `useCreatorMetrics` hook for real-time updates
- Integrate with existing `campaignService` for campaign counts
- Use `earningsService` for financial data

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Follows v1_component_reference.html styling guidelines
- [ ] Responsive layout works on all screen sizes
- [ ] Loading states implemented for all data fetching
- [ ] Error states handle API failures gracefully
- [ ] Pull-to-refresh functionality works
- [ ] Metrics update in real-time or with proper caching
- [ ] Navigation to sub-screens works correctly
- [ ] Empty state provides helpful onboarding

## Notes
- Reference docs/v1_component_reference.html for all component styling
- Use consistent spacing: 16px padding, 12px between elements
- Ensure metrics are clearly labeled and easy to understand
- Consider adding sparkline charts for trend visualization in v2
- Cache dashboard data for offline viewing