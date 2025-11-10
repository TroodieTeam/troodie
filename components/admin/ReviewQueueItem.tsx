import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import ReviewModal from './ReviewModal';

interface ReviewQueueItemProps {
  item: any;
  selected: boolean;
  expanded: boolean;
  onSelect: (selected: boolean) => void;
  onExpand: () => void;
  onRefresh: () => void;
}

export default function ReviewQueueItem({
  item,
  selected,
  expanded,
  onSelect,
  onExpand,
  onRefresh
}: ReviewQueueItemProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);

  const getTypeColor = (type: string) => {
    return type === 'restaurant_claim' ? '#FF6B6B' : '#4ECDC4';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const calculatePriority = () => {
    const daysSinceSubmission = Math.floor(
      (Date.now() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (item.type === 'restaurant_claim') {
      if (daysSinceSubmission > 3) return 'high';
      return 'medium';
    }

    if (item.type === 'creator_application') {
      if (item.details?.follower_count > 10000) return 'high';
      if (item.details?.follower_count > 5000) return 'medium';
      return 'low';
    }

    return 'medium';
  };

  const priority = calculatePriority();

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => onSelect(!selected)}
          >
            <Ionicons
              name={selected ? "checkbox" : "square-outline"}
              size={20}
              color="#FFAD27"
            />
          </TouchableOpacity>

          <View style={styles.mainContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.badges}>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>
                    {item.type === 'restaurant_claim' ? 'Restaurant' : 'Creator'}
                  </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(priority) + '20' }]}>
                  <Text style={[styles.priorityBadgeText, { color: getPriorityColor(priority) }]}>
                    {priority} priority
                  </Text>
                </View>
                <Text style={styles.timeText}>
                  {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {item.type === 'restaurant_claim'
                ? item.details?.restaurant_name || 'Restaurant Claim'
                : `Creator: ${item.user_name}`}
            </Text>

            {/* Submitter Info */}
            <Text style={styles.submitterText}>
              Submitted by: {item.user_name} ({item.user_email})
            </Text>

            {/* Quick Info */}
            <View style={styles.quickInfo}>
              {item.type === 'restaurant_claim' ? (
                <>
                  {item.details?.ownership_proof_type && (
                    <Text style={styles.infoText}>
                      Proof: {item.details.ownership_proof_type}
                    </Text>
                  )}
                  {item.details?.business_email && (
                    <Text style={styles.infoText}>
                      Business: {item.details.business_email}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  {item.details?.follower_count && (
                    <Text style={styles.infoText}>
                      {item.details.follower_count.toLocaleString()} followers
                    </Text>
                  )}
                  {item.details?.platforms && (
                    <Text style={styles.infoText}>
                      Platforms: {item.details.platforms.join(', ')}
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Expanded Details */}
            {expanded && (
              <View style={styles.expandedDetails}>
                <Text style={styles.detailsTitle}>Full Details</Text>
                {item.type === 'restaurant_claim' ? (
                  <View>
                    <Text style={styles.detailText}>Restaurant: {item.details?.restaurant_name}</Text>
                    <Text style={styles.detailText}>Address: {item.details?.restaurant_address}</Text>
                    <Text style={styles.detailText}>Proof Type: {item.details?.ownership_proof_type}</Text>
                    <Text style={styles.detailText}>Business Email: {item.details?.business_email}</Text>
                    <Text style={styles.detailText}>Phone: {item.details?.business_phone}</Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.detailText}>Bio: {item.details?.bio}</Text>
                    <Text style={styles.detailText}>Categories: {item.details?.content_categories?.join(', ')}</Text>
                    <Text style={styles.detailText}>Instagram: {item.details?.instagram_handle}</Text>
                    <Text style={styles.detailText}>TikTok: {item.details?.tiktok_handle}</Text>
                    <Text style={styles.detailText}>YouTube: {item.details?.youtube_handle}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onExpand} style={styles.expandButton}>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          item={item}
          onClose={() => setShowReviewModal(false)}
          onComplete={() => {
            setShowReviewModal(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
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
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  submitterText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  quickInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  actions: {
    marginLeft: 12,
    alignItems: 'center',
    gap: 8,
  },
  expandButton: {
    padding: 4,
  },
  reviewButton: {
    backgroundColor: '#FFAD27',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});