import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToastService } from '@/services/toastService';
import { moderationService } from '@/services/moderationService';
import { useAuth } from '@/contexts/AuthContext';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: 'post' | 'review' | 'comment';
  contentId: string;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate Content', icon: 'warning-outline' },
  { value: 'spam', label: 'Spam', icon: 'mail-outline' },
  { value: 'harassment', label: 'Harassment', icon: 'person-remove-outline' },
  { value: 'false_information', label: 'False Information', icon: 'information-circle-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export function ReportModal({ 
  visible, 
  onClose, 
  contentType,
  contentId,
  onSuccess
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      ToastService.showError('Please select a reason for reporting');
      return;
    }

    if (!user) {
      ToastService.showError('You must be logged in to report content');
      return;
    }

    setLoading(true);
    try {
      // Map contentType to targetType expected by the API
      const targetType = contentType === 'post' ? 'post' : 
                        contentType === 'user' ? 'user' :
                        contentType === 'comment' ? 'comment' :
                        contentType === 'board' ? 'board' : 'community';
      
      const success = await moderationService.submitReport(
        targetType as 'post' | 'comment' | 'user' | 'board' | 'community',
        contentId,
        selectedReason,
        details || undefined
      );

      if (success) {
        onSuccess?.();
        handleClose();
        // Success message is already shown by moderationService
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      // Error is already handled by moderationService with Alert
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Report Content</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>Why are you reporting this?</Text>
              
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason.value && styles.reasonItemSelected
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                >
                  <Ionicons 
                    name={reason.icon as any} 
                    size={24} 
                    color={selectedReason === reason.value ? '#5B4CCC' : '#666'} 
                  />
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason.value && styles.reasonTextSelected
                  ]}>
                    {reason.label}
                  </Text>
                  {selectedReason === reason.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#5B4CCC" />
                  )}
                </TouchableOpacity>
              ))}

              {selectedReason && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsLabel}>Additional details (optional)</Text>
                  <TextInput
                    style={styles.detailsInput}
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Provide more information about this report..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!selectedReason || loading) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  reasonItemSelected: {
    borderColor: '#5B4CCC',
    backgroundColor: '#F8F6FF',
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    marginLeft: 12,
  },
  reasonTextSelected: {
    fontFamily: 'Inter_500Medium',
    color: '#5B4CCC',
  },
  detailsSection: {
    marginTop: 20,
  },
  detailsLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginBottom: 8,
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    minHeight: 100,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  submitButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});