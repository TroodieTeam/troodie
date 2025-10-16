import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { useAuth } from '@/contexts/AuthContext';
import { deliverableService } from '@/services/deliverableService';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Clock, Upload, X } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ContentType = 'photo' | 'video' | 'reel' | 'story' | 'post';
type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

interface CampaignApplication {
  id: string;
  campaign_id: string;
  campaign_name: string;
  restaurant_name: string;
  proposed_rate_cents: number;
  deadline: string;
}

export default function SubmitDeliverable() {
  const router = useRouter();
  const { user } = useAuth();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [application, setApplication] = useState<CampaignApplication | null>(null);
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);

  // Form state
  const [contentType, setContentType] = useState<ContentType>('photo');
  const [contentUrl, setContentUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform | ''>('');
  const [platformPostUrl, setPlatformPostUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCreatorProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (creatorProfileId && applicationId) {
      loadApplication();
    }
  }, [creatorProfileId, applicationId]);

  const loadCreatorProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCreatorProfileId(data.id);
    } catch (error) {
      console.error('Error loading creator profile:', error);
      Alert.alert('Error', 'Failed to load creator profile');
    }
  };

  const loadApplication = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_applications')
        .select(`
          id,
          campaign_id,
          proposed_rate_cents,
          campaigns!inner(
            id,
            name,
            end_date,
            restaurants!inner(name)
          )
        `)
        .eq('id', applicationId)
        .eq('creator_id', creatorProfileId)
        .single();

      if (error) throw error;

      setApplication({
        id: data.id,
        campaign_id: data.campaign_id,
        campaign_name: data.campaigns.name,
        restaurant_name: data.campaigns.restaurants.name,
        proposed_rate_cents: data.proposed_rate_cents,
        deadline: data.campaigns.end_date,
      });
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;

        // Upload to Supabase storage
        const fileName = `deliverables/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('deliverable-content')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('deliverable-content')
          .getPublicUrl(fileName);

        setContentUrl(publicUrl);
        setThumbnailUrl(publicUrl);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;

        // Upload to Supabase storage
        const fileName = `deliverables/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('deliverable-content')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('deliverable-content')
          .getPublicUrl(fileName);

        setContentUrl(publicUrl);
        setThumbnailUrl(publicUrl);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!contentUrl) {
      Alert.alert('Content Required', 'Please upload content before saving draft');
      return;
    }

    setSavingDraft(true);
    try {
      const result = await deliverableService.saveDraftDeliverable({
        campaign_application_id: applicationId!,
        content_type: contentType,
        content_url: contentUrl,
        thumbnail_url: thumbnailUrl,
        caption,
        social_platform: socialPlatform || undefined,
        platform_post_url: platformPostUrl || undefined,
      });

      if (result) {
        Alert.alert('Draft Saved', 'Your deliverable has been saved as a draft', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!contentUrl) {
      Alert.alert('Content Required', 'Please upload content before submitting');
      return;
    }

    if (!platformPostUrl) {
      Alert.alert('Post URL Required', 'Please provide the link to your published post');
      return;
    }

    setSubmitting(true);
    try {
      const result = await deliverableService.submitDeliverable({
        campaign_application_id: applicationId!,
        content_type: contentType,
        content_url: contentUrl,
        thumbnail_url: thumbnailUrl,
        caption,
        social_platform: socialPlatform || undefined,
        platform_post_url: platformPostUrl,
      });

      if (result) {
        Alert.alert(
          'Submitted Successfully!',
          `Your deliverable has been submitted for review. The restaurant will review it within 72 hours.`,
          [{ text: 'OK', onPress: () => router.replace('/creator/deliverables') }]
        );
      } else {
        Alert.alert('Error', 'Failed to submit deliverable');
      }
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      Alert.alert('Error', 'Failed to submit deliverable');
    } finally {
      setSubmitting(false);
    }
  };

  const contentTypes: { value: ContentType; label: string; icon: string }[] = [
    { value: 'photo', label: 'Photo', icon: '📷' },
    { value: 'video', label: 'Video', icon: '🎥' },
    { value: 'reel', label: 'Reel', icon: '🎬' },
    { value: 'story', label: 'Story', icon: '⚡' },
    { value: 'post', label: 'Post', icon: '📝' },
  ];

  const platforms: { value: SocialPlatform; label: string; icon: string }[] = [
    { value: 'instagram', label: 'Instagram', icon: '📸' },
    { value: 'tiktok', label: 'TikTok', icon: '🎵' },
    { value: 'youtube', label: 'YouTube', icon: '▶️' },
    { value: 'twitter', label: 'Twitter', icon: '🐦' },
    { value: 'facebook', label: 'Facebook', icon: '👥' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFAD27" />
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Campaign not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <>
            <CreatorHeader
              title="Submit Deliverable"
              onBack={() => router.back()}
            />

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Campaign Info Card */}
              <View style={styles.campaignInfoCard}>
                <View style={styles.campaignInfoRow}>
                  <View style={styles.restaurantIcon}>
                    <Text style={styles.restaurantIconText}>
                      {application.restaurant_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.campaignInfoText}>
                    <Text style={styles.restaurantName}>{application.restaurant_name}</Text>
                    <Text style={styles.campaignName}>{application.campaign_name}</Text>
                  </View>
                </View>
                <View style={styles.campaignMetaRow}>
                  <View style={styles.metaBadge}>
                    <Clock size={14} color="#737373" />
                    <Text style={styles.metaBadgeText}>
                      Due {new Date(application.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.metaBadge, styles.payoutBadge]}>
                    <Text style={styles.payoutText}>
                      ${(application.proposed_rate_cents / 100).toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Content Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Content Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScrollView}
                >
                  {contentTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.chip,
                        contentType === type.value && styles.chipSelected
                      ]}
                      onPress={() => setContentType(type.value)}
                    >
                      <Text style={styles.chipIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.chipText,
                        contentType === type.value && styles.chipTextSelected
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Content Upload */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Upload Content</Text>
                {contentUrl ? (
                  <View style={styles.uploadedContent}>
                    <Image source={{ uri: contentUrl }} style={styles.uploadedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        setContentUrl('');
                        setThumbnailUrl('');
                      }}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={takePicture}
                      disabled={uploadingImage}
                    >
                      <View style={styles.uploadIconCircle}>
                        <Camera size={20} color="#000000" />
                      </View>
                      <Text style={styles.uploadButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={pickImage}
                      disabled={uploadingImage}
                    >
                      <View style={styles.uploadIconCircle}>
                        <Upload size={20} color="#000000" />
                      </View>
                      <Text style={styles.uploadButtonText}>Upload File</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#FFAD27" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </View>

              {/* Caption */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Caption (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Write your caption here..."
                  placeholderTextColor="#A3A3A3"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Social Platform */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Social Platform</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScrollView}
                >
                  {platforms.map((platform) => (
                    <TouchableOpacity
                      key={platform.value}
                      style={[
                        styles.chip,
                        socialPlatform === platform.value && styles.chipSelected
                      ]}
                      onPress={() => setSocialPlatform(platform.value)}
                    >
                      <Text style={styles.chipIcon}>{platform.icon}</Text>
                      <Text style={[
                        styles.chipText,
                        socialPlatform === platform.value && styles.chipTextSelected
                      ]}>
                        {platform.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Post URL */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Post URL</Text>
                <Text style={styles.sectionDescription}>
                  Link to your published post (required for submission)
                </Text>
                <TextInput
                  style={styles.input}
                  value={platformPostUrl}
                  onChangeText={setPlatformPostUrl}
                  placeholder="https://instagram.com/p/..."
                  placeholderTextColor="#A3A3A3"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.secondaryButton, savingDraft && styles.buttonDisabled]}
                  onPress={handleSaveDraft}
                  disabled={savingDraft || submitting}
                >
                  {savingDraft ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Save Draft</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (submitting || !contentUrl || !platformPostUrl) && styles.buttonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || savingDraft || !contentUrl || !platformPostUrl}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <>
                      <Check size={18} color="#000000" />
                      <Text style={styles.primaryButtonText}>Submit for Review</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.bottomSpacer} />
            </ScrollView>
          </>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#737373',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  campaignInfoCard: {
    backgroundColor: '#FFFAF2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  campaignInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFAD27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  restaurantIconText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  campaignInfoText: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 2,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  campaignMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  metaBadgeText: {
    fontSize: 12,
    color: '#737373',
  },
  payoutBadge: {
    backgroundColor: '#10B98120',
    borderColor: '#10B98130',
  },
  payoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#737373',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#A3A3A3',
    marginBottom: 8,
  },
  chipScrollView: {
    marginHorizontal: -4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginHorizontal: 4,
  },
  chipSelected: {
    backgroundColor: '#FFFAF2',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  chipTextSelected: {
    color: '#000000',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFAF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  uploadedContent: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  uploadedImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#F5F5F5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#737373',
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 14,
    color: '#000000',
  },
  textArea: {
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 14,
    color: '#000000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#FFAD27',
    borderRadius: 24,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 40,
  },
});
