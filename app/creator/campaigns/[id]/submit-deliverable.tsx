/**
 * Submit Deliverable Screen
 *
 * Allows creators to submit deliverables for a campaign.
 * Features:
 * - Display campaign requirements
 * - URL validation (Instagram/TikTok/YouTube)
 * - Screenshot upload (optional)
 * - Caption and notes
 * - Submission confirmation
 * - Real-time validation feedback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  submitDeliverable,
  validateSocialMediaUrl,
  type SubmitDeliverableParams
} from '@/services/deliverableSubmissionService';
import { imageUploadService } from '@/services/imageUploadServiceV2';
import * as ImagePicker from 'expo-image-picker';
import type { DeliverablePlatform } from '@/types/deliverableRequirements';

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmitDeliverableScreen() {
  const { id: campaignId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Form state
  const [postUrl, setPostUrl] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [notes, setNotes] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<DeliverablePlatform | null>(null);

  // UI state
  const [isValidating, setIsValidating] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  // Validation effect
  useEffect(() => {
    if (postUrl.trim().length > 0) {
      const timer = setTimeout(() => {
        setIsValidating(true);
        const validation = validateSocialMediaUrl(postUrl);
        setIsValidating(false);

        if (!validation.valid) {
          setUrlError(validation.error || 'Invalid URL');
          setDetectedPlatform(null);
        } else {
          setUrlError(null);
          setDetectedPlatform(validation.platform || null);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setUrlError(null);
      setDetectedPlatform(null);
    }
  }, [postUrl]);

  // Request permission for image picker
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to upload screenshots');
      }
    })();
  }, []);

  const pickScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [9, 16] // Vertical aspect ratio for social media
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshotUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking screenshot:', error);
      Alert.alert('Error', 'Failed to pick screenshot');
    }
  };

  const removeScreenshot = () => {
    setScreenshotUri(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!postUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter the URL of your post');
      return;
    }

    if (urlError) {
      Alert.alert('Invalid URL', urlError);
      return;
    }

    if (!detectedPlatform) {
      Alert.alert('Invalid URL', 'Could not detect social media platform from URL');
      return;
    }

    if (!user?.id || !campaignId) {
      Alert.alert('Error', 'Missing user or campaign information');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot if provided
      let screenshotUrl: string | undefined;
      if (screenshotUri) {
        setIsUploadingScreenshot(true);
        const uploadResult = await imageUploadService.uploadImage(screenshotUri, 'deliverable-screenshots');
        setIsUploadingScreenshot(false);

        if (uploadResult.error) {
          throw new Error('Failed to upload screenshot');
        }
        screenshotUrl = uploadResult.data;
      }

      // Submit deliverable
      const params: SubmitDeliverableParams = {
        creator_campaign_id: campaignId, // TODO: Get actual creator_campaign_id
        campaign_id: campaignId,
        creator_id: user.id,
        deliverable_index: 1, // TODO: Calculate based on existing deliverables
        platform: detectedPlatform,
        post_url: postUrl.trim(),
        screenshot_url: screenshotUrl,
        caption: caption.trim() || undefined,
        notes_to_restaurant: notes.trim() || undefined
      };

      const { data, error } = await submitDeliverable(params);

      if (error) {
        throw error;
      }

      // Success!
      Alert.alert(
        'Deliverable Submitted!',
        'Your deliverable has been submitted for review. You\'ll receive a notification when it\'s reviewed.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      Alert.alert('Submission Failed', 'Failed to submit deliverable. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingScreenshot(false);
    }
  };

  const canSubmit = postUrl.trim().length > 0 && !urlError && !isSubmitting && detectedPlatform;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Deliverable</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Campaign Requirements Card */}
        <View style={styles.requirementsCard}>
          <View style={styles.requirementsHeader}>
            <Ionicons name="list-circle" size={24} color="#FFAD27" />
            <Text style={styles.requirementsTitle}>Campaign Requirements</Text>
          </View>
          <View style={styles.requirementsList}>
            <RequirementItem text="Create a 15-45 second vertical video" />
            <RequirementItem text="Feature the restaurant and atmosphere" />
            <RequirementItem text="Tag @TroodieApp in your post" />
            <RequirementItem text="Use hashtag #TroodieCreatorMarketplace" />
            <RequirementItem text="Include CTA about Troodie" />
          </View>
        </View>

        {/* Post URL Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post URL *</Text>
          <Text style={styles.sectionDescription}>
            Paste the link to your Instagram, TikTok, or YouTube post
          </Text>
          <View style={styles.urlInputContainer}>
            <TextInput
              style={[styles.urlInput, urlError && styles.urlInputError]}
              placeholder="https://instagram.com/p/..."
              value={postUrl}
              onChangeText={setPostUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholderTextColor="#9CA3AF"
            />
            {isValidating && (
              <ActivityIndicator size="small" color="#FFAD27" style={styles.urlValidationIcon} />
            )}
            {!isValidating && detectedPlatform && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color="#10B981"
                style={styles.urlValidationIcon}
              />
            )}
            {!isValidating && urlError && (
              <Ionicons
                name="close-circle"
                size={24}
                color="#EF4444"
                style={styles.urlValidationIcon}
              />
            )}
          </View>

          {/* Platform Detection */}
          {detectedPlatform && !urlError && (
            <View style={styles.platformBadge}>
              <Ionicons
                name={getPlatformIcon(detectedPlatform)}
                size={16}
                color="#FFAD27"
              />
              <Text style={styles.platformBadgeText}>
                {getPlatformLabel(detectedPlatform)} detected
              </Text>
            </View>
          )}

          {/* URL Error */}
          {urlError && (
            <View style={styles.errorMessage}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{urlError}</Text>
            </View>
          )}

          {/* URL Help Text */}
          {!urlError && !detectedPlatform && postUrl.length === 0 && (
            <View style={styles.helpBox}>
              <Text style={styles.helpText}>
                💡 Supported platforms: Instagram (posts, reels, stories), TikTok, YouTube
              </Text>
            </View>
          )}
        </View>

        {/* Screenshot Upload (Optional) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Screenshot (Optional)</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            Upload a screenshot of your post for verification
          </Text>

          {screenshotUri ? (
            <View style={styles.screenshotPreview}>
              <Image source={{ uri: screenshotUri }} style={styles.screenshotImage} />
              <TouchableOpacity style={styles.removeScreenshotButton} onPress={removeScreenshot}>
                <Ionicons name="close-circle" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickScreenshot}>
              <Ionicons name="cloud-upload-outline" size={32} color="#6B7280" />
              <Text style={styles.uploadButtonText}>Tap to Upload Screenshot</Text>
              <Text style={styles.uploadButtonSubtext}>Helps restaurant verify your post</Text>
            </TouchableOpacity>
          )}

          {isUploadingScreenshot && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color="#FFAD27" />
              <Text style={styles.uploadingText}>Uploading screenshot...</Text>
            </View>
          )}
        </View>

        {/* Caption (Optional) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Caption (Optional)</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            Copy your post caption for reference
          </Text>
          <TextInput
            style={[styles.textArea]}
            placeholder="Paste your post caption here..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Notes to Restaurant (Optional) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Notes to Restaurant (Optional)</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            Any additional information you'd like to share
          </Text>
          <TextInput
            style={[styles.textArea]}
            placeholder="e.g., Posted during peak dinner hours, received great engagement..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>What happens next?</Text>
            <Text style={styles.infoBoxText}>
              The restaurant will review your deliverable within 72 hours. If not reviewed, it will be
              automatically approved and payment will be processed.
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button (Fixed Bottom) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit for Review</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RequirementItem({ text }: { text: string }) {
  return (
    <View style={styles.requirementItem}>
      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      <Text style={styles.requirementText}>{text}</Text>
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getPlatformIcon(platform: DeliverablePlatform): any {
  switch (platform) {
    case 'instagram':
      return 'logo-instagram';
    case 'tiktok':
      return 'musical-notes';
    case 'youtube':
      return 'logo-youtube';
    case 'facebook':
      return 'logo-facebook';
    case 'twitter':
      return 'logo-twitter';
    default:
      return 'link';
  }
}

function getPlatformLabel(platform: DeliverablePlatform): string {
  switch (platform) {
    case 'instagram':
      return 'Instagram';
    case 'tiktok':
      return 'TikTok';
    case 'youtube':
      return 'YouTube';
    case 'facebook':
      return 'Facebook';
    case 'twitter':
      return 'Twitter';
    default:
      return 'Social Media';
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
  headerSpacer: {
    width: 40
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20
  },
  requirementsCard: {
    backgroundColor: '#FFFAF2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFAD27',
    padding: 16,
    marginBottom: 24
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8
  },
  requirementsList: {
    gap: 8
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  requirementText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
    flex: 1
  },
  section: {
    marginBottom: 24
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12
  },
  optionalBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7'
  },
  urlInputContainer: {
    position: 'relative'
  },
  urlInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingRight: 48,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FFFFFF'
  },
  urlInputError: {
    borderColor: '#EF4444'
  },
  urlValidationIcon: {
    position: 'absolute',
    right: 12,
    top: 12
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  platformBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFAD27',
    marginLeft: 6
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginLeft: 6
  },
  helpBox: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8
  },
  helpText: {
    fontSize: 13,
    color: '#0369A1'
  },
  uploadButton: {
    height: 160,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8
  },
  uploadButtonSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  screenshotPreview: {
    position: 'relative',
    aspectRatio: 9 / 16,
    maxHeight: 400,
    borderRadius: 12,
    overflow: 'hidden'
  },
  screenshotImage: {
    width: '100%',
    height: '100%'
  },
  removeScreenshotButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12
  },
  uploadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  infoBoxContent: {
    flex: 1,
    marginLeft: 12
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4
  },
  infoBoxText: {
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  submitButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#FFAD27',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
