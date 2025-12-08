/**
 * Rating Service
 * Handles creator rating functionality for businesses
 * Task: CM-16
 */

import { supabase } from '@/lib/supabase';

export interface RateCreatorParams {
  applicationId: string;
  rating: number;
  comment?: string;
}

export interface CreatorRating {
  averageRating: number | null;
  totalRatings: number;
}

/**
 * Rate a creator after campaign completion
 * @param params - Rating parameters
 * @returns Success status and error if any
 */
export async function rateCreator(
  params: RateCreatorParams
): Promise<{ success: boolean; error?: string }> {
  const { applicationId, rating, comment } = params;

  // Validate rating
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }

  try {
    // Check application exists and is completed
    // Note: Business user authorization is handled at the UI level (only campaign owners can see applications)
    const { data: application, error: fetchError } = await supabase
      .from('campaign_applications')
      .select('id, status, rating, campaign_id')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Check if already rated
    if (application.rating) {
      return { success: false, error: 'Rating already submitted for this campaign' };
    }

    // Check if application is accepted
    if (application.status !== 'accepted') {
      return { success: false, error: 'Can only rate creators with accepted applications' };
    }

    // Check that ALL deliverables have been approved
    // Rating is the final step - all deliverables must be completed and approved
    const { data: allDeliverables, error: deliverablesError } = await supabase
      .from('campaign_deliverables')
      .select('id, status')
      .eq('campaign_application_id', applicationId);

    if (deliverablesError) {
      return { success: false, error: `Failed to check deliverables: ${deliverablesError.message}` };
    }

    if (!allDeliverables || allDeliverables.length === 0) {
      return { 
        success: false, 
        error: 'Cannot rate creator until deliverables have been submitted and approved' 
      };
    }

    // Check that all deliverables are approved (no pending, rejected, or disputed)
    const unapprovedDeliverables = allDeliverables.filter(
      d => !['approved', 'auto_approved'].includes(d.status)
    );

    if (unapprovedDeliverables.length > 0) {
      const unapprovedStatuses = [...new Set(unapprovedDeliverables.map(d => d.status))];
      return { 
        success: false, 
        error: `Cannot rate creator until all deliverables are approved. Found deliverables with status: ${unapprovedStatuses.join(', ')}` 
      };
    }

    // Update rating
    const { error: updateError } = await supabase
      .from('campaign_applications')
      .update({
        rating: rating,
        rating_comment: comment || null,
        rated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to submit rating' };
  }
}

/**
 * Get average rating for a creator
 * @param creatorId - Creator profile ID
 * @returns Average rating and total count
 */
export async function getCreatorRating(
  creatorId: string
): Promise<{ data: CreatorRating | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('campaign_applications')
      .select('rating')
      .eq('creator_id', creatorId)
      .eq('status', 'accepted')
      .not('rating', 'is', null);

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: { averageRating: null, totalRatings: 0 } };
    }

    const totalRatings = data.length;
    const sum = data.reduce((acc, app) => acc + Number(app.rating), 0);
    const averageRating = Math.round((sum / totalRatings) * 10) / 10; // Round to 1 decimal

    return {
      data: {
        averageRating,
        totalRatings,
      },
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch rating' };
  }
}

/**
 * Check if an application can be rated
 * @param applicationId - Application ID
 * @returns Whether rating is possible and if already rated
 */
export async function canRateApplication(
  applicationId: string
): Promise<{ canRate: boolean; alreadyRated: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('campaign_applications')
      .select('id, status, rating')
      .eq('id', applicationId)
      .single();

    if (error) {
      return { canRate: false, alreadyRated: false, error: error.message };
    }

    if (!data) {
      return { canRate: false, alreadyRated: false, error: 'Application not found' };
    }

    const alreadyRated = !!data.rating;
    
    // Check if application is accepted
    if (data.status !== 'accepted') {
      return { canRate: false, alreadyRated, error: 'Application must be accepted' };
    }

    // Check that ALL deliverables have been approved
    // Rating is the final step - all deliverables must be completed and approved
    const { data: allDeliverables, error: deliverablesError } = await supabase
      .from('campaign_deliverables')
      .select('id, status')
      .eq('campaign_application_id', applicationId);

    if (deliverablesError) {
      return { 
        canRate: false, 
        alreadyRated, 
        error: `Failed to check deliverables: ${deliverablesError.message}` 
      };
    }

    if (!allDeliverables || allDeliverables.length === 0) {
      return { 
        canRate: false, 
        alreadyRated, 
        error: 'Cannot rate creator until deliverables have been submitted and approved' 
      };
    }

    // Check that all deliverables are approved (no pending, rejected, or disputed)
    const unapprovedDeliverables = allDeliverables.filter(
      d => !['approved', 'auto_approved'].includes(d.status)
    );

    if (unapprovedDeliverables.length > 0) {
      const unapprovedStatuses = [...new Set(unapprovedDeliverables.map(d => d.status))];
      return { 
        canRate: false, 
        alreadyRated, 
        error: `All deliverables must be approved before rating. Found deliverables with status: ${unapprovedStatuses.join(', ')}` 
      };
    }

    const canRate = !alreadyRated;
    return { canRate, alreadyRated };
  } catch (error: any) {
    return {
      canRate: false,
      alreadyRated: false,
      error: error.message || 'Failed to check rating status',
    };
  }
}
