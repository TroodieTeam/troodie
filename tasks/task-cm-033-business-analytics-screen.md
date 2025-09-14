# Business Analytics Screen

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 1.5 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: CM-001, CM-031

## Overview
Create the Business Analytics screen that provides restaurant owners with insights into their creator campaign performance, ROI metrics, and content effectiveness. MVP focuses on essential metrics with simple visualizations.

## MVP Simplification Summary
**Decision Date:** September 2025  
**Scope:** Essential analytics only for MVP

### MVP Features:
- Overview metrics (total spend, campaigns run, creators worked with)
- Simple performance cards (best performing campaign, top creator)
- Basic time period selection (This month, Last month, All time)
- Content gallery of creator posts

### Deferred to Post-MVP:
- Complex charts and graphs
- Detailed ROI calculations
- Export functionality
- Custom date ranges
- Comparative analytics

## Business Value
- Demonstrates value of creator campaigns
- Helps optimize future campaign decisions
- Shows which creators drive best results
- Justifies marketing spend with data

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Business Analytics
  As a restaurant owner
  I want to see analytics about my campaigns
  So that I can understand ROI and optimize future campaigns

  Scenario: Viewing analytics overview
    Given I have run creator campaigns
    When I navigate to Analytics
    Then I see overview metrics (spend, campaigns, creators, content pieces)
    And I see time period selector
    And I see performance highlights

  Scenario: Time period selection
    Given I am viewing analytics
    When I change the time period
    Then all metrics update to reflect the selected period
    And the change is instant without page reload

  Scenario: Content gallery
    Given creators have posted content for my campaigns
    When I scroll to the content section
    Then I see a gallery of creator posts
    And I can tap to view full content details

  Scenario: Empty state
    Given I have no campaigns in the selected period
    When I view analytics
    Then I see an informative empty state
    And I'm encouraged to create a campaign
```

## Technical Implementation

### Analytics Screen Component
```typescript
interface AnalyticsData {
  overview: {
    totalSpend: number;
    totalCampaigns: number;
    totalCreators: number;
    totalContent: number;
  };
  performance: {
    bestCampaign: {
      name: string;
      metric: string;
      value: string;
    };
    topCreator: {
      name: string;
      avatar: string;
      contentCount: number;
      engagement: string;
    };
    avgCostPerContent: number;
    avgEngagementRate: number;
  };
  recentContent: ContentItem[];
}

const BusinessAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState<'this_month' | 'last_month' | 'all_time'>('this_month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>();
  const [loading, setLoading] = useState(true);

  const periods = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'all_time', label: 'All Time' }
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getBusinessAnalytics(selectedPeriod);
      setAnalyticsData(data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!analyticsData || analyticsData.overview.totalCampaigns === 0) {
    return <EmptyAnalytics onCreateCampaign={() => navigation.navigate('CreateCampaign')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map(period => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.id as any)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period.id && styles.periodTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Metrics */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total Spend"
              value={`$${analyticsData.overview.totalSpend}`}
              icon={DollarSign}
              color="#10B981"
            />
            <MetricCard
              label="Campaigns"
              value={analyticsData.overview.totalCampaigns.toString()}
              icon={Target}
              color="#6366F1"
            />
            <MetricCard
              label="Creators"
              value={analyticsData.overview.totalCreators.toString()}
              icon={Users}
              color="#F59E0B"
            />
            <MetricCard
              label="Content Pieces"
              value={analyticsData.overview.totalContent.toString()}
              icon={Camera}
              color="#EC4899"
            />
          </View>
        </View>

        {/* Performance Highlights */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance Highlights</Text>
          
          {analyticsData.performance.bestCampaign && (
            <View style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <Trophy size={24} color="#F59E0B" />
              </View>
              <View style={styles.highlightContent}>
                <Text style={styles.highlightLabel}>Best Performing Campaign</Text>
                <Text style={styles.highlightTitle}>
                  {analyticsData.performance.bestCampaign.name}
                </Text>
                <Text style={styles.highlightMetric}>
                  {analyticsData.performance.bestCampaign.metric}: {analyticsData.performance.bestCampaign.value}
                </Text>
              </View>
            </View>
          )}

          {analyticsData.performance.topCreator && (
            <TouchableOpacity 
              style={styles.highlightCard}
              onPress={() => navigation.navigate('CreatorProfile', { 
                creatorId: analyticsData.performance.topCreator.id 
              })}
            >
              <Image 
                source={{ uri: analyticsData.performance.topCreator.avatar }} 
                style={styles.creatorAvatar}
              />
              <View style={styles.highlightContent}>
                <Text style={styles.highlightLabel}>Top Creator</Text>
                <Text style={styles.highlightTitle}>
                  {analyticsData.performance.topCreator.name}
                </Text>
                <Text style={styles.highlightMetric}>
                  {analyticsData.performance.topCreator.contentCount} posts • {analyticsData.performance.topCreator.engagement} engagement
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ${analyticsData.performance.avgCostPerContent}
              </Text>
              <Text style={styles.statLabel}>Avg. Cost per Content</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {analyticsData.performance.avgEngagementRate}%
              </Text>
              <Text style={styles.statLabel}>Avg. Engagement Rate</Text>
            </View>
          </View>
        </View>

        {/* Recent Content Gallery */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Creator Content</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllContent')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.contentGallery}
          >
            {analyticsData.recentContent.map(content => (
              <TouchableOpacity
                key={content.id}
                style={styles.contentItem}
                onPress={() => navigation.navigate('ContentDetail', { contentId: content.id })}
              >
                <Image source={{ uri: content.thumbnailUrl }} style={styles.contentImage} />
                <View style={styles.contentOverlay}>
                  <View style={styles.contentStats}>
                    <Eye size={12} color="#FFF" />
                    <Text style={styles.contentStatText}>{formatNumber(content.views)}</Text>
                  </View>
                </View>
                <Text style={styles.contentCreator}>{content.creatorName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
```

### Metric Card Component
```typescript
const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: any;
  color: string;
}> = ({ label, value, icon: Icon, color }) => {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
};
```

### Empty Analytics Component
```typescript
const EmptyAnalytics: React.FC<{ onCreateCampaign: () => void }> = ({ onCreateCampaign }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.emptyContent}>
        <BarChart size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Analytics Yet</Text>
        <Text style={styles.emptyDescription}>
          Start running creator campaigns to see performance metrics and insights here
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={onCreateCampaign}>
          <Text style={styles.createButtonText}>Create Your First Campaign</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

## Definition of Done
- [ ] Analytics screen loads with correct data
- [ ] Period selector changes data appropriately
- [ ] Overview metrics display correctly
- [ ] Best campaign highlight shows when available
- [ ] Top creator highlight shows with avatar
- [ ] Average metrics calculate correctly
- [ ] Content gallery scrolls horizontally
- [ ] Content items show view counts
- [ ] Tap on content navigates to detail
- [ ] Empty state shows for no data
- [ ] Loading states handled properly
- [ ] Back navigation works correctly

## Notes
- Entry point from Business Dashboard and More tab
- Keep metrics simple and actionable for MVP
- Focus on metrics that demonstrate clear value
- Content gallery helps restaurants see actual deliverables
- Consider adding push notifications for milestone achievements
- Future: Add charts, ROI calculator, comparison tools
- Related: CM-031 Business Dashboard, CM-032 Manage Campaigns