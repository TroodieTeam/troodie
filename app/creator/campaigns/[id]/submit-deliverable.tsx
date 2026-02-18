/**
 * Submit Deliverable Screen (Two-Stage Workflow)
 *
 * Stage 1 - Upload Content: Creator uploads video/photo for restaurant review
 * Stage 2 - Submit Proof: After approval, creator submits platform post URLs
 *
 * Step indicator at top shows current stage.
 * Screen adapts based on workflow_stage of existing deliverables.
 */

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadContentForReview } from '@/services/contentUploadService';
import {
    getDeliverablesForCreatorCampaign,
    getRequiredDeliverables,
    getSubmissionProgress,
    submitProofLinks,
    validateSocialMediaUrl
} from '@/services/deliverableSubmissionService';
import type { DeliverablePlatform, WorkflowStage } from '@/types/deliverableRequirements';
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

type ActiveStep = 'upload' | 'proof' | 'pending_review' | 'complete';

interface ProofFormData {
  url: string;
  platform: DeliverablePlatform | null;
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

  // Campaign data
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

  // Workflow state
  const [activeStep, setActiveStep] = useState<ActiveStep>('upload');
  const [existingDeliverableId, setExistingDeliverableId] = useState<string | null>(null);
  const [existingWorkflowStage, setExistingWorkflowStage] = useState<WorkflowStage | null>(null);
  const [restaurantFeedback, setRestaurantFeedback] = useState<string | null>(null);

  // Step 1: Upload content form
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'video' | 'photo' | null>(null);
  const [caption, setCaption] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Proof links form
  const [proofLinks, setProofLinks] = useState<ProofFormData[]>([
    { url: '', platform: null, isValidating: false, urlError: null, urlWarning: null }
  ]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id && campaignId) {
      loadCampaignData();
    }
  }, [user?.id, campaignId]);

  // Request media library permission
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to upload content');
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
      if (!reqError && required?.deliverables?.length) {
        setRequiredDeliverables(required.deliverables);
      } else {
        setRequiredDeliverables([]);
      }

      // Load progress
      const { data: progressData } = await getSubmissionProgress(application.id, campaignId);
      if (progressData) {
        setProgress(progressData);
      }

      // Load existing deliverables to determine workflow stage
      const { data: existingDeliverables } = await getDeliverablesForCreatorCampaign(application.id);

      if (existingDeliverables && existingDeliverables.length > 0) {
        // Find the most recent deliverable to determine active step
        const latest = existingDeliverables[existingDeliverables.length - 1] as any;
        setExistingDeliverableId(latest.id);
        setExistingWorkflowStage(latest.workflow_stage);
        setRestaurantFeedback(latest.restaurant_feedback || null);

        const stage = latest.workflow_stage as WorkflowStage;
        const status = latest.status;

        if (stage === 'proof' || status === 'proof') {
          setActiveStep('complete');
        } else if (stage === 'approved' || stage === 'posting') {
          setActiveStep('proof');
        } else if (stage === 'review' || status === 'pending_review') {
          setActiveStep('pending_review');
        } else if (status === 'rejected' || status === 'needs_revision') {
          // Allow re-upload
          setActiveStep('upload');
          setRestaurantFeedback(latest.restaurant_feedback || null);
        } else {
          setActiveStep('upload');
        }
      } else {
        setActiveStep('upload');
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      Alert.alert('Error', 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // STEP 1: Upload Content
  // ============================================================================

  const pickContent = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFileUri(asset.uri);
        setSelectedFileType(asset.type === 'video' ? 'video' : 'photo');
      }
    } catch (error) {
      console.error('Error picking content:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleUploadContent = async () => {
    if (!user?.id || !campaignId || !campaignApplicationId || !selectedFileUri || !selectedFileType) {
      Alert.alert('Error', 'Please select a video or photo to upload');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await uploadContentForReview({
        campaign_application_id: campaignApplicationId,
        campaign_id: campaignId,
        creator_id: user.id,
        file_uri: selectedFileUri,
        file_type: selectedFileType,
        caption: caption.trim() || undefined,
        notes_to_restaurant: notes.trim() || undefined,
      });

      if (error) {
        Alert.alert('Upload Failed', error.message);
        return;
      }

      if (data) {
        setExistingDeliverableId(data.id || null);
        setActiveStep('pending_review');
        Alert.alert(
          'Content Uploaded',
          'Your content has been submitted for restaurant review. You will be notified when it is reviewed.'
        );
      }
    } catch (error) {
      console.error('Error uploading content:', error);
      Alert.alert('Upload Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // STEP 2: Submit Proof Links
  // ============================================================================

  const updateProofLink = (index: number, updates: Partial<ProofFormData>) => {
    const updated = [...proofLinks];
    updated[index] = { ...updated[index], ...updates };
    setProofLinks(updated);
  };

  const validateProofUrl = (index: number) => {
    const link = proofLinks[index];
    if (!link.url.trim()) {
      updateProofLink(index, { urlError: null, urlWarning: null, platform: null });
      return;
    }

    updateProofLink(index, { isValidating: true });
    setTimeout(() => {
      const validation = validateSocialMediaUrl(link.url);
      updateProofLink(index, {
        isValidating: false,
        urlError: validation.error || null,
        urlWarning: validation.warning || null,
        platform: validation.platform || null,
      });
    }, 500);
  };

  useEffect(() => {
    if (activeStep !== 'proof') return;
    proofLinks.forEach((link, index) => {
      if (link.url.trim().length > 10) {
        const timer = setTimeout(() => validateProofUrl(index), 500);
        return () => clearTimeout(timer);
      }
    });
  }, [proofLinks.map(l => l.url).join(','), activeStep]);

  const handleSubmitProof = async () => {
    if (!existingDeliverableId) {
      Alert.alert('Error', 'No deliverable found to submit proof for');
      return;
    }

    const validLinks = proofLinks.filter(l => l.url.trim() && !l.urlError && l.platform);
    if (validLinks.length === 0) {
      Alert.alert('Missing URL', 'Please enter at least one valid post URL as proof');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await submitProofLinks({
        deliverable_id: existingDeliverableId,
        platform_urls: validLinks.map(l => ({
          platform: l.platform!,
          url: l.url.trim(),
        })),
      });

      if (error) {
        Alert.alert('Submission Failed', error.message);
        return;
      }

      setActiveStep('complete');
      Alert.alert(
        'Proof Submitted',
        'Your post links have been submitted. Payment will be processed shortly.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting proof:', error);
      Alert.alert('Submission Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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
        <Text style={styles.headerTitle}>Submit Deliverable</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepRow}>
            <View style={[
              styles.stepCircle,
              (activeStep === 'upload' || activeStep === 'pending_review' || activeStep === 'proof' || activeStep === 'complete')
                && styles.stepCircleActive
            ]}>
              <Text style={[
                styles.stepNumber,
                (activeStep === 'upload' || activeStep === 'pending_review' || activeStep === 'proof' || activeStep === 'complete')
                  && styles.stepNumberActive
              ]}>1</Text>
            </View>
            <View style={[
              styles.stepLine,
              (activeStep === 'proof' || activeStep === 'complete') && styles.stepLineActive
            ]} />
            <View style={[
              styles.stepCircle,
              (activeStep === 'proof' || activeStep === 'complete') && styles.stepCircleActive
            ]}>
              <Text style={[
                styles.stepNumber,
                (activeStep === 'proof' || activeStep === 'complete') && styles.stepNumberActive
              ]}>2</Text>
            </View>
          </View>
          <View style={styles.stepLabelRow}>
            <Text style={[
              styles.stepLabel,
              (activeStep === 'upload' || activeStep === 'pending_review') && styles.stepLabelActive
            ]}>Upload Content</Text>
            <Text style={[
              styles.stepLabel,
              (activeStep === 'proof') && styles.stepLabelActive
            ]}>Submit Proof</Text>
          </View>
        </View>

        {/* Required Deliverables List */}
        {requiredDeliverables.length > 0 && (
          <View style={styles.requiredSection}>
            <Text style={styles.sectionTitle}>Expected Deliverables</Text>
            {requiredDeliverables.map((req, index) => {
              const deliverableProgress = progress?.deliverables.find(d => d.index === req.index);
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
                        Status: {getStatusLabel(deliverableProgress.status)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Restaurant Feedback Banner (for rejections/revisions) */}
        {restaurantFeedback && (activeStep === 'upload') && (
          <View style={styles.feedbackBanner}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#DC2626" />
            <View style={styles.feedbackContent}>
              <Text style={styles.feedbackTitle}>Restaurant Feedback</Text>
              <Text style={styles.feedbackText}>{restaurantFeedback}</Text>
            </View>
          </View>
        )}

        {/* ============================================= */}
        {/* STEP 1: Upload Content */}
        {/* ============================================= */}
        {activeStep === 'upload' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload Content for Review</Text>
            <Text style={styles.stepDescription}>
              Select a video or photo to upload. The restaurant will review your content before you post it.
            </Text>

            {/* File Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content *</Text>
              {selectedFileUri ? (
                <View style={styles.contentPreview}>
                  {selectedFileType === 'photo' ? (
                    <Image source={{ uri: selectedFileUri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.videoPreview}>
                      <Ionicons name="videocam" size={48} color="#FFAD27" />
                      <Text style={styles.videoPreviewText}>Video selected</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeContentButton}
                    onPress={() => { setSelectedFileUri(null); setSelectedFileType(null); }}
                  >
                    <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadButton} onPress={pickContent}>
                  <Ionicons name="cloud-upload-outline" size={40} color="#FFAD27" />
                  <Text style={styles.uploadButtonTitle}>Tap to Select Video or Photo</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    MP4, MOV, JPEG, PNG (max 100MB video / 10MB image)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Caption */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Caption</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Add a caption for the restaurant to review..."
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Notes to Restaurant</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Any additional context for the restaurant..."
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
                  The restaurant will review your content within 72 hours. Once approved, you will post it to
                  your social platforms and submit the post links as proof.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ============================================= */}
        {/* PENDING REVIEW STATE */}
        {/* ============================================= */}
        {activeStep === 'pending_review' && (
          <View style={styles.statusMessage}>
            <Ionicons name="time-outline" size={64} color="#FFAD27" />
            <Text style={styles.statusTitle}>Content Submitted</Text>
            <Text style={styles.statusText}>
              Your content is awaiting restaurant review. You will be notified when it is approved
              or if changes are requested.{'\n\n'}
              If not reviewed within 72 hours, it will be automatically approved.
            </Text>
          </View>
        )}

        {/* ============================================= */}
        {/* STEP 2: Submit Proof Links */}
        {/* ============================================= */}
        {activeStep === 'proof' && (
          <View style={styles.stepContent}>
            {/* Approved Banner */}
            <View style={styles.approvedBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.approvedBannerText}>Content approved! Post to your platforms and submit links below.</Text>
            </View>

            <Text style={styles.stepTitle}>Submit Post Links</Text>
            <Text style={styles.stepDescription}>
              Paste the URLs of your published posts to prove content was posted.
            </Text>

            {proofLinks.map((link, index) => (
              <View key={index} style={styles.proofLinkForm}>
                <Text style={styles.proofLinkLabel}>Post URL {index + 1} *</Text>
                <View style={styles.urlInputContainer}>
                  <TextInput
                    style={[styles.urlInput, link.urlError && styles.urlInputError]}
                    placeholder="https://instagram.com/p/..."
                    value={link.url}
                    onChangeText={(text) => updateProofLink(index, { url: text })}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholderTextColor="#9CA3AF"
                  />
                  {link.isValidating && (
                    <ActivityIndicator size="small" color="#FFAD27" style={styles.urlValidationIcon} />
                  )}
                  {!link.isValidating && link.platform && !link.urlError && (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.urlValidationIcon} />
                  )}
                  {!link.isValidating && link.urlError && (
                    <Ionicons name="close-circle" size={24} color="#EF4444" style={styles.urlValidationIcon} />
                  )}
                </View>

                {link.platform && !link.urlError && (
                  <View style={styles.platformBadge}>
                    <Ionicons name={getPlatformIcon(link.platform)} size={16} color="#FFAD27" />
                    <Text style={styles.platformBadgeText}>{getPlatformLabel(link.platform)} detected</Text>
                  </View>
                )}

                {link.urlError && (
                  <View style={styles.errorMessage}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{link.urlError}</Text>
                  </View>
                )}

                {link.urlWarning && !link.urlError && (
                  <View style={styles.warningMessage}>
                    <Ionicons name="warning" size={16} color="#F59E0B" />
                    <Text style={styles.warningText}>{link.urlWarning}</Text>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addLinkButton}
              onPress={() => setProofLinks([...proofLinks, { url: '', platform: null, isValidating: false, urlError: null, urlWarning: null }])}
            >
              <Ionicons name="add-circle-outline" size={24} color="#FFAD27" />
              <Text style={styles.addLinkButtonText}>Add Another Link</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================= */}
        {/* COMPLETE STATE */}
        {/* ============================================= */}
        {activeStep === 'complete' && (
          <View style={styles.statusMessage}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.statusTitle}>All Done!</Text>
            <Text style={styles.statusText}>
              Your proof links have been submitted. Payment will be processed shortly.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      {activeStep === 'upload' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitButton, (!selectedFileUri || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleUploadContent}
            disabled={!selectedFileUri || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {activeStep === 'proof' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!proofLinks.some(l => l.url.trim() && !l.urlError && l.platform) || isSubmitting)
                && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitProof}
            disabled={!proofLinks.some(l => l.url.trim() && !l.urlError && l.platform) || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Proof Links</Text>
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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending_review': return 'Pending Review';
    case 'approved':
    case 'auto_approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'needs_revision':
    case 'revision_requested': return 'Needs Revision';
    default: return status;
  }
}

function getPlatformIcon(platform: DeliverablePlatform): any {
  switch (platform) {
    case 'instagram': return 'logo-instagram';
    case 'tiktok': return 'musical-notes';
    case 'youtube': return 'logo-youtube';
    case 'facebook': return 'logo-facebook';
    case 'twitter': return 'logo-twitter';
    default: return 'link';
  }
}

function getPlatformLabel(platform: DeliverablePlatform): string {
  switch (platform) {
    case 'instagram': return 'Instagram';
    case 'tiktok': return 'TikTok';
    case 'youtube': return 'YouTube';
    case 'facebook': return 'Facebook';
    case 'twitter': return 'Twitter';
    default: return 'Social Media';
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

  // Step Indicator
  stepIndicator: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepCircleActive: {
    backgroundColor: '#FFAD27'
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF'
  },
  stepNumberActive: {
    color: '#FFFFFF'
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
    maxWidth: 120
  },
  stepLineActive: {
    backgroundColor: '#FFAD27'
  },
  stepLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8
  },
  stepLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500'
  },
  stepLabelActive: {
    color: '#FFAD27',
    fontWeight: '600'
  },

  // Required deliverables
  requiredSection: {
    backgroundColor: '#FFFAF2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFAD27',
    padding: 16,
    marginBottom: 20
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

  // Feedback banner
  feedbackBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 20
  },
  feedbackContent: {
    flex: 1,
    marginLeft: 12
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4
  },
  feedbackText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18
  },

  // Step content
  stepContent: {
    marginBottom: 20
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20
  },

  // Upload
  section: {
    marginBottom: 20
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
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
  uploadButton: {
    height: 160,
    borderWidth: 2,
    borderColor: '#FFAD27',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF2'
  },
  uploadButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4
  },
  contentPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden'
  },
  previewImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 300,
    borderRadius: 12
  },
  videoPreview: {
    height: 200,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoPreviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8
  },
  removeContentButton: {
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

  // Info box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20
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

  // Status messages
  statusMessage: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12
  },
  statusText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22
  },

  // Approved banner
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 20
  },
  approvedBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 12
  },

  // Proof links
  proofLinkForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  proofLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
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
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFAD27',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFFAF2',
    marginBottom: 20
  },
  addLinkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFAD27',
    marginLeft: 8
  },

  // Bottom bar
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
