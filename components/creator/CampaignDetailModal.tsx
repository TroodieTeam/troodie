import { ExploreCampaign } from '@/types/exploreCampaign';
import { Building, Calendar, DollarSign, Target, X } from 'lucide-react-native';
import React from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface CampaignDetailModalProps {
  visible: boolean;
  campaign: ExploreCampaign | null;
  onClose: () => void;
  onApply: (campaign: ExploreCampaign) => void;
}

export function CampaignDetailModal({
  visible,
  campaign,
  onClose,
  onApply,
}: CampaignDetailModalProps) {
  if (!campaign) return null;

  const hasApplied = campaign.applications && campaign.applications.length > 0;

  const formatDuration = () => {
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;

    const isValidStart = startDate && !isNaN(startDate.getTime());
    const isValidEnd = endDate && !isNaN(endDate.getTime());

    if (isValidStart && isValidEnd) {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else if (isValidEnd) {
      return `Until ${endDate.toLocaleDateString()}`;
    } else if (isValidStart) {
      return `From ${startDate.toLocaleDateString()}`;
    } else {
      return 'Duration not specified';
    }
  };

  const renderDeliverables = () => {
    if (!campaign.deliverable_requirements) return null;

    try {
      const requirements =
        typeof campaign.deliverable_requirements === 'string'
          ? JSON.parse(campaign.deliverable_requirements)
          : campaign.deliverable_requirements;
      const deliverablesList = requirements?.deliverables || [];

      if (deliverablesList.length === 0) return null;

      return (
        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>Expected Deliverables</Text>
          <View style={{ gap: 12 }}>
            {deliverablesList.map((deliverable: any, index: number) => (
              <View key={index} style={styles.deliverableCard}>
                <View style={styles.deliverableCardHeader}>
                  <Target size={18} color="#FFAD27" />
                  <Text style={styles.deliverableType}>
                    {deliverable.quantity || 1}× {deliverable.type || 'Social Media Post'}
                  </Text>
                </View>
                {deliverable.description && (
                  <Text style={styles.deliverableDescription}>{deliverable.description}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      );
    } catch (e) {
      console.error('Error parsing deliverable_requirements:', e);
      return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Campaign Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Campaign Image */}
            {campaign.restaurant?.cover_photo_url && (
              <Image
                source={{ uri: campaign.restaurant.cover_photo_url }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.modalRestaurant}>
              {!campaign.restaurant?.cover_photo_url && (
                <Building size={20} color="#666" />
              )}
              <Text style={styles.modalRestaurantName}>{campaign.restaurant?.name}</Text>
            </View>

            <Text style={styles.modalCampaignTitle}>{campaign.title}</Text>
            <Text style={styles.modalDescription}>{campaign.description}</Text>

            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <DollarSign size={18} color="#10B981" />
                <View>
                  <Text style={styles.modalStatLabel}>Budget</Text>
                  <Text style={styles.modalStatValue}>
                    ${(campaign.budget_cents / 100).toFixed(0)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalStatItem}>
                <Calendar size={18} color="#F59E0B" />
                <View>
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>{formatDuration()}</Text>
                </View>
              </View>
            </View>

            {renderDeliverables()}

            {campaign.requirements &&
              Array.isArray(campaign.requirements) &&
              campaign.requirements.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Requirements</Text>
                  {campaign.requirements.map((req, index) => (
                    <View key={index} style={styles.requirementItem}>
                      <Text style={styles.requirementBullet}>•</Text>
                      <Text style={styles.requirementText}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {hasApplied ? (
              <View style={[styles.applyButton, styles.applyButtonDisabled]}>
                <Text style={[styles.applyButtonText, { opacity: 0.6 }]}>Already Applied</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  onClose();
                  onApply(campaign);
                }}
              >
                <Text style={styles.applyButtonText}>Apply Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F7F7F7',
  },
  modalRestaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalRestaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalCampaignTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  modalStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  requirementBullet: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  deliverableCard: {
    backgroundColor: '#FFFAF2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE8CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deliverableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  deliverableType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    flex: 1,
  },
  deliverableDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  applyButton: {
    backgroundColor: '#262626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#262626',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
