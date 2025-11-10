# Task: Deliverable Submission Service Layer

**Epic:** deliverable-submission
**Priority:** P0 - Critical
**Estimate:** 3 days
**Status:** 🟡 Needs Review

---

## Overview

Create the service layer for campaign deliverable submission, review, and payment workflows. Handles all business logic for deliverable lifecycle management.

## Business Value

Provides the API layer for creators to submit deliverables, restaurants to review them, and automated payment processing. Core functionality for the deliverables MVP.

## Acceptance Criteria

```gherkin
Feature: Deliverable Submission Service

  Scenario: Creator submits a deliverable
    Given a creator with an accepted campaign application
    When they call submitDeliverable() with content and metadata
    Then a new deliverable record is created with status "pending_review"
    And the restaurant owner is notified
    And the deliverable ID is returned

  Scenario: Creator saves draft deliverable
    Given a creator wants to save work in progress
    When they call saveDraftDeliverable() with partial data
    Then a deliverable is created with status "draft"
    And they can edit it later

  Scenario: Restaurant owner approves deliverable
    Given a deliverable with status "pending_review"
    When restaurant owner calls approveDeliverable()
    Then deliverable status changes to "approved"
    And payment processing is triggered
    And creator is notified

  Scenario: Restaurant owner rejects deliverable
    Given a deliverable with status "pending_review"
    When restaurant owner calls rejectDeliverable() with reason
    Then deliverable status changes to "rejected"
    And rejection reason is stored
    And creator is notified with feedback

  Scenario: Restaurant requests revision
    Given a deliverable with status "pending_review"
    When restaurant owner calls requestRevision() with notes
    Then deliverable status changes to "revision_requested"
    And revision notes are stored
    And creator is notified

  Scenario: Get pending deliverables for review
    Given multiple deliverables in "pending_review" status
    When restaurant owner calls getPendingDeliverables()
    Then all pending deliverables for their restaurant are returned
    And sorted by submission date (oldest first)

  Scenario: Get creator's deliverables
    Given a creator has submitted multiple deliverables
    When they call getMyDeliverables()
    Then all their deliverables are returned
    And grouped by campaign
    And includes status and payment info
```

## Technical Implementation

### 1. Create `services/deliverableService.ts`

```typescript
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
      // Get campaign application details
      const { data: application, error: appError } = await supabase
        .from('campaign_applications')
        .select('id, campaign_id, creator_id, campaigns!inner(restaurant_id), proposed_rate_cents')
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

      // TODO: Send notification to restaurant owner
      // await notificationService.notifyDeliverableSubmitted(data.id, data.restaurant_id)

      console.log('[DeliverableService] Deliverable submitted:', data.id);
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
      const { data: application, error: appError } = await supabase
        .from('campaign_applications')
        .select('id, campaign_id, creator_id, campaigns!inner(restaurant_id), proposed_rate_cents')
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
      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          payment_status: 'processing',
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error approving deliverable:', error);
        return null;
      }

      // TODO: Trigger payment processing
      // await paymentService.processDeliverablePayment(data.id)

      // TODO: Notify creator
      // await notificationService.notifyDeliverableApproved(data.id, data.creator_id)

      console.log('[DeliverableService] Deliverable approved:', data.id);
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
      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error rejecting deliverable:', error);
        return null;
      }

      // TODO: Notify creator with rejection reason
      // await notificationService.notifyDeliverableRejected(data.id, data.creator_id, rejectionReason)

      console.log('[DeliverableService] Deliverable rejected:', data.id);
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
      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          status: 'revision_requested',
          reviewed_at: new Date().toISOString(),
          revision_notes: revisionNotes,
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error requesting revision:', error);
        return null;
      }

      // TODO: Notify creator with revision notes
      // await notificationService.notifyRevisionRequested(data.id, data.creator_id, revisionNotes)

      console.log('[DeliverableService] Revision requested:', data.id);
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

      return (
        data?.map((d) => ({
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
        })) || []
      );
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

      return (
        data?.map((d) => ({
          ...d,
          campaign: {
            id: d.campaigns.id,
            name: d.campaigns.name,
            restaurant_name: d.campaigns.restaurants.name,
          },
        })) || []
      );
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
      // Calculate engagement rate if we have the data
      let engagement_rate: number | undefined;
      if (metrics.views_count && metrics.views_count > 0) {
        const total_engagement =
          (metrics.likes_count || 0) +
          (metrics.comments_count || 0) +
          (metrics.shares_count || 0);
        engagement_rate = (total_engagement / metrics.views_count) * 100;
      }

      const { data, error } = await supabase
        .from('campaign_deliverables')
        .update({
          ...metrics,
          engagement_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableId)
        .select()
        .single();

      if (error) {
        console.error('[DeliverableService] Error updating metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[DeliverableService] Unexpected error:', error);
      return null;
    }
  }
}

export const deliverableService = new DeliverableService();
```

## Files to Create/Modify

- ✅ `services/deliverableService.ts` - New service file

## Dependencies

- ✅ task-cd-001-deliverable-submission-schema.md (Database schema must be created first)
- 🔴 Payment service integration (future task)
- 🔴 Notification service integration (future task)

## Definition of Done

- [ ] `deliverableService.ts` created with all methods
- [ ] All CRUD operations tested manually
- [ ] Service handles errors gracefully
- [ ] TypeScript types exported correctly
- [ ] Console logging implemented for debugging
- [ ] Service documented with JSDoc comments
- [ ] Tested with both creator and restaurant roles
- [ ] RLS policies verified (creators can only access their deliverables)
- [ ] Added to `services/CLAUDE.md` documentation

## Related Tasks

- task-cd-001-deliverable-submission-schema.md (Prerequisites)
- task-cd-003-creator-deliverable-ui.md (Consumes this service)
- task-cd-004-restaurant-review-dashboard.md (Consumes this service)
- task-cd-006-auto-approval-cron.md (Uses auto-approval function)
- task-cd-007-payment-processing.md (Payment integration)
