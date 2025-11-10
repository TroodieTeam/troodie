import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, TrendingUp, Users, DollarSign } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { platformCampaignService } from '@/services/platformCampaignService';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';

export default function CampaignsListScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBudget: 0,
    activeCreators: 0,
    totalCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await platformCampaignService.getAllCampaigns();
      if (error) throw error;
      if (data) {
        setCampaigns(data);
        // Calculate stats
        const totalBudget = data.reduce((sum, c) => sum + (c.approved_budget_cents || 0), 0);
        const activeCreators = data.reduce((sum, c) => sum + (c.accepted_creators || 0), 0);
        setStats({
          totalBudget,
          activeCreators,
          totalCampaigns: data.length,
        });
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getCampaignTypeLabel = (source: string) => {
    switch (source) {
      case 'troodie_direct':
        return 'Direct';
      case 'troodie_partnership':
        return 'Partnership';
      case 'community_challenge':
        return 'Challenge';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'draft':
        return '#6B7280';
      case 'completed':
        return '#1E40AF';
      case 'paused':
        return '#F59E0B';
      default:
        return designTokens.colors.textMedium;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Platform Campaigns</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/admin/campaigns/create')}
          >
            <Plus size={20} color={designTokens.colors.textDark} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFFAF2' }]}>
              <DollarSign size={20} color={designTokens.colors.primaryOrange} />
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats.totalBudget)}</Text>
            <Text style={styles.statLabel}>Total Budget</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Users size={20} color="#1E40AF" />
            </View>
            <Text style={styles.statValue}>{stats.activeCreators}</Text>
            <Text style={styles.statLabel}>Active Creators</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <TrendingUp size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.totalCampaigns}</Text>
            <Text style={styles.statLabel}>Campaigns</Text>
          </View>
        </View>

        {/* Campaign List */}
        {campaigns.length === 0 ? (
          <EmptyState
            title="No Campaigns Yet"
            message="Create your first platform-managed campaign to get started"
            actionLabel="Create Campaign"
            onAction={() => router.push('/admin/campaigns/create')}
          />
        ) : (
          <View style={styles.listContainer}>
            {campaigns.map((campaign) => (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => router.push(`/admin/campaigns/${campaign.id}`)}
              >
                <View style={styles.campaignHeader}>
                  <View>
                    <Text style={styles.campaignTitle}>{campaign.title}</Text>
                    <Text style={styles.campaignType}>
                      {getCampaignTypeLabel(campaign.campaign_source)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(campaign.status)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(campaign.status) },
                      ]}
                    >
                      {campaign.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.campaignStats}>
                  <View style={styles.campaignStat}>
                    <Text style={styles.campaignStatLabel}>Budget</Text>
                    <Text style={styles.campaignStatValue}>
                      {formatCurrency(campaign.approved_budget_cents || 0)}
                    </Text>
                  </View>
                  <View style={styles.campaignStat}>
                    <Text style={styles.campaignStatLabel}>Creators</Text>
                    <Text style={styles.campaignStatValue}>
                      {campaign.accepted_creators || 0} / {campaign.max_creators}
                    </Text>
                  </View>
                  <View style={styles.campaignStat}>
                    <Text style={styles.campaignStatLabel}>Spend</Text>
                    <Text style={styles.campaignStatValue}>
                      {formatCurrency(campaign.actual_spend_cents || 0)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.textDark,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: designTokens.borderRadius.full,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  campaignCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  campaignType: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  campaignStat: {
    alignItems: 'center',
  },
  campaignStatLabel: {
    fontSize: 11,
    color: designTokens.colors.textMedium,
    marginBottom: 2,
  },
  campaignStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
});
