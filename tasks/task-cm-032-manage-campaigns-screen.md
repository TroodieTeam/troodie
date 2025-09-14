# Manage Campaigns Screen

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 1 day
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: CM-001, CM-011, CM-031

## Overview
Create the Manage Campaigns screen where restaurant owners can view, filter, and manage all their campaigns in different states (draft, active, completed). This screen provides campaign oversight and quick access to campaign details and applications.

## MVP Simplification Summary
**Decision Date:** September 2025  
**Scope:** Basic campaign list with essential management features

### MVP Features:
- Simple list view of all campaigns
- Basic filtering by status (all, draft, active, completed)
- Quick status indicators and key metrics per campaign
- Tap to view/edit campaign details
- Defer bulk actions and advanced filtering to post-MVP

## Business Value
- Central location to manage all marketing campaigns
- Quick overview of campaign performance
- Easy access to edit drafts and review applications
- Helps restaurants optimize their creator partnerships

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Manage Campaigns Screen
  As a restaurant owner
  I want to see and manage all my campaigns
  So that I can track performance and make adjustments

  Scenario: Viewing campaigns list
    Given I have multiple campaigns in various states
    When I navigate to Manage Campaigns
    Then I see a list of all my campaigns
    And each campaign shows status, budget, creators, and timeline
    And I can filter by campaign status

  Scenario: Filtering campaigns
    Given I am on the Manage Campaigns screen
    When I select a filter (Active, Draft, Completed)
    Then I only see campaigns matching that status
    And the filter selection is clearly indicated

  Scenario: Campaign actions
    Given I am viewing my campaigns
    When I tap on a campaign
    Then I navigate to the campaign detail screen
    And I can edit draft campaigns or view active/completed ones
```

## Technical Implementation

### Manage Campaigns Screen
```typescript
interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  budget: number;
  spentAmount: number;
  startDate: Date;
  endDate: Date;
  selectedCreators: number;
  maxCreators: number;
  pendingApplications: number;
  deliveredContent: number;
  totalDeliverables: number;
}

const ManageCampaignsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(route.params?.filter || 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters = [
    { id: 'all', label: 'All', count: campaigns.length },
    { id: 'active', label: 'Active', count: campaigns.filter(c => c.status === 'active').length },
    { id: 'draft', label: 'Drafts', count: campaigns.filter(c => c.status === 'draft').length },
    { id: 'completed', label: 'Completed', count: campaigns.filter(c => c.status === 'completed').length }
  ];

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [selectedFilter, campaigns]);

  const loadCampaigns = async () => {
    try {
      const data = await campaignService.getUserCampaigns();
      setCampaigns(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCampaigns = () => {
    if (selectedFilter === 'all') {
      setFilteredCampaigns(campaigns);
    } else {
      setFilteredCampaigns(campaigns.filter(c => c.status === selectedFilter));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Campaigns</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateCampaign')}>
          <Plus size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        style={styles.filterContainer}
        showsHorizontalScrollIndicator={false}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              selectedFilter === filter.id && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Text style={[
              styles.filterLabel,
              selectedFilter === filter.id && styles.filterLabelActive
            ]}>
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <View style={[
                styles.filterBadge,
                selectedFilter === filter.id && styles.filterBadgeActive
              ]}>
                <Text style={[
                  styles.filterCount,
                  selectedFilter === filter.id && styles.filterCountActive
                ]}>
                  {filter.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Campaigns List */}
      {loading ? (
        <LoadingScreen />
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState filter={selectedFilter} onCreate={() => navigation.navigate('CreateCampaign')} />
      ) : (
        <FlatList
          data={filteredCampaigns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CampaignListItem
              campaign={item}
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};
```

### Campaign List Item Component
```typescript
const CampaignListItem: React.FC<{ campaign: Campaign; onPress: () => void }> = ({ 
  campaign, 
  onPress 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'draft': return '#6B7280';
      case 'completed': return '#3B82F6';
      case 'paused': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getDaysText = () => {
    if (campaign.status === 'draft') return 'Not started';
    if (campaign.status === 'completed') return 'Ended';
    
    const now = new Date();
    const end = new Date(campaign.endDate);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days} days left`;
    return 'Ending today';
  };

  return (
    <TouchableOpacity style={styles.campaignItem} onPress={onPress}>
      <View style={styles.campaignHeader}>
        <View style={styles.campaignTitleRow}>
          <Text style={styles.campaignName}>{campaign.name}</Text>
          {campaign.pendingApplications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{campaign.pendingApplications}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) }]}>
          <Text style={styles.statusText}>{campaign.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.campaignStats}>
        <View style={styles.statItem}>
          <Users size={16} color="#6B7280" />
          <Text style={styles.statText}>
            {campaign.selectedCreators}/{campaign.maxCreators} creators
          </Text>
        </View>
        <View style={styles.statItem}>
          <DollarSign size={16} color="#6B7280" />
          <Text style={styles.statText}>
            ${campaign.spentAmount}/${campaign.budget}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={16} color="#6B7280" />
          <Text style={styles.statText}>{getDaysText()}</Text>
        </View>
      </View>

      {campaign.status === 'active' && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(campaign.deliveredContent / campaign.totalDeliverables) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {campaign.deliveredContent}/{campaign.totalDeliverables} deliverables completed
          </Text>
        </View>
      )}

      {campaign.status === 'draft' && (
        <View style={styles.draftActions}>
          <Text style={styles.draftText}>Tap to continue editing</Text>
          <ChevronRight size={20} color="#007AFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};
```

### Empty State Component
```typescript
const EmptyState: React.FC<{ filter: string; onCreate: () => void }> = ({ filter, onCreate }) => {
  const getEmptyMessage = () => {
    switch (filter) {
      case 'active':
        return {
          title: 'No active campaigns',
          message: 'Create a campaign to start working with creators'
        };
      case 'draft':
        return {
          title: 'No draft campaigns',
          message: 'All your campaigns are published'
        };
      case 'completed':
        return {
          title: 'No completed campaigns yet',
          message: 'Your active campaigns will appear here when they end'
        };
      default:
        return {
          title: 'No campaigns yet',
          message: 'Create your first campaign to get started'
        };
    }
  };

  const { title, message } = getEmptyMessage();

  return (
    <View style={styles.emptyContainer}>
      <Image source={require('../assets/empty-campaigns.png')} style={styles.emptyImage} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {filter !== 'completed' && (
        <TouchableOpacity style={styles.createButton} onPress={onCreate}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Create Campaign</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

## Definition of Done
- [ ] Screen displays all user's campaigns
- [ ] Filter tabs work correctly (All, Active, Draft, Completed)
- [ ] Filter counts update accurately
- [ ] Campaign items show all key information
- [ ] Status badges use correct colors
- [ ] Progress bars display for active campaigns
- [ ] Pending application badges show when applicable
- [ ] Tap on campaign navigates to detail screen
- [ ] Pull to refresh updates the list
- [ ] Empty states show for each filter
- [ ] Create campaign button navigates correctly
- [ ] Loading and error states handled

## Notes
- Accessible from Business Dashboard and More tab
- Consider adding search functionality in future
- May want to add sorting options (newest, ending soon, budget)
- Cache campaign list for offline viewing
- Real-time updates for application counts would be valuable
- Related: CM-031 Business Dashboard, CM-011 Campaign Creation