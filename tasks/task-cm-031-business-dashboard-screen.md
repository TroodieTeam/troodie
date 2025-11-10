# Business Dashboard Screen

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 1.5 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: CM-001, CM-021

## Overview
Create the main Business Dashboard screen that serves as the command center for restaurant owners to monitor their creator campaigns, view key metrics, and access all business tools. This is the primary landing screen after a business owner logs in or navigates from the More tab.

## MVP Simplification Summary
**Decision Date:** September 2025  
**Scope:** Focus on essential metrics and quick actions for MVP

### MVP Approach:
- Display only critical metrics (active campaigns, pending applications, this month's spend)
- Simple card-based layout for easy scanning
- Quick actions for common tasks
- Defer advanced analytics and historical data to post-MVP

## Business Value
- Central hub for restaurant owners to manage creator partnerships
- Quick overview of campaign performance and spending
- Reduces time to key actions (create campaign, review applications)
- Builds confidence in the platform's value proposition

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Business Dashboard
  As a restaurant owner
  I want a dashboard showing my campaign activity
  So that I can manage my creator marketing effectively

  Scenario: Viewing dashboard with active campaigns
    Given I am a verified restaurant owner
    When I navigate to the Business Dashboard
    Then I see my restaurant name and verified badge
    And I see cards for active campaigns count, pending applications, and monthly spend
    And I see a list of my active campaigns with key metrics
    And I see quick action buttons for common tasks

  Scenario: Empty state for new business
    Given I am a new restaurant owner with no campaigns
    When I view the dashboard
    Then I see a welcome message
    And I see benefits of creator campaigns
    And I see a prominent "Create First Campaign" button

  Scenario: Quick actions
    Given I am viewing the dashboard
    When I tap a quick action button
    Then I am navigated to the appropriate screen
    And the navigation is smooth and fast
```

## Technical Implementation

### Dashboard Screen Component
```typescript
interface DashboardData {
  restaurant: {
    id: string;
    name: string;
    imageUrl: string;
    isVerified: boolean;
    claimedAt: Date;
  };
  metrics: {
    activeCampaigns: number;
    pendingApplications: number;
    monthlySpend: number;
    totalCreatorsWorked: number;
  };
  campaigns: CampaignSummary[];
  recentApplications: ApplicationSummary[];
}

const BusinessDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await businessService.getDashboardData(user.id);
      setDashboardData(data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!dashboardData?.campaigns.length) {
    return <EmptyDashboard onCreateCampaign={() => navigation.navigate('CreateCampaign')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: dashboardData.restaurant.imageUrl }} style={styles.restaurantImage} />
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.restaurantName}>{dashboardData.restaurant.name}</Text>
              {dashboardData.restaurant.isVerified && (
                <CheckCircle size={20} color="#10B981" />
              )}
            </View>
            <Text style={styles.subtitle}>Business Dashboard</Text>
          </View>
        </View>

        {/* Metrics Cards */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Active Campaigns"
            value={dashboardData.metrics.activeCampaigns}
            icon={Target}
            color="#6366F1"
            onPress={() => navigation.navigate('ManageCampaigns', { filter: 'active' })}
          />
          <MetricCard
            title="Pending Applications"
            value={dashboardData.metrics.pendingApplications}
            icon={Users}
            color="#F59E0B"
            onPress={() => navigation.navigate('Applications')}
            showBadge={dashboardData.metrics.pendingApplications > 0}
          />
          <MetricCard
            title="This Month"
            value={`$${dashboardData.metrics.monthlySpend}`}
            icon={DollarSign}
            color="#10B981"
            onPress={() => navigation.navigate('Analytics')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <ActionButton
              icon={Plus}
              label="New Campaign"
              onPress={() => navigation.navigate('CreateCampaign')}
              primary
            />
            <ActionButton
              icon={Search}
              label="Find Creators"
              onPress={() => navigation.navigate('BrowseCreators')}
            />
            <ActionButton
              icon={BarChart}
              label="View Analytics"
              onPress={() => navigation.navigate('Analytics')}
            />
          </View>
        </View>

        {/* Active Campaigns */}
        <View style={styles.campaignsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Campaigns</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManageCampaigns')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.campaigns.slice(0, 3).map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: campaign.id })}
            />
          ))}
        </View>

        {/* Recent Applications */}
        {dashboardData.recentApplications.length > 0 && (
          <View style={styles.applicationsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Applications</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Applications')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {dashboardData.recentApplications.slice(0, 5).map(application => (
              <ApplicationRow
                key={application.id}
                application={application}
                onPress={() => navigation.navigate('ApplicationDetail', { 
                  applicationId: application.id 
                })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
```

### Empty State Component
```typescript
const EmptyDashboard: React.FC<{ onCreateCampaign: () => void }> = ({ onCreateCampaign }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.emptyContent}>
        <Image source={require('../assets/empty-campaigns.png')} style={styles.emptyImage} />
        
        <Text style={styles.emptyTitle}>Welcome to Creator Campaigns!</Text>
        <Text style={styles.emptyDescription}>
          Partner with local food creators to promote your restaurant and drive more customers
        </Text>

        <View style={styles.benefits}>
          <BenefitItem icon="📸" text="Get authentic content from real customers" />
          <BenefitItem icon="🎯" text="Reach targeted local audiences" />
          <BenefitItem icon="📊" text="Track campaign performance and ROI" />
          <BenefitItem icon="💰" text="Control your marketing budget" />
        </View>

        <TouchableOpacity style={styles.createButton} onPress={onCreateCampaign}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Create Your First Campaign</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.learnMoreButton}>
          <Text style={styles.learnMoreText}>Learn How It Works</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

### Campaign Card Component
```typescript
const CampaignCard: React.FC<{ campaign: CampaignSummary; onPress: () => void }> = ({ 
  campaign, 
  onPress 
}) => {
  const getDaysRemaining = () => {
    const end = new Date(campaign.endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <TouchableOpacity style={styles.campaignCard} onPress={onPress}>
      <View style={styles.campaignHeader}>
        <Text style={styles.campaignName}>{campaign.name}</Text>
        <StatusBadge status={campaign.status} />
      </View>

      <View style={styles.campaignMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{campaign.selectedCreators}/{campaign.maxCreators}</Text>
          <Text style={styles.metricLabel}>Creators</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>${campaign.spentAmount}</Text>
          <Text style={styles.metricLabel}>Spent</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{getDaysRemaining()}</Text>
          <Text style={styles.metricLabel}>Days Left</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(campaign.spentAmount / campaign.budget) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.budgetText}>
        ${campaign.spentAmount} of ${campaign.budget} budget used
      </Text>
    </TouchableOpacity>
  );
};
```

## Definition of Done
- [ ] Dashboard loads with restaurant info and metrics
- [ ] Metric cards show correct counts and amounts
- [ ] Quick action buttons navigate to correct screens
- [ ] Active campaigns list shows up to 3 campaigns
- [ ] Campaign cards show progress and key metrics
- [ ] Recent applications show with creator info
- [ ] Empty state displays for new businesses
- [ ] Pull to refresh updates all data
- [ ] Loading states handled gracefully
- [ ] Error states show helpful messages
- [ ] Responsive design works on all devices
- [ ] Navigation to all linked screens works

## Notes
- Entry point from More tab "Business Dashboard" option
- Also accessible after claiming a restaurant
- Consider real-time updates for application counts
- Cache dashboard data for offline viewing
- Add skeleton loading for better perceived performance
- Related: CM-003 More Tab Navigation, CM-021 Restaurant Claiming