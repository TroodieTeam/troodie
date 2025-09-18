import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

/**
 * Restaurant Claim Service
 * Handles restaurant claiming workflow with pending state review
 * Task: PS-004
 */

export interface SubmitClaimRequest {
  restaurant_id: string;
  ownership_proof_type: 'business_license' | 'utility_bill' | 'lease' | 'domain_match' | 'other';
  ownership_proof_url?: string;
  business_email?: string;
  business_phone?: string;
  additional_notes?: string;
}

export interface ClaimStatusResponse {
  claim_id: string;
  restaurant_name: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  review_notes?: string;
  can_resubmit: boolean;
}

class RestaurantClaimService {
  /**
   * Submit a new restaurant claim
   * Creates a claim in pending state for admin review
   */
  async submitRestaurantClaim(request: SubmitClaimRequest) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Check for existing claims by this user for this restaurant
      const { data: existingClaim, error: checkError } = await supabase
        .from('restaurant_claims')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('restaurant_id', request.restaurant_id)
        .in('status', ['pending', 'approved'])
        .single();

      if (existingClaim && !checkError) {
        if (existingClaim.status === 'pending') {
          throw new Error('You already have a pending claim for this restaurant');
        }
        if (existingClaim.status === 'approved') {
          throw new Error('You have already claimed this restaurant');
        }
      }

      // Check if restaurant is already claimed by someone else
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, owner_id')
        .eq('id', request.restaurant_id)
        .single();

      if (restaurantError) {
        throw new Error('Restaurant not found');
      }

      if (restaurant.owner_id) {
        throw new Error('This restaurant has already been claimed by another user');
      }

      // Get user profile for email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      // Create the claim in pending state
      const { data: claim, error: claimError } = await supabase
        .from('restaurant_claims')
        .insert({
          user_id: user.id,
          restaurant_id: request.restaurant_id,
          status: 'pending',
          email: request.business_email || userProfile?.email || user.email,
          ownership_proof_type: request.ownership_proof_type,
          ownership_proof_url: request.ownership_proof_url,
          business_phone: request.business_phone,
          additional_notes: request.additional_notes,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (claimError) {
        console.error('Error creating claim:', claimError);
        throw new Error('Failed to submit claim. Please try again.');
      }

      return {
        claim_id: claim.id,
        restaurant_name: restaurant.name,
        status: 'pending' as const,
        submitted_at: claim.submitted_at,
        estimated_review_time: '24-48 hours',
        message: 'Your claim has been submitted and is pending review.'
      };
    } catch (error) {
      console.error('RestaurantClaimService.submitClaim error:', error);
      throw error;
    }
  }

  /**
   * Get the status of a specific claim
   */
  async getClaimStatus(claimId: string): Promise<ClaimStatusResponse> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const { data: claim, error } = await supabase
        .from('restaurant_claims')
        .select(`
          *,
          restaurant:restaurants(name, address, cuisine_type)
        `)
        .eq('id', claimId)
        .eq('user_id', user.id)
        .single();

      if (error || !claim) {
        throw new Error('Claim not found');
      }

      return {
        claim_id: claim.id,
        restaurant_name: claim.restaurant.name,
        status: claim.status,
        submitted_at: claim.submitted_at,
        reviewed_at: claim.reviewed_at,
        rejection_reason: claim.rejection_reason,
        review_notes: claim.review_notes,
        can_resubmit: claim.can_resubmit ?? true
      };
    } catch (error) {
      console.error('RestaurantClaimService.getClaimStatus error:', error);
      throw error;
    }
  }

  /**
   * Get all claims for the current user
   */
  async getMyRestaurantClaims() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const { data: claims, error } = await supabase
        .from('restaurant_claims')
        .select(`
          id,
          status,
          submitted_at,
          reviewed_at,
          rejection_reason,
          can_resubmit,
          restaurant:restaurants(id, name, address, cuisine_type)
        `)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching claims:', error);
        throw new Error('Failed to fetch claims');
      }

      return {
        claims: claims || [],
        total: claims?.length || 0
      };
    } catch (error) {
      console.error('RestaurantClaimService.getMyClaims error:', error);
      throw error;
    }
  }

  /**
   * Check if user can claim a specific restaurant
   */
  async canClaimRestaurant(restaurantId: string): Promise<{
    canClaim: boolean;
    reason?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { canClaim: false, reason: 'Not authenticated' };
      }

      // Check if restaurant exists and is not already claimed
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, owner_id')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurant) {
        return { canClaim: false, reason: 'Restaurant not found' };
      }

      if (restaurant.owner_id) {
        return { canClaim: false, reason: 'Restaurant already claimed' };
      }

      // Check for existing pending or approved claims by this user
      const { data: existingClaim } = await supabase
        .from('restaurant_claims')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'approved'])
        .single();

      if (existingClaim) {
        if (existingClaim.status === 'pending') {
          return { canClaim: false, reason: 'You have a pending claim for this restaurant' };
        }
        if (existingClaim.status === 'approved') {
          return { canClaim: false, reason: 'You have already claimed this restaurant' };
        }
      }

      return { canClaim: true };
    } catch (error) {
      console.error('RestaurantClaimService.canClaimRestaurant error:', error);
      return { canClaim: false, reason: 'Error checking claim eligibility' };
    }
  }

  /**
   * Upload ownership proof document
   */
  async uploadOwnershipProof(file: any): Promise<string> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}_ownership_proof`;
      const { data, error } = await supabase.storage
        .from('ownership-proofs')
        .upload(fileName, file);

      if (error) {
        throw new Error('Failed to upload proof document');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('ownership-proofs')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('RestaurantClaimService.uploadOwnershipProof error:', error);
      throw error;
    }
  }

  /**
   * Withdraw a pending claim
   */
  async withdrawClaim(claimId: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('restaurant_claims')
        .delete()
        .eq('id', claimId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        throw new Error('Failed to withdraw claim');
      }
    } catch (error) {
      console.error('RestaurantClaimService.withdrawClaim error:', error);
      throw error;
    }
  }
}

export const restaurantClaimService = new RestaurantClaimService();