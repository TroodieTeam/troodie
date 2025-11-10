import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { adminReviewService } from '@/services/adminReviewService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';

export default function AdminReviewsScreen() {
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'restaurant_claim' | 'creator_application',
    status: 'pending',
    priority: 'all',
    dateRange: 'all'
  });

  const [data, setData] = useState<any>({ items: [], total: 0, page: 1, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState<any>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await adminReviewService.getPendingReviews({
        type: filters.type,
        page: data.page,
        limit: 20,
        sort_by: 'submitted_at',
        order: 'desc'
      });
      setData(response);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleReviewItem = (item: any) => {
    setSelectedReviewItem(item);
    setShowReviewModal(true);
  };

  const handleApprove = async (item: any, notes?: string) => {
    try {
      setLoading(true);
      if (item.type === 'restaurant_claim') {
        await adminReviewService.approveRestaurantClaim(item.id, {
          review_notes: notes,
          auto_notify: true
        });
      } else {
        await adminReviewService.approveCreatorApplication(item.id, {
          review_notes: notes,
          auto_notify: true
        });
      }
      Alert.alert('Success', 'Item approved successfully');
      setShowReviewModal(false);
      fetchReviews();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve item');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (item: any, reason: string, notes?: string) => {
    try {
      setLoading(true);
      if (item.type === 'restaurant_claim') {
        await adminReviewService.rejectRestaurantClaim(item.id, {
          rejection_reason: reason,
          review_notes: notes,
          allow_resubmit: true,
          auto_notify: true
        });
      } else {
        await adminReviewService.rejectCreatorApplication(item.id, {
          rejection_reason: reason,
          review_notes: notes,
          allow_resubmit: true,
          auto_notify: true
        });
      }
      Alert.alert('Success', 'Item rejected successfully');
      setShowReviewModal(false);
      fetchReviews();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject item');
    } finally {
      setLoading(false);
    }
  };

  const renderQueueItem = (item: any) => {
    const isExpanded = expandedItem === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.queueItem}
        onPress={() => setExpandedItem(isExpanded ? null : item.id)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemBadges}>
            <View style={[styles.typeBadge,
              { backgroundColor: item.type === 'restaurant_claim' ? '#FFE5E5' : '#E5F9F6' }
            ]}>
              <Text style={[styles.typeBadgeText,
                { color: item.type === 'restaurant_claim' ? '#FF6B6B' : '#4ECDC4' }
              ]}>
                {item.type === 'restaurant_claim' ? 'Restaurant' : 'Creator'}
              </Text>
            </View>
            <Text style={styles.timeText}>
              {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        </View>

        <Text style={styles.itemTitle}>
          {item.type === 'restaurant_claim'
            ? item.details?.restaurant_name || 'Restaurant Claim'
            : `Creator: ${item.user_name}`}
        </Text>

        <Text style={styles.itemSubtitle}>
          Submitted by: {item.user_name} ({item.user_email})
        </Text>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailsSection}>
              {item.type === 'restaurant_claim' ? (
                <>
                  <Text style={styles.detailText}>
                    Proof Type: {item.details?.ownership_proof_type}
                  </Text>
                  <Text style={styles.detailText}>
                    Business Email: {item.details?.business_email}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.detailText}>
                    Followers: {item.details?.follower_count?.toLocaleString() || 'N/A'}
                  </Text>
                  <Text style={styles.detailText}>
                    Platforms: {item.details?.platforms?.join(', ') || 'N/A'}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => handleReviewItem(item)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Review Queue</Text>
          <Text style={styles.subtitle}>
            {data.total} pending submissions
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterTab, filters.type === 'all' && styles.filterTabActive]}
          onPress={() => setFilters({ ...filters, type: 'all' })}
        >
          <Text style={[styles.filterTabText, filters.type === 'all' && styles.filterTabTextActive]}>
            All Types
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filters.type === 'restaurant_claim' && styles.filterTabActive]}
          onPress={() => setFilters({ ...filters, type: 'restaurant_claim' })}
        >
          <Text style={[styles.filterTabText, filters.type === 'restaurant_claim' && styles.filterTabTextActive]}>
            Restaurants
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filters.type === 'creator_application' && styles.filterTabActive]}
          onPress={() => setFilters({ ...filters, type: 'creator_application' })}
        >
          <Text style={[styles.filterTabText, filters.type === 'creator_application' && styles.filterTabTextActive]}>
            Creators
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Queue Items */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && data.items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFAD27" />
          </View>
        ) : data.items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pending reviews</Text>
            <Text style={styles.emptySubtext}>All caught up!</Text>
          </View>
        ) : (
          data.items.map(renderQueueItem)
        )}
      </ScrollView>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        item={selectedReviewItem}
        onClose={() => setShowReviewModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
      />
    </SafeAreaView>
  );
}

// Review Modal Component
function ReviewModal({ visible, item, onClose, onApprove, onReject, loading }: any) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(item, reviewNotes);
    } else if (action === 'reject') {
      if (!rejectionReason) {
        Alert.alert('Error', 'Rejection reason is required');
        return;
      }
      onReject(item, rejectionReason, reviewNotes);
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Review Submission</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
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

                <Text style={styles.detailLabel}>Proof Type:</Text>
                <Text style={styles.detailValue}>{item.details?.ownership_proof_type}</Text>
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
              </>
            )}
          </View>

          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Action</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, action === 'approve' && styles.approveButtonActive]}
                onPress={() => setAction('approve')}
              >
                <Text style={[styles.actionButtonText, action === 'approve' && styles.actionButtonTextActive]}>
                  Approve
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, action === 'reject' && styles.rejectButtonActive]}
                onPress={() => setAction('reject')}
              >
                <Text style={[styles.actionButtonText, action === 'reject' && styles.actionButtonTextActive]}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {action === 'reject' && (
            <View style={styles.rejectionSection}>
              <Text style={styles.sectionTitle}>Rejection Reason *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Internal Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Add any internal notes..."
              value={reviewNotes}
              onChangeText={setReviewNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, (!action || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!action || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Processing...' : 'Submit Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#FFAD27',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  queueItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  reviewButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailsCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
  actionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  approveButtonActive: {
    backgroundColor: '#4CAF50',
  },
  rejectButtonActive: {
    backgroundColor: '#f44336',
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
  notesSection: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
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