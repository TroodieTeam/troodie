# Engineering Request #007: Business-to-Creator Invitation System

**Priority:** 🟠 P1 - Should Fix Before Launch  
**Severity:** Major  
**Feature:** New Feature Required  
**Estimated Effort:** 2 days  
**Status:** Not Started

---

## Problem Statement

Currently, businesses can only browse creators but have no way to:
- Invite a creator to apply to a specific campaign
- Send a collaboration request
- Track invitation status
- Proactively reach out to creators they're interested in

**Current State:**
- Businesses can browse creators
- Businesses can view creator profiles
- No invitation mechanism exists
- Creators must discover and apply to campaigns themselves

**Impact:**
- Limits business ability to proactively recruit creators
- Reduces marketplace efficiency
- Missing core marketplace functionality
- Poor UX for businesses wanting to work with specific creators

---

## Technical Requirements

### Database Schema

**New Table:** `campaign_invitations`

```sql
CREATE TABLE campaign_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Invitation details
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  
  -- Timestamps
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Auto-expire after 14 days
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(campaign_id, creator_id),
  
  -- Ensure campaign is active
  CONSTRAINT campaign_must_be_active CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
      AND c.status = 'active'
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_campaign_invitations_campaign ON campaign_invitations(campaign_id);
CREATE INDEX idx_campaign_invitations_creator ON campaign_invitations(creator_id);
CREATE INDEX idx_campaign_invitations_status ON campaign_invitations(status);
CREATE INDEX idx_campaign_invitations_invited_by ON campaign_invitations(invited_by);
CREATE INDEX idx_campaign_invitations_expires_at ON campaign_invitations(expires_at) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE campaign_invitations ENABLE ROW LEVEL SECURITY;

-- Businesses can create invitations for their campaigns
CREATE POLICY "Businesses can create invitations"
  ON campaign_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE c.id = campaign_invitations.campaign_id
      AND r.owner_id = auth.uid()
      AND c.status = 'active'
    )
  );

-- Creators can view invitations sent to them
CREATE POLICY "Creators can view their invitations"
  ON campaign_invitations FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Businesses can view invitations for their campaigns
CREATE POLICY "Businesses can view their campaign invitations"
  ON campaign_invitations FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.owner_id = auth.uid()
    )
  );

-- Creators can update invitation status (accept/decline)
CREATE POLICY "Creators can update invitation status"
  ON campaign_invitations FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Businesses can withdraw their invitations
CREATE POLICY "Businesses can withdraw invitations"
  ON campaign_invitations FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE r.owner_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'withdrawn'
  );
```

### Database Functions

**Function:** Auto-expire old invitations

```sql
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE campaign_invitations
  SET 
    status = 'expired',
    responded_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_old_invitations TO authenticated;

-- Schedule to run daily (requires pg_cron extension)
-- SELECT cron.schedule('expire-invitations', '0 0 * * *', 'SELECT expire_old_invitations()');
```

**Function:** Get invitation statistics

```sql
CREATE OR REPLACE FUNCTION get_invitation_stats(
  p_campaign_id UUID DEFAULT NULL,
  p_creator_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_invitations BIGINT,
  pending BIGINT,
  accepted BIGINT,
  declined BIGINT,
  expired BIGINT,
  acceptance_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted,
    COUNT(*) FILTER (WHERE status = 'declined')::BIGINT as declined,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')) > 0 THEN
        (COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL /
         COUNT(*) FILTER (WHERE status IN ('accepted', 'declined'))::DECIMAL) * 100
      ELSE 0
    END as acceptance_rate
  FROM campaign_invitations
  WHERE (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
    AND (p_creator_id IS NULL OR creator_id = p_creator_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Service Layer

**File:** `services/campaignInvitationService.ts`

```typescript
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

// Create invitation
export async function createInvitation(
  params: CreateInvitationParams
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
  // - Validate campaign is active
  // - Check for existing invitation
  // - Create invitation with 14-day expiry
  // - Send notification
  // - Return invitation
}

// Get invitations for creator
export async function getInvitationsForCreator(
  creatorId: string,
  status?: CampaignInvitation['status']
): Promise<{ data: CampaignInvitation[] | null; error: Error | null }> {
  // Implementation
}

// Get invitations for campaign
export async function getInvitationsForCampaign(
  campaignId: string,
  status?: CampaignInvitation['status']
): Promise<{ data: CampaignInvitation[] | null; error: Error | null }> {
  // Implementation
}

// Accept invitation
export async function acceptInvitation(
  invitationId: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
  // - Update invitation status
  // - Create campaign_application with status='accepted'
  // - Send notification to business
  // - Return updated invitation
}

// Decline invitation
export async function declineInvitation(
  invitationId: string,
  reason?: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
  // - Update invitation status
  // - Send notification to business
  // - Return updated invitation
}

// Withdraw invitation (business)
export async function withdrawInvitation(
  invitationId: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
  // - Update invitation status to 'withdrawn'
  // - Send notification to creator (optional)
  // - Return updated invitation
}

// Get invitation statistics
export async function getInvitationStats(
  campaignId?: string,
  creatorId?: string
): Promise<{ data: InvitationStats | null; error: Error | null }> {
  // Implementation
}
```

### UI Components

1. **Invite Creator Modal** (`components/business/InviteCreatorModal.tsx`)
   - Campaign selector
   - Message composer
   - Creator preview
   - Loading/error states

2. **Invitation List** (`components/creator/InvitationList.tsx`)
   - List of invitations
   - Accept/Decline actions
   - Campaign preview cards

3. **Invitation Card** (`components/creator/InvitationCard.tsx`)
   - Campaign details
   - Business info
   - Message preview
   - Action buttons

4. **Invitation Status Badge** (`components/business/InvitationStatusBadge.tsx`)
   - Shows invitation status on creator cards
   - Color-coded by status

### Screen Updates

1. **Browse Creators** (`app/(tabs)/business/creators/browse.tsx`)
   - Add "Invite to Campaign" button
   - Show invitation status badges
   - Open invite modal

2. **Creator Profile** (`app/creator/[id]/index.tsx`)
   - Add "Invite to Campaign" button (if business view)
   - Show invitation status

3. **Creator Campaigns** (`app/creator/campaigns.tsx`)
   - Add "Invitations" tab
   - List pending invitations
   - Accept/Decline actions

4. **Business Campaigns** (`app/(tabs)/business/campaigns/[id]/index.tsx`)
   - Add "Invitations" section
   - Show sent invitations
   - Withdraw option

---

## Implementation Details

### Phase 1: Database & Service Layer (Day 1)

1. Create migration file
2. Implement service functions
3. Add RLS policies
4. Create database functions
5. Write unit tests

### Phase 2: UI Components (Day 2)

1. Create invite modal component
2. Create invitation list component
3. Create invitation card component
4. Create status badge component
5. Write component tests

### Phase 3: Integration (Day 2)

1. Update Browse Creators screen
2. Update Creator Campaigns screen
3. Update Business Campaigns screen
4. Add notification integration
5. End-to-end testing

---

## User Flows

### Flow 1: Business Invites Creator

1. Business browses creators
2. Clicks "Invite to Campaign" on creator card
3. Modal opens:
   - Shows creator info
   - Campaign dropdown (active campaigns only)
   - Optional message field
   - Character counter for message (500 char limit)
4. Business selects campaign
5. Optionally adds personalized message
6. Clicks "Send Invitation"
7. System validates:
   - Campaign is active
   - No existing invitation
   - Business owns campaign
8. Invitation created with 14-day expiry
9. Creator receives notification
10. Success message shown to business
11. Creator card shows "Invited" badge

### Flow 2: Creator Accepts Invitation

1. Creator receives notification
2. Opens "Invitations" tab in My Campaigns
3. Sees pending invitation card with:
   - Campaign title and details
   - Business name
   - Budget information
   - Message from business
   - Expiry countdown
4. Clicks "View Campaign Details" to see full campaign
5. Clicks "Accept Invitation"
6. Confirmation dialog appears
7. Creator confirms
8. System:
   - Updates invitation status to 'accepted'
   - Creates `campaign_application` with status='accepted'
   - Sets `applied_at` timestamp
   - Sends notification to business
9. Campaign appears in creator's "Active" campaigns
10. Business receives notification of acceptance

### Flow 3: Creator Declines Invitation

1. Creator sees invitation
2. Clicks "Decline"
3. Optional: Add decline reason (stored in message or separate field)
4. Confirmation dialog
5. Creator confirms
6. System:
   - Updates invitation status to 'declined'
   - Sets `responded_at` timestamp
   - Sends notification to business
7. Invitation removed from creator's list
8. Business sees declined status

### Flow 4: Business Withdraws Invitation

1. Business views campaign details
2. Sees "Invitations" section
3. Finds pending invitation
4. Clicks "Withdraw"
5. Confirmation dialog
6. Business confirms
7. System:
   - Updates invitation status to 'withdrawn'
   - Sets `withdrawn_at` timestamp
   - Removes from creator's list (optional notification)
8. Invitation no longer appears in lists

---

## Testing Requirements

### Unit Tests

1. **Service Tests:**
   - `createInvitation()` - Validates business can invite
   - `acceptInvitation()` - Creates application correctly
   - `declineInvitation()` - Updates status correctly
   - `withdrawInvitation()` - Business can withdraw
   - RLS policies prevent unauthorized access
   - Duplicate invitations prevented
   - Expired invitations handled

2. **Component Tests:**
   - Invite modal renders correctly
   - Campaign dropdown populates
   - Form validation works
   - Success/error states display
   - Invitation cards render correctly
   - Status badges show correct colors

### Integration Tests

1. **End-to-End Flows:**
   - Business invites creator → Creator receives notification → Creator accepts
   - Business invites creator → Creator declines → Business sees decline
   - Business withdraws invitation → Creator no longer sees it
   - Expired invitations auto-update

2. **Edge Cases:**
   - Business tries to invite to inactive campaign (should fail)
   - Business tries to invite creator already invited (should show existing)
   - Creator tries to accept expired invitation (should fail)
   - Creator tries to accept invitation for different creator (should fail)
   - Business tries to invite to campaign they don't own (should fail)

### Manual Testing Checklist

- [ ] Business can open invite modal from browse screen
- [ ] Campaign dropdown shows only active campaigns
- [ ] Message field has character limit
- [ ] Invitation sends successfully
- [ ] Creator receives notification
- [ ] Invitation appears in creator's invitations tab
- [ ] Creator can view campaign details from invitation
- [ ] Creator can accept invitation
- [ ] Application created with correct status
- [ ] Creator can decline invitation
- [ ] Business sees invitation status updates
- [ ] Business can withdraw invitation
- [ ] Duplicate invitations prevented
- [ ] Expired invitations handled correctly
- [ ] RLS policies prevent unauthorized access
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Error handling works correctly

---

## Acceptance Criteria

- [ ] Database migration created and tested
- [ ] `campaign_invitations` table created with RLS
- [ ] Database functions implemented
- [ ] Service functions implemented and tested
- [ ] Invite modal component created
- [ ] Invitation list component created
- [ ] Invitation card component created
- [ ] Status badge component created
- [ ] Browse Creators screen updated
- [ ] Creator Campaigns screen updated with invitations tab
- [ ] Business Campaigns screen updated with invitations section
- [ ] Notifications sent for all invitation events
- [ ] All tests passing
- [ ] UI matches design spec
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Expiry handling works correctly
- [ ] RLS policies tested and working

---

## Design Mockups

### Invite Modal

```
┌─────────────────────────────────────┐
│  Invite Creator to Campaign    [X] │
├─────────────────────────────────────┤
│  [Avatar]                            │
│  Creator Name                        │
│  @username                           │
│  50K followers                       │
├─────────────────────────────────────┤
│  Select Campaign *                  │
│  [Campaign Dropdown ▼]               │
│  ┌───────────────────────────────┐  │
│  │ Campaign Title                │  │
│  │ $500 budget                   │  │
│  │ Deadline: Jan 30              │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  Message (Optional)                 │
│  [Textarea - 500 char limit]        │
│  "We'd love to work with you..."    │
│  245/500                            │
├─────────────────────────────────────┤
│  [Cancel]      [Send Invitation →]  │
└─────────────────────────────────────┘
```

### Invitation Card

```
┌─────────────────────────────────────┐
│  📧 New Invitation                   │
├─────────────────────────────────────┤
│  Campaign: Campaign Title            │
│  Restaurant: Restaurant Name         │
│  Budget: $500                        │
│  Deadline: Jan 30, 2025             │
├─────────────────────────────────────┤
│  "We'd love to work with you on..."  │
│  - Business Owner Name               │
├─────────────────────────────────────┤
│  Expires in 12 days                  │
│  [View Details]  [Accept]  [Decline]│
└─────────────────────────────────────┘
```

---

## Related Files

- `supabase/migrations/20250122_campaign_invitations.sql` - Migration file
- `services/campaignInvitationService.ts` - Service implementation
- `components/business/InviteCreatorModal.tsx` - Invite modal
- `components/creator/InvitationList.tsx` - Invitation list
- `components/creator/InvitationCard.tsx` - Invitation card
- `app/(tabs)/business/creators/browse.tsx` - Browse screen
- `app/creator/campaigns.tsx` - Creator campaigns
- `app/(tabs)/business/campaigns/[id]/index.tsx` - Business campaign details

---

## Future Enhancements

- Bulk invitations (invite multiple creators at once)
- Invitation templates for common messages
- Invitation analytics dashboard
- Reminder notifications for pending invitations
- Invitation preferences (creators can set availability)
- Smart matching suggestions (AI-powered creator recommendations)

