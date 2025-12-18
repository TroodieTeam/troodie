# Engineering Request #002: Contact Creator → Invite to Campaign

**Priority:** 🔴 P0 - Critical  
**Severity:** Critical  
**Feature:** CM-9 (Browse Creators)  
**Estimated Effort:** 2-3 days  
**Status:** Not Started

---

## Problem Statement

The "Contact Creator" button in Browse Creators screen currently only navigates to the creator profile page. It does not allow businesses to:
- Invite creators to specific campaigns
- Send a collaboration request
- Initiate any meaningful action

**Current Behavior:**
```tsx
const handleContactCreator = (creatorId: string) => {
  router.push(`/creator/${creatorId}`);
};
```

**Impact:**
- Poor UX - button label suggests action but only navigates
- No way for businesses to proactively invite creators
- Missing core marketplace functionality

---

## Technical Requirements

### Database Changes

Create `campaign_invitations` table to track invitations:

```sql
CREATE TABLE campaign_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional: auto-expire after 7 days
  UNIQUE(campaign_id, creator_id)
);

-- Indexes
CREATE INDEX idx_campaign_invitations_campaign ON campaign_invitations(campaign_id);
CREATE INDEX idx_campaign_invitations_creator ON campaign_invitations(creator_id);
CREATE INDEX idx_campaign_invitations_status ON campaign_invitations(status);
CREATE INDEX idx_campaign_invitations_invited_by ON campaign_invitations(invited_by);

-- RLS Policies
ALTER TABLE campaign_invitations ENABLE ROW LEVEL SECURITY;

-- Businesses can create invitations for their campaigns
CREATE POLICY "Businesses can create invitations"
  ON campaign_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_invitations.campaign_id
      AND c.restaurant_id IN (
        SELECT restaurant_id FROM restaurants
        WHERE owner_id = auth.uid()
      )
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
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );
```

### Service Layer Changes

Create `services/campaignInvitationService.ts`:

```typescript
export interface CampaignInvitation {
  id: string;
  campaign_id: string;
  creator_id: string;
  invited_by: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_at: string;
  responded_at?: string;
  expires_at?: string;
  campaign?: {
    id: string;
    title: string;
    restaurant_name?: string;
  };
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface CreateInvitationParams {
  campaign_id: string;
  creator_id: string;
  message?: string;
}

export async function createInvitation(
  params: CreateInvitationParams
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
}

export async function getInvitationsForCreator(
  creatorId: string
): Promise<{ data: CampaignInvitation[] | null; error: Error | null }> {
  // Implementation
}

export async function acceptInvitation(
  invitationId: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
  // Should create campaign_application with status='accepted'
}

export async function declineInvitation(
  invitationId: string
): Promise<{ data: CampaignInvitation | null; error: Error | null }> {
  // Implementation
}
```

### UI Components

1. **Invite Modal Component** (`components/business/InviteCreatorModal.tsx`):
   - Campaign selector (dropdown of business's active campaigns)
   - Optional message textarea
   - Creator info display
   - Submit button

2. **Update Browse Creators** (`app/(tabs)/business/creators/browse.tsx`):
   - Change "Contact Creator" button to "Invite to Campaign"
   - Open invite modal instead of navigating
   - Show invitation status badge if already invited

3. **Creator Invitations Screen** (`app/creator/invitations.tsx`):
   - List of pending invitations
   - Accept/Decline actions
   - Link to campaign details

4. **Update Creator Campaigns** (`app/creator/campaigns.tsx`):
   - Add "Invitations" tab
   - Show pending invitations with accept/decline buttons

---

## Implementation Details

### Step 1: Database Migration

**File:** `supabase/migrations/20250122_campaign_invitations.sql`

```sql
-- Create campaign_invitations table
-- Add RLS policies
-- Add indexes
-- (Full SQL from Technical Requirements section)
```

### Step 2: Service Implementation

**File:** `services/campaignInvitationService.ts`

Key functions:
- `createInvitation()` - Business invites creator
- `getInvitationsForCreator()` - Get creator's invitations
- `acceptInvitation()` - Creator accepts (creates application)
- `declineInvitation()` - Creator declines
- `getInvitationsForCampaign()` - Business views campaign invitations

### Step 3: Invite Modal Component

**File:** `components/business/InviteCreatorModal.tsx`

Props:
```typescript
interface InviteCreatorModalProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

Features:
- Fetch business's active campaigns
- Campaign dropdown selector
- Optional message input
- Loading states
- Error handling
- Success confirmation

### Step 4: Update Browse Creators Screen

**File:** `app/(tabs)/business/creators/browse.tsx`

Changes:
```tsx
// Replace handleContactCreator with:
const handleInviteCreator = (creator: Creator) => {
  setSelectedCreator(creator);
  setInviteModalVisible(true);
};

// Add state:
const [inviteModalVisible, setInviteModalVisible] = useState(false);
const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

// Update button:
<TouchableOpacity
  onPress={() => handleInviteCreator(creator)}
  style={styles.inviteButton}
>
  <Text>Invite to Campaign</Text>
</TouchableOpacity>

// Add modal:
<InviteCreatorModal
  creatorId={selectedCreator?.id}
  creatorName={selectedCreator?.displayName}
  creatorAvatar={selectedCreator?.avatarUrl}
  visible={inviteModalVisible}
  onClose={() => {
    setInviteModalVisible(false);
    setSelectedCreator(null);
  }}
  onSuccess={() => {
    // Refresh list or show success message
  }}
/>
```

### Step 5: Creator Invitations Screen

**File:** `app/creator/invitations.tsx`

Features:
- List of pending invitations
- Campaign details preview
- Accept/Decline buttons
- Empty state
- Loading states

### Step 6: Update Creator Campaigns Screen

**File:** `app/creator/campaigns.tsx`

Add "Invitations" tab that shows:
- Pending invitations
- Quick accept/decline actions
- Link to full invitation details

### Step 7: Notification Integration

**File:** `services/notificationService.ts` (or existing notification system)

Add notification types:
- `campaign_invitation` - Creator receives invitation
- `invitation_accepted` - Business receives acceptance
- `invitation_declined` - Business receives decline

---

## User Flows

### Business Invites Creator

1. Business browses creators
2. Clicks "Invite to Campaign" on creator card
3. Modal opens with:
   - Creator info
   - Campaign dropdown (active campaigns only)
   - Optional message field
4. Business selects campaign and optionally adds message
5. Clicks "Send Invitation"
6. Creator receives notification
7. Invitation appears in creator's "Invitations" tab

### Creator Accepts Invitation

1. Creator receives notification
2. Opens "Invitations" tab in My Campaigns
3. Sees pending invitation with campaign details
4. Clicks "Accept"
5. System creates `campaign_application` with status='accepted'
6. Invitation status updates to 'accepted'
7. Business receives notification
8. Campaign moves to "Active" for creator

### Creator Declines Invitation

1. Creator sees invitation
2. Clicks "Decline"
3. Optional: Add decline reason
4. Invitation status updates to 'declined'
5. Business receives notification
6. Invitation removed from creator's list

---

## Testing Requirements

### Unit Tests

1. **Service Tests:**
   - `createInvitation()` - Validates business can invite
   - `acceptInvitation()` - Creates application correctly
   - `declineInvitation()` - Updates status correctly
   - RLS policies work correctly

2. **Component Tests:**
   - Invite modal renders correctly
   - Campaign dropdown populates
   - Form validation works
   - Success/error states display

### Integration Tests

1. **End-to-End Flow:**
   - Business invites creator
   - Creator receives notification
   - Creator accepts invitation
   - Application created correctly
   - Business sees acceptance

2. **Edge Cases:**
   - Business tries to invite creator already invited (should show existing invitation)
   - Creator tries to accept expired invitation (should fail)
   - Business tries to invite to inactive campaign (should fail)
   - Creator tries to accept invitation for different creator (should fail)

### Manual Testing Checklist

- [ ] Business can open invite modal from browse screen
- [ ] Campaign dropdown shows only active campaigns
- [ ] Invitation sends successfully
- [ ] Creator receives notification
- [ ] Invitation appears in creator's invitations tab
- [ ] Creator can accept invitation
- [ ] Application created with correct status
- [ ] Creator can decline invitation
- [ ] Business sees invitation status updates
- [ ] Duplicate invitations prevented
- [ ] RLS policies prevent unauthorized access

---

## Acceptance Criteria

- [ ] Database migration created and tested
- [ ] `campaign_invitations` table created with RLS
- [ ] Service functions implemented and tested
- [ ] Invite modal component created
- [ ] Browse Creators screen updated with invite functionality
- [ ] Creator invitations screen created
- [ ] Creator campaigns screen updated with invitations tab
- [ ] Notifications sent for invitations
- [ ] All tests passing
- [ ] UI matches design spec
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Empty states implemented

---

## Design Considerations

### Invite Modal UI

```
┌─────────────────────────────────┐
│  Invite Creator to Campaign    │
├─────────────────────────────────┤
│  [Creator Avatar]               │
│  Creator Name                   │
│  @username                      │
├─────────────────────────────────┤
│  Select Campaign *             │
│  [Dropdown ▼]                   │
│                                 │
│  Message (Optional)             │
│  [Textarea]                     │
│                                 │
│  [Cancel]  [Send Invitation]    │
└─────────────────────────────────┘
```

### Invitation Card UI

```
┌─────────────────────────────────┐
│  Campaign Title                 │
│  Restaurant Name                │
│  Budget: $500                   │
│                                 │
│  Message: "We'd love to..."    │
│                                 │
│  [Accept]  [Decline]           │
└─────────────────────────────────┘
```

---

## Related Files

- `app/(tabs)/business/creators/browse.tsx` - Browse screen (needs update)
- `app/creator/campaigns.tsx` - Creator campaigns (needs invitations tab)
- `services/campaignInvitationService.ts` - New service file
- `components/business/InviteCreatorModal.tsx` - New component
- `supabase/migrations/20250122_campaign_invitations.sql` - New migration

---

## Future Enhancements

- Bulk invitations (invite multiple creators at once)
- Invitation templates
- Auto-expire invitations after X days
- Invitation analytics (acceptance rate, etc.)
- Reminder notifications for pending invitations

