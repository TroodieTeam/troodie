import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Edit,
  Pause,
  Play,
  CheckCircle,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Calendar,
} from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { platformCampaignService } from '@/services/platformCampaignService';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function CampaignDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [platformData, setPlatformData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaignDetails = async () => {
    try {
      if (!id) return;

      const { data: campaignData, error: campaignError } =
        await platformCampaignService.getCampaignById(id as string);
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: platformMetadata, error: platformError } =
        await platformCampaignService.getPlatformCampaignData(id as string);
      if (platformError) console.error('Platform data error:', platformError);
      setPlatformData(platformMetadata);
    } catch (error) {
      console.error('Error loading campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaignDetails();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaignDetails();
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await platformCampaignService.updateCampaignStatus(
        id as string,
        newStatus as any
      );
      if (error) throw error;
      Alert.alert('Success', `Campaign ${newStatus} successfully`);
      loadCampaignDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update campaign status');
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCampaignTypeLabel = (source: string) => {
    switch (source) {
      case 'troodie_direct':
        return 'Troodie Direct';
      case 'troodie_partnership':
        return 'Partnership';
      case 'community_challenge':
        return 'Community Challenge';
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

  if (!campaign) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Campaign not found</Text>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campaign Details</Text>
          <TouchableOpacity style={styles.editButton}>
            <Edit size={20} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Campaign Info */}
        <View style={styles.section}>
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
                style={[styles.statusText, { color: getStatusColor(campaign.status) }]}
              >
                {campaign.status}
              </Text>
            </View>
          </View>

          <Text style={styles.campaignDescription}>{campaign.description}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          {campaign.status === 'draft' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStatusChange('active')}
            >
              <Play size={18} color={designTokens.colors.primaryOrange} />
              <Text style={styles.actionButtonText}>Activate</Text>
            </TouchableOpacity>
          )}
          {campaign.status === 'active' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStatusChange('paused')}
            >
              <Pause size={18} color={designTokens.colors.textDark} />
              <Text style={styles.actionButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          {campaign.status === 'paused' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStatusChange('active')}
            >
              <Play size={18} color={designTokens.colors.primaryOrange} />
              <Text style={styles.actionButtonText}>Resume</Text>
            </TouchableOpacity>
          )}
          {(campaign.status === 'active' || campaign.status === 'paused') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStatusChange('completed')}
            >
              <CheckCircle size={18} color={designTokens.colors.success} />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#FFFAF2' }]}>
                <DollarSign size={20} color={designTokens.colors.primaryOrange} />
              </View>
              <Text style={styles.metricValue}>
                {formatCurrency(platformData?.actual_spend_cents || 0)}
              </Text>
              <Text style={styles.metricLabel}>Spent</Text>
              <Text style={styles.metricSubtext}>
                of {formatCurrency(platformData?.approved_budget_cents || 0)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#DBEAFE' }]}>
                <Users size={20} color="#1E40AF" />
              </View>
              <Text style={styles.metricValue}>
                {platformData?.accepted_creators || 0}
              </Text>
              <Text style={styles.metricLabel}>Creators</Text>
              <Text style={styles.metricSubtext}>
                of {platformData?.target_creators || 0} target
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#FCE7F3' }]}>
                <FileText size={20} color="#BE185D" />
              </View>
              <Text style={styles.metricValue}>
                {platformData?.content_pieces_delivered || 0}
              </Text>
              <Text style={styles.metricLabel}>Content</Text>
              <Text style={styles.metricSubtext}>
                of {platformData?.target_content_pieces || 0} target
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#D1FAE5' }]}>
                <TrendingUp size={20} color="#047857" />
              </View>
              <Text style={styles.metricValue}>
                {(platformData?.actual_reach || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>Reach</Text>
              <Text style={styles.metricSubtext}>
                of {(platformData?.target_reach || 0).toLocaleString()} target
              </Text>
            </View>
          </View>
        </View>

        {/* Requirements */}
        {campaign.requirements && campaign.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.card}>
              {campaign.requirements.map((req: string, index: number) => (
                <View key={index} style={styles.requirementItem}>
                  <View style={styles.requirementNumber}>
                    <Text style={styles.requirementNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.requirementText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Campaign Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.card}>
            <View style={styles.dateRow}>
              <Calendar size={16} color={designTokens.colors.textMedium} />
              <View style={styles.dateContent}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text style={styles.dateValue}>{formatDate(campaign.start_date)}</Text>
              </View>
            </View>
            <View style={styles.dateRow}>
              <Calendar size={16} color={designTokens.colors.textMedium} />
              <View style={styles.dateContent}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>{formatDate(campaign.end_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Budget Details */}
        {platformData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Details</Text>
            <View style={styles.card}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Budget Source</Text>
                <Text style={styles.detailValue}>{platformData.budget_source}</Text>
              </View>
              {platformData.cost_center && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cost Center</Text>
                  <Text style={styles.detailValue}>{platformData.cost_center}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Approved Budget</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(platformData.approved_budget_cents)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Actual Spend</Text>
                <Text style={[styles.detailValue, { fontWeight: '700' }]}>
                  {formatCurrency(platformData.actual_spend_cents || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Partnership Details (if applicable) */}
        {campaign.campaign_source === 'troodie_partnership' && platformData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partnership Details</Text>
            <View style={styles.card}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Partner Restaurant ID</Text>
                <Text style={styles.detailValue}>
                  {platformData.partner_restaurant_id || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Agreement Signed</Text>
                <Text style={styles.detailValue}>
                  {platformData.partnership_agreement_signed ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subsidy Amount</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(platformData.subsidy_amount_cents || 0)}
                </Text>
              </View>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.textDark,
  },
  editButton: {
    padding: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 12,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  campaignType: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
  },
  campaignDescription: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 11,
    color: designTokens.colors.textLight,
  },
  card: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  requirementNumber: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requirementNumberText: {
    fontSize: 11,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: designTokens.colors.textDark,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dateContent: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  detailLabel: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  errorText: {
    fontSize: 16,
    color: designTokens.colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
});
