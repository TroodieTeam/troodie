import { useAuth } from '@/contexts/AuthContext';
import { deliverableService, type DeliverableWithDetails } from '@/services/deliverableService';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  X,
  XCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'pending' | 'approved' | 'all';

export default function DeliverableReviews() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [deliverables, setDeliverables] = useState<DeliverableWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Review modal state
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableWithDetails | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'revision'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadRestaurantProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (restaurantId) {
      loadDeliverables();
    }
  }, [restaurantId, activeTab]);

  const loadRestaurantProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setRestaurantId(data.restaurant_id);
    } catch (error) {
      console.error('Error loading restaurant profile:', error);
    }
  };

  const loadDeliverables = async () => {
    if (!restaurantId) return;

    try {
      let data: DeliverableWithDetails[] = [];

      if (activeTab === 'pending') {
        data = await deliverableService.getPendingDeliverables(restaurantId);
      } else {
        // Get all deliverables for this restaurant
        const { data: allData, error } = await supabase
          .from('campaign_deliverables')
          .select(`
            *,
            campaigns!inner(id, name, restaurants!inner(name)),
            creator_profiles!inner(id, display_name, avatar_url)
          `)
          .eq('restaurant_id', restaurantId)
          .order('submitted_at', { ascending: false });

        if (error) throw error;

        data = allData?.map((d: any) => ({
          ...d,
          campaign: {
            id: d.campaigns.id,
            name: d.campaigns.name,
            restaurant_name: d.campaigns.restaurants.name,
          },
          creator: {
            id: d.creator_profiles.id,
            display_name: d.creator_profiles.display_name,
            avatar_url: d.creator_profiles.avatar_url,
          },
        })) || [];

        if (activeTab === 'approved') {
          data = data.filter(d => d.status === 'approved' || d.status === 'auto_approved');
        }
      }

      setDeliverables(data);
    } catch (error) {
      console.error('Error loading deliverables:', error);
      Alert.alert('Error', 'Failed to load deliverables');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliverables();
    setRefreshing(false);
  };

  const openReviewModal = (deliverable: DeliverableWithDetails, action: typeof reviewAction) => {
    setSelectedDeliverable(deliverable);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedDeliverable) return;

    if ((reviewAction === 'reject' || reviewAction === 'revision') && !reviewNotes.trim()) {
      Alert.alert('Notes Required', 'Please provide feedback for the creator');
      return;
    }

    setSubmittingReview(true);
    try {
      let result;

      switch (reviewAction) {
        case 'approve':
          result = await deliverableService.approveDeliverable(
            selectedDeliverable.id,
            reviewNotes || undefined
          );
          break;
        case 'reject':
          result = await deliverableService.rejectDeliverable(
            selectedDeliverable.id,
            reviewNotes
          );
          break;
        case 'revision':
          result = await deliverableService.requestRevision(
            selectedDeliverable.id,
            reviewNotes
          );
          break;
      }

      if (result) {
        Alert.alert(
          'Success',
          reviewAction === 'approve'
            ? 'Deliverable approved! Payment will be processed.'
            : reviewAction === 'reject'
            ? 'Deliverable rejected.'
            : 'Revision requested. Creator will be notified.'
        );
        setShowReviewModal(false);
        setSelectedDeliverable(null);
        setReviewNotes('');
        await loadDeliverables();
      } else {
        Alert.alert('Error', 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getAutoApprovalTime = (submittedAt?: string) => {
    if (!submittedAt) return null;
    const submitted = new Date(submittedAt);
    const autoApprovalTime = new Date(submitted.getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = autoApprovalTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return 'Auto-approved';
    if (diffHours < 24) return `${diffHours}h left`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h left`;
  };

  const renderDeliverableCard = (deliverable: DeliverableWithDetails) => {
    const autoApprovalTime = getAutoApprovalTime(deliverable.submitted_at);
    const isPending = deliverable.status === 'pending_review';

    return (
      <TouchableOpacity
        key={deliverable.id}
        style={[styles.deliverableCard, isPending && styles.deliverableCardPending]}
        onPress={() => {
          if (isPending) {
            setSelectedDeliverable(deliverable);
          }
        }}
      >
        {/* Creator Info */}
        <View style={styles.creatorRow}>
          <Image
            source={{ uri: deliverable.creator?.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.creatorAvatar}
          />
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{deliverable.creator?.display_name}</Text>
            <Text style={styles.campaignNameText}>{deliverable.campaign?.name}</Text>
          </View>
          {isPending && autoApprovalTime && (
            <View style={styles.autoApprovalBadge}>
              <Clock size={12} color="#F59E0B" />
              <Text style={styles.autoApprovalText}>{autoApprovalTime}</Text>
            </View>
          )}
        </View>

        {/* Content Preview */}
        <Image
          source={{ uri: deliverable.thumbnail_url || deliverable.content_url }}
          style={styles.contentImage}
        />

        {/* Caption */}
        {deliverable.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {deliverable.caption}
          </Text>
        )}

        {/* Metrics */}
        {(deliverable.status === 'approved' || deliverable.status === 'auto_approved') && (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Eye size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.views_count.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <Heart size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.likes_count.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <MessageCircle size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.comments_count.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <Share2 size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.shares_count.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Platform & Post Link */}
        {deliverable.platform_post_url && (
          <TouchableOpacity
            style={styles.postLinkRow}
            onPress={() => {
              // Open URL
            }}
          >
            <Text style={styles.postLinkText}>
              View on {deliverable.social_platform || 'Social Media'} →
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons (for pending) */}
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => openReviewModal(deliverable, 'approve')}
            >
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={[styles.actionButtonText, styles.approveButtonText]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.revisionButton]}
              onPress={() => openReviewModal(deliverable, 'revision')}
            >
              <AlertCircle size={18} color="#F59E0B" />
              <Text style={[styles.actionButtonText, styles.revisionButtonText]}>Request Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => openReviewModal(deliverable, 'reject')}
            >
              <XCircle size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Badge (for non-pending) */}
        {!isPending && (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                deliverable.status === 'approved' && styles.statusApproved,
                deliverable.status === 'auto_approved' && styles.statusAutoApproved,
                deliverable.status === 'rejected' && styles.statusRejected,
                deliverable.status === 'revision_requested' && styles.statusRevision,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {deliverable.status === 'approved' && '✓ Approved'}
                {deliverable.status === 'auto_approved' && '✓ Auto-Approved'}
                {deliverable.status === 'rejected' && '✗ Rejected'}
                {deliverable.status === 'revision_requested' && '↻ Revision Requested'}
              </Text>
            </View>
            <Text style={styles.reviewedDate}>{formatDate(deliverable.reviewed_at)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const emptyMessages: Record<TabType, { title: string; description: string }> = {
      pending: {
        title: 'No Pending Reviews',
        description: 'Deliverables awaiting review will appear here',
      },
      approved: {
        title: 'No Approved Deliverables',
        description: 'Approved deliverables will appear here',
      },
      all: {
        title: 'No Deliverables Yet',
        description: 'Campaign deliverables will appear here',
      },
    };

    const message = emptyMessages[activeTab];

    return (
      <View style={styles.emptyState}>
        <CheckCircle2 size={48} color="#E5E5E5" />
        <Text style={styles.emptyTitle}>{message.title}</Text>
        <Text style={styles.emptyDescription}>{message.description}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFAD27" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Deliverable Reviews</Text>
          <Text style={styles.headerSubtitle}>Review creator submissions</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['pending', 'approved', 'all'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'pending'
                  ? `Pending (${activeTab === 'pending' ? deliverables.length : ''})`
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Auto-Approval Notice */}
      {activeTab === 'pending' && deliverables.length > 0 && (
        <View style={styles.noticeBar}>
          <Clock size={16} color="#F59E0B" />
          <Text style={styles.noticeText}>
            Deliverables auto-approve after 72 hours if not reviewed
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFAD27" />
        }
      >
        {deliverables.length > 0 ? (
          <View style={styles.deliverablesList}>
            {deliverables.map(renderDeliverableCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {reviewAction === 'approve' && 'Approve Deliverable'}
              {reviewAction === 'reject' && 'Reject Deliverable'}
              {reviewAction === 'revision' && 'Request Revision'}
            </Text>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedDeliverable && (
              <>
                <Image
                  source={{
                    uri: selectedDeliverable.thumbnail_url || selectedDeliverable.content_url,
                  }}
                  style={styles.modalImage}
                />

                <Text style={styles.modalLabel}>
                  {reviewAction === 'approve' && 'Review Notes (Optional)'}
                  {reviewAction === 'reject' && 'Rejection Reason (Required)'}
                  {reviewAction === 'revision' && 'Revision Notes (Required)'}
                </Text>
                <TextInput
                  style={styles.modalTextArea}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Great work! Looking forward to the results...'
                      : reviewAction === 'reject'
                      ? 'Please explain why this deliverable is being rejected...'
                      : 'Please describe what needs to be changed...'
                  }
                  placeholderTextColor="#A3A3A3"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                {reviewAction === 'approve' && (
                  <View style={styles.modalInfoBox}>
                    <CheckCircle2 size={20} color="#10B981" />
                    <Text style={styles.modalInfoText}>
                      Payment of ${((selectedDeliverable.payment_amount_cents || 0) / 100).toFixed(0)} will be processed to the creator
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    reviewAction === 'approve' && styles.modalApproveButton,
                    reviewAction === 'reject' && styles.modalRejectButton,
                    reviewAction === 'revision' && styles.modalRevisionButton,
                    submittingReview && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitButtonText}>
                      {reviewAction === 'approve' && 'Approve & Process Payment'}
                      {reviewAction === 'reject' && 'Reject Deliverable'}
                      {reviewAction === 'revision' && 'Request Revision'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: 2,
  },
  tabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  tabActive: {
    backgroundColor: '#FFAD27',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B30',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  scrollView: {
    flex: 1,
  },
  deliverablesList: {
    padding: 16,
  },
  deliverableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
  },
  deliverableCardPending: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  campaignNameText: {
    fontSize: 13,
    color: '#737373',
  },
  autoApprovalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  autoApprovalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  contentImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 13,
    color: '#737373',
    fontWeight: '500',
  },
  postLinkRow: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  postLinkText: {
    fontSize: 14,
    color: '#FFAD27',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  approveButton: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B98130',
  },
  revisionButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B30',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF444430',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  approveButtonText: {
    color: '#10B981',
  },
  revisionButtonText: {
    color: '#F59E0B',
  },
  rejectButtonText: {
    color: '#EF4444',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusAutoApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusRevision: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewedDate: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  modalTextArea: {
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 14,
    color: '#000000',
    marginBottom: 20,
  },
  modalInfoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
  modalSubmitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalApproveButton: {
    backgroundColor: '#10B981',
  },
  modalRejectButton: {
    backgroundColor: '#EF4444',
  },
  modalRevisionButton: {
    backgroundColor: '#F59E0B',
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
