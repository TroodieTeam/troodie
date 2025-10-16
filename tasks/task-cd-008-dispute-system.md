# Task: Deliverable Dispute System

**Epic:** trust-safety
**Priority:** P2 - Medium
**Estimate:** 4 days
**Status:** 🔴 Not Started

---

## Overview

Implement dispute resolution system for deliverable conflicts between creators and restaurants. Handles dispute filing, admin review, evidence submission, and resolution.

## Business Value

Provides fair conflict resolution mechanism, builds trust in marketplace, protects both creators and restaurants. Essential for long-term platform health.

## Acceptance Criteria

```gherkin
Feature: Deliverable Dispute System

  Scenario: Creator disputes rejection
    Given a deliverable with status "rejected"
    When creator files a dispute with reason
    Then deliverable dispute_status changes to "creator_disputed"
    And admin team is notified
    And restaurant is notified
    And payment is held

  Scenario: Restaurant disputes auto-approved deliverable
    Given a deliverable with status "auto_approved"
    When restaurant files dispute within 7 days
    Then deliverable dispute_status changes to "restaurant_disputed"
    And payment is paused/reversed
    And creator is notified
    And admin team reviews

  Scenario: Admin reviews dispute
    Given a dispute under review
    When admin reviews evidence from both parties
    And makes a decision (favor creator/restaurant)
    Then dispute_status changes to "resolved"
    And appropriate action taken (payment/refund)
    And both parties notified of decision

  Scenario: Creator submits evidence
    Given an active dispute
    When creator uploads additional evidence
    Then evidence is attached to dispute
    And admin can review all materials

  Scenario: Dispute escalation
    Given a dispute unresolved for 7 days
    When escalation check runs
    Then senior admin is notified
    And dispute is marked urgent
```

## Technical Implementation

### 1. Extend Database Schema

Already added in task-cd-001, but create dispute details table:

```sql
CREATE TABLE deliverable_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID REFERENCES campaign_deliverables(id) ON DELETE CASCADE NOT NULL,
  filed_by VARCHAR(20) NOT NULL CHECK (filed_by IN ('creator', 'restaurant')),
  filed_by_user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Dispute details
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[], -- Array of evidence image/video URLs

  -- Status
  status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'under_investigation',
    'resolved_creator',
    'resolved_restaurant',
    'resolved_split',
    'dismissed'
  )),

  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolution_action VARCHAR(50), -- 'payment_creator', 'refund_restaurant', 'split_payment', 'no_action'

  -- Payment adjustments
  original_amount_cents INTEGER,
  adjusted_amount_cents INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disputes_deliverable ON deliverable_disputes(deliverable_id);
CREATE INDEX idx_disputes_status ON deliverable_disputes(status);
CREATE INDEX idx_disputes_created ON deliverable_disputes(created_at);

-- Dispute messages/communications
CREATE TABLE dispute_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES deliverable_disputes(id) ON DELETE CASCADE NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('creator', 'restaurant', 'admin')),

  message TEXT NOT NULL,
  attachments TEXT[], -- URLs to attached files

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dispute_messages_dispute ON dispute_messages(dispute_id, created_at);
```

### 2. Create Dispute Service (`services/disputeService.ts`)

```typescript
import { supabase } from '@/lib/supabase';

export interface Dispute {
  id: string;
  deliverable_id: string;
  filed_by: 'creator' | 'restaurant';
  filed_by_user_id: string;
  reason: string;
  description?: string;
  evidence_urls?: string[];
  status: DisputeStatus;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  resolution_action?: ResolutionAction;
  original_amount_cents?: number;
  adjusted_amount_cents?: number;
  created_at: string;
  updated_at: string;
}

export type DisputeStatus =
  | 'pending_review'
  | 'under_investigation'
  | 'resolved_creator'
  | 'resolved_restaurant'
  | 'resolved_split'
  | 'dismissed';

export type ResolutionAction =
  | 'payment_creator'
  | 'refund_restaurant'
  | 'split_payment'
  | 'no_action';

class DisputeService {
  /**
   * File a dispute on a deliverable
   */
  async fileDispute(
    deliverableId: string,
    filedBy: 'creator' | 'restaurant',
    userId: string,
    reason: string,
    description?: string,
    evidenceUrls?: string[]
  ): Promise<Dispute | null> {
    try {
      // Get deliverable details
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select('payment_amount_cents, status')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return null;

      // Create dispute
      const { data: dispute, error } = await supabase
        .from('deliverable_disputes')
        .insert({
          deliverable_id: deliverableId,
          filed_by: filedBy,
          filed_by_user_id: userId,
          reason,
          description,
          evidence_urls: evidenceUrls,
          original_amount_cents: deliverable.payment_amount_cents,
        })
        .select()
        .single();

      if (error) {
        console.error('[DisputeService] Error filing dispute:', error);
        return null;
      }

      // Update deliverable dispute status
      await supabase
        .from('campaign_deliverables')
        .update({
          dispute_status: `${filedBy}_disputed`,
          dispute_filed_at: new Date().toISOString(),
        })
        .eq('id', deliverableId);

      // If payment was completed, pause it
      if (deliverable.status === 'auto_approved' || deliverable.status === 'approved') {
        await supabase
          .from('campaign_deliverables')
          .update({ payment_status: 'disputed' })
          .eq('id', deliverableId);
      }

      // TODO: Notify admin team
      // TODO: Notify other party

      console.log('[DisputeService] Dispute filed:', dispute.id);
      return dispute;
    } catch (error) {
      console.error('[DisputeService] Error:', error);
      return null;
    }
  }

  /**
   * Add evidence to existing dispute
   */
  async addEvidence(
    disputeId: string,
    userId: string,
    evidenceUrls: string[]
  ): Promise<boolean> {
    try {
      const { data: dispute } = await supabase
        .from('deliverable_disputes')
        .select('evidence_urls')
        .eq('id', disputeId)
        .single();

      if (!dispute) return false;

      const updatedUrls = [...(dispute.evidence_urls || []), ...evidenceUrls];

      const { error } = await supabase
        .from('deliverable_disputes')
        .update({ evidence_urls: updatedUrls })
        .eq('id', disputeId);

      return !error;
    } catch (error) {
      console.error('[DisputeService] Error adding evidence:', error);
      return false;
    }
  }

  /**
   * Resolve dispute (admin only)
   */
  async resolveDispute(
    disputeId: string,
    adminUserId: string,
    resolution: {
      status: DisputeStatus;
      action: ResolutionAction;
      notes: string;
      adjustedAmountCents?: number;
    }
  ): Promise<boolean> {
    try {
      const { data: dispute } = await supabase
        .from('deliverable_disputes')
        .select('deliverable_id, original_amount_cents')
        .eq('id', disputeId)
        .single();

      if (!dispute) return false;

      // Update dispute
      await supabase
        .from('deliverable_disputes')
        .update({
          status: resolution.status,
          resolved_by: adminUserId,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution.notes,
          resolution_action: resolution.action,
          adjusted_amount_cents: resolution.adjustedAmountCents,
        })
        .eq('id', disputeId);

      // Update deliverable based on resolution
      await supabase
        .from('campaign_deliverables')
        .update({
          dispute_status: 'resolved',
          dispute_resolved_at: new Date().toISOString(),
        })
        .eq('id', dispute.deliverable_id);

      // Handle payment based on resolution action
      switch (resolution.action) {
        case 'payment_creator':
          await supabase
            .from('campaign_deliverables')
            .update({ payment_status: 'processing' })
            .eq('id', dispute.deliverable_id);
          // TODO: Trigger payment
          break;

        case 'refund_restaurant':
          await supabase
            .from('campaign_deliverables')
            .update({ payment_status: 'refunded' })
            .eq('id', dispute.deliverable_id);
          // TODO: Process refund
          break;

        case 'split_payment':
          // TODO: Process split payment
          break;

        case 'no_action':
          // No payment changes
          break;
      }

      // TODO: Notify both parties

      console.log('[DisputeService] Dispute resolved:', disputeId);
      return true;
    } catch (error) {
      console.error('[DisputeService] Error resolving dispute:', error);
      return false;
    }
  }

  /**
   * Send message in dispute thread
   */
  async sendDisputeMessage(
    disputeId: string,
    senderUserId: string,
    senderRole: 'creator' | 'restaurant' | 'admin',
    message: string,
    attachments?: string[]
  ) {
    try {
      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_user_id: senderUserId,
          sender_role: senderRole,
          message,
          attachments,
        });

      return !error;
    } catch (error) {
      console.error('[DisputeService] Error sending message:', error);
      return false;
    }
  }

  /**
   * Get all disputes (admin view)
   */
  async getAllDisputes(status?: DisputeStatus) {
    try {
      let query = supabase
        .from('deliverable_disputes')
        .select(`
          *,
          campaign_deliverables!inner(
            id,
            content_url,
            campaigns!inner(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      return data || [];
    } catch (error) {
      console.error('[DisputeService] Error fetching disputes:', error);
      return [];
    }
  }

  /**
   * Get dispute messages
   */
  async getDisputeMessages(disputeId: string) {
    try {
      const { data, error } = await supabase
        .from('dispute_messages')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      return data || [];
    } catch (error) {
      console.error('[DisputeService] Error fetching messages:', error);
      return [];
    }
  }
}

export const disputeService = new DisputeService();
```

### 3. Create Creator Dispute UI (`app/creator/deliverables/[id]/dispute.tsx`)

```tsx
export default function FileDisputeScreen() {
  const { id } = useLocalSearchParams(); // deliverable_id
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const commonReasons = [
    'Rejection was unfair - deliverable met all requirements',
    'Rejection reason is vague or unclear',
    'Restaurant did not review within reasonable time',
    'Payment amount was changed without notice',
    'Other',
  ];

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }

    setUploading(true);

    const dispute = await disputeService.fileDispute(
      id,
      'creator',
      user?.id || '',
      reason,
      description,
      evidenceUrls
    );

    if (dispute) {
      Alert.alert(
        'Dispute Filed',
        'Your dispute has been submitted. Our team will review it within 2-3 business days.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', 'Failed to file dispute');
    }

    setUploading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>File a Dispute</Text>
      <Text style={styles.subtitle}>
        Our team will review your dispute and work towards a fair resolution.
      </Text>

      {/* Reason Selection */}
      <Text style={styles.label}>Reason for Dispute *</Text>
      {commonReasons.map((r) => (
        <TouchableOpacity
          key={r}
          style={[styles.reasonOption, reason === r && styles.reasonSelected]}
          onPress={() => setReason(r)}
        >
          <Text style={styles.reasonText}>{r}</Text>
        </TouchableOpacity>
      ))}

      {/* Description */}
      <Text style={styles.label}>Additional Details</Text>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder="Provide any additional context..."
        multiline
        numberOfLines={6}
      />

      {/* Evidence Upload */}
      <Text style={styles.label}>Supporting Evidence (Optional)</Text>
      <EvidenceUploader
        evidenceUrls={evidenceUrls}
        onAdd={(url) => setEvidenceUrls([...evidenceUrls, url])}
        onRemove={(url) => setEvidenceUrls(evidenceUrls.filter((u) => u !== url))}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Dispute</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
```

### 4. Create Admin Dispute Dashboard (`app/admin/disputes/index.tsx`)

Admin-only screen to review and resolve disputes.

## Files to Create/Modify

- ✅ `supabase/migrations/20251012_dispute_system.sql` - Dispute tables
- ✅ `services/disputeService.ts` - Dispute service
- ✅ `app/creator/deliverables/[id]/dispute.tsx` - Creator dispute filing
- ✅ `app/business/content/[id]/dispute.tsx` - Restaurant dispute filing
- ✅ `app/admin/disputes/index.tsx` - Admin dispute dashboard
- ✅ `app/admin/disputes/[id].tsx` - Admin dispute resolution

## Dependencies

- ✅ task-cd-001-deliverable-submission-schema.md (Database schema)
- ✅ task-cd-006-payment-processing.md (Payment reversal/refund)
- ✅ Admin role system

## Definition of Done

- [ ] Dispute tables created
- [ ] Dispute service implemented
- [ ] Creator can file dispute on rejected deliverable
- [ ] Restaurant can file dispute on auto-approved deliverable
- [ ] Evidence upload works
- [ ] Dispute messages/communication thread works
- [ ] Admin dashboard shows all disputes
- [ ] Admin can resolve disputes with different outcomes
- [ ] Payment held during dispute
- [ ] Payment processed/refunded based on resolution
- [ ] Both parties notified of resolution
- [ ] RLS policies secure dispute data

## Related Tasks

- task-cd-001-deliverable-submission-schema.md (Prerequisites)
- task-cd-006-payment-processing.md (Payment handling)
- task-cd-007-deliverable-notifications.md (Notifications)
