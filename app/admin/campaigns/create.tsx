import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { designTokens } from '@/constants/designTokens';
import AdminCampaignWizard from '@/components/admin/AdminCampaignWizard';
import { platformCampaignService } from '@/services/platformCampaignService';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateCampaignScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleComplete = async (campaignData: any) => {
    try {
      // Map the form data to the database schema
      const campaignPayload = {
        // Basic campaign fields
        title: campaignData.title,
        description: campaignData.description,
        requirements: campaignData.requirements,
        budget: Math.floor(campaignData.approvedBudgetCents / 100), // Convert to dollars
        budget_cents: campaignData.approvedBudgetCents,
        max_creators: campaignData.maxCreators,
        start_date: campaignData.startDate?.toISOString(),
        end_date: campaignData.endDate?.toISOString(),
        status: 'draft' as const,

        // Campaign source mapping
        campaign_source: campaignData.type === 'direct'
          ? 'troodie_direct'
          : campaignData.type === 'partnership'
          ? 'troodie_partnership'
          : 'community_challenge',

        // Platform management flag
        is_platform_managed: true,

        // Subsidy flag (for partnership campaigns)
        is_subsidized: campaignData.type === 'partnership',

        // Restaurant ID mapping
        restaurant_id: campaignData.type === 'partnership'
          ? campaignData.partnerRestaurantId
          : null, // Troodie restaurant ID will be set by service
      };

      // Create the platform campaign
      const { data: campaign, error: campaignError } = await platformCampaignService.createCampaign(
        campaignPayload,
        user?.id || ''
      );

      if (campaignError || !campaign) {
        throw new Error(campaignError?.message || 'Failed to create campaign');
      }

      // Create the platform-managed campaign metadata
      const platformData = {
        campaign_id: campaign.id,
        budget_source: campaignData.budgetSource,
        approved_budget_cents: campaignData.approvedBudgetCents,
        cost_center: campaignData.costCenter || null,
        target_creators: campaignData.targetCreators,
        target_content_pieces: campaignData.targetContentPieces,
        target_reach: campaignData.targetReach,
        // Partnership-specific fields
        ...(campaignData.type === 'partnership' && {
          partner_restaurant_id: campaignData.partnerRestaurantId,
          partnership_start_date: campaignData.partnershipStartDate?.toISOString(),
          partnership_end_date: campaignData.partnershipEndDate?.toISOString(),
          partnership_agreement_signed: campaignData.partnershipAgreementSigned,
          subsidy_amount_cents: campaignData.subsidyAmountCents,
        }),
      };

      const { error: platformError } = await platformCampaignService.createPlatformCampaign(
        platformData
      );

      if (platformError) {
        // Campaign was created but platform data failed - should log this
        console.error('Platform campaign metadata creation failed:', platformError);
        Alert.alert(
          'Warning',
          'Campaign created but tracking data incomplete. Please contact support.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Success! Navigate to campaign list
      Alert.alert(
        'Success',
        'Campaign created successfully!',
        [{ text: 'OK', onPress: () => router.replace('/admin/campaigns') }]
      );
    } catch (error) {
      console.error('Error creating campaign:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create campaign',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Campaign Creation',
      'Are you sure you want to cancel? All progress will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AdminCampaignWizard onComplete={handleComplete} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
});
