import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { designTokens } from '@/constants/designTokens';
import { ChevronLeft } from 'lucide-react-native';
import CampaignTypeSelector from './CampaignTypeSelector';
import CampaignDetailsForm from './CampaignDetailsForm';
import BudgetTrackingForm from './BudgetTrackingForm';
import PartnershipDetailsForm from './PartnershipDetailsForm';
import CampaignPreview from './CampaignPreview';
import { ManagementType } from '@/types/campaign';

interface AdminCampaignWizardProps {
  onComplete: (campaignData: any) => void;
  onCancel: () => void;
}

type WizardStep = 'type' | 'details' | 'budget' | 'partnership' | 'preview';

export default function AdminCampaignWizard({
  onComplete,
  onCancel,
}: AdminCampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [campaignData, setCampaignData] = useState({
    type: 'direct' as ManagementType,
    // Campaign Details
    title: '',
    description: '',
    requirements: [] as string[],
    maxCreators: 0,
    startDate: null as Date | null,
    endDate: null as Date | null,
    // Budget Tracking
    budgetSource: 'marketing',
    approvedBudgetCents: 0,
    costCenter: '',
    targetCreators: 0,
    targetContentPieces: 0,
    targetReach: 0,
    // Partnership Details (optional)
    partnerRestaurantId: null as string | null,
    partnerRestaurantName: '',
    partnershipAgreementSigned: false,
    partnershipStartDate: null as Date | null,
    partnershipEndDate: null as Date | null,
    subsidyAmountCents: 0,
  });

  const getSteps = (): WizardStep[] => {
    const baseSteps: WizardStep[] = ['type', 'details', 'budget'];
    if (campaignData.type === 'partnership') {
      baseSteps.push('partnership');
    }
    baseSteps.push('preview');
    return baseSteps;
  };

  const getCurrentStepIndex = () => {
    return getSteps().indexOf(currentStep);
  };

  const getStepTitle = (step: WizardStep) => {
    switch (step) {
      case 'type':
        return 'Campaign Type';
      case 'details':
        return 'Campaign Details';
      case 'budget':
        return 'Budget & Metrics';
      case 'partnership':
        return 'Partnership Details';
      case 'preview':
        return 'Review & Publish';
      default:
        return '';
    }
  };

  const handleNext = () => {
    const steps = getSteps();
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps = getSteps();
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return true; // Type is always selected
      case 'details':
        return (
          campaignData.title.trim() !== '' &&
          campaignData.description.trim() !== '' &&
          campaignData.requirements.length > 0 &&
          campaignData.maxCreators > 0
        );
      case 'budget':
        return (
          campaignData.budgetSource !== '' &&
          campaignData.approvedBudgetCents > 0 &&
          campaignData.targetCreators > 0
        );
      case 'partnership':
        return (
          campaignData.partnerRestaurantId !== null &&
          campaignData.partnershipAgreementSigned &&
          campaignData.subsidyAmountCents > 0
        );
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const handlePublish = () => {
    onComplete(campaignData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <CampaignTypeSelector
            selectedType={campaignData.type}
            onSelect={(type) => setCampaignData({ ...campaignData, type })}
          />
        );
      case 'details':
        return (
          <CampaignDetailsForm
            value={{
              title: campaignData.title,
              description: campaignData.description,
              requirements: campaignData.requirements,
              maxCreators: campaignData.maxCreators,
              startDate: campaignData.startDate,
              endDate: campaignData.endDate,
            }}
            onChange={(value) => setCampaignData({ ...campaignData, ...value })}
          />
        );
      case 'budget':
        return (
          <BudgetTrackingForm
            value={{
              budgetSource: campaignData.budgetSource,
              approvedBudgetCents: campaignData.approvedBudgetCents,
              costCenter: campaignData.costCenter,
              targetCreators: campaignData.targetCreators,
              targetContentPieces: campaignData.targetContentPieces,
              targetReach: campaignData.targetReach,
            }}
            onChange={(value) => setCampaignData({ ...campaignData, ...value })}
          />
        );
      case 'partnership':
        return (
          <PartnershipDetailsForm
            value={{
              partnerRestaurantId: campaignData.partnerRestaurantId,
              partnerRestaurantName: campaignData.partnerRestaurantName,
              partnershipAgreementSigned: campaignData.partnershipAgreementSigned,
              partnershipStartDate: campaignData.partnershipStartDate,
              partnershipEndDate: campaignData.partnershipEndDate,
              subsidyAmountCents: campaignData.subsidyAmountCents,
            }}
            onChange={(value) => setCampaignData({ ...campaignData, ...value })}
          />
        );
      case 'preview':
        return (
          <CampaignPreview
            campaignData={campaignData}
            onPublish={handlePublish}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  const steps = getSteps();
  const currentIndex = getCurrentStepIndex();
  const isPreviewStep = currentStep === 'preview';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <ChevronLeft size={24} color={designTokens.colors.textDark} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Campaign</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Progress Indicator */}
      {!isPreviewStep && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {steps.slice(0, -1).map((step, index) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  index <= currentIndex && styles.progressStepActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>
            Step {currentIndex + 1} of {steps.length}: {getStepTitle(currentStep)}
          </Text>
        </View>
      )}

      {/* Step Content */}
      <View style={styles.content}>{renderStepContent()}</View>

      {/* Footer Navigation (not shown on preview step) */}
      {!isPreviewStep && (
        <View style={styles.footer}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === 0 && styles.nextButtonFull,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === steps.length - 2 ? 'Review' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textDark,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.textDark,
  },
  progressContainer: {
    backgroundColor: designTokens.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.borderLight,
  },
  progressStepActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    color: designTokens.colors.textMedium,
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: designTokens.colors.white,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  backButton: {
    flex: 1,
    height: 48,
    borderRadius: designTokens.borderRadius.full,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    backgroundColor: designTokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  nextButton: {
    flex: 2,
    height: 48,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
});
