import { supabase } from '@/lib/supabase';
import { TROODIE_RESTAURANT } from '@/constants/systemAccounts';
import { CampaignSource, ManagementType, BudgetSource } from '@/types/campaign';

/**
 * Service for managing Troodie platform-managed campaigns
 * Task: TMC-003
 */

interface CreatePlatformCampaignData {
  managementType: ManagementType;
  title: string;
  description: string;
  requirements: string;
  contentGuidelines: string;
  budgetSource: BudgetSource;
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
    let campaignSource: CampaignSource;
    if (data.managementType === ManagementType.DIRECT) {
      campaignSource = CampaignSource.TROODIE_DIRECT;
    } else if (data.managementType === ManagementType.PARTNERSHIP) {
      campaignSource = CampaignSource.TROODIE_PARTNERSHIP;
    } else {
      campaignSource = CampaignSource.COMMUNITY_CHALLENGE;
    }

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

    if (Object.keys(campaignUpdates).length > 0) {
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update(campaignUpdates)
        .eq('id', campaignId);

      if (campaignError) {
        return { data: null, error: campaignError };
      }
    }

    // Update platform_managed_campaigns table
    const platformUpdates: any = {};
    if (updates.budgetSource) platformUpdates.budget_source = updates.budgetSource;
    if (updates.approvedBudgetCents) platformUpdates.approved_budget_cents = updates.approvedBudgetCents;
    if (updates.costCenter) platformUpdates.cost_center = updates.costCenter;
    if (updates.targetCreators) platformUpdates.target_creators = updates.targetCreators;
    if (updates.targetContentPieces) platformUpdates.target_content_pieces = updates.targetContentPieces;
    if (updates.targetReach) platformUpdates.target_reach = updates.targetReach;
    if (updates.internalNotes !== undefined) platformUpdates.internal_notes = updates.internalNotes;
    platformUpdates.updated_at = new Date().toISOString();

    if (Object.keys(platformUpdates).length > 1) { // More than just updated_at
      const { error: platformError } = await supabase
        .from('platform_managed_campaigns')
        .update(platformUpdates)
        .eq('campaign_id', campaignId);

      if (platformError) {
        return { data: null, error: platformError };
      }
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get a single platform campaign with full details
 */
export async function getPlatformCampaignById(campaignId: string) {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        restaurants (*),
        platform_managed_campaigns (*),
        campaign_applications (
          id,
          creator_id,
          status,
          proposed_rate_cents
        )
      `)
      .eq('id', campaignId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
