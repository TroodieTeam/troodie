/**
 * Review Deliverables Screen (Restaurant Dashboard)
 *
 * Allows restaurants to review pending deliverables from creators.
 * Features:
 * - List of pending deliverables
 * - Countdown timer (72 hours to auto-approve)
 * - View submitted content (URL + screenshot)
 * - Quick actions: Approve / Request Changes / Reject
 * - Feedback text field
 * - Warning messages before auto-approve
 * - Real-time updates
 */

import { useAuth } from '@/contexts/AuthContext';
import {
    approveDeliverable,
    formatDeadline,
    getPendingDeliverables,
    getUrgencyColor,
    rejectDeliverable,
    requestChanges,
    type ApproveDeliverableParams,
    type RejectDeliverableParams,
    type RequestChangesParams
} from '@/services/deliverableReviewService';
import type { PendingDeliverableSummary } from '@/types/deliverableRequirements';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type ReviewAction = 'approve' | 'request_changes' | 'reject';

// ============================================================================
// COMPONENT
// ============================================================================

export default function ReviewDeliverablesScreen() {
  const { id: campaignId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Data state
  const [deliverables, setDeliverables] = useState<PendingDeliverableSummary[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<PendingDeliverableSummary | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [feedback, setFeedback] = useState('');

  // Load deliverables
  const loadDeliverables = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);

    try {
      // Get restaurant ID from user's business profile
      // TODO: Implement getRestaurantIdForUser()
      const restaurantId = 'temp-restaurant-id';

      const { data, error } = await getPendingDeliverables(restaurantId);

      if (error) {
        console.error('Error loading deliverables:', error);
        Alert.alert('Error', 'Failed to load pending deliverables');
        return;
      }

      setDeliverables(data || []);
    } catch (error) {
      console.error('Error in loadDeliverables:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDeliverables();

    // Poll for updates every minute
    const interval = setInterval(() => {
      loadDeliverables(false);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDeliverables(false);
  };

  const openActionModal = (deliverable: PendingDeliverableSummary, action: ReviewAction) => {
    setSelectedDeliverable(deliverable);
    setSelectedAction(action);
    setFeedback('');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedDeliverable(null);
    setSelectedAction(null);
    setFeedback('');
  };

  const confirmAction = async () => {
    if (!selectedDeliverable || !selectedAction || !user?.id) return;

    // Validate feedback for reject and request_changes
    if ((selectedAction === 'reject' || selectedAction === 'request_changes') && !feedback.trim()) {
      Alert.alert('Feedback Required', 'Please provide feedback when rejecting or requesting changes');
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      if (selectedAction === 'approve') {
        const params: ApproveDeliverableParams = {
          deliverable_id: selectedDeliverable.deliverable_id,
          reviewer_id: user.id,
          feedback: feedback.trim() || undefined
        };
        result = await approveDeliverable(params);
      } else if (selectedAction === 'reject') {
        const params: RejectDeliverableParams = {
          deliverable_id: selectedDeliverable.deliverable_id,
          reviewer_id: user.id,
          feedback: feedback.trim()
        };
        result = await rejectDeliverable(params);
      } else if (selectedAction === 'request_changes') {
        const params: RequestChangesParams = {
          deliverable_id: selectedDeliverable.deliverable_id,
          reviewer_id: user.id,
          feedback: feedback.trim(),
          changes_required: [] // TODO: Allow specifying specific changes
        };
        result = await requestChanges(params);
      }

      if (result?.error) {
        throw result.error;
      }

      // Success!
      Alert.alert(
        'Success',
        `Deliverable ${selectedAction === 'approve' ? 'approved' : selectedAction === 'reject' ? 'rejected' : 'sent back for changes'} successfully!`
      );

      closeActionModal();
      loadDeliverables(false);
    } catch (error) {
      console.error('Error processing review action:', error);
      Alert.alert('Error', 'Failed to process review action. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPostUrl = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Failed to open post URL');
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFAD27" />
        <Text style={styles.loadingText}>Loading pending deliverables...</Text>
      </View>
    );
  }

  if (deliverables.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-done-circle" size={64} color="#10B981" />
        <Text style={styles.emptyTitle}>All Caught Up!</Text>
        <Text style={styles.emptyText}>
          You don't have any pending deliverables to review at this time.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#FFAD27" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Deliverables</Text>
        <TouchableOpacity style={styles.refreshIconButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Pending Count Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="time" size={24} color="#FFAD27" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>{deliverables.length} Pending Review</Text>
          <Text style={styles.bannerText}>
            Deliverables auto-approve if not reviewed within 72 hours
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {deliverables.map((deliverable) => (
          <DeliverableCard
            key={deliverable.deliverable_id}
            deliverable={deliverable}
            onApprove={() => openActionModal(deliverable, 'approve')}
            onRequestChanges={() => openActionModal(deliverable, 'request_changes')}
            onReject={() => openActionModal(deliverable, 'reject')}
            onOpenUrl={() => openPostUrl(deliverable.post_url)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAction === 'approve' && 'Approve Deliverable'}
                {selectedAction === 'request_changes' && 'Request Changes'}
                {selectedAction === 'reject' && 'Reject Deliverable'}
              </Text>
              <TouchableOpacity onPress={closeActionModal}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Creator Info */}
              {selectedDeliverable && (
                <View style={styles.creatorInfo}>
                  {selectedDeliverable.creator_avatar ? (
                    <Image
                      source={{ uri: selectedDeliverable.creator_avatar }}
                      style={styles.creatorAvatar}
                    />
                  ) : (
                    <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                      <Ionicons name="person" size={20} color="#6B7280" />
                    </View>
                  )}
                  <View>
                    <Text style={styles.creatorName}>{selectedDeliverable.creator_name}</Text>
                    <Text style={styles.creatorUsername}>@{selectedDeliverable.creator_username}</Text>
                  </View>
                </View>
              )}

              {/* Deliverable Content Preview */}
              {selectedDeliverable && (
                <View style={styles.deliverablePreviewSection}>
                  <Text style={styles.sectionTitle}>Deliverable Content</Text>
                  
                  {/* Post Screenshot */}
                  {selectedDeliverable.screenshot_url && (
                    <TouchableOpacity 
                      style={styles.modalPostPreview} 
                      onPress={() => openPostUrl(selectedDeliverable.post_url)}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: selectedDeliverable.screenshot_url }} 
                        style={styles.modalPostImage} 
                      />
                      <View style={styles.modalPostOverlay}>
                        <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.modalPostOverlayText}>Tap to view</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Post URL */}
                  {selectedDeliverable.post_url && (
                    <TouchableOpacity
                      style={styles.postUrlContainer}
                      onPress={() => openPostUrl(selectedDeliverable.post_url)}
                    >
                      <Ionicons name="link" size={16} color="#6B7280" />
                      <Text style={styles.postUrlText} numberOfLines={1}>
                        {selectedDeliverable.post_url}
                      </Text>
                      <Ionicons name="open-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  )}

                  {/* Caption */}
                  {selectedDeliverable.caption && (
                    <View style={styles.modalCaptionContainer}>
                      <Text style={styles.modalCaptionLabel}>Caption</Text>
                      <Text style={styles.modalCaptionText}>{selectedDeliverable.caption}</Text>
                    </View>
                  )}

                  {/* Notes to Restaurant */}
                  {selectedDeliverable.notes_to_restaurant && (
                    <View style={styles.modalNotesContainer}>
                      <View style={styles.modalNotesHeader}>
                        <Ionicons name="chatbubble-ellipses" size={16} color="#6B7280" />
                        <Text style={styles.modalNotesLabel}>Notes from Creator</Text>
                      </View>
                      <Text style={styles.modalNotesText}>{selectedDeliverable.notes_to_restaurant}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Message */}
              <View style={styles.modalMessage}>
                {selectedAction === 'approve' && (
                  <>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                    <Text style={styles.modalMessageTitle}>Approve This Deliverable?</Text>
                    <Text style={styles.modalMessageText}>
                      The creator will be notified and payment will be processed.
                    </Text>
                  </>
                )}
                {selectedAction === 'request_changes' && (
                  <>
                    <Ionicons name="refresh-circle" size={48} color="#F59E0B" />
                    <Text style={styles.modalMessageTitle}>Request Changes?</Text>
                    <Text style={styles.modalMessageText}>
                      The creator will be able to resubmit with your feedback.
                    </Text>
                  </>
                )}
                {selectedAction === 'reject' && (
                  <>
                    <Ionicons name="close-circle" size={48} color="#EF4444" />
                    <Text style={styles.modalMessageTitle}>Reject This Deliverable?</Text>
                    <Text style={styles.modalMessageText}>
                      This action cannot be undone. The creator will be notified.
                    </Text>
                  </>
                )}
              </View>

              {/* Feedback Input */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>
                  Feedback {(selectedAction === 'reject' || selectedAction === 'request_changes') && '*'}
                </Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder={
                    selectedAction === 'approve'
                      ? 'Optional: Add a positive note...'
                      : selectedAction === 'request_changes'
                      ? 'Explain what needs to be changed...'
                      : 'Explain why you are rejecting...'
                  }
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={closeActionModal}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  selectedAction === 'approve' && styles.modalButtonApprove,
                  selectedAction === 'reject' && styles.modalButtonReject
                ]}
                onPress={confirmAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>
                    {selectedAction === 'approve' && 'Approve'}
                    {selectedAction === 'request_changes' && 'Request Changes'}
                    {selectedAction === 'reject' && 'Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DeliverableCardProps {
  deliverable: PendingDeliverableSummary;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  onOpenUrl: () => void;
}

function DeliverableCard({
  deliverable,
  onApprove,
  onRequestChanges,
  onReject,
  onOpenUrl
}: DeliverableCardProps) {
  const urgencyColor = getUrgencyColor(deliverable.hours_remaining);
  const timeRemaining = formatDeadline(deliverable.hours_remaining);

  return (
    <View style={styles.deliverableCard}>
      {/* Countdown Timer */}
      <View style={[styles.timerBanner, { backgroundColor: getTimerBackgroundColor(urgencyColor) }]}>
        <Ionicons
          name="timer"
          size={20}
          color={getTimerTextColor(urgencyColor)}
        />
        <Text style={[styles.timerText, { color: getTimerTextColor(urgencyColor) }]}>
          {timeRemaining}
        </Text>
        {urgencyColor === 'red' && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>URGENT</Text>
          </View>
        )}
      </View>

      {/* Creator Info */}
      <View style={styles.cardCreatorInfo}>
        {deliverable.creator_avatar ? (
          <Image source={{ uri: deliverable.creator_avatar }} style={styles.cardCreatorAvatar} />
        ) : (
          <View style={[styles.cardCreatorAvatar, styles.cardCreatorAvatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#6B7280" />
          </View>
        )}
        <View style={styles.cardCreatorDetails}>
          <Text style={styles.cardCreatorName}>{deliverable.creator_name}</Text>
          <Text style={styles.cardCreatorUsername}>@{deliverable.creator_username}</Text>
        </View>
        <View style={styles.platformBadge}>
          <Ionicons name={getPlatformIcon(deliverable.platform)} size={16} color="#6B7280" />
        </View>
      </View>

      {/* Post Preview */}
      <TouchableOpacity style={styles.postPreview} onPress={onOpenUrl} activeOpacity={0.7}>
        {deliverable.screenshot_url ? (
          <Image source={{ uri: deliverable.screenshot_url }} style={styles.postImage} />
        ) : (
          <View style={styles.postPlaceholder}>
            <Ionicons name="link" size={32} color="#6B7280" />
            <Text style={styles.postPlaceholderText}>Tap to view post</Text>
          </View>
        )}
        <View style={styles.postOverlay}>
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Caption (if provided) */}
      {deliverable.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText} numberOfLines={3}>
            {deliverable.caption}
          </Text>
        </View>
      )}

      {/* Notes (if provided) */}
      {deliverable.notes_to_restaurant && (
        <View style={styles.notesContainer}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#6B7280" />
          <Text style={styles.notesText} numberOfLines={2}>
            {deliverable.notes_to_restaurant}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={onReject}>
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.changesButton]} onPress={onRequestChanges}>
          <Ionicons name="refresh-circle-outline" size={20} color="#F59E0B" />
          <Text style={styles.changesButtonText}>Request Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={onApprove}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getPlatformIcon(platform: string): any {
  switch (platform) {
    case 'instagram':
      return 'logo-instagram';
    case 'tiktok':
      return 'musical-notes';
    case 'youtube':
      return 'logo-youtube';
    default:
      return 'link';
  }
}

function getTimerBackgroundColor(urgency: 'green' | 'yellow' | 'red' | 'gray'): string {
  switch (urgency) {
    case 'green':
      return '#D1FAE5';
    case 'yellow':
      return '#FEF3C7';
    case 'red':
      return '#FEE2E2';
    case 'gray':
      return '#F3F4F6';
    default:
      return '#F3F4F6';
  }
}

function getTimerTextColor(urgency: 'green' | 'yellow' | 'red' | 'gray'): string {
  switch (urgency) {
    case 'green':
      return '#065F46';
    case 'yellow':
      return '#92400E';
    case 'red':
      return '#991B1B';
    case 'gray':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB'
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFAD27'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  refreshIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#FFFAF2',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5CC'
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  bannerContent: {
    flex: 1
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  bannerText: {
    fontSize: 13,
    color: '#6B7280'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  deliverableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden'
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600'
  },
  urgentBadge: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  cardCreatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12
  },
  cardCreatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12
  },
  cardCreatorAvatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardCreatorDetails: {
    flex: 1
  },
  cardCreatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  cardCreatorUsername: {
    fontSize: 13,
    color: '#6B7280'
  },
  platformBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  postPreview: {
    position: 'relative',
    aspectRatio: 9 / 16,
    maxHeight: 400,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12
  },
  postImage: {
    width: '100%',
    height: '100%'
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  postPlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8
  },
  postOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  captionContainer: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  captionText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    gap: 6
  },
  approveButton: {
    backgroundColor: '#10B981',
    flex: 1.2
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  changesButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  changesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E'
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '90%'
  },
  modalScrollContent: {
    flex: 1,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937'
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 20
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  creatorAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  creatorUsername: {
    fontSize: 13,
    color: '#6B7280'
  },
  modalMessage: {
    alignItems: 'center',
    paddingVertical: 20
  },
  modalMessageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 6
  },
  modalMessageText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  },
  feedbackSection: {
    marginBottom: 20
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  },
  feedbackInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6'
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280'
  },
  modalButtonPrimary: {
    backgroundColor: '#F59E0B'
  },
  modalButtonApprove: {
    backgroundColor: '#10B981'
  },
  modalButtonReject: {
    backgroundColor: '#EF4444'
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  deliverablePreviewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  modalPostPreview: {
    position: 'relative',
    aspectRatio: 9 / 16,
    maxHeight: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F3F4F6'
  },
  modalPostImage: {
    width: '100%',
    height: '100%'
  },
  modalPostOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  modalPostOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  postUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8
  },
  postUrlText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280'
  },
  modalCaptionContainer: {
    marginBottom: 12
  },
  modalCaptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6
  },
  modalCaptionText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20
  },
  modalNotesContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  modalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  modalNotesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280'
  },
  modalNotesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20
  }
});
