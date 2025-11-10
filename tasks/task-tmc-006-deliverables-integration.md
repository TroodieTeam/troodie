# Troodie-Managed Campaigns: Deliverables Integration

- Epic: TMC (Troodie-Managed Campaigns)
- Priority: High
- Estimate: 1 day
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: TMC-001 (Database Schema), TMC-003 (Admin UI), CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md

## Overview
Integrate Troodie-managed campaigns with the existing campaign deliverables submission and review system. Ensure creators can submit content deliverables (URLs + screenshots) for platform-managed campaigns, and that Troodie admins can review, approve, or request revisions just like restaurants do for regular campaigns. Leverage the 3-day auto-approval system detailed in CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md.

## Business Value
- Ensures consistent creator experience across all campaign types
- Enables Troodie to verify content quality before payment
- Provides audit trail for all platform-managed campaign deliverables
- Supports auto-approval workflow to prevent creator payment delays
- Maintains transparency and accountability for platform spend
- Critical for MVP launch with platform-managed campaigns

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Deliverables for Troodie-Managed Campaigns
  As a creator
  I want to submit deliverables for Troodie campaigns
  So that I can complete my work and receive payment

  Scenario: Submit deliverables for Troodie-direct campaign
    Given I have been accepted to a Troodie-direct campaign
    And I have created content according to requirements
    When I navigate to the campaign application
    And I click "Submit Deliverables"
    Then I see the deliverable submission form
    And I can enter content URL (Instagram, TikTok, etc.)
    And I can upload screenshot proof
    And I can add optional caption and engagement metrics
    And I submit the deliverables
    Then my application status changes to "pending_review"
    And Troodie admins are notified for review

  Scenario: Submit deliverables for partnership campaign
    Given I have been accepted to a partnership campaign
    When I submit deliverables
    Then the workflow is identical to regular restaurant campaigns
    And The partner restaurant receives notification (not Troodie)
    And Partnership subsidy tracking continues in background

  Scenario: Submit deliverables for community challenge
    Given I have been accepted to a community challenge
    When I submit deliverables
    Then my content is visible to other participants
    And Community voting/judging can begin
    And Deliverables contribute to challenge leaderboard

  Scenario: Admin reviews Troodie campaign deliverables
    Given a creator has submitted deliverables for a Troodie campaign
    When I (admin) view the deliverable review dashboard
    Then I see pending deliverables for all platform campaigns
    And I can view the submitted URL and screenshot
    And I can approve, reject, or request revisions
    And Creator is notified of my decision

  Scenario: Auto-approval after 3 days
    Given a creator submitted deliverables 3 days ago
    And Troodie admins have not reviewed them
    When the 72-hour auto-approval timer expires
    Then deliverables are automatically approved
    And Application status changes to "completed"
    And Creator is marked for payment
    And Creator receives "Your content was approved" notification

  Scenario: Track deliverable metrics for analytics
    Given multiple creators have completed Troodie campaigns
    When I view campaign analytics
    Then I see deliverable submission rates
    And I see average time to approval
    And I see revision request rates
    And I see auto-approval vs manual approval breakdown

  Scenario: Dispute resolution for Troodie campaigns
    Given a deliverable was rejected
    When creator disputes the rejection
    Then Troodie admin team reviews the dispute
    And Admin can reverse decision or provide detailed explanation
    And All communications are logged for transparency
```

## Technical Implementation

### Database Schema Updates
Already covered in TMC-001. The existing `campaign_applications` table has `deliverables_submitted` JSONB field that works for all campaign types. No additional schema changes needed.

### Deliverable Submission Flow (React Native)
The existing deliverable submission component should work without changes, but let's verify it handles platform campaigns correctly.

Update: `app/creator/campaigns/[id]/submit-deliverables.tsx` (if needed)

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Upload, Link, Camera, CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { submitCampaignDeliverables } from '@/services/campaignApplicationService';
import { isTroodieCampaign } from '@/constants/systemAccounts';

/**
 * Creator screen for submitting campaign deliverables
 * Works for all campaign types: restaurant, Troodie-direct, partnership, challenges
 */
export default function SubmitDeliverablesScreen() {
  const { id, applicationId } = useLocalSearchParams<{ id: string; applicationId: string }>();
  const [loading, setLoading] = useState(false);

  // Form state
  const [contentUrl, setContentUrl] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'youtube' | 'other'>('instagram');
  const [caption, setCaption] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState('');
  const [likeCount, setLikeCount] = useState('');
  const [commentCount, setCommentCount] = useState('');

  const handlePickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!contentUrl.trim()) {
      Alert.alert('Required', 'Please enter the URL to your published content');
      return;
    }

    if (!screenshotUri) {
      Alert.alert('Required', 'Please upload a screenshot of your content');
      return;
    }

    setLoading(true);

    try {
      const deliverableData = {
        type: 'social_post',
        platform,
        proof: {
          url: contentUrl.trim(),
          screenshot_url: screenshotUri, // Will be uploaded by service
          caption: caption.trim() || undefined,
          engagement_metrics: {
            views: viewCount ? parseInt(viewCount) : undefined,
            likes: likeCount ? parseInt(likeCount) : undefined,
            comments: commentCount ? parseInt(commentCount) : undefined,
          },
        },
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await submitCampaignDeliverables(applicationId, deliverableData);

      if (error) {
        Alert.alert('Error', 'Failed to submit deliverables. Please try again.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Success!',
        'Your deliverables have been submitted for review. You\'ll be notified once they\'re approved (usually within 3 days).',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Deliverables</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <CheckCircle size={24} color="#10B981" />
          <Text style={styles.instructionsTitle}>Almost Done!</Text>
          <Text style={styles.instructionsText}>
            Submit your published content URL and a screenshot. We'll review it within 3 days
            (usually much faster!). If we don't respond within 72 hours, it's automatically approved.
          </Text>
        </View>

        {/* Platform Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Content Platform *</Text>
          <View style={styles.platformButtons}>
            {(['instagram', 'tiktok', 'youtube', 'other'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.platformButton, platform === p && styles.platformButtonActive]}
                onPress={() => setPlatform(p)}
              >
                <Text
                  style={[
                    styles.platformButtonText,
                    platform === p && styles.platformButtonTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content URL */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Published Content URL *</Text>
          <View style={styles.inputContainer}>
            <Link size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="https://instagram.com/p/..."
              placeholderTextColor="#9CA3AF"
              value={contentUrl}
              onChangeText={setContentUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <Text style={styles.inputHint}>
            Paste the direct link to your published post, video, or story
          </Text>
        </View>

        {/* Screenshot Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Screenshot Proof *</Text>
          {screenshotUri ? (
            <View style={styles.screenshotPreview}>
              <Image source={{ uri: screenshotUri }} style={styles.screenshotImage} />
              <TouchableOpacity
                style={styles.changeScreenshotButton}
                onPress={handlePickScreenshot}
              >
                <Camera size={16} color="#FFFFFF" />
                <Text style={styles.changeScreenshotText}>Change Screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickScreenshot}>
              <Upload size={24} color="#FF6B35" />
              <Text style={styles.uploadButtonText}>Upload Screenshot</Text>
              <Text style={styles.uploadButtonHint}>
                Show the published post with visible engagement
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Optional: Caption */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Caption (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Share the caption you used..."
            placeholderTextColor="#9CA3AF"
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Optional: Engagement Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Engagement Metrics (Optional)</Text>
          <Text style={styles.sectionHint}>
            If available, add engagement numbers to help track campaign success
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricInput}>
              <Text style={styles.metricLabel}>Views</Text>
              <TextInput
                style={styles.metricField}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={viewCount}
                onChangeText={setViewCount}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.metricInput}>
              <Text style={styles.metricLabel}>Likes</Text>
              <TextInput
                style={styles.metricField}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={likeCount}
                onChangeText={setLikeCount}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.metricInput}>
              <Text style={styles.metricLabel}>Comments</Text>
              <TextInput
                style={styles.metricField}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={commentCount}
                onChangeText={setCommentCount}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Auto-approval Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            ⏰ Your deliverables will be auto-approved in 72 hours if not reviewed sooner.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit for Review</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  instructionsCard: {
    backgroundColor: '#D1FAE5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginTop: 8,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  platformButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  platformButtonActive: {
    backgroundColor: '#FFF7F5',
    borderColor: '#FF6B35',
  },
  platformButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  platformButtonTextActive: {
    color: '#FF6B35',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    minHeight: 80,
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginTop: 12,
  },
  uploadButtonHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  screenshotPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#F3F4F6',
  },
  changeScreenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
  },
  changeScreenshotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricInput: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  metricField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
    textAlign: 'center',
  },
  noticeCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

### Admin Deliverable Review Dashboard
Create: `app/admin/review-deliverables.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { getPendingDeliverables, reviewDeliverable } from '@/services/deliverableReviewService';

/**
 * Admin dashboard for reviewing campaign deliverables
 * Focuses on Troodie-managed campaigns but can show all pending reviews
 */
export default function ReviewDeliverablesScreen() {
  const [loading, setLoading] = useState(true);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingDeliverables();
  }, []);

  const loadPendingDeliverables = async () => {
    setLoading(true);
    const { data, error } = await getPendingDeliverables();
    if (data) setDeliverables(data);
    setLoading(false);
  };

  const handleApprove = async (applicationId: string) => {
    setReviewing(applicationId);
    const { error } = await reviewDeliverable(applicationId, 'approved', null);

    if (error) {
      Alert.alert('Error', 'Failed to approve deliverable');
    } else {
      Alert.alert('Success', 'Deliverable approved! Creator will be notified.');
      loadPendingDeliverables();
    }
    setReviewing(null);
  };

  const handleReject = async (applicationId: string) => {
    Alert.prompt(
      'Reject Deliverable',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert('Error', 'Please provide a rejection reason');
              return;
            }

            setReviewing(applicationId);
            const { error } = await reviewDeliverable(applicationId, 'rejected', reason.trim());

            if (error) {
              Alert.alert('Error', 'Failed to reject deliverable');
            } else {
              Alert.alert('Rejected', 'Creator will be notified and can resubmit.');
              loadPendingDeliverables();
            }
            setReviewing(null);
          },
        },
      ],
      'plain-text'
    );
  };

  const renderDeliverable = ({ item }: { item: any }) => {
    const hoursRemaining = item.hours_until_auto_approve;
    const isUrgent = hoursRemaining < 24;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.campaignInfo}>
            <Text style={styles.campaignTitle} numberOfLines={1}>
              {item.campaign.title}
            </Text>
            <Text style={styles.creatorName}>by @{item.creator.username}</Text>
          </View>

          {/* Auto-approve timer */}
          <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
            <Clock size={14} color={isUrgent ? '#DC2626' : '#6B7280'} />
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
              {hoursRemaining}h
            </Text>
          </View>
        </View>

        {/* Deliverable Content */}
        <View style={styles.deliverableContent}>
          {/* Screenshot Preview */}
          {item.deliverable.proof.screenshot_url && (
            <Image
              source={{ uri: item.deliverable.proof.screenshot_url }}
              style={styles.screenshot}
            />
          )}

          {/* Content URL */}
          <TouchableOpacity
            style={styles.urlButton}
            onPress={() => Linking.openURL(item.deliverable.proof.url)}
          >
            <ExternalLink size={16} color="#FF6B35" />
            <Text style={styles.urlText} numberOfLines={1}>
              {item.deliverable.proof.url}
            </Text>
          </TouchableOpacity>

          {/* Caption (if provided) */}
          {item.deliverable.proof.caption && (
            <Text style={styles.caption}>{item.deliverable.proof.caption}</Text>
          )}

          {/* Engagement Metrics (if provided) */}
          {item.deliverable.proof.engagement_metrics && (
            <View style={styles.metricsRow}>
              {Object.entries(item.deliverable.proof.engagement_metrics).map(([key, value]) => (
                <View key={key} style={styles.metric}>
                  <Text style={styles.metricLabel}>{key}</Text>
                  <Text style={styles.metricValue}>{value as number}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.application_id)}
            disabled={reviewing === item.application_id}
          >
            {reviewing === item.application_id ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <XCircle size={18} color="#DC2626" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.application_id)}
            disabled={reviewing === item.application_id}
          >
            {reviewing === item.application_id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading deliverables...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Deliverables</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {deliverables.length === 0 ? (
        <View style={styles.emptyState}>
          <CheckCircle size={48} color="#10B981" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>
            No pending deliverables to review. Great work!
          </Text>
        </View>
      ) : (
        <FlatList
          data={deliverables}
          renderItem={renderDeliverable}
          keyExtractor={(item) => item.application_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    color: '#6B7280',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerBadgeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  timerTextUrgent: {
    color: '#DC2626',
  },
  deliverableContent: {
    marginBottom: 16,
  },
  screenshot: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  caption: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
```

### Deliverable Review Service
Create: `services/deliverableReviewService.ts`

```typescript
import { supabase } from '@/lib/supabase';

/**
 * Service for admin review of campaign deliverables
 */

/**
 * Get all pending deliverables awaiting review
 */
export async function getPendingDeliverables() {
  try {
    const { data, error } = await supabase
      .from('campaign_applications')
      .select(`
        id,
        deliverables_submitted,
        submitted_at,
        campaign:campaigns!inner (
          id,
          title,
          campaign_source
        ),
        creator:users!inner (
          id,
          username,
          profile_image_url
        )
      `)
      .eq('status', 'pending_review')
      .not('deliverables_submitted', 'is', null)
      .order('submitted_at', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    // Calculate hours until auto-approve for each deliverable
    const enrichedData = data.map((item: any) => {
      const submittedAt = new Date(item.submitted_at);
      const now = new Date();
      const hoursElapsed = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, Math.ceil(72 - hoursElapsed));

      return {
        application_id: item.id,
        deliverable: item.deliverables_submitted,
        submitted_at: item.submitted_at,
        hours_until_auto_approve: hoursRemaining,
        campaign: item.campaign,
        creator: item.creator,
      };
    });

    return { data: enrichedData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Review a deliverable (approve or reject)
 */
export async function reviewDeliverable(
  applicationId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string | null
) {
  try {
    const updateData: any = {
      status: decision === 'approved' ? 'completed' : 'revision_requested',
      reviewed_at: new Date().toISOString(),
    };

    if (decision === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from('campaign_applications')
      .update(updateData)
      .eq('id', applicationId);

    if (error) {
      return { data: null, error };
    }

    // TODO: Send notification to creator about approval/rejection

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## Definition of Done
- [ ] Deliverable submission flow works for all Troodie campaign types
- [ ] Admin deliverable review dashboard created (React Native)
- [ ] Review service functions implemented
- [ ] Creators can submit URL + screenshot for any campaign type
- [ ] Admins can approve or reject deliverables
- [ ] Auto-approve timer displays correctly (72 hours)
- [ ] Rejection reasons are captured and sent to creators
- [ ] Partnership campaigns route to partner restaurant (not Troodie admin)
- [ ] Analytics track deliverable review metrics
- [ ] All components use React Native (View, Text, Image, FlatList, etc.)
- [ ] Manual testing confirms deliverable flow for all campaign types
- [ ] Edge cases handled (invalid URLs, missing screenshots, etc.)
- [ ] Auto-approval cron job implemented (separate backend task)

## Notes
- **React Native**: All UI code uses React Native components
- **Universal Flow**: Deliverable submission should work identically for all campaign types
- **Partnership Routing**: White-label partnerships route reviews to partner restaurant, not Troodie
- **Auto-Approval**: Requires backend cron job (not covered in this task - see CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md)
- **Screenshot Upload**: Use existing imageUploadService for screenshot storage
- **Metrics Integration**: Delivered content metrics feed into TMC-005 analytics
- **Reference**: CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md for complete deliverable strategy
- **Related Tasks**: TMC-001 (Database Schema), TMC-003 (Admin UI), TMC-005 (Analytics)
- **Future Enhancement**: In-app content preview, engagement tracking integration, dispute resolution workflow
