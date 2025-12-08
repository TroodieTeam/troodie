/**
 * Submit Deliverable Screen
 *
 * Allows creators to submit deliverables for a campaign.
 * Features:
 * - Display campaign requirements and expected deliverables
 * - Progress tracking for multiple deliverables
 * - URL validation (Instagram/TikTok/YouTube)
 * - Screenshot upload (optional)
 * - Caption and notes
 * - Support for multiple deliverables submission
 * - Real-time validation feedback
 *
 * ER-008: Multiple Deliverables Support
 * =====================================
 * Now supports submitting multiple deliverables per campaign with:
 * - Progress tracking (X of Y submitted)
 * - Required deliverables display
 * - Individual deliverable status tracking
 * - Batch or individual submission
 */

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    getRequiredDeliverables,
    getSubmissionProgress,
    submitMultipleDeliverables,
    validateSocialMediaUrl
} from '@/services/deliverableSubmissionService';
import { ImageUploadServiceV2 } from '@/services/imageUploadServiceV2';
import type { DeliverablePlatform } from '@/types/deliverableRequirements';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

interface DeliverableFormData {
  url: string;
  platform: DeliverablePlatform | null;
  screenshotUri: string | null;
  caption: string;
  notes: string;
  isValidating: boolean;
  urlError: string | null;
  urlWarning: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmitDeliverableScreen() {
  const { id: campaignId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Campaign and application data
  const [campaignApplicationId, setCampaignApplicationId] = useState<string | null>(null);
  const [requiredDeliverables, setRequiredDeliverables] = useState<any[]>([]);
  const [progress, setProgress] = useState<{
    submitted: number;
    required: number;
    percentage: number;
    complete: boolean;
    deliverables: Array<{
      index: number;
      status: string;
      submitted_at?: string;
      platform?: DeliverablePlatform;
    }>;
  } | null>(null);

  // Form state - support multiple deliverables
  const [deliverables, setDeliverables] = useState<DeliverableFormData[]>([
    { url: '', platform: null, screenshotUri: null, caption: '', notes: '', isValidating: false, urlError: null, urlWarning: null }
  ]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState<number | null>(null);

  // Load campaign application and required deliverables
  useEffect(() => {
    if (user?.id && campaignId) {
      loadCampaignData();
    }
  }, [user?.id, campaignId]);

  // Validate URLs when they change
  useEffect(() => {
    deliverables.forEach((deliverable, index) => {
      if (deliverable.url.trim().length > 10) {
        const timer = setTimeout(() => {
          validateDeliverableUrl(index);
        }, 500);
        return () => clearTimeout(timer);
      }
    });
  }, [deliverables.map(d => d.url).join(',')]);

  // Request permission for image picker
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to upload screenshots');
      }
    })();
  }, []);

  const loadCampaignData = async () => {
    if (!user?.id || !campaignId) return;

    try {
      setLoading(true);

      // Get creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorProfile) {
        Alert.alert('Error', 'Creator profile not found');
        router.back();
        return;
      }

      // Get campaign application
      const { data: application } = await supabase
        .from('campaign_applications')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('creator_id', creatorProfile.id)
        .eq('status', 'accepted')
        .single();

      if (!application) {
        Alert.alert('Error', 'Campaign application not found or not accepted');
        router.back();
        return;
      }

      setCampaignApplicationId(application.id);

      // Load required deliverables
      const { data: required, error: reqError } = await getRequiredDeliverables(campaignId);
      if (reqError) {
        console.error('Error loading required deliverables:', reqError);
        // Continue without required deliverables - will default to single deliverable
        setRequiredDeliverables([]);
      } else if (required && required.deliverables && required.deliverables.length > 0) {
        console.log('Loaded required deliverables:', required.deliverables.length);
        setRequiredDeliverables(required.deliverables);
      } else {
        // No required deliverables found - set empty array
        console.log('No required deliverables found for campaign');
        setRequiredDeliverables([]);
      }

      // Load progress
      const { data: progressData, error: progError } = await getSubmissionProgress(
        application.id,
        campaignId
      );
      if (progError) {
        console.error('Error loading progress:', progError);
      } else if (progressData) {
        setProgress(progressData);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      Alert.alert('Error', 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const validateDeliverableUrl = (index: number) => {
    const deliverable = deliverables[index];
    if (!deliverable.url.trim()) {
      updateDeliverable(index, {
        isValidating: false,
        urlError: null,
        urlWarning: null,
        platform: null
      });
      return;
    }

    updateDeliverable(index, { isValidating: true });
    
    setTimeout(() => {
      const validation = validateSocialMediaUrl(deliverable.url);
      updateDeliverable(index, {
        isValidating: false,
        urlError: validation.error || null,
        urlWarning: validation.warning || null,
        platform: validation.platform || null
      });
    }, 500);
  };

  const updateDeliverable = (index: number, updates: Partial<DeliverableFormData>) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], ...updates };
    setDeliverables(updated);
  };

  const addDeliverable = () => {
    setDeliverables([
      ...deliverables,
      { url: '', platform: null, screenshotUri: null, caption: '', notes: '', isValidating: false, urlError: null, urlWarning: null }
    ]);
  };

  const removeDeliverable = (index: number) => {
    if (deliverables.length > 1) {
      setDeliverables(deliverables.filter((_, i) => i !== index));
    } else {
      Alert.alert('Cannot Remove', 'You must have at least one deliverable');
    }
  };

  const pickScreenshot = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [9, 16]
      });

      if (!result.canceled && result.assets[0]) {
        updateDeliverable(index, { screenshotUri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking screenshot:', error);
      Alert.alert('Error', 'Failed to pick screenshot');
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !campaignId || !campaignApplicationId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    // Validate all deliverables
    const validDeliverables = deliverables.filter((d, index) => {
      if (!d.url.trim()) {
        Alert.alert('Missing URL', `Please enter a URL for deliverable ${index + 1}`);
        return false;
      }
      if (d.urlError) {
        Alert.alert('Invalid URL', `Deliverable ${index + 1}: ${d.urlError}`);
        return false;
      }
      if (!d.platform) {
        Alert.alert('Invalid URL', `Could not detect platform for deliverable ${index + 1}`);
        return false;
      }
      return true;
    });

    if (validDeliverables.length === 0) {
      Alert.alert('Error', 'Please add at least one valid deliverable');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshots first
      const deliverablesWithScreenshots = await Promise.all(
        validDeliverables.map(async (deliverable, index) => {
          let screenshotUrl: string | undefined;
          
          if (deliverable.screenshotUri) {
            setIsUploadingScreenshot(index);
            try {
              const uploadResult = await ImageUploadServiceV2.uploadImage(
                deliverable.screenshotUri,
                'deliverable-screenshots',
                `screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
              );
              
              screenshotUrl = uploadResult.publicUrl;
            } catch (error) {
              console.error('Error uploading screenshot:', error);
              // Continue without screenshot
            } finally {
              setIsUploadingScreenshot(null);
            }
          }

          return {
            campaign_application_id: campaignApplicationId!,
            campaign_id: campaignId,
            creator_id: user.id,
            platform: deliverable.platform!,
            post_url: deliverable.url.trim(),
            screenshot_url: screenshotUrl,
            caption: deliverable.caption.trim() || undefined,
            notes_to_restaurant: deliverable.notes.trim() || undefined
          };
        })
      );

      // Submit all deliverables
      const { data, errors } = await submitMultipleDeliverables(deliverablesWithScreenshots);

      if (errors.length > 0) {
        Alert.alert(
          'Partial Success',
          `${data?.length || 0} deliverable(s) submitted successfully. ${errors.length} failed.`
        );
      } else {
        Alert.alert(
          'Success!',
          `All ${data?.length || 0} deliverable(s) submitted successfully.`,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting deliverables:', error);
      Alert.alert('Submission Failed', 'Failed to submit deliverables. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingScreenshot(null);
    }
  };

  const canSubmit = deliverables.some(d => 
    d.url.trim().length > 0 && !d.urlError && d.platform
  ) && !isSubmitting;

  // Calculate progress display values
  const submittedCount = progress?.submitted || 0;
  const requiredCount = progress?.required || requiredDeliverables.length || 0;
  const progressPercentage = progress?.percentage !== undefined 
    ? progress.percentage 
    : (requiredCount > 0 ? Math.round((submittedCount / requiredCount) * 100) : 0);
  // Show progress section if we have progress data OR if we have required deliverables
  const showProgressSection = (progress !== null) || (requiredDeliverables.length > 0);
  const allDeliverablesSubmitted = requiredCount > 0 && submittedCount >= requiredCount;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Deliverable</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFAD27" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Deliverables</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Section - Always show if we have required deliverables or progress data */}
        {showProgressSection && requiredCount > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Deliverable Progress</Text>
              <Text style={styles.progressText}>
                {submittedCount} of {requiredCount} submitted ({progressPercentage}%)
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progressPercentage}%` }]} 
              />
            </View>
            {progress?.complete && (
              <Text style={styles.completeText}>✓ All deliverables submitted</Text>
            )}
          </View>
        )}

        {/* Required Deliverables List */}
        {requiredDeliverables.length > 0 && (
          <View style={styles.requiredSection}>
            <Text style={styles.sectionTitle}>Expected Deliverables</Text>
            {requiredDeliverables.map((req, index) => {
              const deliverableProgress = progress?.deliverables.find(d => d.index === req.index);
              // Only show as submitted if status is NOT 'pending' (meaning it's been actually submitted)
              const isSubmitted = deliverableProgress && deliverableProgress.status !== 'pending';
              return (
                <View key={index} style={styles.requiredItem}>
                  <Ionicons
                    name={isSubmitted ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={isSubmitted ? "#10B981" : "#9CA3AF"}
                  />
                  <View style={styles.requiredItemContent}>
                    <Text style={styles.requiredItemTitle}>
                      Deliverable {req.index}: {req.platform || 'Social Media Post'}
                    </Text>
                    {req.description && (
                      <Text style={styles.requiredItemDesc}>{req.description}</Text>
                    )}
                    {isSubmitted && deliverableProgress && (
                      <Text style={styles.requiredItemStatus}>
                        Status: {deliverableProgress.status === 'pending_review' ? 'Pending Review' : 
                                 deliverableProgress.status === 'approved' || deliverableProgress.status === 'auto_approved' ? 'Approved' :
                                 deliverableProgress.status === 'rejected' ? 'Rejected' :
                                 deliverableProgress.status === 'needs_revision' || deliverableProgress.status === 'revision_requested' ? 'Needs Revision' :
                                 deliverableProgress.status}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* All Deliverables Submitted Message */}
        {allDeliverablesSubmitted && (
          <View style={styles.completeMessage}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.completeTitle}>All Deliverables Submitted</Text>
            <Text style={styles.completeText}>
              You've successfully submitted all {requiredCount} required deliverable{requiredCount !== 1 ? 's' : ''} for this campaign.{'\n\n'}
              Your submissions are now pending review. You'll receive a notification once they've been reviewed.
            </Text>
          </View>
        )}

        {/* Deliverables Forms - Only show if not all submitted */}
        {!allDeliverablesSubmitted && deliverables.map((deliverable, index) => (
          <View key={index} style={styles.deliverableForm}>
            <View style={styles.deliverableHeader}>
              <Text style={styles.deliverableNumber}>Deliverable {index + 1}</Text>
              {deliverables.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeDeliverable(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Post URL Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Post URL *</Text>
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={[styles.urlInput, deliverable.urlError && styles.urlInputError]}
                  placeholder="https://instagram.com/p/..."
                  value={deliverable.url}
                  onChangeText={(text) => updateDeliverable(index, { url: text })}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholderTextColor="#9CA3AF"
                />
                {deliverable.isValidating && (
                  <ActivityIndicator size="small" color="#FFAD27" style={styles.urlValidationIcon} />
                )}
                {!deliverable.isValidating && deliverable.platform && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#10B981"
                    style={styles.urlValidationIcon}
                  />
                )}
                {!deliverable.isValidating && deliverable.urlError && (
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color="#EF4444"
                    style={styles.urlValidationIcon}
                  />
                )}
              </View>

              {/* Platform Detection */}
              {deliverable.platform && !deliverable.urlError && (
                <View style={styles.platformBadge}>
                  <Ionicons
                    name={getPlatformIcon(deliverable.platform)}
                    size={16}
                    color="#FFAD27"
                  />
                  <Text style={styles.platformBadgeText}>
                    {getPlatformLabel(deliverable.platform)} detected
                  </Text>
                </View>
              )}

              {/* URL Error */}
              {deliverable.urlError && (
                <View style={styles.errorMessage}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{deliverable.urlError}</Text>
                </View>
              )}

              {/* URL Warning */}
              {deliverable.urlWarning && !deliverable.urlError && (
                <View style={styles.warningMessage}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={styles.warningText}>{deliverable.urlWarning}</Text>
                </View>
              )}
            </View>

            {/* Screenshot Upload */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Screenshot (Optional)</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              {deliverable.screenshotUri ? (
                <View style={styles.screenshotPreview}>
                  <Image source={{ uri: deliverable.screenshotUri }} style={styles.screenshotImage} />
                  <TouchableOpacity
                    style={styles.removeScreenshotButton}
                    onPress={() => updateDeliverable(index, { screenshotUri: null })}
                  >
                    <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickScreenshot(index)}
                  disabled={isUploadingScreenshot === index}
                >
                  {isUploadingScreenshot === index ? (
                    <ActivityIndicator size="small" color="#6B7280" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color="#6B7280" />
                      <Text style={styles.uploadButtonText}>Tap to Upload Screenshot</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Caption */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Caption (Optional)</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Paste your post caption here..."
                value={deliverable.caption}
                onChangeText={(text) => updateDeliverable(index, { caption: text })}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Any additional information..."
                value={deliverable.notes}
                onChangeText={(text) => updateDeliverable(index, { notes: text })}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        ))}

        {/* Add Another Deliverable Button - Only show if not all submitted */}
        {!allDeliverablesSubmitted && (
          <TouchableOpacity style={styles.addButton} onPress={addDeliverable}>
            <Ionicons name="add-circle-outline" size={24} color="#FFAD27" />
            <Text style={styles.addButtonText}>Add Another Deliverable</Text>
          </TouchableOpacity>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>What happens next?</Text>
            <Text style={styles.infoBoxText}>
              The restaurant will review your deliverables within 72 hours. If not reviewed, they will be
              automatically approved and payment will be processed.
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button - Only show if not all submitted */}
      {!allDeliverablesSubmitted && (
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
                <Text style={styles.submitButtonText}>
                  Submit {deliverables.length} Deliverable{deliverables.length !== 1 ? 's' : ''}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4
  },
  completeText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600'
  },
  requiredSection: {
    backgroundColor: '#FFFAF2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFAD27',
    padding: 16,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  requiredItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  requiredItemContent: {
    flex: 1,
    marginLeft: 12
  },
  requiredItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  requiredItemDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  requiredItemStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500'
  },
  deliverableForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  deliverableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  deliverableNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  removeButton: {
    padding: 4
  },
  section: {
    marginBottom: 20
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 8
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 6,
    flex: 1
  },
  uploadButton: {
    height: 120,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8
  },
  screenshotPreview: {
    position: 'relative',
    aspectRatio: 9 / 16,
    maxHeight: 300,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFAD27',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFFAF2',
    marginBottom: 24
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFAD27',
    marginLeft: 8
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 24
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
