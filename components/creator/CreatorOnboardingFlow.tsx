import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DS } from '@/components/design-system/tokens';

// Create aliases for easier migration with mapped colors
const colors = {
  ...DS.colors,
  primary: DS.colors.primaryOrange,
  primaryLight: '#FFF4E6', // Light orange background
  background: DS.colors.background,
  border: DS.colors.border,
  textSecondary: DS.colors.textGray,
  text: DS.colors.textDark,
  success: DS.colors.success,
  successLight: '#D1FAE5', // Light green background
  error: DS.colors.error,
  warning: DS.colors.warning,
  warningLight: '#FEF3C7', // Light yellow background
};
const typography = DS.typography;
const spacing = DS.spacing;

interface CreatorOnboardingFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface OnboardingState {
  currentStep: number;
  displayName: string;
  bio: string;
  location: string;
  foodSpecialties: string[];
  portfolioImages: Array<{
    uri: string;
    caption: string;
    restaurantName?: string;
  }>;
  agreedToTerms: boolean;
}

const FOOD_SPECIALTIES = [
  'Fine Dining',
  'Casual Dining',
  'Street Food',
  'Brunch',
  'Desserts',
  'Vegan/Vegetarian',
  'International Cuisine',
  'Local Favorites',
  'Coffee & Cafes',
  'Bars & Cocktails',
  'Fast Food',
  'Food Trucks',
  'Seafood',
  'BBQ & Grills',
  'Asian Cuisine',
  'Italian',
  'Mexican',
  'Mediterranean',
];

export const CreatorOnboardingFlow: React.FC<CreatorOnboardingFlowProps> = ({
  onComplete,
  onCancel,
}) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    displayName: user?.name || '',
    bio: '',
    location: '',
    foodSpecialties: [],
    portfolioImages: [],
    agreedToTerms: false,
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (state.currentStep < totalSteps - 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const handleBack = () => {
    if (state.currentStep > 0) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    } else {
      onCancel();
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setState(prev => ({
      ...prev,
      foodSpecialties: prev.foodSpecialties.includes(specialty)
        ? prev.foodSpecialties.filter(s => s !== specialty)
        : [...prev.foodSpecialties, specialty].slice(0, 5), // Max 5 specialties
    }));
  };

  const pickImage = async () => {
    if (state.portfolioImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 portfolio images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setState(prev => ({
        ...prev,
        portfolioImages: [
          ...prev.portfolioImages,
          {
            uri: result.assets[0].uri,
            caption: '',
            restaurantName: '',
          },
        ],
      }));
    }
  };

  const updateImageCaption = (index: number, caption: string) => {
    setState(prev => ({
      ...prev,
      portfolioImages: prev.portfolioImages.map((img, i) =>
        i === index ? { ...img, caption } : img
      ),
    }));
  };

  const updateImageRestaurant = (index: number, restaurantName: string) => {
    setState(prev => ({
      ...prev,
      portfolioImages: prev.portfolioImages.map((img, i) =>
        i === index ? { ...img, restaurantName } : img
      ),
    }));
  };

  const removeImage = (index: number) => {
    setState(prev => ({
      ...prev,
      portfolioImages: prev.portfolioImages.filter((_, i) => i !== index),
    }));
  };

  const completeOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Upload portfolio images to storage
      const uploadedImages = await Promise.all(
        state.portfolioImages.map(async (image, index) => {
          const fileName = `${user.id}/portfolio/${Date.now()}_${index}.jpg`;
          const { data, error } = await supabase.storage
            .from('creator-portfolio')
            .upload(fileName, {
              uri: image.uri,
              type: 'image/jpeg',
              name: fileName,
            } as any);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('creator-portfolio')
            .getPublicUrl(fileName);

          return {
            url: publicUrl,
            caption: image.caption,
            restaurantName: image.restaurantName,
          };
        })
      );

      // Call the complete_creator_onboarding function
      const { data, error } = await supabase.rpc('complete_creator_onboarding', {
        p_user_id: user.id,
        p_display_name: state.displayName,
        p_bio: state.bio,
        p_location: state.location,
        p_food_specialties: state.foodSpecialties,
      });

      if (error) throw error;

      // Get the creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (creatorProfile) {
        // Insert portfolio items
        const portfolioItems = uploadedImages.map((img, index) => ({
          creator_profile_id: creatorProfile.id,
          image_url: img.url,
          caption: img.caption,
          restaurant_name: img.restaurantName,
          display_order: index,
        }));

        await supabase.from('creator_portfolio_items').insert(portfolioItems);
      }

      // Refresh user data to get updated account type
      await refreshUser();

      Alert.alert(
        'Welcome Creator! 🎉',
        "You're now a Troodie Creator! Start browsing campaigns to collaborate with restaurants.",
        [{ text: 'Get Started', onPress: onComplete }]
      );
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />;
      case 1:
        return (
          <ProfileStep
            state={state}
            setState={setState}
            toggleSpecialty={toggleSpecialty}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <PortfolioStep
            state={state}
            pickImage={pickImage}
            updateImageCaption={updateImageCaption}
            updateImageRestaurant={updateImageRestaurant}
            removeImage={removeImage}
            onNext={completeOnboarding}
            onBack={handleBack}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {state.currentStep > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((state.currentStep) / totalSteps) * 100}%` },
            ]}
          />
        </View>
      )}
      {renderStep()}
    </SafeAreaView>
  );
};

// Welcome Step Component
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <View style={styles.stepContainer}>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.welcomeContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={60} color={colors.primary} />
        </View>
        
        <Text style={styles.welcomeTitle}>Become a Troodie Creator</Text>
        <Text style={styles.welcomeSubtitle}>
          Join our community of food creators and collaborate with amazing restaurants
        </Text>

        <View style={styles.benefitsList}>
          <BenefitItem
            icon="camera"
            title="Share Your Passion"
            description="Create content for restaurants you love"
          />
          <BenefitItem
            icon="cash"
            title="Earn Money"
            description="Get paid for your creative work"
          />
          <BenefitItem
            icon="people"
            title="Grow Your Audience"
            description="Connect with food lovers in your area"
          />
        </View>

        <Text style={styles.setupTime}>⏱ Quick 2-minute setup</Text>
      </View>
    </ScrollView>
    
    <View style={styles.buttonContainer}>
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Benefit Item Component
const BenefitItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.benefitItem}>
    <Ionicons name={icon as any} size={24} color={colors.primary} />
    <View style={styles.benefitText}>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDescription}>{description}</Text>
    </View>
  </View>
);

// Profile Step Component
const ProfileStep: React.FC<{
  state: OnboardingState;
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>;
  toggleSpecialty: (specialty: string) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ state, setState, toggleSpecialty, onNext, onBack }) => {
  const canContinue = 
    state.displayName.length > 0 &&
    state.bio.length >= 20 &&
    state.location.length > 0 &&
    state.foodSpecialties.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepTitle}>Create Your Creator Profile</Text>
        <Text style={styles.stepSubtitle}>Tell restaurants about yourself</Text>

        <View style={styles.formSection}>
          <Text style={styles.label}>Display Name *</Text>
          <TextInput
            style={styles.input}
            value={state.displayName}
            onChangeText={(text) => setState(prev => ({ ...prev, displayName: text }))}
            placeholder="How you want to be known"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Bio * (min 20 characters)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={state.bio}
            onChangeText={(text) => setState(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about your food content and style..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.charCount}>{state.bio.length}/200</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Location/Area *</Text>
          <TextInput
            style={styles.input}
            value={state.location}
            onChangeText={(text) => setState(prev => ({ ...prev, location: text }))}
            placeholder="e.g., Downtown Seattle, Brooklyn, etc."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Food Specialties * (choose up to 5)</Text>
          <View style={styles.specialtiesGrid}>
            {FOOD_SPECIALTIES.map((specialty) => (
              <TouchableOpacity
                key={specialty}
                style={[
                  styles.specialtyChip,
                  state.foodSpecialties.includes(specialty) && styles.specialtyChipSelected,
                ]}
                onPress={() => toggleSpecialty(specialty)}
              >
                <Text
                  style={[
                    styles.specialtyChipText,
                    state.foodSpecialties.includes(specialty) && styles.specialtyChipTextSelected,
                  ]}
                >
                  {specialty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.disabledButton]}
          onPress={onNext}
          disabled={!canContinue}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Portfolio Step Component
const PortfolioStep: React.FC<{
  state: OnboardingState;
  pickImage: () => void;
  updateImageCaption: (index: number, caption: string) => void;
  updateImageRestaurant: (index: number, restaurantName: string) => void;
  removeImage: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}> = ({
  state,
  pickImage,
  updateImageCaption,
  updateImageRestaurant,
  removeImage,
  onNext,
  onBack,
  loading,
}) => {
  const canComplete = state.portfolioImages.length >= 3;

  return (
    <View style={styles.stepContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepTitle}>Show Your Best Work</Text>
        <Text style={styles.stepSubtitle}>
          Upload 3-5 photos of your food content
        </Text>

        <View style={styles.portfolioGrid}>
          {state.portfolioImages.map((image, index) => (
            <View key={index} style={styles.portfolioItem}>
              <Image source={{ uri: image.uri }} style={styles.portfolioImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
              <TextInput
                style={styles.captionInput}
                placeholder="Add caption..."
                value={image.caption}
                onChangeText={(text) => updateImageCaption(index, text)}
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.captionInput}
                placeholder="Restaurant name (optional)"
                value={image.restaurantName}
                onChangeText={(text) => updateImageRestaurant(index, text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ))}

          {state.portfolioImages.length < 5 && (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="add-circle-outline" size={40} color={colors.primary} />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.termsCheckbox}
            onPress={() => setState(prev => ({ ...prev, agreedToTerms: !prev.agreedToTerms }))}
          >
            <Ionicons
              name={state.agreedToTerms ? 'checkbox' : 'square-outline'}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.termsText}>
              I agree to the Creator Guidelines and Terms
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!canComplete || !state.agreedToTerms || loading) && styles.disabledButton,
          ]}
          onPress={onNext}
          disabled={!canComplete || !state.agreedToTerms || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  stepContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  welcomeContent: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  benefitsList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  benefitText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  benefitTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  setupTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  stepTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  specialtyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  specialtyChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  specialtyChipText: {
    ...typography.caption,
    color: colors.text,
  },
  specialtyChipTextSelected: {
    color: 'white',
  },
  portfolioGrid: {
    marginBottom: spacing.xl,
  },
  portfolioItem: {
    marginBottom: spacing.lg,
  },
  portfolioImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    ...typography.caption,
  },
  addImageButton: {
    width: '100%',
    height: 120,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  termsContainer: {
    marginBottom: spacing.xl,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    ...typography.body,
    marginLeft: spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: 'white',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
});