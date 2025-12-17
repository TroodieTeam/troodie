import { ExploreCampaign } from '@/types/exploreCampaign';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ApplicationFormModalProps {
  visible: boolean;
  campaign: ExploreCampaign | null;
  onClose: () => void;
  onSubmit: (coverLetter: string) => Promise<void>;
  applying: boolean;
}

export function ApplicationFormModal({
  visible,
  campaign,
  onClose,
  onSubmit,
  applying,
}: ApplicationFormModalProps) {
  const [coverLetter, setCoverLetter] = useState('');

  const handleClose = () => {
    setCoverLetter('');
    onClose();
  };

  const handleSubmit = async () => {
    await onSubmit(coverLetter);
    setCoverLetter('');
  };

  const renderRequirements = () => {
    if (!campaign) return null;

    if (campaign.requirements && Array.isArray(campaign.requirements) && campaign.requirements.length > 0) {
      return campaign.requirements.map((req: string, idx: number) => (
        <Text key={idx} style={styles.requirementText}>
          • {req}
        </Text>
      ));
    }

    if (campaign.deliverable_requirements) {
      try {
        const reqs =
          typeof campaign.deliverable_requirements === 'string'
            ? JSON.parse(campaign.deliverable_requirements)
            : campaign.deliverable_requirements;
        if (reqs?.deliverables && Array.isArray(reqs.deliverables)) {
          return reqs.deliverables.map((del: any, idx: number) => (
            <Text key={idx} style={styles.requirementText}>
              • {del.quantity || 1}× {del.type || 'Content'}{' '}
              {del.description ? `- ${del.description}` : ''}
            </Text>
          ));
        }
        return <Text style={styles.requirementText}>See campaign details for requirements</Text>;
      } catch {
        return <Text style={styles.requirementText}>See campaign details for requirements</Text>;
      }
    }

    return <Text style={styles.requirementText}>No specific requirements listed</Text>;
  };

  if (!campaign) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply to Campaign</Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalCampaignTitle}>{campaign.title}</Text>
            <Text style={styles.modalDescription}>{campaign.restaurant?.name}</Text>

            {/* Campaign Requirements - Read Only */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Campaign Requirements</Text>
              <View style={styles.requirementsBox}>{renderRequirements()}</View>
              <Text style={styles.formHint}>These are the fixed requirements for this campaign</Text>
            </View>

            {/* Payment Info */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Payment</Text>
              <View style={styles.paymentBox}>
                <Text style={styles.paymentAmount}>
                  ${((campaign.budget_cents || 0) / 100).toFixed(2)}
                </Text>
                <Text style={styles.formHint}>Fixed payout for this campaign</Text>
              </View>
            </View>

            {/* Optional Message */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Optional Message</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Add a brief message (optional)..."
                value={coverLetter}
                onChangeText={setCoverLetter}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
              <Text style={styles.formHint}>
                Optional: Add context about why you're interested
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.applyButton, applying && styles.applyButtonDisabled]}
              onPress={handleSubmit}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.applyButtonText}>Submit Application</Text>
              )}
            </TouchableOpacity>
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
  modalCampaignTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FFF',
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: '#8C8C8C',
    marginTop: 4,
  },
  requirementsBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 8,
  },
  paymentBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
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
