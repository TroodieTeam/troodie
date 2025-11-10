import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart,
  Camera,
  ChevronRight,
  DollarSign,
  Eye,
  Target,
  Trophy,
  TrendingUp,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AnalyticsData {
  overview: {
    total_spend: number;
    total_campaigns: number;
    total_creators: number;
    total_content: number;
  };
  performance: {
    best_campaign?: {
      id: string;
      name: string;
      metric: string;
      value: string;
    };
    top_creator?: {
      id: string;
      name: string;
      avatar: string;
      content_count: number;
      engagement: string;
    };
    avg_cost_per_content: number;
    avg_engagement_rate: number;
  };
  recent_content: ContentItem[];
}

interface ContentItem {
  id: string;
  thumbnail_url: string;
  creator_name: string;
  views: number;
  engagement_rate: number;
  created_at: string;
}

type TimePeriod = 'last_month' | 'all_time';

export default function BusinessAnalytics() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('last_month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const periods = [
    { id: 'last_month' as TimePeriod, label: 'Last Month' },
    { id: 'all_time' as TimePeriod, label: 'All Time' },
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      if (!user?.id) return;

      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (selectedPeriod === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }

      // Build query
      let campaignsQuery = supabase
        .from('campaigns')
        .select(`
          *,
          campaign_applications (
            id,
            status,
            creator_id,
            creator_profiles (
              id,
              display_name,
              avatar_url
            )
          ),
          portfolio_items (
            id,
            thumbnail_url,
            views,
            likes,
            creator_profiles (
              display_name
            )
          )
        `)
        .eq('owner_id', user.id);

      if (startDate && endDate) {
        campaignsQuery = campaignsQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: campaigns, error } = await campaignsQuery;
      if (error) throw error;

      // Calculate overview metrics
      const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spent_amount_cents || 0), 0) || 0;
      const totalCampaigns = campaigns?.length || 0;
      
      // Get unique creators
      const uniqueCreators = new Set<string>();
      campaigns?.forEach(campaign => {
        campaign.campaign_applications?.forEach(app => {
          if (app.status === 'accepted' && app.creator_id) {
            uniqueCreators.add(app.creator_id);
          }
        });
      });
      const totalCreators = uniqueCreators.size;

      // Count total content pieces
      const totalContent = campaigns?.reduce((sum, c) => 
        sum + (c.portfolio_items?.length || 0), 0
      ) || 0;

      // Find best performing campaign
      let bestCampaign = null;
      if (campaigns && campaigns.length > 0) {
        const sortedByEngagement = [...campaigns].sort((a, b) => {
          const aEngagement = a.portfolio_items?.reduce((sum, item) => 
            sum + (item.views || 0), 0
          ) || 0;
          const bEngagement = b.portfolio_items?.reduce((sum, item) => 
            sum + (item.views || 0), 0
          ) || 0;
          return bEngagement - aEngagement;
        });
        
        if (sortedByEngagement[0] && sortedByEngagement[0].portfolio_items?.length > 0) {
          const totalViews = sortedByEngagement[0].portfolio_items.reduce(
            (sum, item) => sum + (item.views || 0), 0
          );
          bestCampaign = {
            id: sortedByEngagement[0].id,
            name: sortedByEngagement[0].name,
            metric: 'Total Views',
            value: formatNumber(totalViews),
          };
        }
      }

      // Find top creator
      let topCreator = null;
      const creatorStats = new Map<string, any>();
      
      campaigns?.forEach(campaign => {
        campaign.campaign_applications?.forEach(app => {
          if (app.status === 'accepted' && app.creator_profiles) {
            const creatorId = app.creator_profiles.id;
            if (!creatorStats.has(creatorId)) {
              creatorStats.set(creatorId, {
                id: creatorId,
                name: app.creator_profiles.display_name,
                avatar: app.creator_profiles.avatar_url,
                content_count: 0,
                total_views: 0,
              });
            }
            const stats = creatorStats.get(creatorId);
            // Count content from this creator
            campaign.portfolio_items?.forEach(item => {
              if (item.creator_profiles?.display_name === stats.name) {
                stats.content_count++;
                stats.total_views += item.views || 0;
              }
            });
          }
        });
      });

      if (creatorStats.size > 0) {
        const sortedCreators = Array.from(creatorStats.values()).sort(
          (a, b) => b.total_views - a.total_views
        );
        if (sortedCreators[0]) {
          topCreator = {
            id: sortedCreators[0].id,
            name: sortedCreators[0].name,
            avatar: sortedCreators[0].avatar,
            content_count: sortedCreators[0].content_count,
            engagement: `${formatNumber(sortedCreators[0].total_views)} views`,
          };
        }
      }

      // Calculate averages
      const avgCostPerContent = totalContent > 0 
        ? Math.round((totalSpend / 100) / totalContent) 
        : 0;
      
      // Get recent content
      const allContent: ContentItem[] = [];
      campaigns?.forEach(campaign => {
        campaign.portfolio_items?.forEach(item => {
          if (item.thumbnail_url) {
            allContent.push({
              id: item.id,
              thumbnail_url: item.thumbnail_url,
              creator_name: item.creator_profiles?.display_name || 'Unknown',
              views: item.views || 0,
              engagement_rate: item.likes && item.views 
                ? Math.round((item.likes / item.views) * 100) 
                : 0,
              created_at: item.created_at,
            });
          }
        });
      });

      // Sort by date and take recent
      allContent.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAnalyticsData({
        overview: {
          total_spend: totalSpend / 100,
          total_campaigns: totalCampaigns,
          total_creators: totalCreators,
          total_content: totalContent,
        },
        performance: {
          best_campaign: bestCampaign || undefined,
          top_creator: topCreator || undefined,
          avg_cost_per_content: avgCostPerContent,
          avg_engagement_rate: 4.2, // Placeholder - calculate from actual data
        },
        recent_content: allContent.slice(0, 10),
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  if (!analyticsData || analyticsData.overview.total_campaigns === 0) {
    return <EmptyAnalytics onCreateCampaign={() => router.push('/business/campaigns/create')} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: DS.spacing.md,
        }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>
          <Text style={{
            fontSize: 17,
            fontWeight: '600',
            color: DS.colors.text,
          }}>
            Analytics
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Period Selector Tabs */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          paddingHorizontal: DS.spacing.xl,
          paddingBottom: DS.spacing.sm,
        }}>
          {periods.map(period => (
            <TouchableOpacity
              key={period.id}
              style={{
                flex: 1,
                paddingBottom: DS.spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: selectedPeriod === period.id 
                  ? DS.colors.primary 
                  : 'transparent',
              }}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text style={{
                textAlign: 'center',
                fontSize: 15,
                fontWeight: selectedPeriod === period.id ? '600' : '400',
                color: selectedPeriod === period.id ? DS.colors.text : DS.colors.textLight,
              }}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Overview Metrics */}
        <View style={{ padding: DS.spacing.md }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: DS.colors.text,
            marginBottom: DS.spacing.md,
          }}>
            Overview
          </Text>
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: DS.spacing.sm,
          }}>
            <MetricCard
              label="Total Spend"
              value={`$${analyticsData.overview.total_spend}`}
              icon={DollarSign}
              color="#10B981"
            />
            <MetricCard
              label="Campaigns"
              value={analyticsData.overview.total_campaigns.toString()}
              icon={Target}
              color="#6366F1"
            />
            <MetricCard
              label="Creators"
              value={analyticsData.overview.total_creators.toString()}
              icon={Users}
              color="#F59E0B"
            />
            <MetricCard
              label="Content Pieces"
              value={analyticsData.overview.total_content.toString()}
              icon={Camera}
              color="#EC4899"
            />
          </View>
        </View>

        {/* Performance Highlights */}
        <View style={{ padding: DS.spacing.md }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: DS.colors.text,
            marginBottom: DS.spacing.md,
          }}>
            Performance Highlights
          </Text>

          {analyticsData.performance.best_campaign && (
            <View style={{
              backgroundColor: DS.colors.backgroundWhite,
              borderRadius: DS.borderRadius.lg,
              padding: DS.spacing.md,
              marginBottom: DS.spacing.md,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 6,
              elevation: 2,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: DS.spacing.sm,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F59E0B20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: DS.spacing.sm,
                }}>
                  <Trophy size={20} color="#F59E0B" />
                </View>
                <Text style={{
                  fontSize: 13,
                  color: DS.colors.textLight,
                  flex: 1,
                }}>
                  Best Performing Campaign
                </Text>
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: 4,
              }}>
                {analyticsData.performance.best_campaign.name}
              </Text>
              <Text style={{
                fontSize: 14,
                color: DS.colors.textLight,
              }}>
                {analyticsData.performance.best_campaign.metric}: {analyticsData.performance.best_campaign.value}
              </Text>
            </View>
          )}

          {analyticsData.performance.top_creator && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: DS.colors.backgroundWhite,
                borderRadius: DS.borderRadius.md,
                padding: DS.spacing.md,
                marginBottom: DS.spacing.sm,
                borderWidth: 1,
                borderColor: DS.colors.border,
              }}
              onPress={() => router.push(`/creators/${analyticsData.performance.top_creator?.id}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: analyticsData.performance.top_creator.avatar }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  marginRight: DS.spacing.sm,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 12,
                  color: DS.colors.textLight,
                  marginBottom: 2,
                }}>
                  Top Creator
                </Text>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: DS.colors.text,
                }}>
                  {analyticsData.performance.top_creator.name}
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: DS.colors.textLight,
                  marginTop: 2,
                }}>
                  {analyticsData.performance.top_creator.content_count} posts • {analyticsData.performance.top_creator.engagement}
                </Text>
              </View>
              <ChevronRight size={20} color={DS.colors.textLight} />
            </TouchableOpacity>
          )}

          <View style={{
            flexDirection: 'row',
            gap: DS.spacing.sm,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: DS.colors.backgroundWhite,
              borderRadius: DS.borderRadius.lg,
              padding: DS.spacing.md,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 6,
              elevation: 2,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: 4,
              }}>
                ${analyticsData.performance.avg_cost_per_content}
              </Text>
              <Text style={{
                fontSize: 13,
                color: DS.colors.textLight,
                textAlign: 'center',
              }}>
                Avg. Cost per Content
              </Text>
            </View>
            <View style={{
              flex: 1,
              backgroundColor: DS.colors.backgroundWhite,
              borderRadius: DS.borderRadius.lg,
              padding: DS.spacing.md,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 6,
              elevation: 2,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: 4,
              }}>
                {analyticsData.performance.avg_engagement_rate}%
              </Text>
              <Text style={{
                fontSize: 13,
                color: DS.colors.textLight,
                textAlign: 'center',
              }}>
                Avg. Engagement Rate
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Content Gallery */}
        {analyticsData.recent_content.length > 0 && (
          <View style={{ paddingVertical: DS.spacing.md }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: DS.spacing.md,
              marginBottom: DS.spacing.md,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: DS.colors.text,
              }}>
                Recent Creator Content
              </Text>
              <TouchableOpacity onPress={() => router.push('/business/content')}>
                <Text style={{ fontSize: 14, color: DS.colors.primary, fontWeight: '500' }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: DS.spacing.md }}
            >
              {analyticsData.recent_content.map(content => (
                <TouchableOpacity
                  key={content.id}
                  style={{ marginRight: DS.spacing.sm }}
                  onPress={() => router.push(`/business/content/${content.id}`)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: content.thumbnail_url }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: DS.borderRadius.sm,
                    }}
                  />
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: 4,
                    borderBottomLeftRadius: DS.borderRadius.sm,
                    borderBottomRightRadius: DS.borderRadius.sm,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Eye size={12} color="white" />
                        <Text style={{
                          fontSize: 11,
                          color: 'white',
                          marginLeft: 2,
                        }}>
                          {formatNumber(content.views)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{
                    fontSize: 12,
                    color: DS.colors.text,
                    marginTop: 4,
                  }} numberOfLines={1}>
                    {content.creator_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricCard = ({ label, value, icon: Icon, color }) => (
  <View style={{
    flex: 1,
    minWidth: '48%',
    backgroundColor: DS.colors.backgroundWhite,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  }}>
    <View style={{
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${color}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: DS.spacing.sm,
    }}>
      <Icon size={22} color={color} />
    </View>
    <Text style={{
      fontSize: 24,
      fontWeight: '700',
      color: DS.colors.text,
      marginBottom: 4,
    }}>
      {value}
    </Text>
    <Text style={{
      fontSize: 13,
      color: DS.colors.textLight,
      textAlign: 'center',
    }}>
      {label}
    </Text>
  </View>
);

const EmptyAnalytics = ({ onCreateCampaign }) => {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 17,
          fontWeight: '600',
          color: DS.colors.text,
        }}>
          Analytics
        </Text>
        <View style={{ width: 24 }} />
      </View>

    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: DS.spacing.lg,
    }}>
      <BarChart size={64} color={DS.colors.textLight} />
      <Text style={{
        fontSize: 20,
        fontWeight: '600',
        color: DS.colors.text,
        marginTop: DS.spacing.md,
        marginBottom: DS.spacing.xs,
      }}>
        No Analytics Yet
      </Text>
      <Text style={{
        fontSize: 14,
        color: DS.colors.textLight,
        textAlign: 'center',
        marginBottom: DS.spacing.lg,
      }}>
        Start running creator campaigns to see performance metrics and insights here
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: DS.colors.primary,
          paddingHorizontal: DS.spacing.lg,
          paddingVertical: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
        }}
        onPress={onCreateCampaign}
        activeOpacity={0.7}
      >
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600',
        }}>
          Create Your First Campaign
        </Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
  );
};