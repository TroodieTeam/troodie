import { CampaignErrorStates } from '@/components/campaigns/CampaignErrorStates';
import { CampaignStep1 } from '@/components/campaigns/CampaignStep1';
import { CampaignStep2 } from '@/components/campaigns/CampaignStep2';
import { CampaignStep3 } from '@/components/campaigns/CampaignStep3';
import { CampaignStep4 } from '@/components/campaigns/CampaignStep4';
import { CampaignStepIndicator } from '@/components/campaigns/CampaignStepIndicator';
import { DS } from '@/components/design-system/tokens';
import { TOTAL_STEPS } from '@/constants/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaignForm } from '@/hooks/useCampaignForm';
import { useCampaignSubmission } from '@/hooks/useCampaignSubmission';
import { useRestaurantData } from '@/hooks/useRestaurantData';
import { useStripeAccount } from '@/hooks/useStripeAccount';
import { validateCampaignSubmission, validateStep } from '@/utils/campaignValidation';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateCampaign() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Custom hooks
  const {
    formData,
    newDeliverable,
    setNewDeliverable,
    updateFormData,
    addDeliverable,
    removeDeliverable,
  } = useCampaignForm();

  const { stripeAccountStatus, checkStripeAccount, handleConnectStripe, refreshAccountStatus } =
    useStripeAccount(currentStep);

  const { restaurantData, loadingState, errorMessage, loadRestaurantData } = useRestaurantData();

  const { submitCampaign, loading: submissionLoading } = useCampaignSubmission();

  const handleNext = () => {
    if (validateStep(currentStep, formData, stripeAccountStatus)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      Alert.alert('Incomplete', 'Please fill in all required fields for this step.');
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to create a campaign');
      return;
    }

    const validation = validateCampaignSubmission(formData, restaurantData, stripeAccountStatus);
    if (!validation.valid) {
      Alert.alert('Error', validation.error || 'Please complete all required fields.');
      if (validation.step) {
        setCurrentStep(validation.step);
      }
      return;
    }

    const result = await submitCampaign(formData, restaurantData!, stripeAccountStatus, user.id);
    if (result?.step) {
      setCurrentStep(result.step);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <CampaignStep1 formData={formData} onUpdate={updateFormData} />;
      case 2:
        return <CampaignStep2 formData={formData} onUpdate={updateFormData} />;
      case 3:
        return (
          <CampaignStep3
            formData={formData}
            newDeliverable={newDeliverable}
            setNewDeliverable={setNewDeliverable}
            onAddDeliverable={addDeliverable}
            onRemoveDeliverable={removeDeliverable}
          />
        );
      case 4:
        return (
          <CampaignStep4
            stripeAccountStatus={stripeAccountStatus}
            formData={formData}
            loading={submissionLoading}
            onConnectStripe={handleConnectStripe}
            onRefreshStatus={refreshAccountStatus}
            onManualRefresh={() => {
              checkStripeAccount();
            }}
          />
        );
      default:
        return null;
    }
  };

  // Render loading state
  if (loadingState === 'loading') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: DS.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        <Text style={{ marginTop: DS.spacing.md, color: DS.colors.textDark }}>Loading restaurant data...</Text>
      </SafeAreaView>
    );
  }

  // Render error states
  if (loadingState !== 'loaded') {
    return (
      <CampaignErrorStates
        loadingState={loadingState}
        errorMessage={errorMessage}
        onRetry={loadRestaurantData}
        onGoBack={() => router.back()}
        onCompleteSetup={() => router.push('/business' as any)}
        onClaimRestaurant={() => router.push('/restaurant/claim')}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: DS.spacing.md,
          backgroundColor: DS.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.textDark} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: DS.colors.textDark,
          }}
        >
          Create Campaign
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Restaurant Header */}
      {restaurantData && (
        <View
          style={{
            backgroundColor: DS.colors.surface,
            padding: DS.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: DS.colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>
            Creating campaign for:
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.textDark }}>{restaurantData.name}</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: DS.spacing.md }}>
        <CampaignStepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <View
          style={{
            backgroundColor: DS.colors.surface,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            marginBottom: DS.spacing.md,
          }}
        >
          {renderStep()}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View
        style={{
          flexDirection: 'row',
          padding: DS.spacing.md,
          backgroundColor: DS.colors.surface,
          borderTopWidth: 1,
          borderTopColor: DS.colors.border,
        }}
      >
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={() => setCurrentStep(currentStep - 1)}
            style={{
              flex: 1,
              backgroundColor: DS.colors.background,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
              marginRight: DS.spacing.xs,
            }}
          >
            <Text style={{ color: DS.colors.textDark, fontWeight: '600' }}>Previous</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleNext}
          disabled={!validateStep(currentStep, formData, stripeAccountStatus) || submissionLoading}
          style={{
            flex: currentStep > 1 ? 1 : 2,
            backgroundColor: validateStep(currentStep, formData, stripeAccountStatus)
              ? DS.colors.primaryOrange
              : '#808080',
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            alignItems: 'center',
            marginLeft: currentStep > 1 ? DS.spacing.xs : 0,
            opacity: validateStep(currentStep, formData, stripeAccountStatus) ? 1 : 0.8,
          }}
        >
          {submissionLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: 'white',
                  fontWeight: '700',
                }}
              >
                {currentStep === TOTAL_STEPS ? 'Create Campaign' : 'Next'}
              </Text>
              {currentStep === TOTAL_STEPS && !stripeAccountStatus.onboardingCompleted && (
                <Text
                  style={{
                    fontSize: 11,
                    color: '#FFE5E5',
                    marginTop: 4,
                    textAlign: 'center',
                    fontWeight: '500',
                  }}
                >
                  Payment account required
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
