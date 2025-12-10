/**
 * Campaign Invitation Service
 *
 * Handles business-to-creator campaign invitations including:
 * - Creating invitations
 * - Accepting/declining invitations
 * - Withdrawing invitations
 * - Getting invitation statistics
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignInvitation {
  id: string;
  campaign_id: string;
  creator_id: string;
  invited_by: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
  invited_at: string;
  responded_at?: string;
  expires_at?: string;
  withdrawn_at?: string;
  campaign?: {
    id: string;
    title: string;
    description: string;
    budget_cents: number;
    deadline: string;
    restaurant_name?: string;
  };
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    username?: string;
  };
  inviter?: {
    id: string;
    name: string;
    restaurant_name?: string;
  };
}

export interface CreateInvitationParams {
  campaign_id: string;
  creator_id: string;
  message?: string;
}

export interface InvitationStats {
  total_invitations: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  acceptance_rate: number;
}

// ============================================================================
// CREATE INVITATION
// ============================================================================

/**
 * Create a new campaign invitation
 */
export async function createInvitation(
  params: CreateInvitationParams
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from('campaign_invitations')
      .select('id, status')
      .eq('campaign_id', params.campaign_id)
      .eq('creator_id', params.creator_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return { 
          data: null, 
          error: new Error('This creator has already been invited to this campaign') 
        };
      }
      // If withdrawn or expired, allow creating a new one
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiry

    const { data, error } = await supabase
      .from('campaign_invitations')
      .insert({
        campaign_id: params.campaign_id,
        creator_id: params.creator_id,
        invited_by: user.user.id,
        message: params.message?.trim() || null,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      // Log error details for debugging (only in development)
      if (__DEV__) {
        console.error('Error creating invitation:', {
          code: error.code,
          message: error.message,
          // Don't log full error object to avoid exposing sensitive data
        });
      }
      
      // Handle duplicate key constraint violation (23505)
      if (error.code === '23505' || 
          error.message?.includes('duplicate key') || 
          error.message?.includes('unique constraint')) {
        return { 
          data: null, 
          error: new Error('This creator has already been invited to this campaign') 
        };
      }
      
      // Handle other database errors - return user-friendly message
      // Never expose raw database error codes or technical details to users
      return { 
        data: null, 
        error: new Error('Failed to send invitation. Please try again.') 
      };
    }

    // TODO: Send notification to creator
    // await sendNotification(...)

    return { data: data as CampaignInvitation, error: null };
  } catch (error) {
    // Log error details for debugging (only in development)
    if (__DEV__) {
      console.error('Error in createInvitation:', error);
    }
    // Never expose raw error details to users in production
    return { 
      data: null, 
      error: new Error('Failed to send invitation. Please try again.') 
    };
  }
}

// ============================================================================
// GET INVITATIONS
// ============================================================================

/**
 * Get invitations for a creator
 */
export async function getInvitationsForCreator(
  creatorId: string,
  status?: CampaignInvitation['status']
): Promise<{ data: CampaignInvitation[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('campaign_invitations')
      .select(`
        *,
        campaigns (
          id,
          title,
          description,
          budget_cents,
          end_date,
          restaurants (
            name
          )
        )
      `)
      .eq('creator_id', creatorId)
      .order('invited_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching creator invitations:', error);
      return { data: null, error };
    }

    const invitations = (data || []).map((inv: any) => ({
      id: inv.id,
      campaign_id: inv.campaign_id,
      creator_id: inv.creator_id,
      invited_by: inv.invited_by,
      message: inv.message,
      status: inv.status,
      invited_at: inv.invited_at,
      responded_at: inv.responded_at,
      expires_at: inv.expires_at,
      withdrawn_at: inv.withdrawn_at,
      campaign: inv.campaigns ? {
        id: inv.campaigns.id,
        title: inv.campaigns.title,
        description: inv.campaigns.description,
        budget_cents: inv.campaigns.budget_cents,
        deadline: inv.campaigns.end_date,
        restaurant_name: inv.campaigns.restaurants?.name,
      } : undefined,
    }));

    return { data: invitations as CampaignInvitation[], error: null };
  } catch (error) {
    console.error('Error in getInvitationsForCreator:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get invitations for a campaign
 */
export async function getInvitationsForCampaign(
  campaignId: string,
  status?: CampaignInvitation['status']
): Promise<{ data: CampaignInvitation[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('campaign_invitations')
      .select(`
        *,
        creator_profiles (
          id,
          display_name,
          avatar_url,
          users (
            username
          )
        )
      `)
      .eq('campaign_id', campaignId)
      .order('invited_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching campaign invitations:', error);
      return { data: null, error };
    }

    const invitations = (data || []).map((inv: any) => ({
      id: inv.id,
      campaign_id: inv.campaign_id,
      creator_id: inv.creator_id,
      invited_by: inv.invited_by,
      message: inv.message,
      status: inv.status,
      invited_at: inv.invited_at,
      responded_at: inv.responded_at,
      expires_at: inv.expires_at,
      withdrawn_at: inv.withdrawn_at,
      creator: inv.creator_profiles ? {
        id: inv.creator_profiles.id,
        display_name: inv.creator_profiles.display_name,
        avatar_url: inv.creator_profiles.avatar_url,
        username: inv.creator_profiles.users?.username,
      } : undefined,
    }));

    return { data: invitations as CampaignInvitation[], error: null };
  } catch (error) {
    console.error('Error in getInvitationsForCampaign:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// ACCEPT/DECLINE INVITATIONS
// ============================================================================

/**
 * Accept an invitation (creates campaign application)
 */
export async function acceptInvitation(
  invitationId: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('campaign_invitations')
      .select('*, campaigns(*), creator_profiles(id, user_id)')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return { data: null, error: new Error('Invitation not found') };
    }

    // Verify creator owns this invitation
    if (invitation.creator_profiles.user_id !== user.user.id) {
      return { data: null, error: new Error('Unauthorized') };
    }

    // Check if already responded
    if (invitation.status !== 'pending') {
      return { data: null, error: new Error('Invitation already responded') };
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return { data: null, error: new Error('Invitation expired') };
    }

    // Check if application already exists
    const { data: existingApplication } = await supabase
      .from('campaign_applications')
      .select('id, status')
      .eq('campaign_id', invitation.campaign_id)
      .eq('creator_id', invitation.creator_id)
      .maybeSingle();

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('campaign_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select('*')
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Create or update campaign application
    if (existingApplication) {
      // Application already exists - update status to accepted if needed
      if (existingApplication.status !== 'accepted') {
        const { error: updateAppError } = await supabase
          .from('campaign_applications')
          .update({
            status: 'accepted',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', existingApplication.id);

        if (updateAppError) {
          console.error('Error updating application:', updateAppError);
          // Don't fail the whole operation, invitation is already accepted
        }
      }
    } else {
      // Create new application
      const { error: appError } = await supabase
        .from('campaign_applications')
        .insert({
          campaign_id: invitation.campaign_id,
          creator_id: invitation.creator_id,
          status: 'accepted', // Auto-accepted since business invited them
          applied_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
        });

      if (appError) {
        console.error('Error creating application:', appError);
        // Don't fail the whole operation, invitation is already accepted
      }
    }

    // TODO: Send notification to business
    // await sendNotification(...)

    return { data: updatedInvitation as CampaignInvitation, error: null };
  } catch (error) {
    console.error('Error in acceptInvitation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Decline an invitation
 */
export async function declineInvitation(
  invitationId: string,
  reason?: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('campaign_invitations')
      .select('*, creator_profiles(user_id)')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return { data: null, error: new Error('Invitation not found') };
    }

    // Verify creator owns this invitation
    if (invitation.creator_profiles.user_id !== user.user.id) {
      return { data: null, error: new Error('Unauthorized') };
    }

    // Check if already responded
    if (invitation.status !== 'pending') {
      return { data: null, error: new Error('Invitation already responded') };
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('campaign_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
        message: reason ? `${invitation.message || ''}\n\nDeclined reason: ${reason}`.trim() : invitation.message,
      })
      .eq('id', invitationId)
      .select('*')
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // TODO: Send notification to business
    // await sendNotification(...)

    return { data: updatedInvitation as CampaignInvitation, error: null };
  } catch (error) {
    console.error('Error in declineInvitation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Withdraw an invitation (business only)
 */
export async function withdrawInvitation(
  invitationId: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Get invitation with campaign/restaurant info
    const { data: invitation, error: invError } = await supabase
      .from('campaign_invitations')
      .select(`
        *,
        campaigns!inner (
          restaurant_id,
          restaurants!inner (
            owner_id
          )
        )
      `)
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return { data: null, error: new Error('Invitation not found') };
    }

    // Verify business owns this campaign
    if (invitation.campaigns.restaurants.owner_id !== user.user.id) {
      return { data: null, error: new Error('Unauthorized') };
    }

    // Check if already responded
    if (invitation.status !== 'pending') {
      return { data: null, error: new Error('Cannot withdraw responded invitation') };
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('campaign_invitations')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select('*')
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: updatedInvitation as CampaignInvitation, error: null };
  } catch (error) {
    console.error('Error in withdrawInvitation:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get invitation statistics
 */
export async function getInvitationStats(
  campaignId?: string,
  creatorId?: string
): Promise<{ data: InvitationStats | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_invitation_stats', {
      p_campaign_id: campaignId || null,
      p_creator_id: creatorId || null,
    });

    if (error) {
      console.error('Error fetching invitation stats:', error);
      return { data: null, error };
    }

    return {
      data: {
        total_invitations: data[0]?.total_invitations || 0,
        pending: data[0]?.pending || 0,
        accepted: data[0]?.accepted || 0,
        declined: data[0]?.declined || 0,
        expired: data[0]?.expired || 0,
        acceptance_rate: parseFloat(data[0]?.acceptance_rate || 0),
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getInvitationStats:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if invitation is expired
 */
export function isInvitationExpired(invitation: CampaignInvitation): boolean {
  if (!invitation.expires_at) return false;
  return new Date(invitation.expires_at) < new Date();
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(invitation: CampaignInvitation): number {
  if (!invitation.expires_at) return 0;
  const expiresAt = new Date(invitation.expires_at);
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

