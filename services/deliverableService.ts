import { supabase } from '@/lib/supabase';

export interface Deliverable {
  id: string;
  campaign_application_id: string;
  creator_id: string;
  restaurant_id: string;
  campaign_id: string;
  content_type: 'photo' | 'video' | 'reel' | 'story' | 'post';
  content_url: string;
  thumbnail_url?: string;
  caption?: string;
  social_platform?: string;
  platform_post_url?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  engagement_rate?: number;
  status: DeliverableStatus;
  submitted_at?: string;
  reviewed_at?: string;
  reviewer_id?: string;
  auto_approved_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  revision_notes?: string;
  payment_status: PaymentStatus;
  payment_amount_cents?: number;
  payment_transaction_id?: string;
  paid_at?: string;
  payment_error?: string;
  payment_retry_count?: number;
  last_payment_retry_at?: string;
  dispute_status?: DisputeStatus;
  dispute_reason?: string;
  dispute_filed_at?: string;
  dispute_resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export type DeliverableStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'auto_approved'
  | 'rejected'
  | 'revision_requested'
  | 'disputed';

export type PaymentStatus =
  | 'pending'
  | 'pending_onboarding'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'disputed'
  | 'refunded';

export type DisputeStatus =
  | 'none'
  | 'creator_disputed'
  | 'restaurant_disputed'
  | 'under_review'
  | 'resolved';

export interface SubmitDeliverableInput {
  campaign_application_id: string;
  content_type: Deliverable['content_type'];
  content_url: string;
  thumbnail_url?: string;
  caption?: string;
  social_platform?: string;
  platform_post_url?: string;
}

export interface DeliverableWithDetails extends Deliverable {
  campaign?: {
    id: string;
    name: string;
    restaurant_name: string;
  };
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

class DeliverableService {
  /**
   * Submit a deliverable for review
   */
  async submitDeliverable(input: SubmitDeliverableInput): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Submitting deliverable:', input.campaign_application_id);

      // Get campaign application details
      const { data: application, error: appError } = await supabase
        .from('campaign_applications')
        .select(`
          id,
          campaign_id,
          creator_id,
          proposed_rate_cents,
          campaigns!inner(restaurant_id)
        `)
        .eq('id', input.campaign_application_id)
        .single();

      if (appError || !application) {
        console.error('[DeliverableService] Application not found:', appError);
        return null;
      }

      // Create deliverable
      const { data, error } = await supabase
        .from('campaign_deliverables')
        .insert({
          campaign_application_id: input.campaign_application_id,
          creator_id: application.creator_id,
          restaurant_id: application.campaigns.restaurant_id,
          campaign_id: application.campaign_id,
          content_type: input.content_type,
          content_url: input.content_url,
          thumbnail_url: input.thumbnail_url,
          caption: input.caption,
          social_platform: input.social_platform,
          platform_post_url: input.platform_post_url,
          payment_amount_cents: application.proposed_rate_cents,
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error submitting deliverable:', error);
        return null;
      }

      console.log('[DeliverableService] Deliverable submitted successfully:', data.id);
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Save deliverable as draft
   */
  async saveDraftDeliverable(input: SubmitDeliverableInput): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Saving draft deliverable');

      const { data: application, error: appError } = await supabase
        .from('campaign_applications')
        .select(`
          id,
          campaign_id,
          creator_id,
          proposed_rate_cents,
          campaigns!inner(restaurant_id)
        `)
        .eq('id', input.campaign_application_id)
        .single();

      if (appError || !application) {
        console.error('[DeliverableService] Application not found:', appError);
        return null;
      }

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .insert({
          campaign_application_id: input.campaign_application_id,
          creator_id: application.creator_id,
          restaurant_id: application.campaigns.restaurant_id,
          campaign_id: application.campaign_id,
          content_type: input.content_type,
          content_url: input.content_url,
          thumbnail_url: input.thumbnail_url,
          caption: input.caption,
          social_platform: input.social_platform,
          platform_post_url: input.platform_post_url,
          payment_amount_cents: application.proposed_rate_cents,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error saving draft:', error);
        return null;
      }

      console.log('[DeliverableService] Draft saved successfully:', data.id);
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Update draft deliverable
   */
  async updateDraftDeliverable(
    deliverableId: string,
    updates: Partial<SubmitDeliverableInput>
  ): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Updating draft deliverable:', deliverableId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error updating draft:', error);
        return null;
      }

      console.log('[DeliverableService] Draft updated successfully');
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Approve a deliverable
   */
  async approveDeliverable(
    deliverableId: string,
    reviewNotes?: string
  ): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Approving deliverable:', deliverableId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          payment_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error approving deliverable:', error);
        return null;
      }

      console.log('[DeliverableService] Deliverable approved successfully');
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Reject a deliverable
   */
  async rejectDeliverable(
    deliverableId: string,
    rejectionReason: string
  ): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Rejecting deliverable:', deliverableId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error rejecting deliverable:', error);
        return null;
      }

      console.log('[DeliverableService] Deliverable rejected successfully');
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Request revision on a deliverable
   */
  async requestRevision(
    deliverableId: string,
    revisionNotes: string
  ): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Requesting revision:', deliverableId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          status: 'revision_requested',
          reviewed_at: new Date().toISOString(),
          revision_notes: revisionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error requesting revision:', error);
        return null;
      }

      console.log('[DeliverableService] Revision requested successfully');
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Get pending deliverables for a restaurant to review
   */
  async getPendingDeliverables(restaurantId: string): Promise<DeliverableWithDetails[]> {
    try {
      console.log('[DeliverableService] Fetching pending deliverables for restaurant:', restaurantId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .select(`
          *,
          campaigns!inner(id, name, restaurants!inner(name)),
          creator_profiles!inner(id, display_name, avatar_url)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('[DeliverableService] Error fetching pending deliverables:', error);
        return [];
      }

      const mapped = data?.map((d: any) => ({
        ...d,
        campaign: {
          id: d.campaigns.id,
          name: d.campaigns.name,
          restaurant_name: d.campaigns.restaurants.name,
        },
        creator: {
          id: d.creator_profiles.id,
          display_name: d.creator_profiles.display_name,
          avatar_url: d.creator_profiles.avatar_url,
        },
      })) || [];

      console.log(`[DeliverableService] Found ${mapped.length} pending deliverables`);
      return mapped;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return [];
    }
  }

  /**
   * Get all deliverables for a creator
   */
  async getMyDeliverables(creatorId: string): Promise<DeliverableWithDetails[]> {
    try {
      console.log('[DeliverableService] Fetching deliverables for creator:', creatorId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .select(`
          *,
          campaigns!inner(id, name, restaurants!inner(name))
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DeliverableService] Error fetching creator deliverables:', error);
        return [];
      }

      const mapped = data?.map((d: any) => ({
        ...d,
        campaign: {
          id: d.campaigns.id,
          name: d.campaigns.name,
          restaurant_name: d.campaigns.restaurants.name,
        },
      })) || [];

      console.log(`[DeliverableService] Found ${mapped.length} deliverables for creator`);
      return mapped;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return [];
    }
  }

  /**
   * Get deliverable by ID with full details
   */
  async getDeliverableById(deliverableId: string): Promise<DeliverableWithDetails | null> {
    try {
      console.log('[DeliverableService] Fetching deliverable:', deliverableId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .select(`
          *,
          campaigns!inner(id, name, restaurants!inner(name)),
          creator_profiles!inner(id, display_name, avatar_url)
        `)
        .eq('id', deliverableId)
        .single();

      if (error) {
        console.error('[DeliverableService] Error fetching deliverable:', error);
        return null;
      }

      return {
        ...data,
        campaign: {
          id: data.campaigns.id,
          name: data.campaigns.name,
          restaurant_name: data.campaigns.restaurants.name,
        },
        creator: {
          id: data.creator_profiles.id,
          display_name: data.creator_profiles.display_name,
          avatar_url: data.creator_profiles.avatar_url,
        },
      };
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Update deliverable metrics (views, likes, etc.)
   */
  async updateMetrics(
    deliverableId: string,
    metrics: {
      views_count?: number;
      likes_count?: number;
      comments_count?: number;
      shares_count?: number;
    }
  ): Promise<Deliverable | null> {
    try {
      console.log('[DeliverableService] Updating metrics for deliverable:', deliverableId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          ...metrics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error updating metrics:', error);
        return null;
      }

      console.log('[DeliverableService] Metrics updated successfully');
      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Get deliverables by campaign ID
   */
  async getDeliverablesByCampaign(campaignId: string): Promise<DeliverableWithDetails[]> {
    try {
      console.log('[DeliverableService] Fetching deliverables for campaign:', campaignId);

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .select(`
          *,
          campaigns!inner(id, name, restaurants!inner(name)),
          creator_profiles!inner(id, display_name, avatar_url)
        `)
        .eq('campaign_id', campaignId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('[DeliverableService] Error fetching campaign deliverables:', error);
        return [];
      }

      return data?.map((d: any) => ({
        ...d,
        campaign: {
          id: d.campaigns.id,
          name: d.campaigns.name,
          restaurant_name: d.campaigns.restaurants.name,
        },
        creator: {
          id: d.creator_profiles.id,
          display_name: d.creator_profiles.display_name,
          avatar_url: d.creator_profiles.avatar_url,
        },
      })) || [];
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return [];
    }
  }
}

export const deliverableService = new DeliverableService();
