import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminReviewService } from '@/services/adminReviewService';

interface ReviewModalProps {
  item: any;
  onClose: () => void;
  onComplete: () => void;
}

export default function ReviewModal({ item, onClose, onComplete }: ReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const rejectionReasons = [
    'Insufficient proof of ownership',
    'Information doesn\'t match records',
    'Duplicate claim',
    'Insufficient followers',
    'Content quality below standards',
    'Incomplete application',
    'Other (specify in notes)'
  ];

  const handleSubmit = async () => {
    if (action === 'reject' && !rejectionReason && !selectedReason) {
      Alert.alert('Error', 'Rejection reason is required');
      return;
    }

    setLoading(true);

    try {
      const finalRejectionReason = selectedReason || rejectionReason;

      if (action === 'approve') {
        if (item.type === 'restaurant_claim') {
          await adminReviewService.approveRestaurantClaim(item.id, {
            review_notes: reviewNotes,
            auto_notify: true
          });
        } else {
          await adminReviewService.approveCreatorApplication(item.id, {
            review_notes: reviewNotes,
            auto_notify: true
          });
        }
        Alert.alert('Success', 'Item approved successfully');
      } else {
        if (item.type === 'restaurant_claim') {
          await adminReviewService.rejectRestaurantClaim(item.id, {
            rejection_reason: finalRejectionReason,
            review_notes: reviewNotes,
            allow_resubmit: true,
            auto_notify: true
          });
        } else {
          await adminReviewService.rejectCreatorApplication(item.id, {
            rejection_reason: finalRejectionReason,
            review_notes: reviewNotes,
            allow_resubmit: true,
            auto_notify: true
          });
        }
        Alert.alert('Success', 'Item rejected successfully');
      }
      onComplete();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Review Submission</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Full Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Submission Details</Text>
            <View style={styles.detailsCard}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>
                {item.type === 'restaurant_claim' ? 'Restaurant Claim' : 'Creator Application'}
              </Text>

              <Text style={styles.detailLabel}>Submitted by:</Text>
              <Text style={styles.detailValue}>{item.user_name} ({item.user_email})</Text>

              <Text style={styles.detailLabel}>Submitted at:</Text>
              <Text style={styles.detailValue}>{new Date(item.submitted_at).toLocaleString()}</Text>

              {item.type === 'restaurant_claim' ? (
                <>
                  <Text style={styles.detailLabel}>Restaurant:</Text>
                  <Text style={styles.detailValue}>{item.details?.restaurant_name}</Text>

                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{item.details?.restaurant_address}</Text>

                  <Text style={styles.detailLabel}>Proof Type:</Text>
                  <Text style={styles.detailValue}>{item.details?.ownership_proof_type}</Text>

                  <Text style={styles.detailLabel}>Business Email:</Text>
                  <Text style={styles.detailValue}>{item.details?.business_email}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.detailLabel}>Followers:</Text>
                  <Text style={styles.detailValue}>
                    {item.details?.follower_count?.toLocaleString() || 'N/A'}
                  </Text>

                  <Text style={styles.detailLabel}>Platforms:</Text>
                  <Text style={styles.detailValue}>
                    {item.details?.platforms?.join(', ') || 'N/A'}
                  </Text>

                  <Text style={styles.detailLabel}>Bio:</Text>
                  <Text style={styles.detailValue}>{item.details?.bio || 'N/A'}</Text>

                  <Text style={styles.detailLabel}>Content Categories:</Text>
                  <Text style={styles.detailValue}>
                    {item.details?.content_categories?.join(', ') || 'N/A'}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Review Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Action</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  action === 'approve' && styles.actionButtonActive,
                  { backgroundColor: action === 'approve' ? '#4CAF50' : '#f0f0f0' }
                ]}
                onPress={() => setAction('approve')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={action === 'approve' ? '#fff' : '#4CAF50'}
                />
                <Text style={[
                  styles.actionButtonText,
                  action === 'approve' && styles.actionButtonTextActive
                ]}>
                  Approve
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  action === 'reject' && styles.actionButtonActive,
                  { backgroundColor: action === 'reject' ? '#f44336' : '#f0f0f0' }
                ]}
                onPress={() => setAction('reject')}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={action === 'reject' ? '#fff' : '#f44336'}
                />
                <Text style={[
                  styles.actionButtonText,
                  action === 'reject' && styles.actionButtonTextActive
                ]}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rejection Reason */}
          {action === 'reject' && (
            <View style={styles.rejectionSection}>
              <Text style={styles.sectionTitle}>Rejection Reason *</Text>
              {rejectionReasons.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    selectedReason === reason && styles.reasonOptionSelected
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Ionicons
                    name={selectedReason === reason ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedReason === reason ? "#FFAD27" : "#666"}
                  />
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
              {selectedReason === 'Other (specify in notes)' && (
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Enter specific rejection reason..."
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={2}
                />
              )}
            </View>
          )}

          {/* Internal Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Internal Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any internal notes about this review..."
              value={reviewNotes}
              onChangeText={setReviewNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {/* Submit Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!action || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!action || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Processing...' : 'Submit Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
    marginBottom: 8,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonActive: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  rejectionSection: {
    marginBottom: 24,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  reasonOptionSelected: {
    backgroundColor: '#FFFAF2',
    borderRadius: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  customReasonInput: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#FFAD27',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});