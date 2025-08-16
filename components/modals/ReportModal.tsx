import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment' | 'user' | 'board' | 'community';
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Unwanted commercial content or spam' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or harassment' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Hate speech or discrimination' },
  { value: 'violence', label: 'Violence', description: 'Violence or dangerous content' },
  { value: 'sexual_content', label: 'Sexual Content', description: 'Inappropriate sexual content' },
  { value: 'false_information', label: 'False Information', description: 'Misleading or false information' },
  { value: 'intellectual_property', label: 'Intellectual Property', description: 'Copyright or trademark violation' },
  { value: 'self_harm', label: 'Self Harm', description: 'Self-harm or suicide content' },
  { value: 'illegal_activity', label: 'Illegal Activity', description: 'Illegal or regulated goods' },
  { value: 'other', label: 'Other', description: 'Other reason not listed' }
];

export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetName
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be signed in to report content');
        return;
      }

      const { data, error } = await supabase.functions.invoke('submit-report', {
        body: {
          targetType,
          targetId,
          reason: selectedReason,
          description: description || null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it and take appropriate action.',
        [{ text: 'OK', onPress: handleClose }]
      );

    } catch (error: any) {
      console.error('Report submission error:', error);
      
      if (error.message?.includes('already reported')) {
        Alert.alert(
          'Already Reported',
          'You have already reported this content. Our team is reviewing it.'
        );
      } else {
        Alert.alert(
          'Report Failed',
          'Unable to submit report. Please try again later.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'post': return 'Post';
      case 'comment': return 'Comment';
      case 'user': return 'User';
      case 'board': return 'Board';
      case 'community': return 'Community';
      default: return 'Content';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AlertTriangle size={24} color="#FF3B30" />
            <Text style={styles.headerTitle}>Report {getTargetTypeLabel()}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {targetName && (
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Reporting:</Text>
              <Text style={styles.targetName}>{targetName}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Why are you reporting this?</Text>
          <Text style={styles.sectionSubtitle}>
            Your report is anonymous. We'll review it and take appropriate action.
          </Text>

          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.value && styles.reasonItemSelected
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <View style={styles.reasonContent}>
                  <Text style={[
                    styles.reasonLabel,
                    selectedReason === reason.value && styles.reasonLabelSelected
                  ]}>
                    {reason.label}
                  </Text>
                  <Text style={[
                    styles.reasonDescription,
                    selectedReason === reason.value && styles.reasonDescriptionSelected
                  ]}>
                    {reason.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedReason === reason.value && styles.radioButtonSelected
                ]}>
                  {selectedReason === reason.value && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {selectedReason === 'other' && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Please provide details:</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe the issue..."
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              !selectedReason && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  targetInfo: {
    backgroundColor: '#FFF5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  targetLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  targetName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  reasonsList: {
    gap: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  reasonItemSelected: {
    borderColor: '#FFAD27',
    backgroundColor: '#FFF9F0',
  },
  reasonContent: {
    flex: 1,
    marginRight: 12,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  reasonLabelSelected: {
    color: '#FF8C00',
  },
  reasonDescription: {
    fontSize: 13,
    color: '#666',
  },
  reasonDescriptionSelected: {
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FFAD27',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFAD27',
  },
  descriptionContainer: {
    marginTop: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#FF3B30',
  },
  submitButtonDisabled: {
    backgroundColor: '#FFB5B0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});