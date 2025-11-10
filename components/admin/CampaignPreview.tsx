import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { designTokens } from '@/constants/designTokens';
import {
  CheckCircle,
  Building2,
  DollarSign,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react-native';

interface CampaignPreviewProps {
  campaignData: {
    type: 'troodie_direct' | 'troodie_partnership' | 'community_challenge';
    title: string;
    description: string;
    requirements: string[];
    maxCreators: number;
    startDate: Date | null;
    endDate: Date | null;
    budgetSource: string;
    approvedBudgetCents: number;
    costCenter: string;
    targetCreators: number;
    targetContentPieces: number;
    targetReach: number;
    // Partnership details (if applicable)
    partnerRestaurantId?: string | null;
    partnerRestaurantName?: string;
    partnershipAgreementSigned?: boolean;
    partnershipStartDate?: Date | null;
    partnershipEndDate?: Date | null;
    subsidyAmountCents?: number;
  };
  onPublish: () => void;
  onBack: () => void;
}

export default function CampaignPreview({
  campaignData,
  onPublish,
  onBack,
}: CampaignPreviewProps) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCampaignTypeLabel = () => {
    switch (campaignData.type) {
      case 'troodie_direct':
        return 'Troodie Direct Campaign';
      case 'troodie_partnership':
        return 'Partnership Campaign';
      case 'community_challenge':
        return 'Community Challenge';
      default:
        return 'Campaign';
    }
  };

  const getCampaignTypeIcon = () => {
    switch (campaignData.type) {
      case 'troodie_direct':
        return <Building2 size={20} color={designTokens.colors.primaryOrange} />;
      case 'troodie_partnership':
        return <Users size={20} color="#8B5CF6" />;
      case 'community_challenge':
        return <Award size={20} color="#10B981" />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeIndicator}>
            <View style={styles.typeIcon}>{getCampaignTypeIcon()}</View>
            <Text style={styles.typeLabel}>{getCampaignTypeLabel()}</Text>
          </View>
          <View style={styles.readyBadge}>
            <CheckCircle size={16} color={designTokens.colors.success} />
            <Text style={styles.readyText}>Ready to Publish</Text>
          </View>
        </View>

        {/* Campaign Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Details</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{campaignData.title || 'Untitled Campaign'}</Text>
            <Text style={styles.cardDescription}>{campaignData.description}</Text>
          </View>
        </View>

        {/* Requirements */}
        {campaignData.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.card}>
              {campaignData.requirements.map((req, index) => (
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

        {/* Campaign Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Settings</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Users size={18} color="#1E40AF" />
              </View>
              <Text style={styles.statValue}>{campaignData.maxCreators}</Text>
              <Text style={styles.statLabel}>Max Creators</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Calendar size={18} color="#D97706" />
              </View>
              <Text style={styles.statValue}>
                {campaignData.startDate && campaignData.endDate
                  ? `${Math.ceil((campaignData.endDate.getTime() - campaignData.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`
                  : 'Not set'}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Date:</Text>
              <Text style={styles.detailValue}>{formatDate(campaignData.startDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Date:</Text>
              <Text style={styles.detailValue}>{formatDate(campaignData.endDate)}</Text>
            </View>
          </View>
        </View>

        {/* Budget Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget & Metrics</Text>
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <DollarSign size={20} color={designTokens.colors.primaryOrange} />
              <Text style={styles.budgetTitle}>Total Approved Budget</Text>
            </View>
            <Text style={styles.budgetAmount}>
              {formatCurrency(campaignData.approvedBudgetCents)}
            </Text>
            <View style={styles.budgetDetail}>
              <Text style={styles.budgetDetailText}>
                Source: {campaignData.budgetSource || 'Not specified'}
              </Text>
              {campaignData.costCenter && (
                <Text style={styles.budgetDetailText}>
                  Cost Center: {campaignData.costCenter}
                </Text>
              )}
            </View>
          </View>

          {/* Target Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Users size={16} color="#1E40AF" />
              <Text style={styles.metricValue}>{campaignData.targetCreators}</Text>
              <Text style={styles.metricLabel}>Target Creators</Text>
            </View>
            <View style={styles.metricCard}>
              <FileText size={16} color="#BE185D" />
              <Text style={styles.metricValue}>{campaignData.targetContentPieces}</Text>
              <Text style={styles.metricLabel}>Content Pieces</Text>
            </View>
            <View style={styles.metricCard}>
              <TrendingUp size={16} color="#047857" />
              <Text style={styles.metricValue}>
                {campaignData.targetReach.toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>Target Reach</Text>
            </View>
          </View>
        </View>

        {/* Partnership Details (if applicable) */}
        {campaignData.type === 'troodie_partnership' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partnership Details</Text>
            <View style={styles.card}>
              <View style={styles.partnershipRow}>
                <Text style={styles.detailLabel}>Partner Restaurant:</Text>
                <Text style={styles.detailValue}>
                  {campaignData.partnerRestaurantName || 'Not selected'}
                </Text>
              </View>
              <View style={styles.partnershipRow}>
                <Text style={styles.detailLabel}>Agreement Signed:</Text>
                <View style={styles.statusBadge}>
                  {campaignData.partnershipAgreementSigned ? (
                    <>
                      <CheckCircle size={14} color={designTokens.colors.success} />
                      <Text style={[styles.statusText, { color: designTokens.colors.success }]}>
                        Yes
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.statusText, { color: designTokens.colors.error }]}>
                      No
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.partnershipRow}>
                <Text style={styles.detailLabel}>Partnership Dates:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(campaignData.partnershipStartDate)} -{' '}
                  {formatDate(campaignData.partnershipEndDate)}
                </Text>
              </View>
              <View style={styles.partnershipRow}>
                <Text style={styles.detailLabel}>Troodie Subsidy:</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(campaignData.subsidyAmountCents || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* How Creators Will See This */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Creators Will See This</Text>
          <View style={styles.previewCard}>
            {campaignData.type === 'troodie_direct' && (
              <>
                <View style={styles.badgeRow}>
                  <View style={styles.troodieBadge}>
                    <CheckCircle size={14} color={designTokens.colors.primaryOrange} />
                    <Text style={styles.badgeText}>Troodie Official</Text>
                  </View>
                </View>
                <Text style={styles.previewNote}>
                  ✓ This campaign will show "Troodie Official" badge
                </Text>
                <Text style={styles.previewNote}>
                  ✓ Creators will see guaranteed payment badge
                </Text>
                <Text style={styles.previewNote}>
                  ✓ Fast approval time highlighted (24-48 hours)
                </Text>
              </>
            )}
            {campaignData.type === 'troodie_partnership' && (
              <>
                <Text style={styles.previewNote}>
                  This campaign will appear as a regular restaurant campaign
                </Text>
                <Text style={styles.previewNote}>
                  No Troodie branding or subsidy information visible to creators
                </Text>
              </>
            )}
            {campaignData.type === 'community_challenge' && (
              <>
                <View style={styles.badgeRow}>
                  <View style={styles.challengeBadge}>
                    <Award size={14} color="#10B981" />
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>Challenge</Text>
                  </View>
                </View>
                <Text style={styles.previewNote}>
                  ✓ This campaign will show "Challenge" badge
                </Text>
                <Text style={styles.previewNote}>
                  ✓ Gamification elements highlighted
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Bottom spacing for buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.publishButton} onPress={onPublish}>
          <Text style={styles.publishButtonText}>Publish Campaign</Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFAF2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  readyText: {
    fontSize: 13,
    fontWeight: '600',
    color: designTokens.colors.success,
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
  card: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    lineHeight: 20,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
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
  budgetCard: {
    backgroundColor: '#FFFAF2',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 173, 39, 0.3)',
    padding: 16,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  budgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 8,
  },
  budgetDetail: {
    gap: 4,
  },
  budgetDetailText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginTop: 6,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
  },
  partnershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
  },
  badgeRow: {
    marginBottom: 12,
  },
  troodieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFAF2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 173, 39, 0.3)',
    alignSelf: 'flex-start',
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.primaryOrange,
  },
  previewNote: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
    lineHeight: 20,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: designTokens.colors.white,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  backButton: {
    flex: 1,
    height: 48,
    borderRadius: designTokens.borderRadius.full,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    backgroundColor: designTokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  publishButton: {
    flex: 2,
    height: 48,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
});
