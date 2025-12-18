import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
    BarChart,
    Bell,
    CheckCircle,
    Plus,
    Search,
    Settings,
    Target,
    Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DashboardData {
  restaurant: {
    id: string;
    name: string;
    image_url: string;
    is_verified: boolean;
    claimed_at: string;
  };
  metrics: {
    active_campaigns: number;
    pending_applications: number;
    monthly_spend: number;
    total_creators_worked: number;
  };
  campaigns: CampaignSummary[];
  recent_applications: ApplicationSummary[];
}

interface CampaignSummary {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  budget: number;
  spent_amount: number;
  start_date: string;
  end_date: string;
  selected_creators: number;
  max_creators: number;
  pending_applications: number;
}

interface ApplicationSummary {
  id: string;
  campaign_id: string;
  campaign_name: string;
  creator_name: string;
  creator_avatar: string;
  applied_at: string;
}

export default function BusinessDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!user?.id) return;
      
      // Get restaurant data
      const { data: businessProfile, error: profileError } = await supabase
        .from('business_profiles')
        .select(`
          restaurant_id,
          restaurants (
            id,
            name,
            cover_photo_url
          )
        `)
        .eq('user_id', user.id)
        .single();
        
      if (profileError || !businessProfile?.restaurants) {
        setDashboardData(null);
        return;
      }

      // Get campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_applications (id, status)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      // Calculate metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
      
      // Get recent pending applications
      const { data: recentApps } = await supabase
        .from('campaign_applications')
        .select(`
          *,
          campaigns (name),
          creator_profiles (display_name, avatar_url)
        `)
        .eq('status', 'pending')
        .in('campaign_id', campaigns?.map(c => c.id) || [])
        .order('applied_at', { ascending: false })
        .limit(5);

      const pendingAppsCount = recentApps?.length || 0;

      // Calculate monthly spend
      const monthlySpend = campaigns
        ?.filter(c => new Date(c.created_at) >= startOfMonth)
        .reduce((sum, c) => sum + ((c.spent_amount_cents || 0) / 100), 0) || 0;

      // Get unique creators count (simplified)
      const { count: creatorsCount } = await supabase
        .from('campaign_applications')
        .select('creator_id', { count: 'exact', head: true })
        .in('campaign_id', campaigns?.map(c => c.id) || [])
        .eq('status', 'accepted');

      setDashboardData({
        restaurant: {
          id: businessProfile.restaurants.id,
          name: businessProfile.restaurants.name,
          image_url: businessProfile.restaurants.cover_photo_url || 'https://via.placeholder.com/150',
          is_verified: true,
          claimed_at: new Date().toISOString(),
        },
        metrics: {
          active_campaigns: activeCampaigns,
          pending_applications: pendingAppsCount,
          monthly_spend: monthlySpend,
          total_creators_worked: creatorsCount || 0,
        },
        campaigns: campaigns?.slice(0, 3).map(c => ({
          id: c.id,
          name: c.title || c.name,
          status: c.status,
          budget: c.budget_cents / 100,
          spent_amount: (c.spent_amount_cents || 0) / 100,
          start_date: c.start_date,
          end_date: c.end_date,
          selected_creators: c.selected_creators_count || 0,
          max_creators: c.max_creators,
          pending_applications: c.campaign_applications?.filter((a: any) => a.status === 'pending').length || 0,
        })) || [],
        recent_applications: recentApps?.map(a => ({
          id: a.id,
          campaign_id: a.campaign_id,
          campaign_name: a.campaigns.name,
          creator_name: a.creator_profiles.display_name,
          creator_avatar: a.creator_profiles.avatar_url,
          applied_at: a.applied_at,
        })) || [],
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboardData) {
    return <EmptyDashboard onCreateCampaign={() => router.push('/business/campaigns/create')} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: DS.colors.surface,
        paddingTop: DS.spacing.md,
        paddingBottom: DS.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        {/* Navigation Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: DS.spacing.lg,
          marginBottom: DS.spacing.lg,
        }}>
          <View>
            <Text style={{ ...DS.typography.h2, color: DS.colors.textDark }}>
              Dashboard
            </Text>
            <Text style={{ ...DS.typography.body, color: DS.colors.textGray }}>
              Overview
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: DS.spacing.md }}>
            <TouchableOpacity 
              onPress={() => router.push('/business/notifications')}
              style={{
                width: 40,
                height: 40,
                borderRadius: DS.borderRadius.full,
                backgroundColor: DS.colors.surfaceLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} color={DS.colors.textDark} />
              {dashboardData.metrics.pending_applications > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: DS.colors.error,
                  borderWidth: 1.5,
                  borderColor: DS.colors.surface,
                }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/business/settings')}
              style={{
                width: 40,
                height: 40,
                borderRadius: DS.borderRadius.full,
                backgroundColor: DS.colors.surfaceLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={20} color={DS.colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Restaurant Info Card */}
        <View style={{ paddingHorizontal: DS.spacing.lg }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: DS.colors.surfaceLight,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.lg,
          }}>
            <Image
              source={{ uri: dashboardData.restaurant.image_url }}
              style={{
                width: 48,
                height: 48,
                borderRadius: DS.borderRadius.md,
                marginRight: DS.spacing.md,
                backgroundColor: DS.colors.border,
              }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>
                  {dashboardData.restaurant.name}
                </Text>
                {dashboardData.restaurant.is_verified && (
                  <CheckCircle size={16} color={DS.colors.success} fill={DS.colors.surface} />
                )}
              </View>
              <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray }}>
                Member since {new Date(dashboardData.restaurant.claimed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={DS.colors.primaryOrange} />
        }
        contentContainerStyle={{ paddingBottom: DS.spacing.xxxl }}
      >
        {/* Key Metrics */}
        <View style={{ padding: DS.spacing.lg }}>
          <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.md }}>
            Performance
          </Text>
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: DS.spacing.md,
          }}>
            <MetricCard
              value={dashboardData.metrics.active_campaigns}
              label="Active Campaigns"
              color="#6366F1"
              onPress={() => router.push('/business/campaigns?filter=active')}
              width="48%"
            />
            <MetricCard
              value={dashboardData.metrics.pending_applications}
              label="New Applications"
              color="#F59E0B"
              showBadge
              onPress={() => router.push('/business/applications')}
              width="48%"
            />
            <MetricCard
              value={`$${dashboardData.metrics.monthly_spend.toLocaleString()}`}
              label="Spent this Month"
              color="#10B981"
              onPress={() => router.push('/business/analytics')}
              width="48%"
            />
            <MetricCard
              value={dashboardData.metrics.total_creators_worked}
              label="Total Creators"
              color="#EC4899"
              onPress={() => router.push('/business/creators')}
              width="48%"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingLeft: DS.spacing.lg, marginBottom: DS.spacing.xl }}>
          <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.md }}>
            Quick Actions
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: DS.spacing.md, paddingRight: DS.spacing.lg }}
          >
            <QuickActionCard
              icon={Plus}
              title="New Campaign"
              subtitle="Start promotion"
              color={DS.colors.primaryOrange}
              onPress={() => router.push('/business/campaigns/create')}
            />
            <QuickActionCard
              icon={Search}
              title="Find Creators"
              subtitle="Browse talent"
              color="#6366F1"
              onPress={() => router.push('/business/creators/browse')}
            />
            <QuickActionCard
              icon={BarChart}
              title="Analytics"
              subtitle="View insights"
              color="#10B981"
              onPress={() => router.push('/business/analytics')}
            />
          </ScrollView>
        </View>

        {/* Active Campaigns */}
        {dashboardData.campaigns.length > 0 && (
          <View style={{ paddingHorizontal: DS.spacing.lg, marginBottom: DS.spacing.xl }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: DS.spacing.md,
            }}>
              <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>
                Active Campaigns
              </Text>
              <TouchableOpacity onPress={() => router.push('/business/campaigns')}>
                <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {dashboardData.campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPress={() => router.push(`/business/campaigns/${campaign.id}`)}
              />
            ))}
          </View>
        )}

        {/* Recent Applications */}
        {dashboardData.recent_applications.length > 0 && (
          <View style={{ paddingHorizontal: DS.spacing.lg }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: DS.spacing.md,
            }}>
              <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>
                Recent Applications
              </Text>
              <TouchableOpacity onPress={() => router.push('/business/applications')}>
                <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {dashboardData.recent_applications.map(application => (
              <ApplicationRow
                key={application.id}
                application={application}
                onPress={() => router.push(`/business/applications/${application.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Modernized Component Implementations
const MetricCard = ({ value, label, color, showBadge = false, onPress, width }: any) => (
  <TouchableOpacity
    style={{
      width,
      backgroundColor: DS.colors.surface,
      padding: DS.spacing.md,
      borderRadius: DS.borderRadius.lg,
      borderWidth: 1,
      borderColor: DS.colors.border,
      ...DS.shadows.sm,
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.sm }}>
      <Text style={{ ...DS.typography.h1, fontSize: 24, color: color }}>
        {value}
      </Text>
      {showBadge && value > 0 && (
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: DS.colors.error,
        }} />
      )}
    </View>
    <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const QuickActionCard = ({ icon: Icon, title, subtitle, color, onPress }: any) => (
  <TouchableOpacity
    style={{
      width: 140,
      backgroundColor: DS.colors.surface,
      borderRadius: DS.borderRadius.lg,
      padding: DS.spacing.md,
      borderWidth: 1,
      borderColor: DS.colors.border,
      ...DS.shadows.sm,
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={{
      width: 40,
      height: 40,
      borderRadius: DS.borderRadius.md,
      backgroundColor: `${color}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: DS.spacing.md,
    }}>
      <Icon size={20} color={color} />
    </View>
    <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark, marginBottom: 2 }}>
      {title}
    </Text>
    <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>
      {subtitle}
    </Text>
  </TouchableOpacity>
);

const CampaignCard = ({ campaign, onPress }: any) => {
  const getDaysRemaining = () => {
    if (!campaign.end_date) return 0;
    const end = new Date(campaign.end_date);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const progressPercentage = (campaign.spent_amount / campaign.budget) * 100;
  const daysLeft = getDaysRemaining();

  return (
    <TouchableOpacity
      style={{
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.lg,
        padding: DS.spacing.md,
        marginBottom: DS.spacing.md,
        borderWidth: 1,
        borderColor: DS.colors.border,
        ...DS.shadows.sm,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: DS.spacing.sm }}>
        <View style={{ flex: 1, marginRight: DS.spacing.md }}>
          <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: 4 }} numberOfLines={1}>
            {campaign.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: DS.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={14} color={DS.colors.textGray} />
              <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>
                {campaign.selected_creators}/{campaign.max_creators}
              </Text>
            </View>
            {campaign.pending_applications > 0 && (
              <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: DS.borderRadius.xs }}>
                <Text style={{ ...DS.typography.caption, fontSize: 10, color: DS.colors.error, fontWeight: '700' }}>
                  {campaign.pending_applications} NEW
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ 
            backgroundColor: campaign.status === 'active' ? '#DCFCE7' : '#F3F4F6', 
            paddingHorizontal: 8, 
            paddingVertical: 2, 
            borderRadius: DS.borderRadius.full 
          }}>
            <Text style={{ 
              ...DS.typography.caption, 
              fontWeight: '700', 
              color: campaign.status === 'active' ? '#16A34A' : DS.colors.textGray,
              textTransform: 'uppercase'
            }}>
              {campaign.status}
            </Text>
          </View>
          <Text style={{ ...DS.typography.caption, color: daysLeft <= 3 ? DS.colors.error : DS.colors.textGray, marginTop: 4 }}>
            {daysLeft}d left
          </Text>
        </View>
      </View>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Budget Used</Text>
          <Text style={{ ...DS.typography.caption, fontWeight: '600', color: DS.colors.textDark }}>
            ${campaign.spent_amount.toLocaleString()} / ${campaign.budget.toLocaleString()}
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: DS.colors.surfaceLight, borderRadius: DS.borderRadius.full, overflow: 'hidden' }}>
          <View style={{
            height: '100%',
            width: `${Math.min(progressPercentage, 100)}%`,
            backgroundColor: progressPercentage > 80 ? DS.colors.warning : DS.colors.primaryOrange,
            borderRadius: DS.borderRadius.full,
          }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ApplicationRow = ({ application, onPress }: any) => {
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const applied = new Date(date);
    const hours = Math.floor((now.getTime() - applied.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DS.colors.surface,
        padding: DS.spacing.md,
        borderRadius: DS.borderRadius.md,
        marginBottom: DS.spacing.sm,
        borderWidth: 1,
        borderColor: DS.colors.border,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: application.creator_avatar }}
        style={{
          width: 40,
          height: 40,
          borderRadius: DS.borderRadius.full,
          marginRight: DS.spacing.md,
          backgroundColor: DS.colors.surfaceLight,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
          {application.creator_name}
        </Text>
        <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginTop: 2 }}>
          {application.campaign_name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: DS.borderRadius.xs, marginBottom: 4 }}>
          <Text style={{ ...DS.typography.caption, fontSize: 10, color: '#D97706', fontWeight: '700' }}>REVIEW</Text>
        </View>
        <Text style={{ ...DS.typography.caption, color: DS.colors.textLight }}>
          {getTimeAgo(application.applied_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const EmptyDashboard = ({ onCreateCampaign }: any) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: DS.spacing.xl }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: DS.borderRadius.full,
        backgroundColor: `${DS.colors.primaryOrange}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: DS.spacing.lg,
      }}>
        <Target size={40} color={DS.colors.primaryOrange} />
      </View>

      <Text style={{ ...DS.typography.h2, color: DS.colors.textDark, textAlign: 'center', marginBottom: DS.spacing.sm }}>
        Welcome to Dashboard
      </Text>
      <Text style={{ ...DS.typography.body, color: DS.colors.textGray, textAlign: 'center', marginBottom: DS.spacing.xl }}>
        Create your first campaign to start connecting with local creators.
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: DS.colors.primaryOrange,
          paddingHorizontal: DS.spacing.xl,
          paddingVertical: DS.spacing.md,
          borderRadius: DS.borderRadius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          ...DS.shadows.md,
        }}
        onPress={onCreateCampaign}
        activeOpacity={0.7}
      >
        <Plus size={20} color="white" style={{ marginRight: DS.spacing.sm }} />
        <Text style={{ ...DS.typography.button, color: 'white' }}>
          Create Campaign
        </Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);
