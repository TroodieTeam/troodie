import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  DollarSign,
  FileText,
  Plus,
  Target,
  Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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

  useFocusEffect(
    useCallback(() => {
      loadCampaigns();
    }, [])
  );

  const loadCampaigns = async () => {
    try {
      if (!user?.id) return;

      const ADMIN_USER_IDS = [
        'b08d9600-358d-4be9-9552-4607d9f50227',
        '31744191-f7c0-44a4-8673-10b34ccbb87f',
        'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599'
      ];
      const isAdmin = ADMIN_USER_IDS.includes(user.id);

      let query = supabase
        .from('campaigns')
        .select(`
          *,
          campaign_applications (id, status),
          campaign_deliverables (id, status)
        `);

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const processedCampaigns = data?.map(campaign => {
        const pendingApps = campaign.campaign_applications?.filter(
          (a: any) => a.status === 'pending'
        ).length || 0;
        
        const pendingDeliverables = campaign.campaign_deliverables?.filter(
          (d: any) => d.status === 'pending_review'
        ).length || 0;

        return {
          id: campaign.id,
          name: campaign.title || campaign.name,
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
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'draft', label: 'Drafts' },
    { id: 'completed', label: 'Completed' },
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
      {/* Modern Header */}
      <View style={{
        paddingHorizontal: DS.spacing.lg,
        paddingTop: DS.spacing.md,
        paddingBottom: DS.spacing.sm,
        backgroundColor: DS.colors.background,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: DS.spacing.md,
        }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              padding: DS.spacing.xs,
              marginLeft: -DS.spacing.xs,
            }}
          >
            <ChevronLeft size={28} color={DS.colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/business/campaigns/create')}
            style={{
              width: 40,
              height: 40,
              borderRadius: DS.borderRadius.full,
              backgroundColor: DS.colors.primaryOrange,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: DS.colors.primaryOrange,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={{ ...DS.typography.h1, color: DS.colors.textDark }}>
          Campaigns
        </Text>
      </View>

      {/* Modern Filter Pills */}
      <View style={{ marginBottom: DS.spacing.md }}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: DS.spacing.lg, gap: DS.spacing.sm }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = selectedFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedFilter(item.id)}
                style={{
                  paddingHorizontal: DS.spacing.lg,
                  paddingVertical: DS.spacing.sm,
                  borderRadius: DS.borderRadius.full,
                  backgroundColor: isActive ? DS.colors.textDark : DS.colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? DS.colors.textDark : DS.colors.border,
                }}
              >
                <Text style={{
                  ...DS.typography.button,
                  color: isActive ? DS.colors.textWhite : DS.colors.textDark,
                  fontSize: 13,
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={DS.colors.primaryOrange} />
          }
          contentContainerStyle={{ padding: DS.spacing.lg, gap: DS.spacing.lg, paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const CampaignListItem = ({ campaign, onPress, isTestCampaign = false }: { campaign: Campaign; onPress: () => void; isTestCampaign?: boolean }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: DS.colors.success, label: 'Active', bg: '#DCFCE7' };
      case 'draft': return { color: DS.colors.textGray, label: 'Draft', bg: '#F3F4F6' };
      case 'completed': return { color: DS.colors.info, label: 'Completed', bg: '#DBEAFE' };
      case 'paused': return { color: DS.colors.warning, label: 'Paused', bg: '#FEF3C7' };
      default: return { color: DS.colors.textGray, label: status, bg: '#F3F4F6' };
    }
  };

  const getDaysText = () => {
    if (campaign.status === 'draft') return 'Not started';
    if (campaign.status === 'completed') return 'Ended';
    if (!campaign.end_date) return 'No end date';
    
    const now = new Date();
    const endDateStr = campaign.end_date;
    let end: Date;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      const [year, month, day] = endDateStr.split('-').map(Number);
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      end = new Date(endDateStr);
      if (isNaN(end.getTime())) return 'Invalid date';
      if (!endDateStr.includes('T') && !endDateStr.includes(' ')) {
        end.setHours(23, 59, 59, 999);
      }
    }
    
    const diffMs = end.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ending today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const statusConfig = getStatusConfig(campaign.status);
  const budget = campaign.budget_cents / 100;
  const spent = campaign.spent_amount_cents / 100;
  const deliverableProgress = campaign.total_deliverables > 0 
    ? (campaign.delivered_content_count / campaign.total_deliverables) * 100 
    : 0;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.xl,
        padding: DS.spacing.lg,
        ...DS.shadows.sm,
        borderWidth: 1,
        borderColor: DS.colors.border,
      }}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {isTestCampaign && (
        <View style={{
          backgroundColor: '#FFFBEB',
          paddingVertical: DS.spacing.xs,
          paddingHorizontal: DS.spacing.sm,
          marginBottom: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#FCD34D',
        }}>
          <AlertCircle size={14} color={DS.colors.warning} style={{ marginRight: 6 }} />
          <Text style={{ ...DS.typography.caption, color: DS.colors.warning, fontWeight: '600' }}>
            Test Mode
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.lg }}>
        <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, flex: 1, marginRight: DS.spacing.md }}>
          {campaign.name}
        </Text>
        <View style={{
          backgroundColor: statusConfig.bg,
          paddingHorizontal: DS.spacing.sm,
          paddingVertical: 4,
          borderRadius: DS.borderRadius.full,
        }}>
          <Text style={{ ...DS.typography.caption, color: statusConfig.color, fontWeight: '700', textTransform: 'uppercase' }}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={{ flexDirection: 'row', gap: DS.spacing.xl, marginBottom: DS.spacing.lg }}>
        <View>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 2 }}>Budget</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DollarSign size={14} color={DS.colors.textDark} style={{ marginRight: 2 }} />
            <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
              {spent.toLocaleString()} <Text style={{ color: DS.colors.textLight }}>/ {budget.toLocaleString()}</Text>
            </Text>
          </View>
        </View>
        <View>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 2 }}>Time Remaining</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={14} color={DS.colors.textDark} style={{ marginRight: 4 }} />
            <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
              {getDaysText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress */}
      {campaign.total_deliverables > 0 && (
        <View style={{ marginBottom: DS.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Deliverables</Text>
            <Text style={{ ...DS.typography.caption, fontWeight: '600', color: DS.colors.textDark }}>
              {campaign.delivered_content_count} / {campaign.total_deliverables}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: DS.colors.surfaceLight, borderRadius: DS.borderRadius.full, overflow: 'hidden' }}>
            <View style={{
              height: '100%',
              width: `${Math.min(deliverableProgress, 100)}%`,
              backgroundColor: DS.colors.success,
              borderRadius: DS.borderRadius.full,
            }} />
          </View>
        </View>
      )}

      {/* Actions */}
      {(campaign.pending_applications_count > 0 || campaign.pending_deliverables_count > 0) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: DS.spacing.sm, paddingTop: DS.spacing.md, borderTopWidth: 1, borderColor: DS.colors.borderLight }}>
          {campaign.pending_applications_count > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FEF2F2',
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: DS.borderRadius.md,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}>
              <Users size={14} color={DS.colors.error} style={{ marginRight: 6 }} />
              <Text style={{ ...DS.typography.caption, color: DS.colors.error, fontWeight: '600' }}>
                {campaign.pending_applications_count} New Application{campaign.pending_applications_count > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {campaign.pending_deliverables_count > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFBEB',
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: DS.borderRadius.md,
              borderWidth: 1,
              borderColor: '#FDE68A',
            }}>
              <FileText size={14} color={DS.colors.warning} style={{ marginRight: 6 }} />
              <Text style={{ ...DS.typography.caption, color: DS.colors.warning, fontWeight: '600' }}>
                {campaign.pending_deliverables_count} Pending Review
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
        return { title: 'No active campaigns', message: 'Launch a campaign to start working with creators.' };
      case 'draft':
        return { title: 'No drafts', message: 'You have no unfinished campaigns.' };
      case 'completed':
        return { title: 'No history', message: 'Completed campaigns will show up here.' };
      default:
        return { title: 'Start your first campaign', message: 'Create a campaign to connect with local creators and grow your business.' };
    }
  };

  const { title, message } = getEmptyMessage();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: DS.spacing.xl, marginTop: 40 }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: DS.borderRadius.full,
        backgroundColor: DS.colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: DS.spacing.lg,
      }}>
        <Target size={32} color={DS.colors.textLight} />
      </View>
      <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.sm }}>
        {title}
      </Text>
      <Text style={{ ...DS.typography.body, color: DS.colors.textGray, textAlign: 'center', marginBottom: DS.spacing.xl }}>
        {message}
      </Text>
      {filter !== 'completed' && (
        <TouchableOpacity
          style={{
            backgroundColor: DS.colors.primaryOrange,
            paddingHorizontal: DS.spacing.xl,
            paddingVertical: DS.spacing.md,
            borderRadius: DS.borderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: DS.colors.primaryOrange,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={onCreate}
        >
          <Plus size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={{ ...DS.typography.button, color: 'white' }}>
            Create Campaign
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
