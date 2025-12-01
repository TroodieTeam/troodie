/**
 * CREATOR ONBOARDING V1 - Following v1_component_reference.html styling
 * Simplified 2-step flow focusing on portfolio and terms
 *
 * UPDATED: Now uses atomic creator upgrade and cloud image uploads
 * Tasks: CM-1 (Race Condition Fix), CM-2 (Portfolio Image Upload)
 */

import { useAuth } from '@/contexts/AuthContext';
import {
  uploadAllPortfolioImages,
  UploadProgress,
  getFailedUploads,
} from '@/services/portfolioImageService';
import {
  upgradeToCreator,
  addPortfolioItems,
} from '@/services/creatorUpgradeService';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Check,
  X,
  RefreshCw
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
}

export const CreatorOnboardingV1: React.FC<CreatorOnboardingV1Props> = ({
  onComplete,
  onCancel,
}) => {
  const { user, profile, refreshAccountInfo } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [bio, setBio] = useState('');
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        uri: asset.uri,
        caption: '',
        selected: true,
      }));

      setPortfolioImages([...portfolioImages, ...newImages].slice(0, 5));
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

  const completeOnboarding = async () => {
    if (!user) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    const selectedImages = portfolioImages.filter(img => img.selected);
    if (selectedImages.length < 3) {
      Alert.alert('Select More Content', 'Please select at least 3 photos to showcase your work.');
      return;
    }

    setLoading(true);
    setIsUploading(true);

    try {
      // STEP 1: Upload images to cloud storage FIRST
      // This ensures we have cloud URLs before creating the profile
      const uploadedImages = await uploadAllPortfolioImages(
        user.id,
        selectedImages.map(img => ({
          id: img.id,
          uri: img.uri,
          caption: img.caption,
        })),
        setUploadProgress
      );

      // Check for upload failures
      const failedUploads = getFailedUploads(uploadProgress);
      if (failedUploads.length > 0) {
        setIsUploading(false);
        Alert.alert(
          'Upload Error',
          `${failedUploads.length} image(s) failed to upload. Please try again.`,
          [
            { text: 'Retry', onPress: () => completeOnboarding() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // Filter out nulls (failed uploads)
      const successfulUploads = uploadedImages.filter(
        (img): img is NonNullable<typeof img> => img !== null
      );

      if (successfulUploads.length < 3) {
        setIsUploading(false);
        Alert.alert(
          'Upload Error',
          'Not enough images uploaded successfully. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsUploading(false);

      // STEP 2: Atomic creator upgrade
      // This uses the database function that upgrades user AND creates profile
      // in a single transaction. If profile creation fails, user remains consumer.
      const upgradeResult = await upgradeToCreator(user.id, {
        displayName: profile?.name || profile?.username || 'Creator',
        bio: bio || 'Food lover and content creator',
        location: 'Charlotte',
        specialties: ['General'],
      });

      if (!upgradeResult.success || !upgradeResult.profileId) {
        throw new Error(upgradeResult.error || 'Failed to upgrade account');
      }

      // STEP 3: Add portfolio items with cloud URLs
      const portfolioResult = await addPortfolioItems(
        upgradeResult.profileId,
        successfulUploads.map((img, index) => ({
          imageUrl: img.url,
          caption: img.caption,
          displayOrder: index,
          isFeatured: index === 0,
        }))
      );

      if (!portfolioResult.success) {
        // Portfolio failed but user is already upgraded
        // This is non-critical, log and continue
        console.warn('Portfolio items failed to save:', portfolioResult.error);
      }

      // STEP 4: Refresh user data
      if (refreshAccountInfo) {
        await refreshAccountInfo();
      }

      // Show success alert and then complete
      Alert.alert(
        'Welcome Creator!',
        'You can now apply to restaurant campaigns and start earning.',
        [{
          text: 'Get Started',
          onPress: () => {
            onComplete();
          }
        }],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Failed to complete onboarding. Please try again.',
        [
          { text: 'Retry', onPress: () => completeOnboarding() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setIsUploading(false);
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
            Now get paid for your recommendations!
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
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>See Example Creators</Text>
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
            <Text style={styles.subtitle}>Upload 3-5 photos of your food content:</Text>
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
                Add Photos ({portfolioImages.length}/5)
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
                  <Image source={{ uri: image.uri }} style={styles.imageThumb} />

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
        <Text style={styles.headerTitle}>Creator Onboarding</Text>
      </View>

      {/* Content */}
      {currentStep === 0 && renderValueProp()}
      {currentStep === 1 && renderContentShowcase()}
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
