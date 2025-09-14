import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreatorHeader } from '@/components/creator/CreatorHeader';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  Share2,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Calendar,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type TimePeriod = '7d' | '30d' | '90d' | 'all';
type TabType = 'overview' | 'content' | 'audience' | 'campaigns';

interface AnalyticsMetrics {
  views: number;
  uniqueViewers: number;
  saves: number;
  clicks: number;
  shares: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  trends: {
    views: number;
    saves: number;
    engagement: number;
  };
}

interface ContentAnalytics {
  id: string;
  name: string;
  type: 'restaurant' | 'board' | 'post';
  views: number;
  saves: number;
  shares: number;
  clickThroughRate: number;
  engagementRate: number;
}

interface AudienceInsights {
  totalFollowers: number;
  followerGrowth: number;
  demographics: {
    ageRanges: { label: string; value: number }[];
    locations: { city: string; percentage: number }[];
    interests: { category: string; percentage: number }[];
  };
  peakTimes: { hour: number; day: string; engagement: number }[];
}

interface CampaignAnalytics {
  id: string;
  name: string;
  impressions: number;
  engagement: number;
  conversions: number;
  earnings: number;
  roiScore: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function CreatorAnalytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [contentData, setContentData] = useState<ContentAnalytics[]>([]);
  const [audienceData, setAudienceData] = useState<AudienceInsights | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [user?.id, timePeriod]);

  const loadAnalyticsData = async () => {
    if (!user?.id) return;
    
    try {
      // Load overview metrics (mock data for now)
      const mockMetrics: AnalyticsMetrics = {
        views: 15234,
        uniqueViewers: 8921,
        saves: 1823,
        clicks: 3421,
        shares: 234,
        engagementRate: 18.5,
        reach: 12500,
        impressions: 25000,
        trends: {
          views: 12.5,
          saves: 8.3,
          engagement: 15.2,
        },
      };
      setMetrics(mockMetrics);

      // Load content analytics
      const mockContent: ContentAnalytics[] = [
        {
          id: '1',
          name: 'Barcelona Wine Bar',
          type: 'restaurant',
          views: 3421,
          saves: 234,
          shares: 45,
          clickThroughRate: 3.2,
          engagementRate: 8.5,
        },
        {
          id: '2',
          name: 'Date Night Spots',
          type: 'board',
          views: 2156,
          saves: 189,
          shares: 32,
          clickThroughRate: 4.1,
          engagementRate: 10.2,
        },
        {
          id: '3',
          name: 'The Crunkleton',
          type: 'restaurant',
          views: 1893,
          saves: 156,
          shares: 28,
          clickThroughRate: 2.8,
          engagementRate: 9.3,
        },
      ];
      setContentData(mockContent);

      // Load audience insights
      const mockAudience: AudienceInsights = {
        totalFollowers: 1234,
        followerGrowth: 8.5,
        demographics: {
          ageRanges: [
            { label: '18-24', value: 15 },
            { label: '25-34', value: 35 },
            { label: '35-44', value: 30 },
            { label: '45-54', value: 15 },
            { label: '55+', value: 5 },
          ],
          locations: [
            { city: 'Charlotte', percentage: 65 },
            { city: 'Raleigh', percentage: 15 },
            { city: 'Asheville', percentage: 10 },
            { city: 'Other', percentage: 10 },
          ],
          interests: [
            { category: 'Fine Dining', percentage: 45 },
            { category: 'Casual Dining', percentage: 30 },
            { category: 'Cocktail Bars', percentage: 15 },
            { category: 'Coffee Shops', percentage: 10 },
          ],
        },
        peakTimes: [
          { hour: 12, day: 'Saturday', engagement: 95 },
          { hour: 19, day: 'Friday', engagement: 92 },
          { hour: 20, day: 'Saturday', engagement: 88 },
          { hour: 13, day: 'Sunday', engagement: 85 },
        ],
      };
      setAudienceData(mockAudience);

      // Load campaign analytics
      const mockCampaigns: CampaignAnalytics[] = [
        {
          id: '1',
          name: 'Barcelona Wine Bar Feature',
          impressions: 5234,
          engagement: 823,
          conversions: 45,
          earnings: 100,
          roiScore: 8.5,
        },
        {
          id: '2',
          name: 'Summer Restaurant Tour',
          impressions: 3421,
          engagement: 567,
          conversions: 32,
          earnings: 75,
          roiScore: 7.2,
        },
      ];
      setCampaignData(mockCampaigns);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const exportAnalytics = () => {
    console.log('Export analytics as CSV');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUp size={16} color="#10B981" />;
    } else if (trend < 0) {
      return <TrendingDown size={16} color="#EF4444" />;
    }
    return null;
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Eye size={20} color="#737373" />
            <Text style={styles.metricLabel}>Views</Text>
          </View>
          <Text style={styles.metricValue}>{formatNumber(metrics?.views || 0)}</Text>
          <View style={styles.metricTrend}>
            {renderTrendIcon(metrics?.trends.views || 0)}
            <Text style={[styles.metricTrendText, { 
              color: metrics?.trends.views && metrics.trends.views > 0 ? '#10B981' : '#EF4444' 
            }]}>
              {Math.abs(metrics?.trends.views || 0)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Heart size={20} color="#737373" />
            <Text style={styles.metricLabel}>Saves</Text>
          </View>
          <Text style={styles.metricValue}>{formatNumber(metrics?.saves || 0)}</Text>
          <View style={styles.metricTrend}>
            {renderTrendIcon(metrics?.trends.saves || 0)}
            <Text style={[styles.metricTrendText, { 
              color: metrics?.trends.saves && metrics.trends.saves > 0 ? '#10B981' : '#EF4444' 
            }]}>
              {Math.abs(metrics?.trends.saves || 0)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Activity size={20} color="#737373" />
            <Text style={styles.metricLabel}>Engagement</Text>
          </View>
          <Text style={styles.metricValue}>{metrics?.engagementRate || 0}%</Text>
          <View style={styles.metricTrend}>
            {renderTrendIcon(metrics?.trends.engagement || 0)}
            <Text style={[styles.metricTrendText, { 
              color: metrics?.trends.engagement && metrics.trends.engagement > 0 ? '#10B981' : '#EF4444' 
            }]}>
              {Math.abs(metrics?.trends.engagement || 0)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Users size={20} color="#737373" />
            <Text style={styles.metricLabel}>Reach</Text>
          </View>
          <Text style={styles.metricValue}>{formatNumber(metrics?.reach || 0)}</Text>
          <Text style={styles.metricSubtext}>Unique users</Text>
        </View>
      </View>

      {/* Performance Chart Placeholder */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Performance Trend</Text>
        <View style={styles.chartPlaceholder}>
          <BarChart3 size={48} color="#E5E5E5" />
          <Text style={styles.chartPlaceholderText}>Chart visualization coming soon</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Impressions</Text>
          <Text style={styles.statValue}>{formatNumber(metrics?.impressions || 0)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Clicks</Text>
          <Text style={styles.statValue}>{formatNumber(metrics?.clicks || 0)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Shares</Text>
          <Text style={styles.statValue}>{formatNumber(metrics?.shares || 0)}</Text>
        </View>
      </View>
    </View>
  );

  const renderContentTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Top Performing Content</Text>
      {contentData.map((content) => (
        <View key={content.id} style={styles.contentItem}>
          <View style={styles.contentInfo}>
            <Text style={styles.contentName}>{content.name}</Text>
            <Text style={styles.contentType}>
              {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
            </Text>
          </View>
          <View style={styles.contentMetrics}>
            <View style={styles.contentMetric}>
              <Text style={styles.contentMetricValue}>{formatNumber(content.views)}</Text>
              <Text style={styles.contentMetricLabel}>Views</Text>
            </View>
            <View style={styles.contentMetric}>
              <Text style={styles.contentMetricValue}>{formatNumber(content.saves)}</Text>
              <Text style={styles.contentMetricLabel}>Saves</Text>
            </View>
            <View style={styles.contentMetric}>
              <Text style={styles.contentMetricValue}>{content.engagementRate}%</Text>
              <Text style={styles.contentMetricLabel}>Engagement</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderAudienceTab = () => (
    <View style={styles.tabContent}>
      {/* Follower Summary */}
      <View style={styles.followerCard}>
        <View style={styles.followerMain}>
          <Text style={styles.followerCount}>{formatNumber(audienceData?.totalFollowers || 0)}</Text>
          <Text style={styles.followerLabel}>Total Followers</Text>
        </View>
        <View style={styles.followerGrowth}>
          <TrendingUp size={20} color="#10B981" />
          <Text style={styles.followerGrowthText}>+{audienceData?.followerGrowth || 0}%</Text>
          <Text style={styles.followerGrowthLabel}>This month</Text>
        </View>
      </View>

      {/* Demographics */}
      <View style={styles.demographicsSection}>
        <Text style={styles.sectionTitle}>Audience Demographics</Text>
        
        {/* Age Distribution */}
        <View style={styles.demographicCard}>
          <Text style={styles.demographicTitle}>Age Distribution</Text>
          {audienceData?.demographics.ageRanges.map((range) => (
            <View key={range.label} style={styles.demographicItem}>
              <Text style={styles.demographicLabel}>{range.label}</Text>
              <View style={styles.demographicBar}>
                <View style={[styles.demographicBarFill, { width: `${range.value}%` }]} />
              </View>
              <Text style={styles.demographicValue}>{range.value}%</Text>
            </View>
          ))}
        </View>

        {/* Top Locations */}
        <View style={styles.demographicCard}>
          <Text style={styles.demographicTitle}>Top Locations</Text>
          {audienceData?.demographics.locations.map((location) => (
            <View key={location.city} style={styles.locationItem}>
              <Text style={styles.locationCity}>{location.city}</Text>
              <Text style={styles.locationPercentage}>{location.percentage}%</Text>
            </View>
          ))}
        </View>

        {/* Peak Engagement Times */}
        <View style={styles.demographicCard}>
          <Text style={styles.demographicTitle}>Peak Engagement Times</Text>
          {audienceData?.peakTimes.slice(0, 3).map((time, index) => (
            <View key={index} style={styles.peakTimeItem}>
              <View style={styles.peakTimeInfo}>
                <Text style={styles.peakTimeDay}>{time.day}</Text>
                <Text style={styles.peakTimeHour}>
                  {time.hour > 12 ? `${time.hour - 12}:00 PM` : `${time.hour}:00 AM`}
                </Text>
              </View>
              <View style={styles.peakTimeEngagement}>
                <Activity size={16} color="#10B981" />
                <Text style={styles.peakTimeValue}>{time.engagement}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderCampaignsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Campaign Performance</Text>
      {campaignData.map((campaign) => (
        <View key={campaign.id} style={styles.campaignCard}>
          <Text style={styles.campaignName}>{campaign.name}</Text>
          <View style={styles.campaignMetrics}>
            <View style={styles.campaignMetric}>
              <Text style={styles.campaignMetricValue}>{formatNumber(campaign.impressions)}</Text>
              <Text style={styles.campaignMetricLabel}>Impressions</Text>
            </View>
            <View style={styles.campaignMetric}>
              <Text style={styles.campaignMetricValue}>{formatNumber(campaign.engagement)}</Text>
              <Text style={styles.campaignMetricLabel}>Engagements</Text>
            </View>
            <View style={styles.campaignMetric}>
              <Text style={styles.campaignMetricValue}>${campaign.earnings}</Text>
              <Text style={styles.campaignMetricLabel}>Earned</Text>
            </View>
            <View style={styles.campaignMetric}>
              <Text style={styles.campaignMetricValue}>{campaign.roiScore}</Text>
              <Text style={styles.campaignMetricLabel}>ROI Score</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CreatorHeader 
        title="Creator Analytics" 
        rightElement={
          <TouchableOpacity style={styles.exportButton} onPress={exportAnalytics}>
            <Download size={20} color="#737373" />
          </TouchableOpacity>
        }
      />

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['7d', '30d', '90d', 'all'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, timePeriod === period && styles.periodButtonActive]}
              onPress={() => setTimePeriod(period)}
            >
              <Text style={[styles.periodButtonText, timePeriod === period && styles.periodButtonTextActive]}>
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['overview', 'content', 'audience', 'campaigns'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'audience' && renderAudienceTab()}
        {activeTab === 'campaigns' && renderCampaignsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    padding: 8,
  },
  periodSelector: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  periodButtonActive: {
    backgroundColor: '#10B981',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  tabs: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  tabActive: {
    backgroundColor: '#000000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#737373',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricTrendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#737373',
  },
  chartSection: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  contentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  contentInfo: {
    marginBottom: 12,
  },
  contentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  contentType: {
    fontSize: 12,
    color: '#737373',
  },
  contentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contentMetric: {
    alignItems: 'center',
  },
  contentMetricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contentMetricLabel: {
    fontSize: 11,
    color: '#737373',
  },
  followerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  followerMain: {
    flex: 1,
  },
  followerCount: {
    fontSize: 32,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  followerLabel: {
    fontSize: 14,
    color: '#737373',
  },
  followerGrowth: {
    alignItems: 'center',
  },
  followerGrowthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
  followerGrowthLabel: {
    fontSize: 12,
    color: '#737373',
  },
  demographicsSection: {
    gap: 16,
  },
  demographicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  demographicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  demographicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  demographicLabel: {
    fontSize: 14,
    color: '#737373',
    width: 60,
  },
  demographicBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  demographicBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  demographicValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    width: 40,
    textAlign: 'right',
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  locationCity: {
    fontSize: 14,
    color: '#000000',
  },
  locationPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  peakTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  peakTimeInfo: {
    flex: 1,
  },
  peakTimeDay: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  peakTimeHour: {
    fontSize: 12,
    color: '#737373',
  },
  peakTimeEngagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  peakTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  campaignMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  campaignMetric: {
    alignItems: 'center',
  },
  campaignMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  campaignMetricLabel: {
    fontSize: 11,
    color: '#737373',
  },
});