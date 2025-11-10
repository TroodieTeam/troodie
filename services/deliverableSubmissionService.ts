/**
 * Deliverable Submission Service
 *
 * Handles creator deliverable submissions for campaigns including:
 * - Submitting new deliverables
 * - Retrieving deliverable status
 * - Updating/resubmitting deliverables
 * - URL validation
 * - Time tracking for auto-approval
 */

import { supabase } from '@/lib/supabase';
import type {
  DeliverableSubmission,
  DeliverablePlatform,
  DeliverableStatus,
  EngagementMetrics,
  PendingDeliverableSummary
} from '@/types/deliverableRequirements';

// ============================================================================
// TYPES
// ============================================================================

export interface SubmitDeliverableParams {
  creator_campaign_id: string;
  campaign_id: string;
  creator_id: string;
  deliverable_index: number;
  platform: DeliverablePlatform;
  post_url: string;
  screenshot_url?: string;
  caption?: string;
  notes_to_restaurant?: string;
  engagement_metrics?: EngagementMetrics;
}

export interface UpdateDeliverableParams {
  deliverable_id: string;
  post_url?: string;
  screenshot_url?: string;
  caption?: string;
  notes_to_restaurant?: string;
  engagement_metrics?: EngagementMetrics;
}

export interface ValidationResult {
  valid: boolean;
  platform?: DeliverablePlatform;
  error?: string;
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validates a social media URL and determines the platform
 */
export function validateSocialMediaUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Instagram
    if (hostname.includes('instagram.com')) {
      if (urlObj.pathname.includes('/p/') || urlObj.pathname.includes('/reel/') || urlObj.pathname.includes('/stories/')) {
        return { valid: true, platform: 'instagram' };
      }
      return { valid: false, error: 'Invalid Instagram post URL. Must be a post, reel, or story.' };
    }

    // TikTok
    if (hostname.includes('tiktok.com')) {
      if (urlObj.pathname.includes('/video/') || urlObj.pathname.includes('/@')) {
        return { valid: true, platform: 'tiktok' };
      }
      return { valid: false, error: 'Invalid TikTok URL. Must be a video post.' };
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      if (urlObj.pathname.includes('/watch') || urlObj.pathname.includes('/shorts/') || hostname.includes('youtu.be')) {
        return { valid: true, platform: 'youtube' };
      }
      return { valid: false, error: 'Invalid YouTube URL. Must be a video link.' };
    }

    // Facebook
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      return { valid: true, platform: 'facebook' };
    }

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      if (urlObj.pathname.includes('/status/')) {
        return { valid: true, platform: 'twitter' };
      }
      return { valid: false, error: 'Invalid Twitter/X URL. Must be a tweet link.' };
    }

    return {
      valid: false,
      error: 'Unsupported platform. Please use Instagram, TikTok, YouTube, Facebook, or Twitter.'
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format. Please enter a valid URL starting with https://'
    };
  }
}

/**
 * Checks if URL is accessible (basic check)
 */
export async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok || response.status === 403; // 403 may mean it exists but requires auth
  } catch (error) {
    return false;
  }
}

// ============================================================================
// SUBMISSION METHODS
// ============================================================================

/**
 * Submit a new deliverable
 */
export async function submitDeliverable(
  params: SubmitDeliverableParams
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    // Validate URL
    const urlValidation = validateSocialMediaUrl(params.post_url);
    if (!urlValidation.valid) {
      return {
        data: null,
        error: new Error(urlValidation.error || 'Invalid URL')
      };
    }

    // Auto-detect platform from URL if not explicitly set
    const platform = params.platform || urlValidation.platform || 'other';

    // Insert deliverable
    const { data, error } = await supabase
      .from('campaign_deliverables')
      .insert({
        creator_campaign_id: params.creator_campaign_id,
        campaign_id: params.campaign_id,
        creator_id: params.creator_id,
        deliverable_index: params.deliverable_index,
        platform,
        post_url: params.post_url,
        screenshot_url: params.screenshot_url,
        caption: params.caption,
        notes_to_restaurant: params.notes_to_restaurant,
        engagement_metrics: params.engagement_metrics || {},
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error submitting deliverable:', error);
      return { data: null, error };
    }

    // Update creator_campaigns to reflect submission
    await supabase
      .from('creator_campaigns')
      .update({
        restaurant_review_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours from now
        updated_at: new Date().toISOString()
      })
      .eq('id', params.creator_campaign_id);

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('Error in submitDeliverable:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing deliverable (for revisions)
 */
export async function updateDeliverable(
  params: UpdateDeliverableParams
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (params.post_url) {
      // Validate new URL
      const urlValidation = validateSocialMediaUrl(params.post_url);
      if (!urlValidation.valid) {
        return {
          data: null,
          error: new Error(urlValidation.error || 'Invalid URL')
        };
      }
      updates.post_url = params.post_url;
      if (urlValidation.platform) {
        updates.platform = urlValidation.platform;
      }
    }

    if (params.screenshot_url !== undefined) updates.screenshot_url = params.screenshot_url;
    if (params.caption !== undefined) updates.caption = params.caption;
    if (params.notes_to_restaurant !== undefined) updates.notes_to_restaurant = params.notes_to_restaurant;
    if (params.engagement_metrics !== undefined) updates.engagement_metrics = params.engagement_metrics;

    // If updating after rejection, increment revision number and reset status
    const { data: currentData } = await supabase
      .from('campaign_deliverables')
      .select('status, revision_number')
      .eq('id', params.deliverable_id)
      .single();

    if (currentData?.status === 'needs_revision' || currentData?.status === 'rejected') {
      updates.status = 'pending';
      updates.revision_number = (currentData.revision_number || 1) + 1;
      updates.submitted_at = new Date().toISOString();
      updates.reviewed_at = null;
      updates.reviewed_by = null;
      updates.restaurant_feedback = null;
    }

    // Update deliverable
    const { data, error } = await supabase
      .from('campaign_deliverables')
      .update(updates)
      .eq('id', params.deliverable_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating deliverable:', error);
      return { data: null, error };
    }

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('Error in updateDeliverable:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a deliverable (only if pending)
 */
export async function deleteDeliverable(
  deliverableId: string
): Promise<{ error: Error | null }> {
  try {
    // Check if deliverable is pending
    const { data: deliverable } = await supabase
      .from('campaign_deliverables')
      .select('status')
      .eq('id', deliverableId)
      .single();

    if (deliverable?.status !== 'pending' && deliverable?.status !== 'needs_revision') {
      return {
        error: new Error('Cannot delete a deliverable that has been reviewed')
      };
    }

    const { error } = await supabase
      .from('campaign_deliverables')
      .delete()
      .eq('id', deliverableId);

    if (error) {
      console.error('Error deleting deliverable:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in deleteDeliverable:', error);
    return { error: error as Error };
  }
}

// ============================================================================
// QUERY METHODS
// ============================================================================

/**
 * Get deliverable by ID
 */
export async function getDeliverableById(
  deliverableId: string
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('campaign_deliverables')
      .select('*')
      .eq('id', deliverableId)
      .single();

    if (error) {
      console.error('Error fetching deliverable:', error);
      return { data: null, error };
    }

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('Error in getDeliverableById:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all deliverables for a creator campaign
 */
export async function getDeliverablesForCreatorCampaign(
  creatorCampaignId: string
): Promise<{ data: DeliverableSubmission[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('campaign_deliverables')
      .select('*')
      .eq('creator_campaign_id', creatorCampaignId)
      .order('deliverable_index', { ascending: true });

    if (error) {
      console.error('Error fetching deliverables:', error);
      return { data: null, error };
    }

    return { data: data as DeliverableSubmission[], error: null };
  } catch (error) {
    console.error('Error in getDeliverablesForCreatorCampaign:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get deliverable status summary for a creator campaign
 */
export async function getDeliverableStatusSummary(
  creatorCampaignId: string
): Promise<{
  data: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    needs_revision: number;
    all_approved: boolean;
    auto_approval_deadline?: string;
    hours_remaining?: number;
  } | null;
  error: Error | null;
}> {
  try {
    const { data: deliverables, error } = await supabase
      .from('campaign_deliverables')
      .select('status, submitted_at')
      .eq('creator_campaign_id', creatorCampaignId);

    if (error) {
      console.error('Error fetching deliverable status:', error);
      return { data: null, error };
    }

    const total = deliverables?.length || 0;
    const pending = deliverables?.filter(d => d.status === 'pending').length || 0;
    const approved = deliverables?.filter(d => d.status === 'approved').length || 0;
    const rejected = deliverables?.filter(d => d.status === 'rejected').length || 0;
    const needs_revision = deliverables?.filter(d => d.status === 'needs_revision').length || 0;
    const all_approved = total > 0 && approved === total;

    // Calculate auto-approval deadline for pending deliverables
    let auto_approval_deadline: string | undefined;
    let hours_remaining: number | undefined;

    const pendingDeliverable = deliverables?.find(d => d.status === 'pending');
    if (pendingDeliverable?.submitted_at) {
      const submittedAt = new Date(pendingDeliverable.submitted_at);
      const deadline = new Date(submittedAt.getTime() + 72 * 60 * 60 * 1000); // 72 hours
      auto_approval_deadline = deadline.toISOString();
      hours_remaining = Math.max(0, (deadline.getTime() - Date.now()) / (60 * 60 * 1000));
    }

    return {
      data: {
        total,
        pending,
        approved,
        rejected,
        needs_revision,
        all_approved,
        auto_approval_deadline,
        hours_remaining
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getDeliverableStatusSummary:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get deliverables by creator ID (all campaigns)
 */
export async function getDeliverablesByCreator(
  creatorId: string,
  status?: DeliverableStatus
): Promise<{ data: DeliverableSubmission[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('campaign_deliverables')
      .select(`
        *,
        campaign:campaigns(title, restaurant_id)
      `)
      .eq('creator_id', creatorId)
      .order('submitted_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching creator deliverables:', error);
      return { data: null, error };
    }

    return { data: data as DeliverableSubmission[], error: null };
  } catch (error) {
    console.error('Error in getDeliverablesByCreator:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// ANALYTICS & HELPERS
// ============================================================================

/**
 * Check if a deliverable needs attention (nearing auto-approval)
 */
export function needsAttention(deliverable: DeliverableSubmission): boolean {
  if (deliverable.status !== 'pending' || !deliverable.submitted_at) {
    return false;
  }

  const submittedAt = new Date(deliverable.submitted_at);
  const hoursElapsed = (Date.now() - submittedAt.getTime()) / (60 * 60 * 1000);

  // Flag if more than 60 hours have elapsed (12 hours remaining)
  return hoursElapsed > 60;
}

/**
 * Calculate time remaining until auto-approval
 */
export function getTimeRemaining(submittedAt: string): {
  hours: number;
  minutes: number;
  expired: boolean;
} {
  const submitted = new Date(submittedAt);
  const deadline = new Date(submitted.getTime() + 72 * 60 * 60 * 1000);
  const remaining = deadline.getTime() - Date.now();

  if (remaining <= 0) {
    return { hours: 0, minutes: 0, expired: true };
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return { hours, minutes, expired: false };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(submittedAt: string): string {
  const { hours, minutes, expired } = getTimeRemaining(submittedAt);

  if (expired) {
    return 'Auto-approved';
  }

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${minutes}m remaining`;
}

/**
 * Get urgency level for time remaining
 */
export function getUrgencyLevel(submittedAt: string): 'low' | 'medium' | 'high' | 'expired' {
  const { hours, expired } = getTimeRemaining(submittedAt);

  if (expired) return 'expired';
  if (hours <= 12) return 'high';
  if (hours <= 24) return 'medium';
  return 'low';
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Submit multiple deliverables at once
 */
export async function submitMultipleDeliverables(
  submissions: SubmitDeliverableParams[]
): Promise<{
  data: DeliverableSubmission[] | null;
  errors: Array<{ index: number; error: Error }>;
}> {
  const results: DeliverableSubmission[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  for (let i = 0; i < submissions.length; i++) {
    const { data, error } = await submitDeliverable(submissions[i]);
    if (error) {
      errors.push({ index: i, error });
    } else if (data) {
      results.push(data);
    }
  }

  return {
    data: results.length > 0 ? results : null,
    errors
  };
}

/**
 * Get deliverable submission progress
 */
export async function getSubmissionProgress(
  creatorCampaignId: string,
  requiredDeliverables: number
): Promise<{
  data: {
    submitted: number;
    required: number;
    percentage: number;
    complete: boolean;
  } | null;
  error: Error | null;
}> {
  try {
    const { data: deliverables, error } = await supabase
      .from('campaign_deliverables')
      .select('id')
      .eq('creator_campaign_id', creatorCampaignId);

    if (error) {
      return { data: null, error };
    }

    const submitted = deliverables?.length || 0;
    const percentage = requiredDeliverables > 0
      ? Math.round((submitted / requiredDeliverables) * 100)
      : 0;
    const complete = submitted >= requiredDeliverables;

    return {
      data: {
        submitted,
        required: requiredDeliverables,
        percentage,
        complete
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getSubmissionProgress:', error);
    return { data: null, error: error as Error };
  }
}
