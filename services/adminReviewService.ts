import { supabase } from '@/lib/supabase';

/**
 * Admin Review Service
 * Handles admin review operations for pending claims and applications
 * Task: PS-006
 */

export interface PendingReviewItem {
  id: string;
  type: 'restaurant_claim' | 'creator_application';
  user_id: string;
  user_name: string;
  user_email: string;
  submitted_at: string;
  status: string;
  details: Record<string, any>;
}

export interface ReviewActionRequest {
  review_notes?: string;
  auto_notify?: boolean;
}

export interface ApproveRequest extends ReviewActionRequest {
  // Additional approval-specific fields can go here
}

export interface RejectRequest extends ReviewActionRequest {
  rejection_reason: string;
  allow_resubmit?: boolean;
}

class AdminReviewService {
  // Admin user IDs
  private readonly ADMIN_USER_IDS = [
    'b08d9600-358d-4be9-9552-4607d9f50227',
    '31744191-f7c0-44a4-8673-10b34ccbb87f'
  ];

  /**
   * Check if current user is admin
   */
  private async requireAdmin(): Promise<boolean> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');

    // Check if user is in the admin list
    if (!this.ADMIN_USER_IDS.includes(user.id)) {
      throw new Error('Admin access required');
    }

    return true;
  }

  /**
   * Get all pending review items
   */
  async getPendingReviews(filters?: {
    type?: 'restaurant_claim' | 'creator_application' | 'all';
    page?: number;
    limit?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }) {
    try {
      await this.requireAdmin();

      const limit = filters?.limit || 20;
      const offset = ((filters?.page || 1) - 1) * limit;

      let query = supabase
        .from('pending_review_queue')
        .select('*', { count: 'exact' });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data, error, count } = await query
        .order(filters?.sort_by || 'submitted_at', { ascending: filters?.order === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching pending reviews:', error);
        throw new Error('Failed to fetch pending reviews');
      }

      return {
        items: data || [],
        total: count || 0,
        page: filters?.page || 1,
        total_pages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('AdminReviewService.getPendingReviews error:', error);
      throw error;
    }
  }

  /**
   * Get a specific review item
   */
  async getReviewItem(itemId: string, type: 'restaurant_claim' | 'creator_application') {
    try {
      await this.requireAdmin();

      if (type === 'restaurant_claim') {
        const { data, error } = await supabase
          .from('restaurant_claims')
          .select(`
            *,
            user:users(id, name, email, phone, created_at),
            restaurant:restaurants(*)
          `)
          .eq('id', itemId)
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('creator_applications')
          .select(`
            *,
            user:users(id, name, email, phone, created_at)
          `)
          .eq('id', itemId)
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('AdminReviewService.getReviewItem error:', error);
      throw error;
    }
  }

  /**
   * Approve a restaurant claim
   */
  async approveRestaurantClaim(claimId: string, request: ApproveRequest) {
    try {
      await this.requireAdmin();

      const { data: { user: admin } } = await supabase.auth.getUser();

      console.log('[AdminReviewService] Approving restaurant claim:', {
        claimId,
        adminId: admin?.id,
      });

      // Get the claim details
      const { data: claim, error: claimError } = await supabase
        .from('restaurant_claims')
        .select('*, restaurant:restaurants(*)')
        .eq('id', claimId)
        .single();

      console.log('[AdminReviewService] Claim query result:', {
        claim,
        claimError,
        errorCode: claimError?.code,
        errorMessage: claimError?.message,
        errorDetails: claimError?.details,
        errorHint: claimError?.hint,
      });

      if (claimError) {
        console.error('[AdminReviewService] Claim query error:', claimError);
        throw new Error(`Claim not found: ${claimError.message} (Code: ${claimError.code})`);
      }

      if (!claim) {
        throw new Error('Claim not found - no data returned');
      }

      if (claim.status !== 'pending') {
        throw new Error('Claim is not pending review');
      }

      // Start transaction-like operations
      // 1. Update claim status
      // Note: restaurant_claims uses 'verified' not 'approved' per schema constraint
      const { error: updateClaimError } = await supabase
        .from('restaurant_claims')
        .update({
          status: 'verified',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin?.id,
          review_notes: request.review_notes
        })
        .eq('id', claimId);

      if (updateClaimError) throw updateClaimError;

      // 2. Link restaurant to user
      console.log('[AdminReviewService] Updating restaurant ownership:', {
        restaurantId: claim.restaurant_id,
        userId: claim.user_id,
      });

      const { error: updateRestaurantError, data: restaurantUpdateData } = await supabase
        .from('restaurants')
        .update({
          owner_id: claim.user_id,
          is_claimed: true
        })
        .eq('id', claim.restaurant_id)
        .select();

      console.log('[AdminReviewService] Restaurant update result:', {
        error: updateRestaurantError,
        data: restaurantUpdateData,
        errorCode: updateRestaurantError?.code,
        errorMessage: updateRestaurantError?.message,
      });

      if (updateRestaurantError) {
        console.error('[AdminReviewService] Failed to update restaurant:', updateRestaurantError);
        throw updateRestaurantError;
      }

      // 3. Update user profile to restaurant owner
      console.log('[AdminReviewService] Updating user account type:', {
        userId: claim.user_id,
      });

      const { error: updateUserError, data: userUpdateData } = await supabase
        .from('users')
        .update({
          is_restaurant: true,
          account_type: 'business'
        })
        .eq('id', claim.user_id)
        .select();

      console.log('[AdminReviewService] User update result:', {
        error: updateUserError,
        data: userUpdateData,
        errorCode: updateUserError?.code,
        errorMessage: updateUserError?.message,
      });

      if (updateUserError) {
        console.error('[AdminReviewService] Failed to update user:', updateUserError);
        throw updateUserError;
      }

      // 4. Create business profile if doesn't exist
      console.log('[AdminReviewService] Checking business profile:', {
        userId: claim.user_id,
      });

      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', claim.user_id)
        .single();

      console.log('[AdminReviewService] Business profile check:', {
        existingProfile,
        error: profileCheckError,
      });

      if (!existingProfile) {
        console.log('[AdminReviewService] Creating business profile:', {
          userId: claim.user_id,
          restaurantId: claim.restaurant_id,
          email: claim.email,
        });

        const { error: insertProfileError, data: insertProfileData } = await supabase
          .from('business_profiles')
          .insert({
            user_id: claim.user_id,
            restaurant_id: claim.restaurant_id,
            verification_status: 'verified',
            business_email: claim.email
          })
          .select();

        console.log('[AdminReviewService] Business profile insert result:', {
          error: insertProfileError,
          data: insertProfileData,
          errorCode: insertProfileError?.code,
          errorMessage: insertProfileError?.message,
        });

        if (insertProfileError) {
          console.error('[AdminReviewService] Failed to create business profile:', insertProfileError);
          // Don't throw - this is not critical, profile can be created later
        }
      }

      // TODO: Notifications temporarily disabled - see engineering request ER-001
      // Notification system needs RLS audit and fixes before re-enabling
      // if (request.auto_notify !== false) {
      //   try {
      //     await statusNotificationService.notifyStatusChange({
      //       userId: claim.user_id,
      //       submissionId: claimId,
      //       submissionType: 'restaurant_claim',
      //       newStatus: 'verified',
      //       restaurantName: claim.restaurant?.name,
      //       reviewNotes: request.review_notes
      //     });
      //   } catch (error: any) {
      //     console.warn('[AdminReviewService] Notification failed (non-critical):', {
      //       error: error.message,
      //       userId: claim.user_id,
      //       claimId: claimId,
      //     });
      //   }
      // }

      return {
        success: true,
        message: 'Restaurant claim approved successfully',
        processed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('AdminReviewService.approveRestaurantClaim error:', error);
      throw error;
    }
  }

  /**
   * Approve a creator application
   */
  async approveCreatorApplication(applicationId: string, request: ApproveRequest) {
    try {
      await this.requireAdmin();

      const { data: { user: admin } } = await supabase.auth.getUser();

      // Get the application details
      const { data: application, error: appError } = await supabase
        .from('creator_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError || !application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'pending') {
        throw new Error('Application is not pending review');
      }

      // 1. Update application status
      const { error: updateAppError } = await supabase
        .from('creator_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin?.id,
          review_notes: request.review_notes
        })
        .eq('id', applicationId);

      if (updateAppError) throw updateAppError;

      // 2. Update user to creator
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          is_creator: true,
          account_type: 'creator'
        })
        .eq('id', application.user_id);

      if (updateUserError) throw updateUserError;

      // 3. Create creator profile
      const { error: createProfileError } = await supabase
        .from('creator_profiles')
        .insert({
          user_id: application.user_id,
          instagram_handle: application.instagram_handle,
          tiktok_handle: application.tiktok_handle,
          youtube_handle: application.youtube_handle,
          twitter_handle: application.twitter_handle,
          follower_count: application.follower_count,
          bio: application.bio,
          content_categories: application.content_categories,
          preferred_cuisines: application.preferred_cuisine_types
        });

      if (createProfileError && !createProfileError.message.includes('duplicate')) {
        console.error('Error creating creator profile:', createProfileError);
      }

      // TODO: Notifications temporarily disabled - see engineering request ER-001
      // Notification system needs RLS audit and fixes before re-enabling
      // if (request.auto_notify !== false) {
      //   try {
      //     await statusNotificationService.notifyStatusChange({
      //       userId: application.user_id,
      //       submissionId: applicationId,
      //       submissionType: 'creator_application',
      //       newStatus: 'approved',
      //       reviewNotes: request.review_notes
      //     });
      //   } catch (error) {
      //     console.error('Error sending notification:', error);
      //   }
      // }

      return {
        success: true,
        message: 'Creator application approved successfully',
        processed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('AdminReviewService.approveCreatorApplication error:', error);
      throw error;
    }
  }

  /**
   * Reject a restaurant claim
   */
  async rejectRestaurantClaim(claimId: string, request: RejectRequest) {
    try {
      await this.requireAdmin();

      if (!request.rejection_reason) {
        throw new Error('Rejection reason is required');
      }

      const { data: { user: admin } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('restaurant_claims')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin?.id,
          rejection_reason: request.rejection_reason,
          review_notes: request.review_notes,
          can_resubmit: request.allow_resubmit !== false
        })
        .eq('id', claimId)
        .eq('status', 'pending');

      if (error) {
        throw new Error('Failed to reject claim');
      }

      return {
        success: true,
        message: 'Restaurant claim rejected',
        processed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('AdminReviewService.rejectRestaurantClaim error:', error);
      throw error;
    }
  }

  /**
   * Reject a creator application
   */
  async rejectCreatorApplication(applicationId: string, request: RejectRequest) {
    try {
      await this.requireAdmin();

      if (!request.rejection_reason) {
        throw new Error('Rejection reason is required');
      }

      const { data: { user: admin } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('creator_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin?.id,
          rejection_reason: request.rejection_reason,
          review_notes: request.review_notes,
          can_resubmit: request.allow_resubmit !== false
        })
        .eq('id', applicationId)
        .eq('status', 'pending');

      if (error) {
        throw new Error('Failed to reject application');
      }

      return {
        success: true,
        message: 'Creator application rejected',
        processed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('AdminReviewService.rejectCreatorApplication error:', error);
      throw error;
    }
  }

  /**
   * Bulk approve items
   */
  async bulkApprove(ids: string[], type: 'restaurant_claim' | 'creator_application', notes?: string) {
    try {
      await this.requireAdmin();

      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [] as { id: string; error: string }[]
      };

      for (const id of ids) {
        try {
          if (type === 'restaurant_claim') {
            await this.approveRestaurantClaim(id, { review_notes: notes });
          } else {
            await this.approveCreatorApplication(id, { review_notes: notes });
          }
          results.succeeded++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            id,
            error: error.message || 'Unknown error'
          });
        }
        results.processed++;
      }

      return results;
    } catch (error) {
      console.error('AdminReviewService.bulkApprove error:', error);
      throw error;
    }
  }

  /**
   * Bulk reject items
   */
  async bulkReject(
    ids: string[],
    type: 'restaurant_claim' | 'creator_application',
    rejection_reason: string,
    notes?: string
  ) {
    try {
      await this.requireAdmin();

      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [] as { id: string; error: string }[]
      };

      for (const id of ids) {
        try {
          if (type === 'restaurant_claim') {
            await this.rejectRestaurantClaim(id, {
              rejection_reason,
              review_notes: notes
            });
          } else {
            await this.rejectCreatorApplication(id, {
              rejection_reason,
              review_notes: notes
            });
          }
          results.succeeded++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            id,
            error: error.message || 'Unknown error'
          });
        }
        results.processed++;
      }

      return results;
    } catch (error) {
      console.error('AdminReviewService.bulkReject error:', error);
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStatistics(dateRange?: { start: string; end: string }) {
    try {
      await this.requireAdmin();

      let query = supabase.from('review_statistics').select('*');

      if (dateRange) {
        query = query
          .gte('review_date', dateRange.start)
          .lte('review_date', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Failed to fetch review statistics');
      }

      return data || [];
    } catch (error) {
      console.error('AdminReviewService.getReviewStatistics error:', error);
      throw error;
    }
  }

  /**
   * Get review logs for audit
   */
  async getReviewLogs(filters?: {
    entity_type?: string;
    entity_id?: string;
    actor_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      await this.requireAdmin();

      let query = supabase
        .from('review_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      if (filters?.actor_id) {
        query = query.eq('actor_id', filters.actor_id);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Failed to fetch review logs');
      }

      return data || [];
    } catch (error) {
      console.error('AdminReviewService.getReviewLogs error:', error);
      throw error;
    }
  }
}

export const adminReviewService = new AdminReviewService();