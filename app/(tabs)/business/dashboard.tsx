import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart,
  Camera,
  CheckCircle,
  ChevronRight,
  DollarSign,
  Plus,
  Search,
  Settings,
  Target,
  TrendingUp,
  Users,
  Bell
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
  proposed_rate: number;
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
      if (!user?.id) {
        console.log('No user ID found');
        return;
      }
      
      console.log('Loading dashboard for user:', user.id, user.email);

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
        
      console.log('Business profile query result:', { businessProfile, profileError });

      if (profileError || !businessProfile) {
        console.error('Business profile error:', profileError);
        // If no business profile, show empty state
        setDashboardData(null);
        return;
      }
      
      if (!businessProfile.restaurants) {
        console.error('No restaurant data found in business profile');
        setDashboardData(null);
        return;
      }

      // Get metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get campaigns - using owner_id instead of restaurant_id
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Campaigns error:', campaignsError);
        // Continue with empty campaigns array instead of throwing
      }
      
      console.log('Campaigns found:', campaigns?.length || 0);

      // Calculate metrics
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
      
      // Get applications
      const campaignIds = campaigns?.map(c => c.id) || [];
      let applications = [];
      let pendingApplications = 0;
      
      if (campaignIds.length > 0) {
        const { data: appsData, error: appsError } = await supabase
          .from('campaign_applications')
          .select(`
            *,
            campaigns (name),
            creator_profiles (display_name, avatar_url)
          `)
          .in('campaign_id', campaignIds)
          .eq('status', 'pending')
          .order('applied_at', { ascending: false })
          .limit(5);

        if (appsError) {
          console.error('Applications error:', appsError);
        } else {
          applications = appsData || [];
        }
      }
      
      pendingApplications = applications?.length || 0;

      // Calculate monthly spend - using spent_amount_cents field
      const monthlySpend = campaigns
        ?.filter(c => new Date(c.created_at) >= startOfMonth)
        .reduce((sum, c) => sum + ((c.spent_amount_cents || 0) / 100), 0) || 0;

      // Get unique creators count
      let creatorsCount = 0;
      if (campaignIds.length > 0) {
        const { count } = await supabase
          .from('campaign_applications')
          .select('creator_id', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .eq('status', 'accepted');
        creatorsCount = count || 0;
      }

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
          pending_applications: pendingApplications,
          monthly_spend: monthlySpend,
          total_creators_worked: creatorsCount || 0,
        },
        campaigns: campaigns?.slice(0, 3).map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          budget: c.budget_cents / 100,
          spent_amount: (c.spent_amount_cents || 0) / 100,
          start_date: c.start_date,
          end_date: c.end_date,
          selected_creators: c.selected_creators_count || 0,
          max_creators: c.max_creators,
          pending_applications: 0,
        })) || [],
        recent_applications: applications?.map(a => ({
          id: a.id,
          campaign_id: a.campaign_id,
          campaign_name: a.campaigns.name,
          creator_name: a.creator_profiles.display_name,
          creator_avatar: a.creator_profiles.avatar_url,
          applied_at: a.applied_at,
          proposed_rate: a.proposed_rate_cents / 100,
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
          <ActivityIndicator size="large" color={DS.colors.primary} />
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
        backgroundColor: DS.colors.backgroundWhite,
        paddingTop: DS.spacing.sm,
        paddingBottom: DS.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        {/* Navigation Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
        }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              padding: DS.spacing.xs,
            }}
          >
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 17,
            fontWeight: '600',
            color: DS.colors.text,
          }}>Business Dashboard</Text>
          
          <View style={{ flexDirection: 'row', gap: DS.spacing.sm }}>
            <TouchableOpacity 
              onPress={() => router.push('/business/notifications')}
              style={{
                padding: DS.spacing.xs,
                position: 'relative',
              }}
            >
              <Bell size={24} color={DS.colors.text} />
              {dashboardData.metrics.pending_applications > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: DS.colors.error,
                  borderWidth: 2,
                  borderColor: DS.colors.backgroundWhite,
                }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/business/settings')}
              style={{
                padding: DS.spacing.xs,
              }}
            >
              <Settings size={24} color={DS.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Restaurant Info */}
        <View style={{
          paddingHorizontal: DS.spacing.md,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Image
              source={{ uri: dashboardData.restaurant.image_url }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                marginRight: DS.spacing.sm,
                backgroundColor: DS.colors.border,
              }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '700', 
                  color: DS.colors.text,
                }}>
                  {dashboardData.restaurant.name}
                </Text>
                {dashboardData.restaurant.is_verified && (
                  <CheckCircle size={16} color={DS.colors.success} />
                )}
              </View>
              <Text style={{
                fontSize: 12,
                color: DS.colors.textLight,
                marginTop: 2,
              }}>
                Member since {new Date(dashboardData.restaurant.claimed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >

        {/* Key Metrics */}
        <View style={{
          paddingHorizontal: DS.spacing.md,
          paddingTop: DS.spacing.md,
          paddingBottom: DS.spacing.sm,
        }}>
          <View style={{
            backgroundColor: DS.colors.backgroundWhite,
            borderRadius: DS.borderRadius.lg,
            padding: DS.spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}>
              <MetricItem
                value={dashboardData.metrics.active_campaigns}
                label="Active"
                sublabel="Campaigns"
                color="#6366F1"
                onPress={() => router.push('/business/campaigns?filter=active')}
              />
              <MetricItem
                value={dashboardData.metrics.pending_applications}
                label="Pending"
                sublabel="Applications"
                color="#F59E0B"
                showBadge
                onPress={() => router.push('/business/applications')}
              />
              <MetricItem
                value={`$${dashboardData.metrics.monthly_spend.toLocaleString()}`}
                label="This Month"
                sublabel="Spent"
                color="#10B981"
                onPress={() => router.push('/business/analytics')}
              />
              <MetricItem
                value={dashboardData.metrics.total_creators_worked}
                label="Total"
                sublabel="Creators"
                color="#EC4899"
                onPress={() => router.push('/business/creators')}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: DS.spacing.md, marginTop: DS.spacing.md }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: DS.spacing.sm }}
          >
            <QuickActionCard
              icon={Plus}
              title="Create Campaign"
              subtitle="Start new promotion"
              color={DS.colors.primary}
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
              title="View Analytics"
              subtitle="Track performance"
              color="#10B981"
              onPress={() => router.push('/business/analytics')}
            />
            <QuickActionCard
              icon={Users}
              title="Applications"
              subtitle={`${dashboardData.metrics.pending_applications} new`}
              color="#F59E0B"
              onPress={() => router.push('/business/applications')}
              badge={dashboardData.metrics.pending_applications}
            />
          </ScrollView>
        </View>

        {/* Active Campaigns */}
        {dashboardData.campaigns.length > 0 && (
          <View style={{ padding: DS.spacing.md }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: DS.spacing.sm,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: DS.colors.text,
              }}>
                Active Campaigns
              </Text>
              <TouchableOpacity onPress={() => router.push('/business/campaigns')}>
                <Text style={{ fontSize: 14, color: DS.colors.primary }}>
                  See All
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
          <View style={{ padding: DS.spacing.md }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: DS.spacing.sm,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: DS.colors.text,
              }}>
                Recent Applications
              </Text>
              <TouchableOpacity onPress={() => router.push('/business/applications')}>
                <Text style={{ fontSize: 14, color: DS.colors.primary }}>
                  See All
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

// Component implementations
const MetricItem = ({ value, label, sublabel, color, showBadge = false, onPress }) => (
  <TouchableOpacity
    style={{
      alignItems: 'center',
      padding: DS.spacing.xs,
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={{ position: 'relative' }}>
      <Text style={{
        fontSize: 24,
        fontWeight: '700',
        color: color,
        marginBottom: 4,
      }}>
        {value}
      </Text>
      {showBadge && value > 0 && (
        <View style={{
          position: 'absolute',
          top: -4,
          right: -8,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: DS.colors.error,
        }} />
      )}
    </View>
    <Text style={{
      fontSize: 11,
      color: DS.colors.text,
      fontWeight: '500',
    }}>
      {label}
    </Text>
    <Text style={{
      fontSize: 10,
      color: DS.colors.textLight,
    }}>
      {sublabel}
    </Text>
  </TouchableOpacity>
);

const QuickActionCard = ({ icon: Icon, title, subtitle, color, onPress, badge }) => (
  <TouchableOpacity
    style={{
      width: 140,
      backgroundColor: DS.colors.backgroundWhite,
      borderRadius: DS.borderRadius.md,
      padding: DS.spacing.md,
      borderWidth: 1,
      borderColor: DS.colors.border,
      position: 'relative',
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {badge > 0 && (
      <View style={{
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: DS.colors.error,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}>
        <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>{badge}</Text>
      </View>
    )}
    <View style={{
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${color}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: DS.spacing.sm,
    }}>
      <Icon size={18} color={color} />
    </View>
    <Text style={{
      fontSize: 13,
      fontWeight: '600',
      color: DS.colors.text,
      marginBottom: 2,
    }}>
      {title}
    </Text>
    <Text style={{
      fontSize: 11,
      color: DS.colors.textLight,
    }}>
      {subtitle}
    </Text>
  </TouchableOpacity>
);


const CampaignCard = ({ campaign, onPress }) => {
  const getDaysRemaining = () => {
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
        backgroundColor: DS.colors.backgroundWhite,
        borderRadius: DS.borderRadius.lg,
        padding: DS.spacing.md,
        marginBottom: DS.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Title and Status Row */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: DS.spacing.md,
      }}>
        <View style={{ flex: 1, marginRight: DS.spacing.sm }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: 4,
          }}>
            {campaign.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: DS.spacing.xs }}>
            <Users size={14} color={DS.colors.textLight} />
            <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
              {campaign.selected_creators}/{campaign.max_creators} creators
            </Text>
            {campaign.pending_applications > 0 && (
              <View style={{
                backgroundColor: DS.colors.error,
                borderRadius: 10,
                paddingHorizontal: 5,
                paddingVertical: 1,
                marginLeft: 4,
              }}>
                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                  {campaign.pending_applications} NEW
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <StatusBadge status={campaign.status} />
          <Text style={{ 
            fontSize: 11, 
            color: daysLeft <= 3 ? DS.colors.error : DS.colors.textLight,
            marginTop: 4,
            fontWeight: daysLeft <= 3 ? '600' : '400',
          }}>
            {daysLeft} days left
          </Text>
        </View>
      </View>

      {/* Budget Progress */}
      <View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: DS.spacing.xs,
        }}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
            Budget Used
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: DS.colors.text }}>
            ${campaign.spent_amount.toLocaleString()} / ${campaign.budget.toLocaleString()}
          </Text>
        </View>
        <View style={{
          height: 6,
          backgroundColor: DS.colors.backgroundLight,
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            width: `${Math.min(progressPercentage, 100)}%`,
            backgroundColor: progressPercentage > 80 ? DS.colors.warning : DS.colors.primary,
            borderRadius: 3,
          }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'active':
        return { backgroundColor: '#10B98115', color: '#10B981' };
      case 'draft':
        return { backgroundColor: '#6B728015', color: '#6B7280' };
      case 'completed':
        return { backgroundColor: '#3B82F615', color: '#3B82F6' };
      case 'paused':
        return { backgroundColor: '#F59E0B15', color: '#F59E0B' };
      default:
        return { backgroundColor: '#6B728015', color: '#6B7280' };
    }
  };

  const style = getStatusStyle();

  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: style.backgroundColor,
    }}>
      <Text style={{
        fontSize: 10,
        fontWeight: '600',
        color: style.color,
        textTransform: 'uppercase',
      }}>
        {status}
      </Text>
    </View>
  );
};

const ApplicationRow = ({ application, onPress }) => {
  const getTimeAgo = (date) => {
    const now = new Date();
    const applied = new Date(date);
    const hours = Math.floor((now - applied) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DS.colors.backgroundWhite,
        padding: DS.spacing.sm,
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
          width: 44,
          height: 44,
          borderRadius: 22,
          marginRight: DS.spacing.sm,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
          {application.creator_name}
        </Text>
        <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 2 }}>
          {application.campaign_name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{
            backgroundColor: DS.colors.primary + '15',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}>
            <Text style={{ fontSize: 10, color: DS.colors.primary, fontWeight: '600' }}>
              ${application.proposed_rate}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: DS.colors.textLight, marginLeft: DS.spacing.xs }}>
            • {getTimeAgo(application.applied_at)}
          </Text>
        </View>
      </View>
      <View style={{
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: DS.spacing.xs,
      }}>
        <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>REVIEW</Text>
      </View>
      <ChevronRight size={18} color={DS.colors.textLight} />
    </TouchableOpacity>
  );
};

const EmptyDashboard = ({ onCreateCampaign }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: DS.spacing.lg,
    }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${DS.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: DS.spacing.md,
      }}>
        <Target size={40} color={DS.colors.primary} />
      </View>

      <Text style={{
        fontSize: 24,
        fontWeight: '700',
        color: DS.colors.text,
        marginBottom: DS.spacing.sm,
        textAlign: 'center',
      }}>
        Welcome to Creator Campaigns!
      </Text>
      <Text style={{
        fontSize: 14,
        color: DS.colors.textLight,
        textAlign: 'center',
        marginBottom: DS.spacing.lg,
        lineHeight: 20,
      }}>
        Partner with local food creators to promote your restaurant and drive more customers
      </Text>

      <View style={{ width: '100%', marginBottom: DS.spacing.lg }}>
        <BenefitItem icon="📸" text="Get authentic content from real customers" />
        <BenefitItem icon="🎯" text="Reach targeted local audiences" />
        <BenefitItem icon="📊" text="Track campaign performance and ROI" />
        <BenefitItem icon="💰" text="Control your marketing budget" />
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: DS.colors.primary,
          paddingHorizontal: DS.spacing.lg,
          paddingVertical: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={onCreateCampaign}
        activeOpacity={0.7}
      >
        <Plus size={20} color="white" />
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600',
          marginLeft: DS.spacing.xs,
        }}>
          Create Your First Campaign
        </Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const BenefitItem = ({ icon, text }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.spacing.md,
  }}>
    <Text style={{ fontSize: 24, marginRight: DS.spacing.sm }}>{icon}</Text>
    <Text style={{ fontSize: 14, color: DS.colors.text, flex: 1 }}>{text}</Text>
  </View>
);