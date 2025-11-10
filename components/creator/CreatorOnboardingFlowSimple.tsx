/**
 * CREATOR ONBOARDING FLOW - SIMPLIFIED VERSION
 * Focuses on portfolio upload and creator terms only
 * Profile info already collected in main onboarding
 */

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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, X, CheckCircle, TrendingUp, DollarSign, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DS } from '@/components/design-system/tokens';

interface CreatorOnboardingFlowSimpleProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface PortfolioImage {
  id: string;
  uri: string;
  caption: string;
  restaurantName: string;
}

export const CreatorOnboardingFlowSimple: React.FC<CreatorOnboardingFlowSimpleProps> = ({
  onComplete,
  onCancel,
}) => {
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalSteps = 2; // Welcome + Portfolio

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
      selectionLimit: 5 - portfolioImages.length,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        id: `${Date.now()}-${Math.random()}`,
        uri: asset.uri,
        caption: '',
        restaurantName: '',
      }));
      
      setPortfolioImages([...portfolioImages, ...newImages].slice(0, 5));
    }
  };

  const updateImageCaption = (id: string, caption: string) => {
    setPortfolioImages(prev =>
      prev.map(img => (img.id === id ? { ...img, caption } : img))
    );
  };

  const updateImageRestaurant = (id: string, restaurantName: string) => {
    setPortfolioImages(prev =>
      prev.map(img => (img.id === id ? { ...img, restaurantName } : img))
    );
  };

  const removeImage = (id: string) => {
    setPortfolioImages(prev => prev.filter(img => img.id !== id));
  };

  const completeOnboarding = async () => {
    if (!user) return;
    
    if (portfolioImages.length < 3) {
      Alert.alert('More Photos Needed', 'Please upload at least 3 photos to showcase your work.');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Creator Terms to continue.');
      return;
    }

    setLoading(true);
    try {
      // Call the RPC function to complete creator onboarding
      const { error } = await supabase.rpc('complete_creator_onboarding', {
        p_user_id: user.id,
        p_display_name: user.name || user.username || 'Creator',
        p_bio: user.bio || 'Food content creator',
        p_location: 'Los Angeles', // Could get from user profile
        p_food_specialties: ['General'], // Basic default
      });

      if (error) throw error;

      // Upload portfolio images
      for (const image of portfolioImages) {
        // In production, upload to storage first
        // For now, just save the metadata
        await supabase.from('creator_portfolio_items').insert({
          creator_profile_id: user.id,
          image_url: image.uri, // In production, this would be the storage URL
          caption: image.caption,
          restaurant_name: image.restaurantName,
          display_order: portfolioImages.indexOf(image),
        });
      }

      await refreshUser();
      Alert.alert(
        'Welcome Creator! 🎉',
        'You can now apply to restaurant campaigns and start earning.',
        [{ text: 'Get Started', onPress: onComplete }]
      );
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', error.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.welcomeContainer}>
        <View style={styles.iconContainer}>
          <Camera size={48} color={DS.colors.primaryOrange} />
        </View>
        
        <Text style={styles.title}>Become a Creator</Text>
        <Text style={styles.subtitle}>
          Turn your food photos into earnings by partnering with restaurants
        </Text>

        <View style={styles.benefitsContainer}>
          <BenefitCard
            icon={<DollarSign size={24} color={DS.colors.primaryOrange} />}
            title="Earn Money"
            description="Get paid for creating content at restaurants"
          />
          <BenefitCard
            icon={<Users size={24} color={DS.colors.primaryOrange} />}
            title="Build Your Audience"
            description="Grow your following with quality content"
          />
          <BenefitCard
            icon={<TrendingUp size={24} color={DS.colors.primaryOrange} />}
            title="Free Meals"
            description="Enjoy complimentary dining experiences"
          />
        </View>

        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>What You'll Need:</Text>
          <Text style={styles.requirementItem}>• 3-5 photos of food content you've created</Text>
          <Text style={styles.requirementItem}>• Passion for food and photography</Text>
          <Text style={styles.requirementItem}>• Active on social media (optional)</Text>
        </View>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderPortfolioStep = () => (
    <KeyboardAvoidingView 
      style={styles.flex} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Show Your Best Work</Text>
        <Text style={styles.subtitle}>
          Upload 3-5 photos of your food content
        </Text>

        {portfolioImages.length < 5 && (
          <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
            <Camera size={24} color={DS.colors.primaryOrange} />
            <Text style={styles.uploadButtonText}>
              Add Photos ({portfolioImages.length}/5)
            </Text>
          </TouchableOpacity>
        )}

        {portfolioImages.map((image) => (
          <View key={image.id} style={styles.imageCard}>
            <Image source={{ uri: image.uri }} style={styles.portfolioImage} />
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(image.id)}
            >
              <X size={20} color={DS.colors.surface} />
            </TouchableOpacity>

            <TextInput
              style={styles.captionInput}
              placeholder="Add caption..."
              placeholderTextColor={DS.colors.textGray}
              value={image.caption}
              onChangeText={(text) => updateImageCaption(image.id, text)}
              multiline
              maxLength={200}
            />

            <TextInput
              style={styles.restaurantInput}
              placeholder="Restaurant name (optional)"
              placeholderTextColor={DS.colors.textGray}
              value={image.restaurantName}
              onChangeText={(text) => updateImageRestaurant(image.id, text)}
              maxLength={100}
            />
          </View>
        ))}

        <View style={styles.termsContainer}>
          <Switch
            value={agreedToTerms}
            onValueChange={setAgreedToTerms}
            trackColor={{ false: DS.colors.border, true: DS.colors.primaryOrange }}
            thumbColor={DS.colors.surface}
          />
          <Text style={styles.termsText}>
            I agree to the Creator Terms and understand that my content may be used by restaurants
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!agreedToTerms || portfolioImages.length < 3 || loading) && styles.disabledButton,
          ]}
          onPress={completeOnboarding}
          disabled={!agreedToTerms || portfolioImages.length < 3 || loading}
        >
          {loading ? (
            <ActivityIndicator color={DS.colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={DS.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>creator/onboarding</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentStep + 1) / totalSteps) * 100}%` },
          ]}
        />
      </View>

      {/* Content */}
      {currentStep === 0 && renderWelcomeStep()}
      {currentStep === 1 && renderPortfolioStep()}
    </SafeAreaView>
  );
};

// Benefit Card Component
const BenefitCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.benefitCard}>
    <View style={styles.benefitIcon}>{icon}</View>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={styles.benefitDescription}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    backgroundColor: DS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  backButton: {
    padding: DS.spacing.xs,
  },
  headerTitle: {
    ...DS.typography.body,
    color: DS.colors.textGray,
  },
  headerSpacer: {
    width: 32,
  },
  progressBar: {
    height: 3,
    backgroundColor: DS.colors.borderLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DS.colors.primaryOrange,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: DS.spacing.lg,
  },
  welcomeContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: DS.spacing.lg,
  },
  title: {
    ...DS.typography.h1,
    textAlign: 'center',
    marginBottom: DS.spacing.sm,
  },
  subtitle: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    textAlign: 'center',
    marginBottom: DS.spacing.xl,
  },
  benefitsContainer: {
    marginBottom: DS.spacing.xl,
  },
  benefitCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.md,
    marginBottom: DS.spacing.md,
    ...DS.shadows.sm,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.sm,
  },
  benefitTitle: {
    ...DS.typography.bodyBold,
    marginBottom: DS.spacing.xs,
  },
  benefitDescription: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
  },
  requirementsBox: {
    backgroundColor: DS.colors.surfaceLight,
    borderRadius: DS.borderRadius.md,
    padding: DS.spacing.md,
    marginBottom: DS.spacing.xl,
  },
  requirementsTitle: {
    ...DS.typography.bodyBold,
    marginBottom: DS.spacing.sm,
  },
  requirementItem: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    marginBottom: DS.spacing.xs,
  },
  uploadButton: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.md,
    borderWidth: 2,
    borderColor: DS.colors.primaryOrange,
    borderStyle: 'dashed',
    padding: DS.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.spacing.md,
  },
  uploadButtonText: {
    ...DS.typography.bodyBold,
    color: DS.colors.primaryOrange,
    marginLeft: DS.spacing.sm,
  },
  imageCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    marginBottom: DS.spacing.md,
    ...DS.shadows.sm,
    overflow: 'hidden',
  },
  portfolioImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: DS.spacing.sm,
    right: DS.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionInput: {
    ...DS.typography.body,
    padding: DS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
    minHeight: 60,
  },
  restaurantInput: {
    ...DS.typography.body,
    padding: DS.spacing.md,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DS.colors.surfaceLight,
    borderRadius: DS.borderRadius.md,
    padding: DS.spacing.md,
    marginVertical: DS.spacing.lg,
  },
  termsText: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
    flex: 1,
    marginLeft: DS.spacing.sm,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: DS.spacing.lg,
    paddingBottom: DS.spacing.xl,
    backgroundColor: DS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    gap: DS.spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: DS.colors.primaryOrange,
    borderRadius: DS.borderRadius.md,
    padding: DS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  primaryButtonText: {
    ...DS.typography.bodyBold,
    color: DS.colors.surface,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.md,
    borderWidth: 1,
    borderColor: DS.colors.border,
    padding: DS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  secondaryButtonText: {
    ...DS.typography.body,
    color: DS.colors.textGray,
  },
  disabledButton: {
    opacity: 0.5,
  },
});