/**
 * Deliverable Review Service
 *
 * Handles restaurant review of creator deliverables including:
 * - Retrieving pending deliverables
 * - Approving/rejecting deliverables
 * - Requesting changes/revisions
 * - Auto-approval tracking
 * - Review analytics
 */

import { supabase } from '@/lib/supabase';
import type {
    DeliverableStatistics,
    DeliverableSubmission,
    PendingDeliverableSummary
} from '@/types/deliverableRequirements';
import { processDeliverablePayout } from './payoutService';

// ============================================================================
// TYPES
// ============================================================================

export interface ApproveDeliverableParams {
  deliverable_id: string;
  reviewer_id: string;
  feedback?: string;
}

export interface RejectDeliverableParams {
  deliverable_id: string;
  reviewer_id: string;
  feedback: string; // Feedback is required when rejecting
  reason?: string;
}

export interface RequestChangesParams {
  deliverable_id: string;
  reviewer_id: string;
  feedback: string; // Feedback is required when requesting changes
  changes_required: string[];
}

// ============================================================================
// REVIEW ACTIONS
// ============================================================================

/**
 * Approve a deliverable
 */
export async function approveDeliverable(
  params: ApproveDeliverableParams
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('campaign_deliverables')
      .update({
        status: 'approved',
        reviewed_by: params.reviewer_id,
        reviewed_at: new Date().toISOString(),
        restaurant_feedback: params.feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.deliverable_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error approving deliverable:', error);
      return { data: null, error };
    }

    // Trigger payment processing
    try {
      const payoutResult = await processDeliverablePayout(params.deliverable_id);
      if (!payoutResult.success && payoutResult.error !== 'Creator needs to complete Stripe onboarding') {
        console.error('Error processing payout:', payoutResult.error);
        // Don't fail the approval if payout fails - it will be retried
      }
    } catch (payoutError) {
      console.error('Error triggering payout:', payoutError);
      // Don't fail the approval if payout fails - it will be retried
    }

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('Error in approveDeliverable:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Reject a deliverable
 */
export async function rejectDeliverable(
  params: RejectDeliverableParams
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    if (!params.feedback || params.feedback.trim().length === 0) {
      return {
        data: null,
        error: new Error('Feedback is required when rejecting a deliverable')
      };
    }

    const { data, error } = await supabase
      .from('campaign_deliverables')
      .update({
        status: 'rejected',
        reviewed_by: params.reviewer_id,
        reviewed_at: new Date().toISOString(),
        restaurant_feedback: params.feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.deliverable_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error rejecting deliverable:', error);
      return { data: null, error };
    }

    // TODO: Send notification to creator about rejection

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('Error in rejectDeliverable:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Request changes to a deliverable
 */
export async function requestChanges(
  params: RequestChangesParams
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    if (!params.feedback || params.feedback.trim().length === 0) {
      return {
        data: null,
        error: new Error('Feedback is required when requesting changes')
      };
    }

    // Build feedback with changes required
    let fullFeedback = params.feedback;
    if (params.changes_required.length > 0) {
      fullFeedback += '\n\nChanges Required:\n' + params.changes_required.map((c, i) => `${i + 1}. ${c}`).join('\n');
    }

    const { data, error } = await supabase
      .from('campaign_deliverables')
      .update({
        status: 'needs_revision',
        reviewed_by: params.reviewer_id,
        reviewed_at: new Date().toISOString(),
        restaurant_feedback: fullFeedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.deliverable_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error requesting changes:', error);
      return { data: null, error };
    }

    // TODO: Send notification to creator about required changes

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('Error in requestChanges:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Bulk approve multiple deliverables
 */
export async function bulkApproveDeliverables(
  deliverableIds: string[],
  reviewerId: string,
  feedback?: string
): Promise<{
  data: DeliverableSubmission[] | null;
  errors: Array<{ id: string; error: Error }>;
}> {
  const results: DeliverableSubmission[] = [];
  const errors: Array<{ id: string; error: Error }> = [];

  for (const id of deliverableIds) {
    const { data, error } = await approveDeliverable({
      deliverable_id: id,
      reviewer_id: reviewerId,
      feedback
    });

    if (error) {
      errors.push({ id, error });
    } else if (data) {
      results.push(data);
    }
  }

  return {
    data: results.length > 0 ? results : null,
    errors
  };
}

// ============================================================================
// QUERY METHODS FOR RESTAURANT DASHBOARD
// ============================================================================

/**
 * Get pending deliverables for a restaurant
 */
export async function getPendingDeliverables(
  restaurantId: string
): Promise<{ data: PendingDeliverableSummary[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('pending_deliverables_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('hours_remaining', { ascending: true }); // Most urgent first

    if (error) {
      console.error('Error fetching pending deliverables:', error);
      return { data: null, error };
    }

    return { data: data as PendingDeliverableSummary[], error: null };
  } catch (error) {
    console.error('Error in getPendingDeliverables:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all deliverables for a campaign (for restaurant review)
 */
export async function getDeliverablesForCampaign(
  campaignId: string,
  status?: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('campaign_deliverables')
      .select(`
        *,
        creator:users!creator_id(
          id,
          full_name,
          username,
          avatar_url,
          email
        )
      `)
      .eq('campaign_id', campaignId)
      .order('submitted_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching campaign deliverables:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in getDeliverablesForCampaign:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get deliverable count by status for a campaign
 */
export async function getDeliverableCountsByStatus(
  campaignId: string
): Promise<{
  data: {
    pending: number;
    approved: number;
    rejected: number;
    needs_revision: number;
    total: number;
  } | null;
  error: Error | null;
}> {
  try {
    const { data: deliverables, error } = await supabase
      .from('campaign_deliverables')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) {
      return { data: null, error };
    }

    const counts = {
      pending: deliverables?.filter(d => d.status === 'pending').length || 0,
      approved: deliverables?.filter(d => d.status === 'approved').length || 0,
      rejected: deliverables?.filter(d => d.status === 'rejected').length || 0,
      needs_revision: deliverables?.filter(d => d.status === 'needs_revision').length || 0,
      total: deliverables?.length || 0
    };

    return { data: counts, error: null };
  } catch (error) {
    console.error('Error in getDeliverableCountsByStatus:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get deliverables nearing auto-approval deadline
 */
export async function getDeliverablesNearingAutoApproval(
  restaurantId: string,
  hoursThreshold: number = 12
): Promise<{ data: PendingDeliverableSummary[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('pending_deliverables_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .lte('hours_remaining', hoursThreshold)
      .order('hours_remaining', { ascending: true });

    if (error) {
      console.error('Error fetching deliverables nearing deadline:', error);
      return { data: null, error };
    }

    return { data: data as PendingDeliverableSummary[], error: null };
  } catch (error) {
    console.error('Error in getDeliverablesNearingAutoApproval:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// AUTO-APPROVAL
// ============================================================================

/**
 * Manually trigger auto-approval for overdue deliverables
 * (Normally called by cron job, but can be called manually for testing)
 */
export async function triggerAutoApproval(): Promise<{
  data: Array<{
    deliverable_id: string;
    creator_id: string;
    campaign_id: string;
    creator_campaign_id: string;
    approved_at: string;
    creator_email: string;
    campaign_title: string;
  }> | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('auto_approve_overdue_deliverables');

    if (error) {
      console.error('Error triggering auto-approval:', error);
      return { data: null, error };
    }

    // Process payouts for auto-approved deliverables
    if (data && Array.isArray(data)) {
      for (const approved of data) {
        try {
          const payoutResult = await processDeliverablePayout(approved.deliverable_id);
          if (!payoutResult.success && payoutResult.error !== 'Creator needs to complete Stripe onboarding') {
            console.error(`Error processing payout for deliverable ${approved.deliverable_id}:`, payoutResult.error);
          }
        } catch (payoutError) {
          console.error(`Error triggering payout for deliverable ${approved.deliverable_id}:`, payoutError);
        }
      }
    }

    // TODO: Send notifications to creators and restaurants about auto-approvals

    return { data, error: null };
  } catch (error) {
    console.error('Error in triggerAutoApproval:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Check if a specific deliverable should be auto-approved
 */
export async function checkAutoApprovalStatus(
  deliverableId: string
): Promise<{
  data: {
    should_auto_approve: boolean;
    hours_elapsed: number;
    hours_remaining: number;
    deadline: string;
  } | null;
  error: Error | null;
}> {
  try {
    const { data: deliverable, error } = await supabase
      .from('campaign_deliverables')
      .select('status, submitted_at')
      .eq('id', deliverableId)
      .single();

    if (error || !deliverable) {
      return { data: null, error: error || new Error('Deliverable not found') };
    }

    if (deliverable.status !== 'pending' || !deliverable.submitted_at) {
      return {
        data: {
          should_auto_approve: false,
          hours_elapsed: 0,
          hours_remaining: 0,
          deadline: ''
        },
        error: null
      };
    }

    const submittedAt = new Date(deliverable.submitted_at);
    const deadline = new Date(submittedAt.getTime() + 72 * 60 * 60 * 1000);
    const hoursElapsed = (Date.now() - submittedAt.getTime()) / (60 * 60 * 1000);
    const hoursRemaining = Math.max(0, (deadline.getTime() - Date.now()) / (60 * 60 * 1000));
    const shouldAutoApprove = hoursElapsed >= 72;

    return {
      data: {
        should_auto_approve: shouldAutoApprove,
        hours_elapsed: Math.round(hoursElapsed * 10) / 10,
        hours_remaining: Math.round(hoursRemaining * 10) / 10,
        deadline: deadline.toISOString()
      },
      error: null
    };
  } catch (error) {
    console.error('Error in checkAutoApprovalStatus:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get deliverable statistics for a campaign
 */
export async function getDeliverableStatistics(
  campaignId: string
): Promise<{ data: DeliverableStatistics | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('deliverable_statistics')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching deliverable statistics:', error);
      return { data: null, error };
    }

    return { data: data as DeliverableStatistics, error: null };
  } catch (error) {
    console.error('Error in getDeliverableStatistics:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get restaurant review performance metrics
 */
export async function getRestaurantReviewMetrics(
  restaurantId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  data: {
    total_reviewed: number;
    avg_review_hours: number;
    approval_rate: number;
    rejection_rate: number;
    revision_rate: number;
    auto_approval_rate: number;
    pending_count: number;
  } | null;
  error: Error | null;
}> {
  try {
    let query = supabase
      .from('campaign_deliverables')
      .select(`
        status,
        auto_approved,
        submitted_at,
        reviewed_at,
        campaign:campaigns!inner(restaurant_id)
      `)
      .eq('campaign.restaurant_id', restaurantId);

    if (startDate) {
      query = query.gte('submitted_at', startDate);
    }
    if (endDate) {
      query = query.lte('submitted_at', endDate);
    }

    const { data: deliverables, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const total = deliverables?.length || 0;
    const reviewed = deliverables?.filter(d => d.reviewed_at).length || 0;
    const approved = deliverables?.filter(d => d.status === 'approved').length || 0;
    const rejected = deliverables?.filter(d => d.status === 'rejected').length || 0;
    const revision = deliverables?.filter(d => d.status === 'needs_revision').length || 0;
    const autoApproved = deliverables?.filter(d => d.auto_approved).length || 0;
    const pending = deliverables?.filter(d => d.status === 'pending').length || 0;

    // Calculate average review time
    const reviewedDeliverables = deliverables?.filter(d => d.reviewed_at && d.submitted_at) || [];
    const avgReviewHours = reviewedDeliverables.length > 0
      ? reviewedDeliverables.reduce((sum, d) => {
          const submitted = new Date(d.submitted_at!);
          const reviewed = new Date(d.reviewed_at!);
          return sum + (reviewed.getTime() - submitted.getTime()) / (60 * 60 * 1000);
        }, 0) / reviewedDeliverables.length
      : 0;

    return {
      data: {
        total_reviewed: reviewed,
        avg_review_hours: Math.round(avgReviewHours * 10) / 10,
        approval_rate: reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0,
        rejection_rate: reviewed > 0 ? Math.round((rejected / reviewed) * 100) : 0,
        revision_rate: reviewed > 0 ? Math.round((revision / reviewed) * 100) : 0,
        auto_approval_rate: reviewed > 0 ? Math.round((autoApproved / reviewed) * 100) : 0,
        pending_count: pending
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getRestaurantReviewMetrics:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format time remaining for display
 */
export function formatDeadline(hoursRemaining: number): string {
  if (hoursRemaining <= 0) {
    return 'Auto-approved';
  }

  if (hoursRemaining < 1) {
    const minutes = Math.round(hoursRemaining * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }

  if (hoursRemaining < 24) {
    const hours = Math.floor(hoursRemaining);
    const minutes = Math.round((hoursRemaining - hours) * 60);
    return `${hours}h ${minutes}m remaining`;
  }

  const days = Math.floor(hoursRemaining / 24);
  const hours = Math.floor(hoursRemaining % 24);
  return `${days} day${days !== 1 ? 's' : ''} ${hours}h remaining`;
}

/**
 * Get urgency color for deadline
 */
export function getUrgencyColor(hoursRemaining: number): 'green' | 'yellow' | 'red' | 'gray' {
  if (hoursRemaining <= 0) return 'gray';
  if (hoursRemaining <= 12) return 'red';
  if (hoursRemaining <= 24) return 'yellow';
  return 'green';
}

/**
 * Check if restaurant can still review (before auto-approval)
 */
export function canReview(submittedAt: string): boolean {
  const submitted = new Date(submittedAt);
  const deadline = new Date(submitted.getTime() + 72 * 60 * 60 * 1000);
  return Date.now() < deadline.getTime();
}

/**
 * Calculate review response time
 */
export function calculateResponseTime(submittedAt: string, reviewedAt: string): {
  hours: number;
  formatted: string;
} {
  const submitted = new Date(submittedAt);
  const reviewed = new Date(reviewedAt);
  const hours = (reviewed.getTime() - submitted.getTime()) / (60 * 60 * 1000);

  let formatted: string;
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    formatted = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (hours < 24) {
    formatted = `${Math.round(hours * 10) / 10} hours`;
  } else {
    const days = Math.floor(hours / 24);
    formatted = `${days} day${days !== 1 ? 's' : ''}`;
  }

  return { hours: Math.round(hours * 10) / 10, formatted };
}
