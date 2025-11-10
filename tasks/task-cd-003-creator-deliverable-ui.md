# Task: Creator Deliverable Submission UI

**Epic:** deliverable-submission
**Priority:** P0 - Critical
**Estimate:** 4 days
**Status:** ✅ Complete - Ready for Testing

---

## Overview

Build the creator-facing UI for submitting campaign deliverables. Includes deliverable creation form, draft management, submission tracking, and revision handling.

## Business Value

Enables creators to submit their work for campaigns, track approval status, respond to revision requests, and see payment status. Core user experience for creators in the deliverables flow.

## Acceptance Criteria

```gherkin
Feature: Creator Deliverable Submission UI

  Scenario: Creator views active campaign deliverables
    Given a creator with accepted campaigns
    When they navigate to "My Campaigns" → Active campaign
    Then they see a "Submit Deliverable" button
    And they can view previously submitted deliverables
    And deliverable status is clearly displayed

  Scenario: Creator submits a photo deliverable
    Given a creator on an active campaign detail screen
    When they tap "Submit Deliverable"
    And select content type "Photo"
    And upload an image from camera roll
    And enter caption and platform details
    And tap "Submit for Review"
    Then deliverable is created with status "pending_review"
    And they see a success confirmation
    And restaurant owner is notified

  Scenario: Creator saves draft deliverable
    Given a creator is filling out deliverable form
    When they tap "Save as Draft"
    Then deliverable is saved with status "draft"
    And they can edit it later from drafts list

  Scenario: Creator sees revision request
    Given a deliverable with status "revision_requested"
    When creator views the deliverable
    Then they see the revision notes from restaurant
    And they can upload a new version
    And previous version is saved to revision history

  Scenario: Creator tracks payment status
    Given an approved deliverable
    When creator views deliverable details
    Then they see payment status (pending/processing/completed)
    And payment amount
    And payment date when completed

  Scenario: Creator views deliverable analytics
    Given a deliverable with metrics
    When creator views the deliverable
    Then they see views, likes, comments, shares
    And engagement rate percentage
    And they can update metrics manually
```

## Technical Implementation

### 1. Update Campaign Detail Screen (`app/creator/campaigns/[id].tsx`)

Add deliverable submission UI to existing campaign detail screen:

```tsx
import { deliverableService } from '@/services/deliverableService';
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliverables();
  }, []);

  const loadDeliverables = async () => {
    // Get creator ID from profile
    const creatorId = '...';
    const data = await deliverableService.getMyDeliverables(creatorId);
    const campaignDeliverables = data.filter(d => d.campaign_id === id);
    setDeliverables(campaignDeliverables);
    setLoading(false);
  };

  return (
    <ScrollView>
      {/* Campaign Info */}
      <View style={styles.campaignHeader}>
        {/* ... existing campaign details ... */}
      </View>

      {/* Deliverables Section */}
      <View style={styles.deliverablesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Deliverables</Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => router.push(`/creator/deliverables/create?campaignId=${id}`)}
          >
            <Text style={styles.submitButtonText}>+ Submit Deliverable</Text>
          </TouchableOpacity>
        </View>

        {/* Deliverables List */}
        {deliverables.map(deliverable => (
          <DeliverableCard
            key={deliverable.id}
            deliverable={deliverable}
            onPress={() => router.push(`/creator/deliverables/${deliverable.id}`)}
          />
        ))}

        {deliverables.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deliverables submitted yet</Text>
            <Text style={styles.emptySubtext}>
              Submit your content to get paid
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const DeliverableCard = ({ deliverable, onPress }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'auto_approved':
        return '#10B981';
      case 'pending_review':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      case 'revision_requested':
        return '#3B82F6';
      case 'draft':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'auto_approved':
        return 'Auto-Approved';
      case 'pending_review':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      case 'revision_requested':
        return 'Revision Requested';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Paid';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity style={styles.deliverableCard} onPress={onPress}>
      <Image source={{ uri: deliverable.thumbnail_url }} style={styles.thumbnail} />
      <View style={styles.deliverableInfo}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(deliverable.status)}20` },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(deliverable.status) }]}
            >
              {getStatusText(deliverable.status)}
            </Text>
          </View>
          {deliverable.payment_status === 'completed' && (
            <View style={styles.paidBadge}>
              <Check size={12} color="white" />
              <Text style={styles.paidText}>
                ${deliverable.payment_amount_cents / 100}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.deliverableCaption} numberOfLines={2}>
          {deliverable.caption || 'No caption'}
        </Text>
        <Text style={styles.deliverableDate}>
          {new Date(deliverable.submitted_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
```

### 2. Create Deliverable Submission Form (`app/creator/deliverables/create.tsx`)

```tsx
import { deliverableService } from '@/services/deliverableService';
import { imageUploadServiceV2 } from '@/services/imageUploadServiceV2';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export default function CreateDeliverableScreen() {
  const { campaignId, applicationId } = useLocalSearchParams();
  const router = useRouter();

  const [contentType, setContentType] = useState<'photo' | 'video' | 'reel' | 'story'>('photo');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState<string>('instagram');
  const [platformUrl, setPlatformUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSaveDraft = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    setUploading(true);

    try {
      // Upload image
      const contentUrl = await imageUploadServiceV2.uploadImage(imageUri, 'deliverables');

      // Save as draft
      const deliverable = await deliverableService.saveDraftDeliverable({
        campaign_application_id: applicationId,
        content_type: contentType,
        content_url: contentUrl,
        thumbnail_url: contentUrl,
        caption,
        social_platform: platform,
        platform_post_url: platformUrl,
      });

      if (deliverable) {
        Alert.alert('Success', 'Draft saved successfully');
        router.back();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please add a caption');
      return;
    }

    setUploading(true);

    try {
      // Upload image
      const contentUrl = await imageUploadServiceV2.uploadImage(imageUri, 'deliverables');

      // Submit deliverable
      const deliverable = await deliverableService.submitDeliverable({
        campaign_application_id: applicationId,
        content_type: contentType,
        content_url: contentUrl,
        thumbnail_url: contentUrl,
        caption,
        social_platform: platform,
        platform_post_url: platformUrl,
      });

      if (deliverable) {
        Alert.alert(
          'Success',
          'Deliverable submitted for review! You\'ll be notified when it\'s approved.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      Alert.alert('Error', 'Failed to submit deliverable');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Submit Deliverable</Text>

      {/* Content Type Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Content Type</Text>
        <View style={styles.contentTypeRow}>
          {['photo', 'video', 'reel', 'story'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.contentTypeButton,
                contentType === type && styles.contentTypeButtonActive,
              ]}
              onPress={() => setContentType(type)}
            >
              <Text
                style={[
                  styles.contentTypeText,
                  contentType === type && styles.contentTypeTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Image/Video Upload */}
      <View style={styles.section}>
        <Text style={styles.label}>Upload Content</Text>
        {imageUri ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
            >
              <Text style={styles.changeImageText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadButtons}>
            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
              <Camera size={24} color="#10B981" />
              <Text style={styles.uploadButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Image size={24} color="#10B981" />
              <Text style={styles.uploadButtonText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Caption */}
      <View style={styles.section}>
        <Text style={styles.label}>Caption *</Text>
        <TextInput
          style={styles.textArea}
          value={caption}
          onChangeText={setCaption}
          placeholder="Write your caption here..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Platform */}
      <View style={styles.section}>
        <Text style={styles.label}>Platform</Text>
        <View style={styles.platformRow}>
          {['instagram', 'tiktok', 'youtube', 'twitter'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.platformButton,
                platform === p && styles.platformButtonActive,
              ]}
              onPress={() => setPlatform(p)}
            >
              <Text
                style={[
                  styles.platformText,
                  platform === p && styles.platformTextActive,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Platform URL */}
      <View style={styles.section}>
        <Text style={styles.label}>Post URL (optional)</Text>
        <TextInput
          style={styles.input}
          value={platformUrl}
          onChangeText={setPlatformUrl}
          placeholder="https://instagram.com/p/..."
          keyboardType="url"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.draftButton}
          onPress={handleSaveDraft}
          disabled={uploading}
        >
          <Text style={styles.draftButtonText}>Save as Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

### 3. Create Deliverable Detail Screen (`app/creator/deliverables/[id].tsx`)

Shows deliverable status, metrics, payment info, and revision requests:

```tsx
export default function DeliverableDetailScreen() {
  const { id } = useLocalSearchParams();
  const [deliverable, setDeliverable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliverable();
  }, []);

  const loadDeliverable = async () => {
    const data = await deliverableService.getDeliverableById(id);
    setDeliverable(data);
    setLoading(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Content Preview */}
      <Image source={{ uri: deliverable.content_url }} style={styles.contentImage} />

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Status</Text>
          <StatusBadge status={deliverable.status} />
        </View>

        {deliverable.status === 'revision_requested' && (
          <View style={styles.revisionNotice}>
            <AlertCircle size={20} color="#F59E0B" />
            <Text style={styles.revisionText}>Revision requested</Text>
          </View>
        )}

        {deliverable.review_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Review Notes:</Text>
            <Text style={styles.notesText}>{deliverable.review_notes}</Text>
          </View>
        )}

        {deliverable.revision_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Revision Notes:</Text>
            <Text style={styles.notesText}>{deliverable.revision_notes}</Text>
          </View>
        )}

        {deliverable.rejection_reason && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Rejection Reason:</Text>
            <Text style={styles.notesText}>{deliverable.rejection_reason}</Text>
          </View>
        )}
      </View>

      {/* Payment Card */}
      <View style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Payment</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentAmount}>
            ${deliverable.payment_amount_cents / 100}
          </Text>
          <PaymentStatusBadge status={deliverable.payment_status} />
        </View>
        {deliverable.paid_at && (
          <Text style={styles.paidDate}>
            Paid on {new Date(deliverable.paid_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Metrics Card */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricItem icon={Eye} label="Views" value={deliverable.views_count} />
          <MetricItem icon={Heart} label="Likes" value={deliverable.likes_count} />
          <MetricItem icon={MessageCircle} label="Comments" value={deliverable.comments_count} />
          <MetricItem icon={Share2} label="Shares" value={deliverable.shares_count} />
        </View>
        {deliverable.engagement_rate && (
          <Text style={styles.engagementRate}>
            {deliverable.engagement_rate.toFixed(2)}% engagement rate
          </Text>
        )}
        <TouchableOpacity style={styles.updateMetricsButton}>
          <Text style={styles.updateMetricsText}>Update Metrics</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      {deliverable.status === 'revision_requested' && (
        <TouchableOpacity
          style={styles.resubmitButton}
          onPress={() => router.push(`/creator/deliverables/create?revisionOf=${id}`)}
        >
          <Text style={styles.resubmitButtonText}>Submit Revision</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
```

## Files to Create/Modify

- ✅ `app/creator/campaigns/[id].tsx` - Update existing campaign detail screen
- ✅ `app/creator/deliverables/create.tsx` - New deliverable submission form
- ✅ `app/creator/deliverables/[id].tsx` - New deliverable detail screen
- ✅ `components/creator/DeliverableCard.tsx` - Reusable deliverable card component
- ✅ `components/creator/StatusBadge.tsx` - Status badge component

## Dependencies

- ✅ task-cd-001-deliverable-submission-schema.md (Database schema)
- ✅ task-cd-002-deliverable-submission-service.md (Service layer)
- ✅ imageUploadServiceV2.ts (Image upload)
- 🔴 Notification system (for status updates)

## Definition of Done

- [ ] Campaign detail screen shows deliverables section
- [ ] "Submit Deliverable" button navigates to creation form
- [ ] Deliverable creation form allows content upload
- [ ] Caption, platform, and URL fields work correctly
- [ ] "Save as Draft" saves deliverable with draft status
- [ ] "Submit for Review" submits deliverable and shows confirmation
- [ ] Deliverable detail screen shows status, payment, and metrics
- [ ] Revision request UI shows notes and allows resubmission
- [ ] Status badges show correct colors and text
- [ ] Payment status displayed accurately
- [ ] Metrics can be viewed and updated
- [ ] Loading states implemented
- [ ] Error handling with user-friendly messages
- [ ] Responsive design on various screen sizes
- [ ] Tested on iOS and Android

## Related Tasks

- task-cd-001-deliverable-submission-schema.md (Prerequisites)
- task-cd-002-deliverable-submission-service.md (Prerequisites)
- task-cd-004-restaurant-review-dashboard.md (Restaurant side)
- task-cd-008-deliverable-notifications.md (Notifications)
