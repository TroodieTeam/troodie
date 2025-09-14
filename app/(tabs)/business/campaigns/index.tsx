import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Plus,
  Target,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

  const loadCampaigns = async () => {
    try {
      if (!user?.id) return;

      // Get campaigns using owner_id
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_applications (
            id,
            status
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process campaigns with counts
      const processedCampaigns = data?.map(campaign => {
        const pendingApps = campaign.campaign_applications?.filter(
          a => a.status === 'pending'
        ).length || 0;

        return {
          id: campaign.id,
          name: campaign.name,
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

  const renderCampaignItem = ({ item }: { item: Campaign }) => (
    <CampaignListItem
      campaign={item}
      onPress={() => router.push(`/business/campaigns/${item.id}`)}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
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
          <ChevronLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.text,
        }}>
          Manage Campaigns
        </Text>
        <TouchableOpacity onPress={() => router.push('/business/campaigns/create')}>
          <Plus size={24} color={DS.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={{
        backgroundColor: DS.colors.backgroundWhite,
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
                  ? DS.colors.primary 
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
                    ? DS.colors.text 
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
                      ? DS.colors.text 
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
          <ActivityIndicator size="large" color={DS.colors.primary} />
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

const CampaignListItem = ({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) => {
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
    const end = new Date(campaign.end_date);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days} days left`;
    if (days === 0) return 'Ending today';
    return 'Ended';
  };

  const budget = campaign.budget_cents / 100;
  const spent = campaign.spent_amount_cents / 100;
  const deliverableProgress = campaign.total_deliverables > 0 
    ? (campaign.delivered_content_count / campaign.total_deliverables) * 100 
    : 0;

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
      {/* Campaign Title and Status */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: DS.spacing.md,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: DS.colors.text,
          flex: 1,
          marginRight: DS.spacing.sm,
        }}>
          {campaign.name}
        </Text>
        <Text style={{
          fontSize: 12,
          fontWeight: '600',
          color: getStatusColor(campaign.status),
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {campaign.status}
        </Text>
      </View>

      {/* Compact Stats Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: DS.spacing.md,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        }}>
          <Users size={16} color={DS.colors.textLight} />
          <Text style={{
            fontSize: 14,
            color: DS.colors.text,
            marginLeft: 6,
          }}>
            {campaign.selected_creators_count}/{campaign.max_creators} creators
          </Text>
        </View>
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        }}>
          <DollarSign size={16} color={DS.colors.textLight} />
          <Text style={{
            fontSize: 14,
            color: DS.colors.text,
            marginLeft: 6,
          }}>
            ${spent.toLocaleString()}/${budget.toLocaleString()}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Clock size={16} color={DS.colors.textLight} />
          <Text style={{
            fontSize: 14,
            color: DS.colors.text,
            marginLeft: 6,
          }}>
            {getDaysText()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{
        height: 6,
        backgroundColor: DS.colors.backgroundLight,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: DS.spacing.xs,
      }}>
        <View style={{
          height: '100%',
          width: `${Math.min(deliverableProgress, 100)}%`,
          backgroundColor: DS.colors.primary,
          borderRadius: 3,
        }} />
      </View>
      
      {/* Progress Text */}
      <Text style={{
        fontSize: 12,
        color: DS.colors.textLight,
      }}>
        {campaign.delivered_content_count}/{campaign.total_deliverables} deliverables completed
      </Text>

      {/* Pending Applications Badge */}
      {campaign.pending_applications_count > 0 && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: DS.spacing.sm,
          paddingTop: DS.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: DS.colors.border,
        }}>
          <View style={{
            backgroundColor: DS.colors.error,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginRight: 6,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 11,
              fontWeight: '700',
            }}>
              {campaign.pending_applications_count}
            </Text>
          </View>
          <Text style={{
            fontSize: 13,
            color: DS.colors.text,
            fontWeight: '500',
          }}>
            New application{campaign.pending_applications_count > 1 ? 's' : ''} to review
          </Text>
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
        backgroundColor: DS.colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: DS.spacing.md,
      }}>
        <Icon size={40} color={DS.colors.textLight} />
      </View>
      <Text style={{
        fontSize: 20,
        fontWeight: '600',
        color: DS.colors.text,
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
            backgroundColor: DS.colors.primary,
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