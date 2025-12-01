/**
 * Campaign Application Service
 * Task: CM-3 - Fix Campaign Application creator_id Lookup
 *
 * This service handles campaign applications with proper creator_id
 * lookup. The campaign_applications table references creator_profiles(id),
 * NOT users(id), so we must look up the creator profile first.
 */

import { supabase } from '@/lib/supabase';

export interface ApplyToCampaignParams {
  campaignId: string;
  proposedRateCents: number;
  proposedDeliverables: string;
  coverLetter: string;
}

export type ApplicationErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NO_PROFILE'
  | 'ALREADY_APPLIED'
  | 'CAMPAIGN_CLOSED'
  | 'CAMPAIGN_FULL'
  | 'RLS_ERROR'
  | 'UNKNOWN';

export interface ApplicationResult {
  success: boolean;
  applicationId?: string;
  error?: string;
  errorCode?: ApplicationErrorCode;
}

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_id: string;
  proposed_rate_cents: number;
  proposed_deliverables: string;
  cover_letter: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  applied_at: string;
  reviewed_at?: string;
}

/**
 * Apply to a campaign.
 * This function handles the creator_id lookup automatically.
 *
 * IMPORTANT: The campaign_applications table uses creator_profiles.id
 * as the creator_id, NOT users.id. This function handles that lookup.
 *
 * @param params - Application parameters
 * @returns Result with success status and application ID or error
 */
export async function applyToCampaign(
  params: ApplyToCampaignParams
): Promise<ApplicationResult> {
  try {
    // Step 1: Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Please sign in to apply to campaigns',
        errorCode: 'NOT_AUTHENTICATED',
      };
    }

    // Step 2: Get creator profile ID (CRITICAL!)
    // campaign_applications references creator_profiles(id), not users(id)
    const { data: creatorProfile, error: profileError } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !creatorProfile) {
      console.error(
        '[CampaignApplication] Creator profile not found:',
        profileError
      );
      return {
        success: false,
        error: 'Please complete your creator profile before applying to campaigns',
        errorCode: 'NO_PROFILE',
      };
    }

    const creatorProfileId = creatorProfile.id;

    // Step 3: Check for existing application
    const { data: existingApplication } = await supabase
      .from('campaign_applications')
      .select('id, status')
      .eq('campaign_id', params.campaignId)
      .eq('creator_id', creatorProfileId)
      .single();

    if (existingApplication) {
      return {
        success: false,
        error: `You have already applied to this campaign (status: ${existingApplication.status})`,
        errorCode: 'ALREADY_APPLIED',
      };
    }

    // Step 4: Verify campaign is still accepting applications
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status, max_creators, selected_creators_count')
      .eq('id', params.campaignId)
      .single();

    if (campaignError || !campaign) {
      return {
        success: false,
        error: 'Campaign not found',
        errorCode: 'CAMPAIGN_CLOSED',
      };
    }

    if (campaign.status !== 'active') {
      return {
        success: false,
        error: 'This campaign is no longer accepting applications',
        errorCode: 'CAMPAIGN_CLOSED',
      };
    }

    if (
      campaign.max_creators &&
      campaign.selected_creators_count >= campaign.max_creators
    ) {
      return {
        success: false,
        error: 'This campaign has reached its maximum number of creators',
        errorCode: 'CAMPAIGN_FULL',
      };
    }

    // Step 5: Submit application with CORRECT creator_id
    const { data: application, error: insertError } = await supabase
      .from('campaign_applications')
      .insert({
        campaign_id: params.campaignId,
        creator_id: creatorProfileId, // <-- creator_profiles.id, NOT user.id!
        proposed_rate_cents: params.proposedRateCents,
        proposed_deliverables: params.proposedDeliverables,
        cover_letter: params.coverLetter,
        status: 'pending',
        applied_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[CampaignApplication] Insert error:', insertError);

      // Check for RLS violation (error code 42501)
      if (insertError.code === '42501') {
        return {
          success: false,
          error:
            'Permission denied. Please ensure your creator profile is complete.',
          errorCode: 'RLS_ERROR',
        };
      }

      return {
        success: false,
        error: insertError.message || 'Failed to submit application',
        errorCode: 'UNKNOWN',
      };
    }

    return {
      success: true,
      applicationId: application.id,
    };
  } catch (error: any) {
    console.error('[CampaignApplication] Exception:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      errorCode: 'UNKNOWN',
    };
  }
}

/**
 * Get the current user's applications.
 *
 * @returns Array of applications or error
 */
export async function getMyApplications(): Promise<{
  data: CampaignApplication[] | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get creator profile ID first
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creatorProfile) {
      return { data: [], error: undefined }; // No profile means no applications
    }

    const { data, error } = await supabase
      .from('campaign_applications')
      .select('*')
      .eq('creator_id', creatorProfile.id)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('[CampaignApplication] Get applications error:', error);
      return { data: null, error: error.message };
    }

    return { data };
  } catch (error: any) {
    console.error('[CampaignApplication] Exception:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Withdraw an application.
 *
 * @param applicationId - The application ID to withdraw
 * @returns Success status
 */
export async function withdrawApplication(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('campaign_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId);

    if (error) {
      console.error('[CampaignApplication] Withdraw error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[CampaignApplication] Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user has already applied to a campaign.
 *
 * @param campaignId - The campaign ID to check
 * @returns Whether user has applied and their application status
 */
export async function hasAppliedToCampaign(
  campaignId: string
): Promise<{
  hasApplied: boolean;
  status?: string;
  applicationId?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { hasApplied: false };
    }

    // Get creator profile ID
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creatorProfile) {
      return { hasApplied: false };
    }

    const { data: application } = await supabase
      .from('campaign_applications')
      .select('id, status')
      .eq('campaign_id', campaignId)
      .eq('creator_id', creatorProfile.id)
      .single();

    if (application) {
      return {
        hasApplied: true,
        status: application.status,
        applicationId: application.id,
      };
    }

    return { hasApplied: false };
  } catch (error) {
    console.error('[CampaignApplication] Check applied error:', error);
    return { hasApplied: false };
  }
}

// Export as singleton-style object
export const campaignApplicationService = {
  applyToCampaign,
  getMyApplications,
  withdrawApplication,
  hasAppliedToCampaign,
};
