# Troodie-Managed Campaigns: Admin Campaign Creation UI

- Epic: TMC (Troodie-Managed Campaigns)
- Priority: High
- Estimate: 2 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: TMC-001 (Database Schema), TMC-002 (System Account)

## Overview
Build a React Native admin interface that allows platform administrators to create and manage Troodie-managed campaigns. This wizard-style UI enables creating direct campaigns, partnership campaigns, and community challenges with proper budget tracking, targeting, and internal management details.

## Business Value
- Empowers platform to create creator opportunities immediately
- Enables transparent budget tracking and ROI measurement
- Supports partnership model for white-label restaurant campaigns
- Provides internal tools for campaign management and reporting
- Critical for solving creator cold-start problem at MVP launch

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Admin Campaign Creation UI
  As a platform administrator
  I want to create Troodie-managed campaigns through a user-friendly interface
  So that I can provide opportunities for creators while tracking budgets

  Scenario: Access admin campaign creation
    Given I am logged in as an admin user
    When I navigate to the admin section
    Then I see a "Create Platform Campaign" option
    And I can access the campaign creation wizard

  Scenario: Create direct Troodie-branded campaign
    Given I am on the campaign creation wizard
    When I select campaign type "Direct (Troodie-branded)"
    And I fill in campaign details (title, description, requirements)
    And I set budget and creator targets
    And I select budget source (marketing, growth, etc.)
    And I submit the campaign
    Then a new campaign is created with campaign_source='troodie_direct'
    And a platform_managed_campaigns record is created
    And the campaign appears in creator marketplace
    And I see a success confirmation with campaign ID

  Scenario: Create partnership campaign (white-label)
    Given I am on the campaign creation wizard
    When I select campaign type "Partnership (White-label)"
    And I select a partner restaurant
    And I fill in partnership details and agreement status
    And I set subsidy amount
    And I submit the campaign
    Then a new campaign is created with campaign_source='troodie_partnership'
    And the campaign is_subsidized=true
    And the campaign appears as if from the partner restaurant
    And internal tracking shows Troodie subsidy

  Scenario: Create community challenge
    Given I am on the campaign creation wizard
    When I select campaign type "Community Challenge"
    And I set challenge parameters (theme, prize pool, voting mechanism)
    And I define success metrics
    And I submit the campaign
    Then a new campaign is created with campaign_source='community_challenge'
    And the challenge is visible to all creators
    And voting/leaderboard features are enabled

  Scenario: Set budget and tracking
    Given I am creating any platform campaign
    When I specify budget details
    Then I must select a budget source (marketing, growth, product, etc.)
    And I must set approved_budget_cents
    And I can optionally set cost_center
    And I can set target metrics (creators, content pieces, reach)

  Scenario: Preview campaign before publishing
    Given I have filled in all campaign details
    When I click "Preview"
    Then I see how the campaign will appear to creators
    And I can see internal management details
    And I can edit or publish the campaign

  Scenario: Edit existing platform campaign
    Given a platform campaign exists
    When I navigate to campaign management
    Then I can view all Troodie-managed campaigns
    And I can edit campaign details
    And I can adjust budgets and targets
    And I can pause or end campaigns early
```

## Technical Implementation

### Navigation Route
Add to admin section: `app/admin/create-platform-campaign.tsx`

### Main Campaign Creation Wizard (React Native)
Create: `app/admin/create-platform-campaign.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { createPlatformCampaign } from '@/services/platformCampaignService';
import CampaignTypeSelector from '@/components/admin/CampaignTypeSelector';
import CampaignDetailsForm from '@/components/admin/CampaignDetailsForm';
import BudgetTrackingForm from '@/components/admin/BudgetTrackingForm';
import PartnershipDetailsForm from '@/components/admin/PartnershipDetailsForm';
import CampaignPreview from '@/components/admin/CampaignPreview';

/**
 * Admin-only screen for creating Troodie-managed campaigns
 * Multi-step wizard for creating direct, partnership, or challenge campaigns
 */
export default function CreatePlatformCampaignScreen() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [campaignData, setCampaignData] = useState({
    // Campaign basics
    managementType: 'direct' as 'direct' | 'partnership' | 'challenge',
    title: '',
    description: '',
    requirements: '',
    contentGuidelines: '',

    // Budget & tracking
    budgetSource: 'marketing' as 'marketing' | 'growth' | 'product' | 'partnerships' | 'content' | 'retention',
    approvedBudgetCents: 0,
    costCenter: '',

    // Targets
    targetCreators: 10,
    targetContentPieces: 10,
    targetReach: 50000,

    // Campaign settings
    durationDays: 30,
    maxApplications: 50,
    proposedRateCents: 2500, // $25 default

    // Partnership-specific (if applicable)
    partnerRestaurantId: '',
    subsidyAmountCents: 0,
    partnershipAgreementSigned: false,

    // Internal management
    internalNotes: '',
  });

  const totalSteps = campaignData.managementType === 'partnership' ? 5 : 4;

  // Check admin access
  if (user?.role !== 'admin') {
    Alert.alert('Access Denied', 'Only administrators can create platform campaigns.');
    router.back();
    return null;
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const result = await createPlatformCampaign(campaignData);

      if (result.error) {
        Alert.alert('Error', result.error.message || 'Failed to create campaign');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Success!',
        'Platform campaign created successfully',
        [
          {
            text: 'View Campaign',
            onPress: () => router.push(`/campaigns/${result.data.id}`),
          },
          {
            text: 'Create Another',
            onPress: () => {
              setCampaignData({
                managementType: 'direct',
                title: '',
                description: '',
                requirements: '',
                contentGuidelines: '',
                budgetSource: 'marketing',
                approvedBudgetCents: 0,
                costCenter: '',
                targetCreators: 10,
                targetContentPieces: 10,
                targetReach: 50000,
                durationDays: 30,
                maxApplications: 50,
                proposedRateCents: 2500,
                partnerRestaurantId: '',
                subsidyAmountCents: 0,
                partnershipAgreementSigned: false,
                internalNotes: '',
              });
              setCurrentStep(0);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CampaignTypeSelector
            selectedType={campaignData.managementType}
            onSelect={(type) => setCampaignData({ ...campaignData, managementType: type })}
          />
        );

      case 1:
        return (
          <CampaignDetailsForm
            data={campaignData}
            onChange={(updates) => setCampaignData({ ...campaignData, ...updates })}
          />
        );

      case 2:
        return (
          <BudgetTrackingForm
            data={campaignData}
            onChange={(updates) => setCampaignData({ ...campaignData, ...updates })}
          />
        );

      case 3:
        // Partnership details (only show for partnership type)
        if (campaignData.managementType === 'partnership') {
          return (
            <PartnershipDetailsForm
              data={campaignData}
              onChange={(updates) => setCampaignData({ ...campaignData, ...updates })}
            />
          );
        }
        // Otherwise show preview
        return <CampaignPreview data={campaignData} />;

      case 4:
        // Preview step (for partnerships, this is step 5)
        return <CampaignPreview data={campaignData} />;

      default:
        return null;
    }
  };

  const stepTitles = ['Type', 'Details', 'Budget', ...(campaignData.managementType === 'partnership' ? ['Partnership'] : []), 'Preview'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Platform Campaign</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {stepTitles.map((title, index) => (
          <View key={index} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
                index < currentStep && styles.progressDotComplete,
              ]}
            >
              {index < currentStep ? (
                <Check size={16} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.progressNumber,
                    index === currentStep && styles.progressNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.progressLabel,
                index === currentStep && styles.progressLabelActive,
              ]}
            >
              {title}
            </Text>
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            onPress={handlePrevious}
            style={[styles.button, styles.buttonSecondary]}
            disabled={loading}
          >
            <ArrowLeft size={20} color="#FF6B35" />
            <Text style={styles.buttonSecondaryText}>Previous</Text>
          </TouchableOpacity>
        )}

        {currentStep < totalSteps - 1 ? (
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.button, styles.buttonPrimary, currentStep === 0 && styles.buttonFull]}
            disabled={loading}
          >
            <Text style={styles.buttonPrimaryText}>Next</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, styles.buttonPrimary]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.buttonPrimaryText}>Create Campaign</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#FF6B35',
  },
  progressDotComplete: {
    backgroundColor: '#10B981',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressNumberActive: {
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  buttonFull: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: '#FF6B35',
    flex: 1,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    flex: 1,
    marginRight: 8,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
```

### Campaign Type Selector Component
Create: `components/admin/CampaignTypeSelector.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, Handshake, Trophy } from 'lucide-react-native';

type CampaignType = 'direct' | 'partnership' | 'challenge';

interface CampaignTypeSelectorProps {
  selectedType: CampaignType;
  onSelect: (type: CampaignType) => void;
}

export default function CampaignTypeSelector({ selectedType, onSelect }: CampaignTypeSelectorProps) {
  const campaignTypes = [
    {
      type: 'direct' as CampaignType,
      icon: Building2,
      title: 'Direct (Troodie-branded)',
      description: 'Campaign appears as official Troodie opportunity. Great for portfolio building and platform initiatives.',
      examples: ['Portfolio Builders', 'Platform Testing', 'Seasonal Campaigns'],
      budgetRange: '$25-$75 per creator',
    },
    {
      type: 'partnership' as CampaignType,
      icon: Handshake,
      title: 'Partnership (White-label)',
      description: 'Campaign appears as if from partner restaurant. Troodie subsidizes costs to help restaurants market.',
      examples: ['Restaurant Spotlights', 'New Menu Launches', 'Grand Openings'],
      budgetRange: '$50-$150 per creator',
    },
    {
      type: 'challenge' as CampaignType,
      icon: Trophy,
      title: 'Community Challenge',
      description: 'Gamified campaign with prize pool. Creators compete for rewards based on engagement and creativity.',
      examples: ['Best Brunch Spot', 'Hidden Gem Challenge', 'Seasonal Food Tours'],
      budgetRange: '$500-$2000 prize pool',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Campaign Type</Text>
      <Text style={styles.subtitle}>
        Choose how this campaign will appear to creators and be managed internally
      </Text>

      {campaignTypes.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedType === option.type;

        return (
          <TouchableOpacity
            key={option.type}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(option.type)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Icon size={24} color={isSelected ? '#FF6B35' : '#6B7280'} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                  {option.title}
                </Text>
                <Text style={styles.cardBudget}>{option.budgetRange}</Text>
              </View>
            </View>

            <Text style={styles.cardDescription}>{option.description}</Text>

            <View style={styles.examplesContainer}>
              <Text style={styles.examplesLabel}>Examples:</Text>
              {option.examples.map((example, index) => (
                <Text key={index} style={styles.exampleItem}>
                  • {example}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF7F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#FEE2E2',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardTitleSelected: {
    color: '#FF6B35',
  },
  cardBudget: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  examplesContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  examplesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  exampleItem: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
});
```

### Platform Campaign Service
Create: `services/platformCampaignService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { TROODIE_RESTAURANT } from '@/constants/systemAccounts';

/**
 * Service for managing Troodie platform-managed campaigns
 */

interface CreatePlatformCampaignData {
  managementType: 'direct' | 'partnership' | 'challenge';
  title: string;
  description: string;
  requirements: string;
  contentGuidelines: string;
  budgetSource: 'marketing' | 'growth' | 'product' | 'partnerships' | 'content' | 'retention';
  approvedBudgetCents: number;
  costCenter?: string;
  targetCreators: number;
  targetContentPieces: number;
  targetReach: number;
  durationDays: number;
  maxApplications: number;
  proposedRateCents: number;
  partnerRestaurantId?: string;
  subsidyAmountCents?: number;
  partnershipAgreementSigned?: boolean;
  internalNotes?: string;
}

/**
 * Create a new platform-managed campaign
 */
export async function createPlatformCampaign(data: CreatePlatformCampaignData) {
  try {
    // Determine campaign source based on management type
    const campaignSource =
      data.managementType === 'direct'
        ? 'troodie_direct'
        : data.managementType === 'partnership'
        ? 'troodie_partnership'
        : 'community_challenge';

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + data.durationDays);

    // For partnerships, use partner restaurant ID; otherwise use Troodie restaurant
    const restaurantId = data.partnerRestaurantId || TROODIE_RESTAURANT.ID;

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        restaurant_id: restaurantId,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        content_guidelines: data.contentGuidelines,
        campaign_source: campaignSource,
        is_subsidized: data.subsidyAmountCents ? data.subsidyAmountCents > 0 : false,
        subsidy_amount_cents: data.subsidyAmountCents || 0,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        budget_total: data.approvedBudgetCents,
        max_applications: data.maxApplications,
        proposed_rate_cents: data.proposedRateCents,
      })
      .select()
      .single();

    if (campaignError) {
      return { data: null, error: campaignError };
    }

    // Create platform management record
    const { data: platformCampaign, error: platformError } = await supabase
      .from('platform_managed_campaigns')
      .insert({
        campaign_id: campaign.id,
        management_type: data.managementType,
        partner_restaurant_id: data.partnerRestaurantId || null,
        partnership_agreement_signed: data.partnershipAgreementSigned || false,
        budget_source: data.budgetSource,
        cost_center: data.costCenter || null,
        approved_budget_cents: data.approvedBudgetCents,
        target_creators: data.targetCreators,
        target_content_pieces: data.targetContentPieces,
        target_reach: data.targetReach,
        internal_notes: data.internalNotes || null,
      })
      .select()
      .single();

    if (platformError) {
      // Rollback campaign creation if platform record fails
      await supabase.from('campaigns').delete().eq('id', campaign.id);
      return { data: null, error: platformError };
    }

    return {
      data: {
        ...campaign,
        platform_campaign: platformCampaign,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get all platform-managed campaigns
 */
export async function getPlatformCampaigns() {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        restaurants (*),
        platform_managed_campaigns (*)
      `)
      .neq('campaign_source', 'restaurant')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Update platform campaign
 */
export async function updatePlatformCampaign(
  campaignId: string,
  updates: Partial<CreatePlatformCampaignData>
) {
  try {
    // Update campaign table
    const campaignUpdates: any = {};
    if (updates.title) campaignUpdates.title = updates.title;
    if (updates.description) campaignUpdates.description = updates.description;
    if (updates.requirements) campaignUpdates.requirements = updates.requirements;
    if (updates.contentGuidelines) campaignUpdates.content_guidelines = updates.contentGuidelines;
    if (updates.proposedRateCents) campaignUpdates.proposed_rate_cents = updates.proposedRateCents;
    if (updates.maxApplications) campaignUpdates.max_applications = updates.maxApplications;

    const { error: campaignError } = await supabase
      .from('campaigns')
      .update(campaignUpdates)
      .eq('id', campaignId);

    if (campaignError) {
      return { data: null, error: campaignError };
    }

    // Update platform_managed_campaigns table
    const platformUpdates: any = {};
    if (updates.budgetSource) platformUpdates.budget_source = updates.budgetSource;
    if (updates.approvedBudgetCents) platformUpdates.approved_budget_cents = updates.approvedBudgetCents;
    if (updates.costCenter) platformUpdates.cost_center = updates.costCenter;
    if (updates.targetCreators) platformUpdates.target_creators = updates.targetCreators;
    if (updates.targetContentPieces) platformUpdates.target_content_pieces = updates.targetContentPieces;
    if (updates.targetReach) platformUpdates.target_reach = updates.targetReach;
    if (updates.internalNotes) platformUpdates.internal_notes = updates.internalNotes;

    const { error: platformError } = await supabase
      .from('platform_managed_campaigns')
      .update(platformUpdates)
      .eq('campaign_id', campaignId);

    if (platformError) {
      return { data: null, error: platformError };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## Definition of Done
- [ ] Admin campaign creation wizard implemented (React Native)
- [ ] Campaign type selector component created (Direct, Partnership, Challenge)
- [ ] Campaign details form component created
- [ ] Budget tracking form component created
- [ ] Partnership details form component created (for white-label campaigns)
- [ ] Campaign preview component created
- [ ] Platform campaign service functions implemented
- [ ] Navigation route added to admin section
- [ ] RLS policies allow admin users to create platform campaigns
- [ ] Form validation prevents invalid submissions
- [ ] Success/error feedback provided to user
- [ ] Created campaigns appear in creator marketplace
- [ ] Manual testing confirms all campaign types can be created
- [ ] Internal tracking records created properly in platform_managed_campaigns table

## Notes
- **Admin Only**: Restrict access to users with role='admin'
- **React Native**: All components use React Native (View, Text, TouchableOpacity, ScrollView, SafeAreaView)
- **Multi-step Wizard**: Progressive disclosure of form fields based on campaign type
- **Budget Validation**: Ensure approved_budget_cents matches number of creators × proposed_rate_cents
- **Partnership Mode**: Show additional fields for partner selection and subsidy tracking
- **Preview Before Publish**: Allow admins to see exactly how campaign appears to creators
- **Reference**: TROODIE_MANAGED_CAMPAIGNS_STRATEGY.md section "Admin Dashboard Requirements"
- **Related Tasks**: TMC-001 (Database Schema), TMC-002 (System Account), TMC-004 (Creator UI Updates)
- **Future Enhancement**: Add image upload for campaign thumbnails, rich text editor for descriptions
