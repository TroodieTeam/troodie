# Creator Analytics Screen

- Epic: Creator Marketplace (cm)
- Priority: Medium
- Estimate: 3 days
- Status: 🔄 Review
- Assignee: -
- Dependencies: task-cm-004-creator-dashboard.md

## Overview
Build the Creator Analytics screen that provides detailed insights into creator performance, audience engagement, and content effectiveness. This screen helps creators understand their impact and optimize their content strategy.

## Business Value
Analytics empower creators to make data-driven decisions about their content and campaign participation. By understanding what resonates with their audience, creators can increase their engagement rates and earnings potential, leading to higher creator satisfaction and retention.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Analytics Dashboard
  As a creator
  I want to see detailed analytics about my performance
  So that I can optimize my content and increase my earnings

  Scenario: View performance overview
    Given I am a creator with activity history
    When I navigate to Creator Analytics
    Then I see key metrics (views, saves, engagement rate, reach)
    And I see trend indicators (up/down from last period)
    And I can select time period (7 days, 30 days, 90 days, all time)

  Scenario: Analyze content performance
    Given I have saved restaurants and created boards
    When I view the "Content" tab
    Then I see performance metrics for each saved restaurant
    And I see which boards get the most engagement
    And I can sort by various metrics (views, saves, clicks)

  Scenario: Understand audience demographics
    Given users have engaged with my content
    When I view the "Audience" tab
    Then I see audience demographics (age, location, interests)
    And I see peak engagement times
    And I see follower growth over time

  Scenario: Track campaign performance
    Given I have completed campaigns
    When I view the "Campaigns" tab
    Then I see performance metrics for each campaign
    And I see ROI calculations (earnings vs effort)
    And I can compare campaign effectiveness

  Scenario: Export analytics data
    Given I want to analyze data externally
    When I tap "Export Data"
    Then I can download analytics as CSV
    And the export includes selected date range
```

## Technical Implementation

### UI Components (following v1_component_reference.html)
- Time period selector (segmented control)
- Metric cards with trend indicators
- Charts using react-native-chart-kit or similar
- Tab navigation for different analytics views
- Use consistent colors from v1_component_reference.html:
  - Primary green: #10B981
  - Secondary gray: #737373
  - Background: #F5F5F5

### Screen Structure
```
CreatorAnalytics/
├── index.tsx                      # Main analytics screen
├── components/
│   ├── PeriodSelector.tsx       # Time range selector
│   ├── MetricCard.tsx           # KPI display with trends
│   ├── PerformanceChart.tsx    # Line/bar charts
│   ├── ContentTable.tsx        # Sortable content metrics
│   ├── AudienceInsights.tsx    # Demographics display
│   └── ExportButton.tsx         # Data export functionality
├── tabs/
│   ├── OverviewTab.tsx         # Main metrics dashboard
│   ├── ContentTab.tsx          # Content performance
│   ├── AudienceTab.tsx         # Audience insights
│   └── CampaignsTab.tsx        # Campaign analytics
└── hooks/
    ├── useAnalytics.ts          # Analytics data fetching
    └── useChartData.ts          # Chart data formatting
```

### Data Model
```typescript
interface AnalyticsMetrics {
  period: '7d' | '30d' | '90d' | 'all';
  views: number;
  unique_viewers: number;
  saves: number;
  clicks: number;
  engagement_rate: number;
  reach: number;
  impressions: number;
  trend_vs_previous: {
    views: number; // percentage change
    saves: number;
    engagement: number;
  };
}

interface ContentAnalytics {
  item_id: string;
  item_type: 'restaurant' | 'board' | 'post';
  item_name: string;
  views: number;
  saves: number;
  shares: number;
  click_through_rate: number;
  avg_view_duration: number;
}

interface AudienceInsights {
  total_followers: number;
  follower_growth: { date: string; count: number }[];
  demographics: {
    age_ranges: Record<string, number>;
    locations: { city: string; percentage: number }[];
    interests: { category: string; percentage: number }[];
  };
  peak_times: { hour: number; engagement: number }[];
}

interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  engagement: number;
  conversions: number;
  earnings: number;
  roi_score: number; // calculated metric
  completion_date: Date;
}
```

### Key Metrics
1. **Engagement Rate**: (saves + clicks) / views × 100
2. **Reach**: Unique users who saw content
3. **Save Rate**: saves / views × 100
4. **Growth Rate**: (current - previous) / previous × 100
5. **ROI Score**: earnings / estimated_effort_hours
6. **Virality Score**: shares / views × 100

### Charts and Visualizations
- Line chart for trends over time
- Bar chart for content comparison
- Pie chart for audience demographics
- Heat map for peak engagement times
- Sparklines for quick metric trends

### Services
- Create `analyticsService` for data aggregation
- Implement caching for expensive queries
- Add real-time updates for current day metrics
- Build export functionality with CSV generation

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Follows v1_component_reference.html styling guidelines
- [ ] Charts render correctly and are interactive
- [ ] Time period selection updates all metrics
- [ ] Sorting and filtering work on content table
- [ ] Export generates valid CSV files
- [ ] Tab navigation works smoothly
- [ ] Loading states for all data fetching
- [ ] Error handling for failed data loads
- [ ] Metrics calculate correctly and update
- [ ] Mobile responsive layout maintained
- [ ] Performance optimized (lazy loading, pagination)

## Notes
- Reference docs/v1_component_reference.html for consistent styling
- Use number formatting: 1.2K, 3.4M for large numbers
- Implement data caching to reduce API calls
- Consider adding comparison mode in v2
- Add tooltips to explain metric calculations
- Ensure charts are accessible (alt text, labels)
- Consider adding predictive analytics in future versions