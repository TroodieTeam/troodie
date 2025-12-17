import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  DollarSign,
  Plus,
  Target
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  budget_cents: number;
  spent_amount_cents: number;
  start_date: string;
  end_date: string;
  selected_creators_count: number;
  max_creators: number;
  pending_applications_count: number;
  delivered_content_count: number;
  total_deliverables: number;
  pending_deliverables_count: number;
  created_at: string;
}

export default function ManageCampaigns() {
  const router = useRouter();
  const { filter } = useLocalSearchParams();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(
    (filter as string) || 'all'
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [selectedFilter, campaigns]);

  // Refresh campaigns when screen comes into focus (e.g., returning from campaign detail)
  useFocusEffect(
    useCallback(() => {
      loadCampaigns();
    }, [])
  );

  const loadCampaigns = async () => {
    try {
      if (!user?.id) {
        return;
      }

      // Check if user is admin
      const ADMIN_USER_IDS = [
        'b08d9600-358d-4be9-9552-4607d9f50227',
        '31744191-f7c0-44a4-8673-10b34ccbb87f',
        'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' // kouame@troodieapp.com
      ];
      const isAdmin = ADMIN_USER_IDS.includes(user.id);

      // Get campaigns - admins see all, regular users see only their own
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          campaign_applications (
            id,
            status
          ),
          campaign_deliverables (
            id,
            status
          )
        `);

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Process campaigns with counts
      const processedCampaigns = data?.map(campaign => {
        const pendingApps = campaign.campaign_applications?.filter(
          (a: any) => a.status === 'pending'
        ).length || 0;
        
        const pendingDeliverables = campaign.campaign_deliverables?.filter(
          (d: any) => d.status === 'pending_review'
        ).length || 0;

        return {
          id: campaign.id,
          name: campaign.title || campaign.name, // Use title first, fallback to name
          status: campaign.status,
          budget_cents: campaign.budget_cents,
          spent_amount_cents: campaign.spent_amount_cents || 0,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          selected_creators_count: campaign.selected_creators_count || 0,
          max_creators: campaign.max_creators,
          pending_applications_count: pendingApps,
          delivered_content_count: campaign.delivered_content_count || 0,
          total_deliverables: campaign.total_deliverables || 0,
          pending_deliverables_count: pendingDeliverables,
          created_at: campaign.created_at,
        };
      }) || [];

      setCampaigns(processedCampaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      Alert.alert('Error', 'Failed to load campaigns');
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

  const filters = [
    { id: 'all', label: 'All', count: campaigns.length },
    { id: 'active', label: 'Active', count: campaigns.filter(c => c.status === 'active').length },
    { id: 'draft', label: 'Drafts', count: campaigns.filter(c => c.status === 'draft').length },
    { id: 'completed', label: 'Completed', count: campaigns.filter(c => c.status === 'completed').length },
  ];

  const renderCampaignItem = ({ item }: { item: Campaign }) => {
    const isTestCampaign = item.name?.toLowerCase().includes('test campaign for rating') || 
                           item.name?.toLowerCase().includes('cm-16');
    return (
    <CampaignListItem
      campaign={item}
      onPress={() => router.push(`/business/campaigns/${item.id}`)}
        isTestCampaign={isTestCampaign}
    />
  );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={DS.colors.textDark} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.textDark,
        }}>
          Manage Campaigns
        </Text>
        <TouchableOpacity onPress={() => router.push('/business/campaigns/create')}>
          <Plus size={24} color={DS.colors.primaryOrange} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={{
        backgroundColor: DS.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingHorizontal: DS.spacing.md,
            paddingVertical: DS.spacing.sm,
          }}
        >
          {filters.map((filter, index) => (
            <TouchableOpacity
              key={filter.id}
              style={{
                paddingBottom: DS.spacing.sm,
                marginRight: DS.spacing.lg,
                borderBottomWidth: 2,
                borderBottomColor: selectedFilter === filter.id 
                  ? DS.colors.primaryOrange 
                  : 'transparent',
              }}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: selectedFilter === filter.id ? '600' : '400',
                  color: selectedFilter === filter.id 
                    ? DS.colors.textDark 
                    : DS.colors.textLight,
                }}>
                  {filter.label}
                </Text>
                {filter.count > 0 && (
                  <Text style={{
                    marginLeft: 6,
                    fontSize: 15,
                    fontWeight: '600',
                    color: selectedFilter === filter.id 
                      ? DS.colors.textDark 
                      : DS.colors.textLight,
                  }}>
                    {filter.count}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Campaigns List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState filter={selectedFilter} onCreate={() => router.push('/business/campaigns/create')} />
      ) : (
        <FlatList
          data={filteredCampaigns}
          keyExtractor={(item) => item.id}
          renderItem={renderCampaignItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={{ padding: DS.spacing.md }}
        />
      )}
    </SafeAreaView>
  );
}

const CampaignListItem = ({ campaign, onPress, isTestCampaign = false }: { campaign: Campaign; onPress: () => void; isTestCampaign?: boolean }) => {
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
    
    // Handle null/undefined end_date
    if (!campaign.end_date) {
      if (__DEV__) {
        console.log('[TimeLeft] Missing end_date', { campaignId: campaign.id });
      }
      return 'No end date';
    }
    
    const now = new Date();
    const endDateStr = campaign.end_date;
    
    // Parse end_date - handle date-only strings (YYYY-MM-DD) vs full datetime
    let end: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      // Date-only string: parse as UTC and set to end of day UTC
      const [year, month, day] = endDateStr.split('-').map(Number);
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      // Full datetime string: parse and set to end of day in same timezone
      end = new Date(endDateStr);
      if (isNaN(end.getTime())) {
        if (__DEV__) {
          console.log('[TimeLeft] Invalid end_date', { campaignId: campaign.id, endDate: endDateStr });
        }
        return 'Invalid date';
      }
      // If it's a full datetime, use it as-is; otherwise set to end of day
      if (!endDateStr.includes('T') && !endDateStr.includes(' ')) {
        end.setHours(23, 59, 59, 999);
      }
    }
    
    const diffMs = end.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Concise tracing
    if (__DEV__) {
      console.log('[TimeLeft]', {
        campaignId: campaign.id,
        endDate: endDateStr,
        endDateParsed: end.toISOString(),
        now: now.toISOString(),
        diffMs,
        days,
        hours: Math.floor(diffMs / (1000 * 60 * 60)),
        minutes: Math.floor(diffMs / (1000 * 60)),
      });
    }
    
    if (days < 0) return 'Ended';
    if (days === 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      if (hours > 0) return `${hours}h left`;
      const minutes = Math.floor(diffMs / (1000 * 60));
      if (minutes > 0) return `${minutes}m left`;
      return 'Ending soon';
    }
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const budget = campaign.budget_cents / 100;
  const spent = campaign.spent_amount_cents / 100;
  const deliverableProgress = campaign.total_deliverables > 0 
    ? (campaign.delivered_content_count / campaign.total_deliverables) * 100 
    : 0;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.lg,
        padding: DS.spacing.lg,
        marginBottom: DS.spacing.md,
        ...DS.shadows.sm,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Test Campaign Banner */}
      {isTestCampaign && (
        <View style={{
          backgroundColor: DS.colors.warning + '15',
          borderLeftWidth: 3,
          borderLeftColor: DS.colors.warning,
          padding: DS.spacing.sm,
          marginBottom: DS.spacing.md,
          borderRadius: DS.borderRadius.xs,
        }}>
          <Text style={{
            fontSize: DS.typography.caption.fontSize,
            fontWeight: '600',
            color: DS.colors.warning,
          }}>
            ⭐ Test Campaign - Use this for rating flow testing
          </Text>
        </View>
      )}

      {/* Campaign Title and Status */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: DS.spacing.md,
      }}>
        <Text style={{
          ...DS.typography.h3,
          color: DS.colors.textDark,
          flex: 1,
          marginRight: DS.spacing.sm,
        }}>
          {campaign.name}
        </Text>
        <View style={{
          backgroundColor: getStatusColor(campaign.status) + '15',
          paddingHorizontal: DS.spacing.sm,
          paddingVertical: DS.spacing.xs,
          borderRadius: DS.borderRadius.sm,
        }}>
        <Text style={{
            ...DS.typography.caption,
          fontWeight: '600',
          color: getStatusColor(campaign.status),
          textTransform: 'uppercase',
        }}>
          {campaign.status}
        </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: DS.spacing.md,
        gap: DS.spacing.md,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          minWidth: '45%',
        }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: DS.borderRadius.sm,
            backgroundColor: DS.colors.surfaceLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DS.spacing.sm,
          }}>
            <DollarSign size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              ...DS.typography.metadata,
              color: DS.colors.textGray,
            }}>
              Budget
            </Text>
          <Text style={{
              ...DS.typography.body,
              fontWeight: '600',
            color: DS.colors.textDark,
          }}>
            ${spent.toLocaleString()}/${budget.toLocaleString()}
          </Text>
          </View>
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          minWidth: '45%',
        }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: DS.borderRadius.sm,
            backgroundColor: DS.colors.surfaceLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DS.spacing.sm,
          }}>
            <Clock size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              ...DS.typography.metadata,
              color: DS.colors.textGray,
            }}>
              Time Left
            </Text>
          <Text style={{
              ...DS.typography.body,
              fontWeight: '600',
            color: DS.colors.textDark,
          }}>
            {getDaysText()}
          </Text>
          </View>
        </View>
      </View>

      {/* Deliverables Progress */}
      {campaign.total_deliverables > 0 && (
        <View style={{
          marginTop: DS.spacing.sm,
          paddingTop: DS.spacing.md,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: DS.spacing.xs,
          }}>
            <Text style={{
              ...DS.typography.metadata,
              color: DS.colors.textGray,
            }}>
              Deliverables Progress
            </Text>
            <Text style={{
              ...DS.typography.metadata,
              fontWeight: '600',
              color: DS.colors.textDark,
            }}>
              {campaign.delivered_content_count}/{campaign.total_deliverables}
            </Text>
          </View>
      <View style={{
        height: 6,
        backgroundColor: DS.colors.surfaceLight,
            borderRadius: DS.borderRadius.xs,
        overflow: 'hidden',
      }}>
        <View style={{
          height: '100%',
          width: `${Math.min(deliverableProgress, 100)}%`,
              backgroundColor: DS.colors.success,
              borderRadius: DS.borderRadius.xs,
        }} />
      </View>
        </View>
      )}

      {/* Action Badges */}
      {(campaign.pending_applications_count > 0 || campaign.pending_deliverables_count > 0) && (
        <View style={{
          marginTop: DS.spacing.md,
          paddingTop: DS.spacing.md,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: DS.spacing.sm,
        }}>
          {campaign.pending_applications_count > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: DS.colors.error + '10',
              paddingHorizontal: DS.spacing.sm,
              paddingVertical: DS.spacing.xs,
              borderRadius: DS.borderRadius.sm,
            }}>
              <View style={{
                backgroundColor: DS.colors.error,
                borderRadius: DS.borderRadius.full,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: DS.spacing.xs,
              }}>
                <Text style={{
                  color: 'white',
                  ...DS.typography.caption,
                  fontWeight: '700',
                }}>
                  {campaign.pending_applications_count}
                </Text>
              </View>
              <Text style={{
                ...DS.typography.metadata,
                color: DS.colors.textDark,
                fontWeight: '500',
              }}>
                New application{campaign.pending_applications_count > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          {campaign.pending_deliverables_count > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: DS.colors.warning + '10',
              paddingHorizontal: DS.spacing.sm,
              paddingVertical: DS.spacing.xs,
              borderRadius: DS.borderRadius.sm,
            }}>
              <View style={{
                backgroundColor: DS.colors.warning,
                borderRadius: DS.borderRadius.full,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: DS.spacing.xs,
              }}>
                <Text style={{
                  color: 'white',
                  ...DS.typography.caption,
                  fontWeight: '700',
                }}>
                  {campaign.pending_deliverables_count}
                </Text>
              </View>
              <Text style={{
                ...DS.typography.metadata,
                color: DS.colors.textDark,
                fontWeight: '500',
              }}>
                Pending deliverable{campaign.pending_deliverables_count > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const EmptyState = ({ filter, onCreate }: { filter: string; onCreate: () => void }) => {
  const getEmptyMessage = () => {
    switch (filter) {
      case 'active':
        return {
          title: 'No active campaigns',
          message: 'Create a campaign to start working with creators',
          icon: Target,
        };
      case 'draft':
        return {
          title: 'No draft campaigns',
          message: 'All your campaigns are published',
          icon: Target,
        };
      case 'completed':
        return {
          title: 'No completed campaigns yet',
          message: 'Your active campaigns will appear here when they end',
          icon: Target,
        };
      default:
        return {
          title: 'No campaigns yet',
          message: 'Create your first campaign to get started',
          icon: Target,
        };
    }
  };

  const { title, message, icon: Icon } = getEmptyMessage();

  return (
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
        backgroundColor: DS.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: DS.spacing.md,
      }}>
        <Icon size={40} color={DS.colors.textLight} />
      </View>
      <Text style={{
        fontSize: 20,
        fontWeight: '600',
        color: DS.colors.textDark,
        marginBottom: DS.spacing.xs,
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 14,
        color: DS.colors.textLight,
        textAlign: 'center',
        marginBottom: DS.spacing.lg,
      }}>
        {message}
      </Text>
      {filter !== 'completed' && (
        <TouchableOpacity
          style={{
            backgroundColor: DS.colors.primaryOrange,
            paddingHorizontal: DS.spacing.lg,
            paddingVertical: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={onCreate}
          activeOpacity={0.7}
        >
          <Plus size={20} color="white" />
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            marginLeft: DS.spacing.xs,
          }}>
            Create Campaign
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};