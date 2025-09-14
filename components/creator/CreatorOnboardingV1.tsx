/**
 * CREATOR ONBOARDING V1 - Following v1_component_reference.html styling
 * Simplified 2-step flow focusing on portfolio and terms
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { 
  ArrowLeft, 
  Camera, 
  X, 
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Users,
  Check
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { profileService } from '@/services/profileService';

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

const CREATOR_FOCUSES = [
  'Local Favorites',
  'Date Night Spots',
  'Hidden Gems',
  'Family Friendly',
  'Vegan/Vegetarian',
  'Fine Dining',
  'Casual Eats',
  'Brunch Spots',
  'Coffee & Cafes',
  'International Cuisine',
];

export const CreatorOnboardingV1: React.FC<CreatorOnboardingV1Props> = ({
  onComplete,
  onCancel,
}) => {
  const { user, refreshAccountInfo, upgradeAccount } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const totalSteps = 3;

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      // Get updated profile with counts
      const profileData = await profileService.getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
      
      // Get user's boards
      const userBoards = await boardService.getUserBoards(user.id);
      setBoards(userBoards || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

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

  const toggleFocus = (focus: string) => {
    setSelectedFocuses(prev =>
      prev.includes(focus)
        ? prev.filter(f => f !== focus)
        : [...prev, focus]
    );
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
        id: `${Date.now()}-${Math.random()}`,
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
    try {
      // Try to use the upgradeAccount function if available
      if (upgradeAccount) {
        const upgradeResult = await upgradeAccount('creator', {
          display_name: user.name || user.username || 'Creator',
          bio: bio || `Food lover exploring ${selectedFocuses.join(', ').toLowerCase()}`,
          location: 'Charlotte',
          food_specialties: selectedFocuses.length > 0 ? selectedFocuses : ['General'],
          specialties: selectedFocuses.length > 0 ? selectedFocuses : ['General'],
        });
        
        if (!upgradeResult.success) {
          throw new Error(upgradeResult.error || 'Failed to upgrade account');
        }
      } else {
        // Fallback: Update user to creator type directly
        const { error: updateError } = await supabase
          .from('users')
          .update({
            account_type: 'creator',
            is_creator: true,
            account_upgraded_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
      }

      // Create or update creator profile
      const { data: existingProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        // Create new creator profile
        const { error: profileError } = await supabase
          .from('creator_profiles')
          .insert({
            user_id: user.id,
            display_name: user.name || user.username || 'Creator',
            bio: bio || `Food lover exploring ${selectedFocuses.join(', ').toLowerCase()}`,
            location: 'Charlotte',
            food_specialties: selectedFocuses.length > 0 ? selectedFocuses : ['General'],
            specialties: selectedFocuses.length > 0 ? selectedFocuses : ['General'],
            verification_status: 'verified',
            instant_approved: true,
            portfolio_uploaded: true,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }
      }

      // Get the creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (creatorProfile) {
        // Save portfolio items (without actual upload for now)
        for (let i = 0; i < selectedImages.length; i++) {
          const image = selectedImages[i];
          await supabase.from('creator_portfolio_items').insert({
            creator_profile_id: creatorProfile.id,
            image_url: image.uri, // In production, upload to storage first
            caption: image.caption || '',
            display_order: i,
            is_featured: i === 0,
          });
        }
      }

      // Refresh user data first, before showing alert
      if (refreshAccountInfo) {
        await refreshAccountInfo();
      }
      
      // Show success alert and then complete
      // Don't navigate away until user dismisses the alert
      Alert.alert(
        'Welcome Creator! 🎉',
        'You can now apply to restaurant campaigns and start earning.',
        [{ 
          text: 'Get Started', 
          onPress: () => {
            // Only call onComplete after user dismisses alert
            onComplete();
          }
        }],
        { cancelable: false } // Prevent dismissing by tapping outside
      );
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Failed to complete onboarding. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
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
              <Text style={styles.bold}>1️⃣ Share</Text> what you already save
            </Text>
            <Text style={[styles.stepText, styles.mt2]}>
              <Text style={styles.bold}>2️⃣ Restaurants pay</Text> for your exposure
            </Text>
            <Text style={[styles.stepText, styles.mt2]}>
              <Text style={styles.bold}>3️⃣ Earn</Text> $25–100 per campaign
            </Text>
            <Text style={[styles.stepText, styles.mt2]}>
              <Text style={styles.bold}>4️⃣ Get paid</Text> instantly via Stripe
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Success Stories</Text>
            <View style={styles.testimonialBox}>
              <Text style={styles.testimonialText}>
                "I earn $400/month sharing places I already love!"
              </Text>
              <Text style={styles.testimonialAuthor}>— Sarah, CLT</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Get Started • 2 min setup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>See Example Creators</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderQualification = () => {
    // Use real user data for qualification check
    const saveCount = profile?.saves_count || user?.saves_count || 0;
    const boardCount = boards?.length || 0;
    const friendCount = (profile?.followers_count || 0) + (profile?.following_count || 0);
    const hasAvatar = !!user?.avatar_url || !!profile?.avatar_url;
    
    // Check all qualification requirements
    const meetsAllRequirements = saveCount >= 40 && boardCount >= 3 && hasAvatar && friendCount >= 5;
    const isQualified = saveCount >= 40;
    
    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.centerContent}>
            <Text style={styles.title}>Let's Check Your Creator Status</Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.card}>
              <View style={styles.checkList}>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={20} color={saveCount >= 40 ? "#10B981" : "#737373"} />
                  <Text style={[styles.checkText, saveCount >= 40 ? styles.checkTextGreen : styles.checkTextGray]}>
                    {saveCount} restaurant saves {saveCount >= 40 ? '✓' : '(need 40+)'}
                  </Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={20} color={boardCount >= 3 ? "#10B981" : "#737373"} />
                  <Text style={[styles.checkText, boardCount >= 3 ? styles.checkTextGreen : styles.checkTextGray]}>
                    {boardCount} boards created {boardCount >= 3 ? '✓' : '(need 3+)'}
                  </Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={20} color={hasAvatar ? "#10B981" : "#737373"} />
                  <Text style={[styles.checkText, hasAvatar ? styles.checkTextGreen : styles.checkTextGray]}>
                    Profile photo {hasAvatar ? 'uploaded ✓' : 'needed'}
                  </Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={20} color={friendCount >= 5 ? "#10B981" : "#737373"} />
                  <Text style={[styles.checkText, friendCount >= 5 ? styles.checkTextGreen : styles.checkTextGray]}>
                    {friendCount} friends connected {friendCount >= 5 ? '✓' : '(need 5+)'}
                  </Text>
                </View>
              </View>
              <Text style={styles.qualifiedText}>
                {meetsAllRequirements 
                  ? "Wow! You're fully qualified 🎉" 
                  : `${4 - [saveCount >= 40, boardCount >= 3, hasAvatar, friendCount >= 5].filter(Boolean).length} requirement${
                      [saveCount >= 40, boardCount >= 3, hasAvatar, friendCount >= 5].filter(Boolean).length === 3 ? '' : 's'
                    } left to meet`}
              </Text>
            </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choose your creator focus</Text>
            <Text style={styles.cardSubtitle}>(Select all that apply)</Text>
            <View style={styles.chipsContainer}>
              {CREATOR_FOCUSES.map(focus => (
                <TouchableOpacity
                  key={focus}
                  style={[
                    styles.chip,
                    selectedFocuses.includes(focus) && styles.chipSelected,
                  ]}
                  onPress={() => toggleFocus(focus)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedFocuses.includes(focus) && styles.chipTextSelected,
                  ]}>
                    {focus}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.buttonContainerEnd}>
          <TouchableOpacity 
            style={[styles.primaryButton, !meetsAllRequirements && styles.primaryButtonDisabled]} 
            onPress={handleNext}
            disabled={!meetsAllRequirements}
          >
            <Text style={[styles.primaryButtonText, !meetsAllRequirements && styles.primaryButtonTextDisabled]}>
              {meetsAllRequirements ? 'Continue' : 'Complete Requirements to Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    );
  };

  const renderContentShowcase = () => (
    <KeyboardAvoidingView 
      style={styles.flex} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.centerContent}>
            <Text style={styles.title}>Showcase Your Best Content</Text>
            <Text style={styles.subtitle}>Upload 3–5 photos of your food content:</Text>
          </View>

          {portfolioImages.length < 5 && (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
              <Camera size={20} color="#FFAD27" />
              <Text style={styles.uploadButtonText}>
                Add Photos ({portfolioImages.length}/5)
              </Text>
            </TouchableOpacity>
          )}

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={20} color="#171717" />
          </TouchableOpacity>
          {currentStep > 0 && (
            <Text style={styles.stepIndicator}>Step {currentStep} of {totalSteps}</Text>
          )}
        </View>
        <Text style={styles.headerTitle}>Creator Onboarding</Text>
      </View>

      {/* Content */}
      {currentStep === 0 && renderValueProp()}
      {currentStep === 1 && renderQualification()}
      {currentStep === 2 && renderContentShowcase()}
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
  checkList: {
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 14,
    color: '#171717',
  },
  checkTextGreen: {
    color: '#10B981',
  },
  checkTextGray: {
    color: '#737373',
  },
  qualifiedText: {
    fontSize: 14,
    color: '#171717',
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: '#525252',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#737373',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#FFFAF2',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipText: {
    fontSize: 14,
    color: '#171717',
  },
  chipTextSelected: {
    color: '#171717',
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