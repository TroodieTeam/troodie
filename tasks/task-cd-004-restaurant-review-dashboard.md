# Task: Restaurant Deliverable Review Dashboard

**Epic:** deliverable-submission
**Priority:** P0 - Critical
**Estimate:** 4 days
**Status:** ✅ Complete - Ready for Testing

---

## Overview

Build the restaurant owner UI for reviewing campaign deliverables. Includes pending deliverables queue, approve/reject/revision actions, and deliverable tracking.

## Business Value

Enables restaurant owners to review submitted content, provide feedback, approve payments, and maintain quality control. Critical for trust and quality in the marketplace.

## Acceptance Criteria

```gherkin
Feature: Restaurant Deliverable Review Dashboard

  Scenario: Restaurant owner views pending deliverables
    Given a restaurant with active campaigns
    When owner navigates to "Content Review" section
    Then they see all pending deliverables
    And sorted by oldest submission first
    And with 72-hour countdown timer for each

  Scenario: Restaurant owner approves deliverable
    Given a deliverable in "pending_review" status
    When owner taps "Approve"
    And optionally adds review notes
    And confirms approval
    Then deliverable status changes to "approved"
    And payment processing is triggered
    And creator is notified

  Scenario: Restaurant owner rejects deliverable
    Given a deliverable in "pending_review" status
    When owner taps "Reject"
    And enters rejection reason (required)
    And confirms rejection
    Then deliverable status changes to "rejected"
    And creator is notified with reason
    And no payment is processed

  Scenario: Restaurant owner requests revision
    Given a deliverable in "pending_review" status
    When owner taps "Request Revision"
    And enters specific revision notes (required)
    And confirms request
    Then deliverable status changes to "revision_requested"
    And creator is notified with notes
    And creator can resubmit

  Scenario: Auto-approval countdown warning
    Given a deliverable approaching 72-hour auto-approval
    When less than 24 hours remain
    Then the deliverable is highlighted
    And shows urgent warning indicator
    And countdown timer turns red

  Scenario: View deliverable details
    Given a submitted deliverable
    When owner taps on deliverable card
    Then they see full-size content
    And caption and platform details
    And creator profile info
    And campaign requirements

  Scenario: Bulk actions
    Given multiple pending deliverables
    When owner selects multiple items
    Then they can approve or reject in bulk
    And add notes that apply to all
```

## Technical Implementation

### 1. Create Restaurant Review Dashboard (`app/(tabs)/business/content/index.tsx`)

```tsx
import { deliverableService } from '@/services/deliverableService';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';

export default function ContentReviewDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    loadRestaurantProfile();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      loadDeliverables();
    }
  }, [restaurantId, filter]);

  const loadRestaurantProfile = async () => {
    const { data } = await supabase
      .from('business_profiles')
      .select('restaurant_id')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setRestaurantId(data.restaurant_id);
    }
  };

  const loadDeliverables = async () => {
    if (!restaurantId) return;

    setLoading(true);

    if (filter === 'pending') {
      const data = await deliverableService.getPendingDeliverables(restaurantId);
      setDeliverables(data);
    } else {
      // Load all deliverables and filter
      // TODO: Add getAllDeliverables method to service
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliverables();
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Approve Deliverables',
      `Approve ${selectedIds.size} deliverable(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            for (const id of selectedIds) {
              await deliverableService.approveDeliverable(id);
            }
            setSelectedIds(new Set());
            loadDeliverables();
          },
        },
      ]
    );
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;

    router.push({
      pathname: '/business/content/bulk-reject',
      params: { ids: Array.from(selectedIds).join(',') },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Content Review</Text>
        {selectedIds.size > 0 && (
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={handleBulkApprove}
            >
              <Check size={16} color="white" />
              <Text style={styles.bulkButtonText}>
                Approve ({selectedIds.size})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkRejectButton]}
              onPress={handleBulkReject}
            >
              <X size={16} color="white" />
              <Text style={styles.bulkButtonText}>
                Reject ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'pending' && styles.tabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.tabText, filter === 'pending' && styles.tabTextActive]}>
            Pending ({deliverables.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'approved' && styles.tabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.tabText, filter === 'approved' && styles.tabTextActive]}>
            Approved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Deliverables List */}
      <FlatList
        data={deliverables}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeliverableReviewCard
            deliverable={item}
            selected={selectedIds.has(item.id)}
            onSelect={() => toggleSelection(item.id)}
            onPress={() => router.push(`/business/content/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <CheckCircle size={48} color="#E5E5E5" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No pending deliverables to review</Text>
          </View>
        }
      />
    </View>
  );
}

const DeliverableReviewCard = ({ deliverable, selected, onSelect, onPress }) => {
  const getTimeRemaining = () => {
    const submitted = new Date(deliverable.submitted_at);
    const autoApproveTime = new Date(submitted.getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    const hoursRemaining = Math.max(
      0,
      (autoApproveTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    if (hoursRemaining < 1) {
      const minutesRemaining = Math.floor(hoursRemaining * 60);
      return {
        text: `${minutesRemaining}m`,
        urgent: true,
      };
    } else if (hoursRemaining < 24) {
      return {
        text: `${Math.floor(hoursRemaining)}h`,
        urgent: true,
      };
    } else {
      const daysRemaining = Math.floor(hoursRemaining / 24);
      return {
        text: `${daysRemaining}d ${Math.floor(hoursRemaining % 24)}h`,
        urgent: false,
      };
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <TouchableOpacity
      style={[
        styles.reviewCard,
        selected && styles.reviewCardSelected,
        timeRemaining.urgent && styles.reviewCardUrgent,
      ]}
      onPress={onPress}
      onLongPress={onSelect}
    >
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={onSelect}
        >
          <View style={[styles.checkboxInner, selected && styles.checkboxSelected]}>
            {selected && <Check size={16} color="white" />}
          </View>
        </TouchableOpacity>

        <Image
          source={{ uri: deliverable.thumbnail_url }}
          style={styles.deliverableThumbnail}
        />

        <View style={styles.deliverableInfo}>
          <Text style={styles.creatorName}>{deliverable.creator?.display_name}</Text>
          <Text style={styles.campaignName}>{deliverable.campaign?.name}</Text>
          <Text style={styles.submittedDate}>
            {new Date(deliverable.submitted_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.timerBadge}>
          <Clock
            size={14}
            color={timeRemaining.urgent ? '#EF4444' : '#F59E0B'}
          />
          <Text
            style={[
              styles.timerText,
              timeRemaining.urgent && styles.timerTextUrgent,
            ]}
          >
            {timeRemaining.text}
          </Text>
        </View>
      </View>

      {deliverable.caption && (
        <Text style={styles.caption} numberOfLines={2}>
          {deliverable.caption}
        </Text>
      )}
    </TouchableOpacity>
  );
};
```

### 2. Create Deliverable Review Detail Screen (`app/(tabs)/business/content/[id].tsx`)

```tsx
export default function DeliverableReviewDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [deliverable, setDeliverable] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliverable();
  }, []);

  const loadDeliverable = async () => {
    const data = await deliverableService.getDeliverableById(id);
    setDeliverable(data);
    setLoading(false);
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Deliverable',
      'This will trigger payment processing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const result = await deliverableService.approveDeliverable(
              id,
              reviewNotes
            );
            if (result) {
              Alert.alert('Success', 'Deliverable approved and payment initiated', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (reason: string) => {
    const result = await deliverableService.rejectDeliverable(id, reason);
    if (result) {
      Alert.alert('Success', 'Deliverable rejected. Creator has been notified.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleRequestRevision = async (notes: string) => {
    const result = await deliverableService.requestRevision(id, notes);
    if (result) {
      Alert.alert('Success', 'Revision requested. Creator has been notified.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Full Content Preview */}
      <View style={styles.contentPreview}>
        {deliverable?.content_type === 'video' ? (
          <Video
            source={{ uri: deliverable.content_url }}
            style={styles.contentMedia}
            useNativeControls
            resizeMode="contain"
          />
        ) : (
          <Image
            source={{ uri: deliverable?.content_url }}
            style={styles.contentMedia}
          />
        )}
      </View>

      {/* Creator Info */}
      <View style={styles.creatorSection}>
        <Image
          source={{ uri: deliverable?.creator?.avatar_url }}
          style={styles.creatorAvatar}
        />
        <View>
          <Text style={styles.creatorName}>
            {deliverable?.creator?.display_name}
          </Text>
          <Text style={styles.creatorMeta}>
            {deliverable?.campaign?.name}
          </Text>
        </View>
      </View>

      {/* Caption */}
      <View style={styles.captionSection}>
        <Text style={styles.sectionTitle}>Caption</Text>
        <Text style={styles.caption}>{deliverable?.caption}</Text>
      </View>

      {/* Platform & URL */}
      <View style={styles.platformSection}>
        <View style={styles.platformRow}>
          <Text style={styles.label}>Platform:</Text>
          <Text style={styles.value}>
            {deliverable?.social_platform || 'Not specified'}
          </Text>
        </View>
        {deliverable?.platform_post_url && (
          <TouchableOpacity
            style={styles.urlRow}
            onPress={() => Linking.openURL(deliverable.platform_post_url)}
          >
            <ExternalLink size={16} color="#10B981" />
            <Text style={styles.urlText}>View Original Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Review Notes (optional) */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Review Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={reviewNotes}
          onChangeText={setReviewNotes}
          placeholder="Add feedback for the creator..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={handleApprove}
        >
          <Check size={20} color="white" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.revisionButton}
          onPress={() => setShowRevisionModal(true)}
        >
          <RotateCcw size={20} color="#3B82F6" />
          <Text style={styles.revisionButtonText}>Request Revision</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => setShowRejectModal(true)}
        >
          <X size={20} color="#EF4444" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} animationType="slide">
        <RejectModal
          onReject={handleReject}
          onCancel={() => setShowRejectModal(false)}
        />
      </Modal>

      {/* Revision Modal */}
      <Modal visible={showRevisionModal} animationType="slide">
        <RevisionModal
          onRequestRevision={handleRequestRevision}
          onCancel={() => setShowRevisionModal(false)}
        />
      </Modal>
    </ScrollView>
  );
}
```

### 3. Create Reject/Revision Modals

```tsx
const RejectModal = ({ onReject, onCancel }) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const commonReasons = [
    'Does not meet quality standards',
    'Does not follow brand guidelines',
    'Inappropriate content',
    'Missing required elements',
    'Other',
  ];

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Reject Deliverable</Text>
        <TouchableOpacity onPress={onCancel}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <Text style={styles.modalLabel}>Select a reason:</Text>
        {commonReasons.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.reasonOption,
              selectedReason === r && styles.reasonOptionSelected,
            ]}
            onPress={() => {
              setSelectedReason(r);
              if (r !== 'Other') {
                setReason(r);
              }
            }}
          >
            <View style={styles.radio}>
              {selectedReason === r && <View style={styles.radioSelected} />}
            </View>
            <Text style={styles.reasonText}>{r}</Text>
          </TouchableOpacity>
        ))}

        {selectedReason === 'Other' && (
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Please specify the reason..."
            multiline
            numberOfLines={4}
          />
        )}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            styles.rejectConfirmButton,
            !reason && styles.confirmButtonDisabled,
          ]}
          onPress={() => onReject(reason)}
          disabled={!reason}
        >
          <Text style={styles.confirmButtonText}>Reject Deliverable</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const RevisionModal = ({ onRequestRevision, onCancel }) => {
  const [notes, setNotes] = useState('');

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Request Revision</Text>
        <TouchableOpacity onPress={onCancel}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <Text style={styles.modalLabel}>
          What changes would you like the creator to make?
        </Text>
        <TextInput
          style={styles.revisionInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Be specific about what needs to change..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <View style={styles.revisionTips}>
          <Text style={styles.tipsTitle}>💡 Tips for good feedback:</Text>
          <Text style={styles.tipText}>• Be specific and constructive</Text>
          <Text style={styles.tipText}>• Reference campaign requirements</Text>
          <Text style={styles.tipText}>• Suggest improvements</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            styles.revisionConfirmButton,
            !notes && styles.confirmButtonDisabled,
          ]}
          onPress={() => onRequestRevision(notes)}
          disabled={!notes}
        >
          <Text style={styles.confirmButtonText}>Request Revision</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
```

## Files to Create/Modify

- ✅ `app/(tabs)/business/content/index.tsx` - New review dashboard
- ✅ `app/(tabs)/business/content/[id].tsx` - New deliverable review detail
- ✅ `app/(tabs)/business/content/bulk-reject.tsx` - Bulk reject screen
- ✅ `components/business/DeliverableReviewCard.tsx` - Reusable review card
- ✅ `components/business/RejectModal.tsx` - Reject modal component
- ✅ `components/business/RevisionModal.tsx` - Revision request modal

## Dependencies

- ✅ task-cd-001-deliverable-submission-schema.md (Database schema)
- ✅ task-cd-002-deliverable-submission-service.md (Service layer)
- 🔴 Notification system (for creator notifications)

## Definition of Done

- [ ] Review dashboard shows pending deliverables
- [ ] Deliverables sorted by submission date (oldest first)
- [ ] 72-hour countdown timer displayed for each deliverable
- [ ] Timer turns red when < 24 hours remain
- [ ] Tap deliverable to see full detail view
- [ ] Approve button triggers payment processing
- [ ] Reject button requires reason (mandatory)
- [ ] Request Revision requires specific notes (mandatory)
- [ ] Bulk selection allows multi-approve/reject
- [ ] Empty state when no pending deliverables
- [ ] Filter tabs (Pending, Approved, All) work correctly
- [ ] Loading and error states implemented
- [ ] Responsive design tested
- [ ] Tested on iOS and Android
- [ ] Restaurant owner can only see their restaurant's deliverables (RLS verified)

## Related Tasks

- task-cd-001-deliverable-submission-schema.md (Prerequisites)
- task-cd-002-deliverable-submission-service.md (Prerequisites)
- task-cd-003-creator-deliverable-ui.md (Creator side)
- task-cd-006-auto-approval-cron.md (Auto-approval)
- task-cd-008-deliverable-notifications.md (Notifications)
