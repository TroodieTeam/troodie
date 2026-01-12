import { CampaignFormData, StripeAccountStatus } from '@/types/campaign';

export function validateStep(
  step: number,
  formData: CampaignFormData,
  stripeAccountStatus: StripeAccountStatus
): boolean {
  switch (step) {
    case 1:
      return formData.title.trim() !== '' && formData.description.trim() !== '';
    case 2:
      // Budget must be a positive number (minimum $1)
      const budgetNum = parseFloat(formData.budget);
      return !isNaN(budgetNum) && budgetNum >= 1 && formData.deadline !== '';
    case 3:
      return formData.deliverables.length > 0;
    case 4:
      return stripeAccountStatus.onboardingCompleted && !stripeAccountStatus.checking;
    default:
      return false;
  }
}

export function validateCampaignSubmission(
  formData: CampaignFormData,
  restaurantData: { id: string } | null,
  stripeAccountStatus: StripeAccountStatus
): { valid: boolean; error?: string; step?: number } {
  if (!restaurantData?.id) {
    return { valid: false, error: 'Restaurant data is missing. Please refresh and try again.' };
  }

  // Validate budget is at least $1
  const budgetNum = parseFloat(formData.budget);
  if (isNaN(budgetNum) || budgetNum < 1) {
    return {
      valid: false,
      error: 'Campaign budget must be at least $1.00',
      step: 2,
    };
  }

  if (!formData.deadline || formData.deadline.trim() === '') {
    return {
      valid: false,
      error: 'Please select a campaign deadline before creating the campaign.',
      step: 2,
    };
  }

  if (!stripeAccountStatus.onboardingCompleted) {
    return {
      valid: false,
      error: 'Please complete your payment account setup before creating a campaign.',
    };
  }

  return { valid: true };
}
