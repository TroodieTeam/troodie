import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { router } from 'expo-router';
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  ChevronRight,
  Zap,
  Target,
  Award,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface DashboardMetrics {
  totalViews: number;
  totalSaves: number;
  engagementRate: number;
  currentMonthEarnings: number;
  activeCampaigns: number;
  pendingPayouts: number;
  viewsTrend: number;
  savesTrend: number;
}

interface RecentActivity {
  id: string;
  type: 'campaign_accepted' | 'earning_received' | 'payout_completed' | 'new_follower';
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
}

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      // Mock metrics for now since the function doesn't exist yet
      const mockMetrics = {
        totalViews: 15234,
        totalSaves: 1823,
        engagementRate: 18.5,
        currentMonthEarnings: 275,
        activeCampaigns: 2,
        pendingPayouts: 125,
        viewsTrend: 12.5,
        savesTrend: 8.3,
      };
      
      // Check if user is a new creator (no activity)
      const { data: profileData } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        // Existing creator - show mock metrics
        setMetrics(mockMetrics);
      } else {
        // New creator - show zeros
        setMetrics({
          totalViews: 0,
          totalSaves: 0,
          engagementRate: 0,
          currentMonthEarnings: 0,
          activeCampaigns: 0,
          pendingPayouts: 0,
          viewsTrend: 0,
          savesTrend: 0,
        });
      }
      
      // Load recent activity
      loadRecentActivity();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    // Mock recent activity for now
    setRecentActivity([
      {
        id: '1',
        type: 'campaign_accepted',
        title: 'Campaign Accepted',
        description: 'Barcelona Wine Bar campaign',
        timestamp: new Date(),
        amount: 75,
      },
      {
        id: '2',
        type: 'earning_received',
        title: 'Payment Received',
        description: 'Completed campaign payout',
        timestamp: new Date(Date.now() - 86400000),
        amount: 100,
      },
      {
        id: '3',
        type: 'new_follower',
        title: 'New Follower',
        description: '5 new followers this week',
        timestamp: new Date(Date.now() - 172800000),
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'campaign_accepted':
        return <Target size={20} color="#10B981" />;
      case 'earning_received':
        return <DollarSign size={20} color="#10B981" />;
      case 'payout_completed':
        return <Zap size={20} color="#3B82F6" />;
      case 'new_follower':
        return <Users size={20} color="#F59E0B" />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  const isNewCreator = !metrics || (metrics.totalViews === 0 && metrics.activeCampaigns === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CreatorHeader title="Creator Dashboard" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Creator Dashboard</Text>
          <Text style={styles.subtitle}>Track your performance and earnings</Text>
        </View>

        {isNewCreator ? (
          // Empty state for new creators
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Award size={48} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Welcome to Creator Tools!</Text>
            <Text style={styles.emptyDescription}>
              Start earning by applying to restaurant campaigns.
              Your performance metrics will appear here as you create content.
            </Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/creator/campaigns')}
            >
              <Text style={styles.primaryButtonText}>Browse Campaigns</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Key Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <TrendingUp size={20} color="#737373" />
                  <Text style={styles.metricLabel}>Total Views</Text>
                </View>
                <Text style={styles.metricValue}>{formatNumber(metrics?.totalViews || 0)}</Text>
                {metrics?.viewsTrend && metrics.viewsTrend > 0 && (
                  <Text style={styles.metricTrend}>+{metrics.viewsTrend}% this month</Text>
                )}
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <BarChart3 size={20} color="#737373" />
                  <Text style={styles.metricLabel}>Total Saves</Text>
                </View>
                <Text style={styles.metricValue}>{formatNumber(metrics?.totalSaves || 0)}</Text>
                {metrics?.savesTrend && metrics.savesTrend > 0 && (
                  <Text style={styles.metricTrend}>+{metrics.savesTrend}% this month</Text>
                )}
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Zap size={20} color="#737373" />
                  <Text style={styles.metricLabel}>Engagement Rate</Text>
                </View>
                <Text style={styles.metricValue}>{metrics?.engagementRate || 0}%</Text>
                <Text style={styles.metricSubtext}>Saves + clicks / views</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <DollarSign size={20} color="#737373" />
                  <Text style={styles.metricLabel}>This Month</Text>
                </View>
                <Text style={styles.metricValue}>{formatCurrency(metrics?.currentMonthEarnings || 0)}</Text>
                <Text style={styles.metricSubtext}>Earnings</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/creator/campaigns')}
                >
                  <View style={styles.actionIcon}>
                    <Target size={24} color="#10B981" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>My Campaigns</Text>
                    <Text style={styles.actionDescription}>
                      {metrics?.activeCampaigns || 0} active campaigns
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#737373" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/creator/earnings')}
                >
                  <View style={styles.actionIcon}>
                    <DollarSign size={24} color="#10B981" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Earnings</Text>
                    <Text style={styles.actionDescription}>
                      {formatCurrency(metrics?.pendingPayouts || 0)} available
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#737373" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/creator/analytics')}
                >
                  <View style={styles.actionIcon}>
                    <BarChart3 size={24} color="#10B981" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Analytics</Text>
                    <Text style={styles.actionDescription}>View detailed insights</Text>
                  </View>
                  <ChevronRight size={20} color="#737373" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityList}>
                {recentActivity.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      {getActivityIcon(activity.type)}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                      <Text style={styles.activityTime}>
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    {activity.amount && (
                      <Text style={styles.activityAmount}>
                        +{formatCurrency(activity.amount)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#737373',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
    gap: 12,
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
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#737373',
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  quickActions: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#737373',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#737373',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});