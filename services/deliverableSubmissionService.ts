/**
 * Deliverable Submission Service
 *
 * Handles creator deliverable submissions for campaigns including:
 * - Submitting new deliverables
 * - Retrieving deliverable status
 * - Updating/resubmitting deliverables
 * - URL validation
 * - Time tracking for auto-approval
 *
 * Engineering Task: Support Multiple Posts/Deliverables
 * =====================================================
 * Current implementation supports single deliverable submission per call.
 * 
 * Future Enhancement: Add support for batch/multiple deliverable submissions:
 * - Add submitMultipleDeliverables() function that accepts array of SubmitDeliverableParams
 * - Update deliverable_index calculation to handle multiple submissions
 * - Add transaction support to ensure all-or-nothing submission for batch operations
 * - Consider adding deliverable grouping/relationship for multi-post campaigns
 * - Update validation to check for duplicate URLs within a batch
 * - Add progress tracking for batch submissions
 */

import { supabase } from '@/lib/supabase';
import type {
    DeliverablePlatform,
    DeliverableStatus,
    DeliverableSubmission,
    EngagementMetrics
} from '@/types/deliverableRequirements';

// ============================================================================
// TYPES
// ============================================================================

export interface SubmitDeliverableParams {
  campaign_application_id: string; // Changed from creator_campaign_id
  campaign_id: string;
  creator_id: string;
  deliverable_index?: number; // Made optional - will auto-calculate if not provided
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
  warning?: string;
  error?: string;
}

// ============================================================================
// URL VALIDATION
// ============================================================================

// Platform detection patterns
const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  instagram: [
    /instagram\.com\/(p|reel|reels|tv|stories|share)\//i,
    /instagram\.com\/[^\/]+\/(p|reel)\//i,
    /instagr\.am\//i,
  ],
  tiktok: [
    /tiktok\.com\/@[^\/]+\/video\//i,
    /tiktok\.com\/t\//i,
    /vm\.tiktok\.com\//i,
    /tiktok\.com\/@[^\/]+$/i, // Profile with video
  ],
  youtube: [
    /youtube\.com\/watch/i,
    /youtube\.com\/shorts\//i,
    /youtube\.com\/live\//i,
    /youtu\.be\//i,
    /youtube\.com\/embed\//i,
  ],
  twitter: [
    /twitter\.com\/[^\/]+\/status\//i,
    /x\.com\/[^\/]+\/status\//i,
    /mobile\.twitter\.com\/[^\/]+\/status\//i,
  ],
  facebook: [
    /facebook\.com\/.+\/posts\//i,
    /facebook\.com\/watch\//i,
    /facebook\.com\/reel\//i,
    /fb\.watch\//i,
    /fb\.com\//i,
  ],
  threads: [
    /threads\.net\/@[^\/]+\/post\//i,
    /threads\.net\/t\//i,
  ],
  linkedin: [
    /linkedin\.com\/posts\//i,
    /linkedin\.com\/feed\/update\//i,
  ],
};

function detectPlatformFromDomain(hostname: string): DeliverablePlatform {
  if (hostname.includes('instagram')) return 'instagram';
  if (hostname.includes('tiktok')) return 'tiktok';
  if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'youtube';
  if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('facebook') || hostname.includes('fb.')) return 'facebook';
  if (hostname.includes('threads')) return 'instagram'; // Threads is Meta-owned, use instagram as fallback
  if (hostname.includes('linkedin')) return 'other';
  return 'other';
}

/**
 * Validates a social media URL and determines the platform
 * Now supports more flexible patterns and warnings for unrecognized formats
 */
export function validateSocialMediaUrl(url: string): ValidationResult {
  // Basic URL validation
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return {
      valid: false,
      platform: 'other',
      error: 'Invalid URL format. Please enter a valid URL starting with https://',
    };
  }

  // Require HTTPS
  if (urlObj.protocol !== 'https:') {
    return {
      valid: false,
      platform: 'other',
      error: 'URL must use HTTPS',
    };
  }

  const hostname = urlObj.hostname.toLowerCase();

  // Detect platform using patterns
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return {
          valid: true,
          platform: platform as DeliverablePlatform,
        };
      }
    }
  }

  // Check if it's a known social media domain but unrecognized format
  const knownDomains = [
    'instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be',
    'twitter.com', 'x.com', 'facebook.com', 'fb.com',
    'threads.net', 'linkedin.com',
  ];

  const isKnownDomain = knownDomains.some(domain =>
    hostname.includes(domain)
  );

  if (isKnownDomain) {
    // Known platform but unknown format - allow with warning
    return {
      valid: true,
      platform: detectPlatformFromDomain(hostname),
      warning: 'URL format not recognized. Please verify the link is to a specific post.',
    };
  }

  // Unknown platform - allow but warn
  return {
    valid: true,
    platform: 'other',
    warning: 'Platform not auto-detected. Please verify the link works and is publicly accessible.',
  };
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
  params: Omit<SubmitDeliverableParams, 'deliverable_index'> & {
    deliverable_index?: number;
  }
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

    // Auto-calculate deliverable_index if not provided
    let deliverableIndex = params.deliverable_index;
    if (!deliverableIndex) {
      // Try to get existing deliverables and calculate next index
      // Handle case where deliverable_index column might not exist
      const { data: existing, error: selectError } = await supabase
        .from('campaign_deliverables')
        .select('id, deliverable_index, submitted_at')
        .eq('campaign_application_id', params.campaign_application_id);
      
      if (selectError && selectError.message?.includes('deliverable_index')) {
        // Column doesn't exist - use count of existing deliverables + 1
        const { count } = await supabase
          .from('campaign_deliverables')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_application_id', params.campaign_application_id);
        
        deliverableIndex = (count || 0) + 1;
      } else if (existing && existing.length > 0) {
        // Column exists - find max index
        const maxIndex = Math.max(
          ...existing
            .map((e: any) => e.deliverable_index)
            .filter((idx: any) => idx !== null && idx !== undefined)
        );
        deliverableIndex = maxIndex > 0 ? maxIndex + 1 : 1;
      } else {
        deliverableIndex = 1;
      }
    }

    // Get restaurant_id from campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('restaurant_id')
      .eq('id', params.campaign_id)
      .single();

    // Insert deliverable - try with deliverable_index first, fallback without it
    // Build base insert data (exclude columns that might not exist)
    const insertData: any = {
      campaign_application_id: params.campaign_application_id,
      campaign_id: params.campaign_id,
      creator_id: params.creator_id,
      restaurant_id: campaign?.restaurant_id || null,
      social_platform: platform, // Use social_platform instead of platform
      platform_post_url: params.post_url,
      content_url: params.post_url, // Use content_url as well
      content_type: 'post', // Default content type
      caption: params.caption,
      status: 'pending_review',
      submitted_at: new Date().toISOString()
    };

    // Add optional fields if they exist
    if (params.screenshot_url) {
      insertData.thumbnail_url = params.screenshot_url; // Use thumbnail_url instead of screenshot_url
    }
    if (params.notes_to_restaurant) {
      insertData.review_notes = params.notes_to_restaurant; // Map notes_to_restaurant to review_notes
    }

    // Try to insert with deliverable_index first
    let { data, error } = await supabase
      .from('campaign_deliverables')
      .insert({
        ...insertData,
        deliverable_index: deliverableIndex,
      })
      .select('*')
      .single();

    // If error is about missing column, retry without deliverable_index
    if (error && error.message?.includes('deliverable_index')) {
      const { data: retryData, error: retryError } = await supabase
        .from('campaign_deliverables')
        .insert(insertData)
        .select('*')
        .single();
      
      if (retryError) {
        // If error is about engagement_metrics or other missing columns, try without them
        if (retryError.message?.includes('engagement_metrics') || 
            retryError.message?.includes('screenshot_url') ||
            retryError.message?.includes('notes_to_restaurant')) {
          // Remove problematic fields and retry
          const cleanData = { ...insertData };
          delete cleanData.engagement_metrics;
          delete cleanData.screenshot_url;
          delete cleanData.notes_to_restaurant;
          
          const { data: finalData, error: finalError } = await supabase
            .from('campaign_deliverables')
            .insert(cleanData)
            .select('*')
            .single();
          
          if (finalError) {
            console.error('Error submitting deliverable:', finalError);
            return { data: null, error: finalError };
          }
          data = finalData;
          error = null;
        } else {
          console.error('Error submitting deliverable:', retryError);
          return { data: null, error: retryError };
        }
      } else {
        data = retryData;
        error = null;
      }
    } else if (error) {
      // If error is about engagement_metrics or other missing columns, try without them
      if (error.message?.includes('engagement_metrics') || 
          error.message?.includes('screenshot_url') ||
          error.message?.includes('notes_to_restaurant')) {
        const cleanData = { ...insertData };
        delete cleanData.engagement_metrics;
        delete cleanData.screenshot_url;
        delete cleanData.notes_to_restaurant;
        delete cleanData.deliverable_index;
        
        const { data: finalData, error: finalError } = await supabase
          .from('campaign_deliverables')
          .insert(cleanData)
          .select('*')
          .single();
        
        if (finalError) {
          console.error('Error submitting deliverable:', finalError);
          return { data: null, error: finalError };
        }
        data = finalData;
        error = null;
      } else {
        console.error('Error submitting deliverable:', error);
        return { data: null, error };
      }
    }

    // Update campaign_application to reflect submission
    await supabase
      .from('campaign_applications')
      .update({
        restaurant_review_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours from now
      })
      .eq('id', params.campaign_application_id);

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
      updates.platform_post_url = params.post_url;
      if (urlValidation.platform) {
        updates.social_platform = urlValidation.platform;
      }
    }

    // Map field names to match actual table schema
    if (params.screenshot_url !== undefined) updates.thumbnail_url = params.screenshot_url;
    if (params.caption !== undefined) updates.caption = params.caption;
    if (params.notes_to_restaurant !== undefined) updates.review_notes = params.notes_to_restaurant;
    // engagement_metrics doesn't exist in the table - skip it

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
  campaignApplicationId: string
): Promise<{ data: DeliverableSubmission[] | null; error: Error | null }> {
  try {
    // First, check if deliverable_index column exists by trying to select it
    // If it doesn't exist, we'll use submitted_at for ordering instead
    let query = supabase
      .from('campaign_deliverables')
      .select('*')
      .eq('campaign_application_id', campaignApplicationId);
    
    // Try to order by deliverable_index, fallback to submitted_at if column doesn't exist
    try {
      query = query.order('deliverable_index', { ascending: true });
    } catch (e) {
      // Column doesn't exist, order by submitted_at instead
      query = query.order('submitted_at', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      // If error is about missing column, try without ordering
      if (error.message?.includes('deliverable_index')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('campaign_deliverables')
          .select('*')
          .eq('campaign_application_id', campaignApplicationId)
          .order('submitted_at', { ascending: true });
        
        if (fallbackError) {
          console.error('Error fetching deliverables:', fallbackError);
          return { data: null, error: fallbackError };
        }
        
        // Map data to include deliverable_index (default to 1 if missing)
        const mappedData = (fallbackData || []).map((item: any, index: number) => ({
          ...item,
          deliverable_index: item.deliverable_index || index + 1,
        }));
        
        return { data: mappedData as DeliverableSubmission[], error: null };
      }
      
      console.error('Error fetching deliverables:', error);
      return { data: null, error };
    }

    // Ensure deliverable_index exists in data (default to array index + 1 if missing)
    const mappedData = (data || []).map((item: any, index: number) => ({
      ...item,
      deliverable_index: item.deliverable_index !== undefined ? item.deliverable_index : index + 1,
    }));

    return { data: mappedData as DeliverableSubmission[], error: null };
  } catch (error) {
    console.error('Error in getDeliverablesForCreatorCampaign:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get deliverable status summary for a creator campaign
 */
export async function getDeliverableStatusSummary(
  campaignApplicationId: string
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
      .eq('campaign_application_id', campaignApplicationId);

    if (error) {
      console.error('Error fetching deliverable status:', error);
      return { data: null, error };
    }

    const total = deliverables?.length || 0;
    const pending = deliverables?.filter(d => d.status === 'pending_review' || d.status === 'pending').length || 0;
    const approved = deliverables?.filter(d => d.status === 'approved' || d.status === 'auto_approved').length || 0;
    const rejected = deliverables?.filter(d => d.status === 'rejected').length || 0;
    const needs_revision = deliverables?.filter(d => d.status === 'needs_revision' || d.status === 'revision_requested').length || 0;
    const all_approved = total > 0 && approved === total;

    // Calculate auto-approval deadline for pending deliverables
    let auto_approval_deadline: string | undefined;
    let hours_remaining: number | undefined;

    const pendingDeliverable = deliverables?.find(d => d.status === 'pending_review' || d.status === 'pending');
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
  submissions: Omit<SubmitDeliverableParams, 'deliverable_index'>[]
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
 * Get required deliverables for a campaign
 */
export async function getRequiredDeliverables(
  campaignId: string
): Promise<{
  data: {
    total_required: number;
    deliverables: Array<{
      index: number;
      platform?: DeliverablePlatform;
      description?: string;
      content_type?: string;
      required: boolean;
    }>;
  } | null;
  error: Error | null;
}> {
  try {
    // First try to get deliverable_requirements (new field)
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('deliverable_requirements')
      .eq('id', campaignId)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Try to get old deliverables field separately (may not exist)
    let oldDeliverables: any = null;
    try {
      const { data: oldData } = await supabase
        .from('campaigns')
        .select('deliverables')
        .eq('id', campaignId)
        .single();
      oldDeliverables = oldData?.deliverables;
    } catch (e) {
      // Column doesn't exist - that's fine, we'll just use deliverable_requirements
      console.log('Old deliverables column does not exist, using deliverable_requirements only');
    }

    // Parse deliverable_requirements JSONB
    const requirements = campaign?.deliverable_requirements || {};
    let deliverablesList = requirements.deliverables || [];
    
    // Check the old deliverables field as a fallback/source of truth
    // Some campaigns may have incorrect deliverable_requirements but correct old deliverables field
    let oldDeliverablesList: any[] = [];
    if (oldDeliverables) {
      const oldDeliverablesArray = Array.isArray(oldDeliverables) 
        ? oldDeliverables 
        : [];
      oldDeliverablesList = oldDeliverablesArray.map((deliverable: any, index: number) => {
        // Handle both string and object formats
        if (typeof deliverable === 'string') {
          return {
            index: index + 1,
            description: deliverable,
            required: true
          };
        } else if (deliverable && typeof deliverable === 'object') {
          return {
            index: deliverable.index !== undefined ? deliverable.index : index + 1,
            platform: deliverable.platform,
            description: deliverable.description || deliverable,
            content_type: deliverable.content_type || deliverable.type,
            required: deliverable.required !== false
          };
        }
        return {
          index: index + 1,
          description: String(deliverable),
          required: true
        };
      });
    }
    
    // Use old deliverables if:
    // 1. deliverable_requirements is empty, OR
    // 2. old deliverables has fewer items (likely more accurate for campaigns that only require 1)
    if (oldDeliverablesList.length > 0) {
      if (deliverablesList.length === 0 || oldDeliverablesList.length < deliverablesList.length) {
        deliverablesList = oldDeliverablesList;
      }
    }
    
    // If still no deliverables found, default to 1 deliverable
    // This handles campaigns that have neither deliverable_requirements nor deliverables set
    if (deliverablesList.length === 0) {
      deliverablesList = [{
        index: 1,
        description: 'Social Media Post',
        required: true
      }];
    }

    // Helper function to parse platform from type string
    const parsePlatform = (type?: string, platform?: string): DeliverablePlatform | undefined => {
      if (platform) {
        return platform.toLowerCase() as DeliverablePlatform;
      }
      if (!type) return undefined;
      const lowerType = type.toLowerCase();
      if (lowerType.includes('instagram')) return 'instagram';
      if (lowerType.includes('tiktok')) return 'tiktok';
      if (lowerType.includes('youtube')) return 'youtube';
      if (lowerType.includes('facebook')) return 'facebook';
      if (lowerType.includes('twitter')) return 'twitter';
      return undefined;
    };

    const deliverables = deliverablesList.map((req: any, arrayIndex: number) => ({
      index: req.index !== undefined ? req.index : arrayIndex + 1, // Use req.index if present, otherwise use array index + 1
      platform: parsePlatform(req.type, req.platform),
      description: req.description,
      content_type: req.content_type || req.type, // Support both 'content_type' and 'type' fields
      required: req.required !== false, // Default to required
    }));

    return {
      data: {
        total_required: deliverables.length,
        deliverables,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getRequiredDeliverables:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get deliverable submission progress
 */
export async function getSubmissionProgress(
  campaignApplicationId: string,
  campaignId: string
): Promise<{
  data: {
    submitted: number;
    required: number;
    percentage: number;
    complete: boolean;
    deliverables: Array<{
      index: number;
      status: string;
      submitted_at?: string;
      platform?: DeliverablePlatform;
    }>;
  } | null;
  error: Error | null;
}> {
  try {
    // Get required deliverables
    const { data: required, error: reqError } = await getRequiredDeliverables(campaignId);
    if (reqError) {
      return { data: null, error: reqError };
    }

    // Get submitted deliverables (campaignApplicationId is already passed)
    const { data: submitted, error: subError } = await getDeliverablesForCreatorCampaign(
      campaignApplicationId
    );
    if (subError) {
      return { data: null, error: subError };
    }

    if (!required) {
      return { data: null, error: new Error('Failed to fetch required deliverables') };
    }

    // Build deliverables array with status
    const deliverables = required.deliverables.map((req, reqIndex) => {
      // Find submitted deliverable by index
      // If deliverable_index column exists, use it; otherwise match by array position
      const submittedDeliverable = submitted?.find((s: any, sIndex: number) => {
        if (s.deliverable_index !== undefined && s.deliverable_index !== null) {
          return s.deliverable_index === req.index;
        }
        // Fallback: match by array position (assuming order matches)
        return sIndex === reqIndex;
      });

      return {
        index: req.index,
        status: submittedDeliverable
          ? submittedDeliverable.status
          : 'pending',
        submitted_at: submittedDeliverable?.submitted_at,
        platform: submittedDeliverable?.platform || req.platform,
      };
    });

    const submittedCount = submitted?.length || 0;
    const requiredCount = required.total_required;
    const percentage = requiredCount > 0
      ? Math.round((submittedCount / requiredCount) * 100)
      : 0;

    return {
      data: {
        submitted: submittedCount,
        required: requiredCount,
        percentage,
        complete: submittedCount >= requiredCount,
        deliverables,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getSubmissionProgress:', error);
    return { data: null, error: error as Error };
  }
}
