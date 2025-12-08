/**
 * CREATOR ONBOARDING V1 - Following v1_component_reference.html styling
 * Simplified 2-step flow focusing on portfolio and terms
 *
 * UPDATED: Now uses atomic creator upgrade and cloud image uploads
 * Tasks: CM-1 (Race Condition Fix), CM-2 (Portfolio Image Upload)
 */

import { VideoThumbnail } from '@/components/VideoThumbnail';
import { MAJOR_CITIES } from '@/constants/majorCities';
import { useAuth } from '@/contexts/AuthContext';
import {
    addPortfolioItems,
    rollbackCreatorUpgrade,
    upgradeToCreator,
} from '@/services/creatorUpgradeService';
import {
    getFailedUploads,
    uploadAllPortfolioImages,
    UploadedImage,
    UploadProgress,
} from '@/services/portfolioImageService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    ArrowLeft,
    Camera,
    Check,
    ChevronDown,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UploadProgressIndicator } from './UploadProgressIndicator';

interface CreatorOnboardingV1Props {
  onComplete: () => void;
  onCancel: () => void;
}

interface PortfolioImage {
  id: string;
  uri: string;
  caption: string;
  selected?: boolean;
  mediaType?: 'image' | 'video';
  duration?: number;
}

export const CreatorOnboardingV1: React.FC<CreatorOnboardingV1Props> = ({
  onComplete,
  onCancel,
}) => {
  const { user, profile, refreshAccountInfo } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const totalSteps = 2;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const pickImages = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to upload your portfolio images.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
        allowsMultipleSelection: true,
        selectionLimit: 5 - portfolioImages.length,
        quality: 0.8,
        // Removed aspect ratio constraint as it can prevent selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia: PortfolioImage[] = result.assets.map(asset => ({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          uri: asset.uri,
          caption: '',
          selected: true,
          mediaType: asset.type === 'video' ? 'video' as const : 'image' as const,
          duration: asset.duration ?? undefined,
        }));

        setPortfolioImages([...portfolioImages, ...newMedia].slice(0, 5));
      }
    } catch (error: any) {
      console.error('Error picking images:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to open image picker. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleImageSelection = (id: string) => {
    setPortfolioImages(prev =>
      prev.map(img => (img.id === id ? { ...img, selected: !img.selected } : img))
    );
  };

  const updateImageCaption = (id: string, caption: string) => {
    setPortfolioImages(prev =>
      prev.map(img => (img.id === id ? { ...img, caption } : img))
    );
  };

  const removeImage = (id: string) => {
    setPortfolioImages(prev => prev.filter(img => img.id !== id));
  };

  const proceedWithUploads = async (successfulUploads: UploadedImage[]) => {
    if (!user) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    setLoading(true);
    setIsUploading(false);

    try {
      // Double-check: Make absolutely sure we have valid URLs before proceeding
      const hasInvalidUploads = successfulUploads.some(media => !media.url || media.url.trim().length === 0);
      if (hasInvalidUploads) {
        setLoading(false);
        Alert.alert(
          'Upload Error',
          'Some uploads completed but returned invalid URLs. Please try again.',
          [
            { text: 'Try Again', onPress: () => completeOnboarding() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // STEP 2: Atomic creator upgrade
      // Only happens after ALL uploads are successful
      const upgradeResult = await upgradeToCreator(user.id, {
        displayName: profile?.name || profile?.username || 'Creator',
        bio: bio || 'Food lover and content creator',
        location: location || 'Charlotte, NC',
        specialties: ['General'],
      });

      if (!upgradeResult.success || !upgradeResult.profileId) {
        // Upgrade failed - user remains consumer
        setLoading(false);
        Alert.alert(
          'Setup Failed',
          upgradeResult.error || 'Failed to create your creator profile. Please try again.',
          [
            { text: 'Try Again', onPress: () => completeOnboarding() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // STEP 3: Add portfolio items with cloud URLs
      // If this fails, we should rollback the creator upgrade (user shouldn't be creator without portfolio)
      const portfolioResult = await addPortfolioItems(
        upgradeResult.profileId,
        successfulUploads.map((media, index) => ({
          imageUrl: media.mediaType === 'image' ? media.url : undefined,
          videoUrl: media.mediaType === 'video' ? media.url : undefined,
          thumbnailUrl: media.thumbnailUrl,
          mediaType: media.mediaType || 'image',
          caption: media.caption,
          displayOrder: index,
          isFeatured: index === 0,
        }))
      );

      if (!portfolioResult.success) {
        // Portfolio failed - this is critical, user was upgraded but portfolio not saved
        // Rollback the creator upgrade since portfolio is required
        console.error('Critical: Portfolio items failed to save after user upgrade:', portfolioResult.error);
        console.log('Attempting to rollback creator upgrade...');
        
        const rollbackResult = await rollbackCreatorUpgrade(user.id);
        
        setLoading(false);
        
        if (rollbackResult.success) {
          Alert.alert(
            'Upload Failed',
            'We couldn\'t save your portfolio. Your account was not upgraded. Please try again.',
            [
              { text: 'Try Again', onPress: () => completeOnboarding() },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else {
          // Rollback failed - this is a critical error
          Alert.alert(
            'Setup Error',
            'A critical error occurred. Please contact support at team@troodieapp.com for assistance.',
            [
              { text: 'Try Again', onPress: () => completeOnboarding() },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
        return;
      }

      // STEP 4: Refresh user data
      if (refreshAccountInfo) {
        await refreshAccountInfo();
      }

      // All steps completed successfully - navigate immediately
      setLoading(false);
      
      // Show success alert briefly, then navigate
      Alert.alert(
        'Welcome Creator!',
        'You can now apply to restaurant campaigns and start earning.',
        [{
          text: 'Get Started',
          onPress: () => {
            onComplete();
          }
        }],
        { 
          cancelable: false,
          onDismiss: () => {
            // Also navigate if alert is dismissed
            onComplete();
          }
        }
      );
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setLoading(false);
      
      // Ensure user stays on page and can retry
      Alert.alert(
        'Setup Failed',
        error.message || 'Something went wrong during setup. Please try again.',
        [
          { text: 'Try Again', onPress: () => completeOnboarding() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const completeOnboarding = async () => {
    if (!user) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    const selectedMedia = portfolioImages.filter(img => img.selected);
    if (selectedMedia.length < 3) {
      Alert.alert('Select More Content', 'Please select at least 3 photos or videos to showcase your work.');
      return;
    }

    setLoading(true);
    setIsUploading(true);

    try {
      // STEP 1: Upload media (images/videos) to cloud storage FIRST
      // This ensures we have cloud URLs before creating the profile
      // DO NOT upgrade user until uploads are completely successful
      let uploadedMedia: (UploadedImage | null)[];
      
      try {
        uploadedMedia = await uploadAllPortfolioImages(
          user.id,
          selectedMedia.map(media => ({
            id: media.id,
            uri: media.uri,
            caption: media.caption,
            mediaType: media.mediaType,
            duration: media.duration,
          })),
          setUploadProgress
        );
      } catch (uploadError: any) {
        // If upload function throws an error, handle it gracefully
        console.error('Upload error:', uploadError);
        setIsUploading(false);
        setLoading(false);
        Alert.alert(
          'Upload Failed',
          `Failed to upload your content: ${uploadError.message || 'Please check your connection and try again.'}`,
          [
            { text: 'Try Again', onPress: () => completeOnboarding() },
            { text: 'Cancel', style: 'cancel', onPress: () => setIsUploading(false) }
          ]
        );
        return;
      }

      // Filter out nulls and invalid uploads (failed uploads)
      const successfulUploads = uploadedMedia.filter(
        (media): media is NonNullable<typeof media> => 
          media !== null && 
          media !== undefined && 
          media.url !== undefined && 
          media.url !== null &&
          media.url.length > 0
      );

      // Check for upload failures - check BOTH the returned array and progress state
      const failedUploads = getFailedUploads(uploadProgress);
      const failedCount = uploadedMedia.length - successfulUploads.length;
      
      // If we have less than 3 successful uploads, we can't proceed
      if (successfulUploads.length < 3) {
        setIsUploading(false);
        setLoading(false);
        Alert.alert(
          'Incomplete Upload',
          `Only ${successfulUploads.length} of ${selectedMedia.length} items uploaded successfully. Please upload at least 3 items to continue.`,
          [
            { text: 'Try Again', onPress: () => completeOnboarding() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // If some uploads failed but we have at least 3 successful, ask user if they want to continue
      if (failedCount > 0 || failedUploads.length > 0 || successfulUploads.length < selectedMedia.length) {
        setIsUploading(false);
        setLoading(false);
        const totalFailed = Math.max(failedCount, failedUploads.length);
        const failedItems = totalFailed === 1 ? 'item' : 'items';
        const successCount = successfulUploads.length;
        const successItems = successCount === 1 ? 'item' : 'items';
        
        Alert.alert(
          'Some Uploads Failed',
          `${totalFailed} ${failedItems} failed to upload, but ${successCount} ${successItems} uploaded successfully. Would you like to continue with the uploaded content?`,
          [
            { 
              text: 'Continue with Uploaded Content', 
              onPress: () => proceedWithUploads(successfulUploads)
            },
            { 
              text: 'Try Again', 
              onPress: () => completeOnboarding() 
            },
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => setIsUploading(false)
            }
          ]
        );
        return;
      }

      // All uploads successful - proceed directly
      await proceedWithUploads(successfulUploads);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setIsUploading(false);
      setLoading(false);
      
      // Ensure user stays on page and can retry
      Alert.alert(
        'Setup Failed',
        error.message || 'Something went wrong during setup. Please try again.',
        [
          { text: 'Try Again', onPress: () => completeOnboarding() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const renderValueProp = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Become a Troodie Creator</Text>

          <View style={styles.illustrationBox}>
            <Text style={styles.illustrationText}>💰 → 📱 → 🍽️</Text>
          </View>

          <Text style={styles.description}>
            Your saves are already helping others discover great restaurants.
          </Text>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.card}>
            <Text style={styles.stepText}>
              <Text style={styles.bold}>1. Share</Text> what you already save
            </Text>
            <Text style={[styles.stepText, styles.mt2]}>
              <Text style={styles.bold}>2. Restaurants pay</Text> for your exposure
            </Text>
            <Text style={[styles.stepText, styles.mt2]}>
              <Text style={styles.bold}>3. Earn</Text> based on audience & engagement
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderContentShowcase = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.centerContent}>
            <Text style={styles.title}>Showcase Your Best Content</Text>
            <Text style={styles.subtitle}>Upload 3-5 photos/videos of your food content:</Text>
          </View>

          {/* Show upload progress when uploading */}
          {isUploading && uploadProgress.length > 0 && (
            <UploadProgressIndicator progress={uploadProgress} />
          )}

          {/* Image picker - hidden during upload */}
          {!isUploading && portfolioImages.length < 5 && (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
              <Camera size={20} color="#FFAD27" />
              <Text style={styles.uploadButtonText}>
                Add Photos/Videos ({portfolioImages.length}/5)
              </Text>
            </TouchableOpacity>
          )}

          {/* Image grid - hidden during upload */}
          {!isUploading && (
            <View style={styles.imagesGrid}>
              {portfolioImages.map((image) => (
                <TouchableOpacity
                  key={image.id}
                  style={[styles.imageItem, image.selected && styles.imageItemSelected]}
                  onPress={() => toggleImageSelection(image.id)}
                >
                  {image.mediaType === 'video' ? (
                    <View style={styles.videoThumbnailWrapper}>
                      <VideoThumbnail
                        videoUri={image.uri}
                        style={styles.imageThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.videoPlayOverlay}>
                        <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <Image source={{ uri: image.uri }} style={styles.imageThumb} />
                  )}

                  {image.selected && (
                    <View style={styles.imageCheckbox}>
                      <Check size={14} color="#171717" />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.imageRemove}
                    onPress={() => removeImage(image.id)}
                  >
                    <X size={16} color="#FFF" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.imageCaptionInput}
                    placeholder="Add caption..."
                    placeholderTextColor="#737373"
                    value={image.caption}
                    onChangeText={(text) => updateImageCaption(image.id, text)}
                    maxLength={100}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Location section - hidden during upload */}
          {!isUploading && (
            <View style={styles.bioSection}>
              <Text style={styles.bioLabel}>Location</Text>
              <TouchableOpacity
                style={styles.locationPicker}
                onPress={() => setShowLocationPicker(true)}
              >
                <Text style={[styles.locationText, !location && styles.locationPlaceholder]}>
                  {location || 'Select your city...'}
                </Text>
                <ChevronDown size={20} color="#737373" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bio section - hidden during upload */}
          {!isUploading && (
            <View style={styles.bioSection}>
              <Text style={styles.bioLabel}>Add a creator bio (optional)</Text>
              <TextInput
                style={styles.bioInput}
                placeholder="Charlotte foodie who loves finding hidden gems..."
                placeholderTextColor="#737373"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
          )}

          {/* Submit button */}
          {!isUploading && (
            <View style={styles.buttonContainerEnd}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (loading || portfolioImages.filter(img => img.selected).length < 3) && styles.disabledButton,
                ]}
                onPress={completeOnboarding}
                disabled={loading || portfolioImages.filter(img => img.selected).length < 3}
              >
                {loading ? (
                  <ActivityIndicator color="#171717" />
                ) : (
                  <Text style={styles.primaryButtonText}>Complete Setup</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            disabled={isUploading}
          >
            <ArrowLeft size={20} color={isUploading ? '#A3A3A3' : '#171717'} />
          </TouchableOpacity>
          {currentStep > 0 && (
            <Text style={styles.stepIndicator}>Step {currentStep} of {totalSteps}</Text>
          )}
        </View>
        {currentStep > 0 && (
          <Text style={styles.headerTitle}>Creator Onboarding</Text>
        )}
        {currentStep === 0 && <View style={{ width: 24 }} />}
      </View>

      {/* Content */}
      {currentStep === 0 && renderValueProp()}
      {currentStep === 1 && renderContentShowcase()}

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
            paddingBottom: 32,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#171717' }}>Select City</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <X size={24} color="#171717" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {MAJOR_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E5E5',
                    backgroundColor: location === city ? '#FFAD2720' : 'transparent',
                  }}
                  onPress={() => {
                    setLocation(city);
                    setShowLocationPicker(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: '#171717',
                    fontWeight: location === city ? '600' : '400',
                  }}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#737373',
  },
  headerTitle: {
    fontSize: 14,
    color: '#737373',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    color: '#525252',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  illustrationBox: {
    width: '100%',
    height: 128,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  illustrationText: {
    fontSize: 32,
  },
  gridContainer: {
    gap: 16,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
  },
  stepText: {
    fontSize: 14,
    color: '#171717',
  },
  mt2: {
    marginTop: 8,
  },
  bold: {
    fontWeight: '500',
  },
  cardLabel: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 8,
  },
  testimonialBox: {
    backgroundColor: '#FFFAF2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 12,
  },
  testimonialText: {
    fontSize: 14,
    color: '#171717',
  },
  testimonialAuthor: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
  buttonContainer: {
    gap: 8,
  },
  buttonContainerEnd: {
    alignItems: 'flex-end',
  },
  primaryButton: {
    backgroundColor: '#FFAD27',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#171717',
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFAD27',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFAD27',
  },
  imagesGrid: {
    gap: 12,
    marginBottom: 16,
  },
  imageItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  imageItemSelected: {
    borderColor: '#FFAD27',
    borderWidth: 2,
  },
  imageThumb: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  videoThumbnailWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  imageCheckbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFAD27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageRemove: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCaptionInput: {
    padding: 12,
    fontSize: 14,
    color: '#171717',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  bioSection: {
    marginBottom: 20,
  },
  bioLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  locationPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 14,
    color: '#171717',
    flex: 1,
  },
  locationPlaceholder: {
    color: '#737373',
  },
  bioInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
    fontSize: 14,
    color: '#171717',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButtonDisabled: {
    backgroundColor: '#E5E5E5',
    opacity: 0.6,
  },
  primaryButtonTextDisabled: {
    color: '#737373',
  },
});
