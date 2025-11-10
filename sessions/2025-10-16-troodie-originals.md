# Working Session: October 16, 2025
## Troodie Originals Launch + Enhanced Deliverables Form

**Status:** Active Development Session
**Focus:** Incorporate stakeholder feedback on initial sponsored campaigns and restaurant deliverable form
**Branch:** feature/v1.0.2-feedback-session

---

## 📋 Session Overview

### Current State Summary

Based on review of all modified and new files:

#### ✅ Complete (Ready for Testing)
1. **TMC-001 & TMC-002**: Database schema + system account (kouame@troodieapp.com)
   - Migration: `supabase/migrations/20251013_troodie_managed_campaigns_schema.sql`
   - Seed: `supabase/seeds/create_troodie_system_account.sql`
   - Constants: `constants/systemAccounts.ts`

2. **TMC-003 & TMC-004**: Admin UI + Creator badges
   - Admin wizard: `components/admin/AdminCampaignWizard.tsx` + 5 form components
   - Admin screens: `app/admin/campaigns/` (create, index, [id])
   - Creator badges: `components/campaigns/CampaignBadge.tsx` + `TrustSignals.tsx`

3. **Campaign Deliverables Strategy**: 70KB comprehensive document
   - 3-day auto-approval system
   - URL + screenshot submission
   - Payment integration requirements
   - Dispute resolution process

#### 🔄 In Progress / Modified
- Testing infrastructure (Maestro E2E, Jest)
- Various service updates (authService, boardService, postService, saveService)
- Auth/bypass account fixes
- Demo data seeding scripts

#### ⚠️ Remaining for TMC MVP
- **TMC-005**: Budget Tracking & Analytics dashboard
- **TMC-006**: Deliverables Integration (creator submission + restaurant review)
- **TMC-007**: Testing & Deployment

---

## 🎯 Stakeholder Recommendations (NEW)

### 1️⃣ Initial Troodie-Sponsored Opportunities

**Budget:** $250 total
**Campaign Name:** "Troodie Creators: Local Gems"

#### Campaign Structure
- **Type:** `troodie_direct` (Troodie Original)
- **Objective:** Generate high-quality UGC to inspire restaurants to post opportunities
- **Target:** 3-5 creators
- **Compensation:** $25-50 per creator

#### Creator Brief
> "Create a fun, authentic reel visiting your favorite local spot. Share what makes it special and close with:
> 'I found this opportunity through the Troodie Creator Marketplace — if you're a creator looking to collaborate with restaurants, download Troodie!'"

#### Deliverables Requirements
1. ✅ 1 vertical video (15-45 seconds)
2. ✅ Collab @TroodieApp
3. ✅ Save restaurant to Troodie + leave review/post
4. ✅ Use hashtag #TroodieCreatorMarketplace
5. ✅ Include CTA line (Troodie mention)
6. ✅ Post to IG Reels or TikTok (public)
7. ✅ Submit link to post once posted

#### Budget Allocation Options
**Option A:** 5 creators × $50 = $250 (higher quality, fewer creators)
**Option B:** 10 creators × $25 = $250 (more variety, test UGC quality)
**Option C:** 3 creators × $50 + 5 creators × $30 = $300 (mixed tier)

---

### 2️⃣ Restaurant-Facing Deliverable Setup Form

**Objective:** Streamlined form for restaurants to post collab opportunities without overwhelming them

#### Form Structure (Tiered Approach)

##### A. Basic Details (Required - <2 min to complete)
| Field | Type | Options/Details |
|-------|------|-----------------|
| **Opportunity Title** | Text | e.g., "Fall Brunch Promo" |
| **Campaign Goal** | Dropdown | Awareness / Foot Traffic / New Menu / Event / Brand Content |
| **Deliverable Type** | Dropdown | Reel / TikTok / Story / Static Post / Carousel |
| **Due Date** | Date/Timeframe | e.g., "Post within 2 weeks of visit" |
| **Compensation Type** | Dropdown | Free Meal / Cash / Gift Card / Store Credit / Discount / Other |
| **Monetary Value** | Number/Range | Dollar amount or range |
| **Visit Details** | Dropdown | Dine-in / Pickup / Event Coverage / Other |
| **Payment Timing** | Dropdown | Before content made / After content made / Before posted / After posted |
| **# of Revisions** | Number | How many revisions allowed |

##### B. Optional Creative Guidelines (Brand Control)
| Field | Type | Options/Details |
|-------|------|-----------------|
| **Tone & Vibe** | Checkboxes | Fun / Classy / Cozy / Trendy / Family-Friendly / Elegant / Playful |
| **Content Themes** | Checkboxes | Food close-ups / BTS / Chef highlight / Atmosphere / Customer experience |
| **Music/Audio Preferences** | Text | Optional open field |
| **Voiceover Preference** | Dropdown | Yes / No / Creator's Choice |
| **On-screen Text Preference** | Dropdown | Yes / No / Creator's Choice |
| **Cover Image Preference** | Dropdown | Logo / Creator's Choice / Dish Photo / Venue Exterior / Creator in image |
| **Brand Assets** | File Upload | Logo, color palette, fonts (optional) |

##### C. Approval & Attribution (Simple but Important)
| Field | Type | Options/Details |
|-------|------|-----------------|
| **Need Pre-Approval?** | Toggle | Yes/No before posting |
| **@handles / Hashtags** | Text | @RestaurantName, #RestaurantCity |
| **Content Repost Rights?** | Toggle | Can restaurant repost on their page? |
| **Extra Notes** | Text Area | Free text for additional details |

#### Progressive Form UX
```
Step 1: "Quick Post" (9 required fields) → Under 2 minutes
  ↓
Step 2: "Add Brand Guidelines (optional)" → Show/hide section
  ↓
Step 3: "Review & Post" → Preview how it appears to creators
```

---

## 🚀 Implementation Plan for This Session

### Priority 1: Launch "Troodie Originals" Campaign System

#### Task 1.1: Create Campaign Type Preset
**File:** `constants/campaignPresets.ts` (new)

Create predefined campaign template for "Troodie Originals":

```typescript
export const TROODIE_ORIGINALS_PRESET = {
  type: 'troodie_direct',
  title: 'Troodie Creators: Local Gems',
  description: 'Create authentic content featuring your favorite local spot...',
  requirements: [
    '1 vertical video (15-45 seconds) for IG Reels or TikTok',
    'Collab @TroodieApp in your post',
    'Save the restaurant to Troodie and leave a review or post',
    'Use hashtag #TroodieCreatorMarketplace',
    'Include CTA: "I found this through Troodie Creator Marketplace"',
    'Post must be public',
    'Submit link to post when completed'
  ],
  budget_source: 'marketing',
  max_creators: 5,
  compensation_per_creator_cents: 5000, // $50
  campaign_source: 'troodie_direct',
  is_subsidized: true
};
```

#### Task 1.2: Add Campaign Template Selector
**File:** `components/admin/CampaignTypeSelector.tsx` (update)

Add "Use Template" option:
- Quick launch buttons for preset campaigns
- "Troodie Originals" template button
- Pre-fills all campaign fields
- Admin can still customize before publishing

#### Task 1.3: Create Troodie Originals Badge
**File:** `components/campaigns/TroodieOriginalsBadge.tsx` (new)

Special badge for Troodie Originals campaigns:
- Orange badge with star icon
- Text: "Troodie Original"
- Shown alongside platform-managed badge

---

### Priority 2: Enhanced Deliverable Form (Restaurant-Facing)

#### Task 2.1: Create Deliverable Requirements Builder
**File:** `types/deliverableRequirements.ts` (new)

```typescript
export interface DeliverableRequirements {
  // Basic Details (required)
  title: string;
  goal: 'awareness' | 'foot_traffic' | 'new_menu' | 'event' | 'brand_content';
  type: 'reel' | 'tiktok' | 'story' | 'static_post' | 'carousel';
  due_date: Date | string;
  compensation_type: 'free_meal' | 'cash' | 'gift_card' | 'store_credit' | 'discount' | 'other';
  compensation_value: number;
  visit_type: 'dine_in' | 'pickup' | 'event_coverage' | 'other';
  payment_timing: 'before_content' | 'after_content' | 'before_post' | 'after_post';
  revisions_allowed: number;

  // Creative Guidelines (optional)
  creative?: {
    tone?: ('fun' | 'classy' | 'cozy' | 'trendy' | 'family_friendly' | 'elegant' | 'playful')[];
    themes?: ('food_closeups' | 'behind_scenes' | 'chef_highlight' | 'atmosphere' | 'customer_experience')[];
    music_preferences?: string;
    voiceover?: 'yes' | 'no' | 'creator_choice';
    onscreen_text?: 'yes' | 'no' | 'creator_choice';
    cover_image?: 'logo' | 'creator_choice' | 'dish_photo' | 'venue_exterior' | 'creator_in_image';
    brand_assets_urls?: string[];
  };

  // Approval & Attribution (optional)
  approval?: {
    pre_approval_required: boolean;
    handles: string[];
    hashtags: string[];
    repost_rights: boolean;
    extra_notes?: string;
  };
}
```

#### Task 2.2: Update Campaign Creation Schema
**File:** `supabase/migrations/20251016_enhanced_deliverable_requirements.sql` (new)

Add `deliverable_requirements` JSONB column to `campaigns` table:

```sql
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS deliverable_requirements JSONB DEFAULT '{}'::jsonb;

-- Add index for querying by deliverable type
CREATE INDEX idx_campaigns_deliverable_type
ON campaigns ((deliverable_requirements->>'type'));

COMMENT ON COLUMN campaigns.deliverable_requirements IS
'Structured requirements for campaign deliverables including basic details, creative guidelines, and approval settings';
```

#### Task 2.3: Create Deliverable Requirements Form Component
**File:** `components/admin/DeliverableRequirementsForm.tsx` (new)

Progressive form with 3 sections:
1. **Basic Details** (always visible, required)
2. **Creative Guidelines** (expandable section, optional)
3. **Approval & Attribution** (expandable section, optional)

Features:
- Collapsible sections
- Progress indicator (e.g., "3 of 9 required fields complete")
- Smart defaults
- Tooltip help text
- Real-time validation

#### Task 2.4: Integrate into Campaign Creation Wizard
**File:** `components/admin/AdminCampaignWizard.tsx` (update)

Add new step between "Campaign Details" and "Budget":
```
Type → Details → Deliverable Requirements (NEW) → Budget → Partnership → Preview
```

---

### Priority 3: Deliverable Submission Flow (Creator-Facing)

#### Task 3.1: Create Deliverable Submission Service
**File:** `services/deliverableSubmissionService.ts` (new)

```typescript
export interface DeliverableSubmission {
  creator_campaign_id: string;
  deliverable_index: number;
  platform: 'instagram' | 'tiktok' | 'youtube';
  post_url: string;
  screenshot_url?: string;
  caption?: string;
  notes_to_restaurant?: string;
  engagement_metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

export async function submitDeliverable(submission: DeliverableSubmission);
export async function getDeliverableStatus(creatorCampaignId: string);
export async function updateDeliverable(deliverableId: string, updates: Partial<DeliverableSubmission>);
```

#### Task 3.2: Create Deliverable Submission Screen
**File:** `app/creator/campaigns/[id]/submit-deliverable.tsx` (new)

Flow:
1. Show campaign requirements (from `deliverable_requirements`)
2. Select deliverable type (if multiple required)
3. Paste post URL (with validation)
4. Optional: Upload screenshot
5. Optional: Add caption/notes
6. Submit for review
7. Show confirmation + next steps

#### Task 3.3: Update Creator Campaign Detail Screen
**File:** `app/creator/campaigns/[id].tsx` (update)

Add:
- "Submit Deliverable" button (prominent)
- Deliverable status badges
- Submission history
- Review feedback (if applicable)
- Auto-approve countdown timer

---

### Priority 4: Restaurant Review Dashboard

#### Task 4.1: Create Deliverable Review Service
**File:** `services/deliverableReviewService.ts` (new)

```typescript
export interface ReviewAction {
  deliverable_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  feedback?: string;
  reviewer_id: string;
}

export async function getPendingDeliverables(restaurantId: string);
export async function reviewDeliverable(action: ReviewAction);
export async function getAutoApprovalDeadline(deliverableId: string);
```

#### Task 4.2: Create Restaurant Deliverable Review Screen
**File:** `app/business/campaigns/[id]/review-deliverables.tsx` (new)

Features:
- List of pending deliverables
- Countdown timer (72 hours to auto-approve)
- View submitted content (open URL + see screenshot)
- Quick actions: Approve / Request Changes / Reject
- Feedback text field
- Warning before auto-approve (24h, 12h, 1h)

#### Task 4.3: Auto-Approval Cron Job
**File:** `supabase/functions/auto-approve-deliverables/index.ts` (new)

Supabase Edge Function (runs hourly):
1. Query all deliverables with `status='pending'` and `submitted_at > 72h ago`
2. Auto-approve each deliverable
3. Update status to `approved` with `auto_approved=true`
4. Trigger payment processing
5. Send notifications to creator and restaurant

---

## 📊 Database Schema Updates Needed

### New Migration: Enhanced Deliverables System
**File:** `supabase/migrations/20251016_enhanced_deliverables_system.sql`

```sql
-- 1. Add deliverable requirements to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS deliverable_requirements JSONB DEFAULT '{}'::jsonb;

-- 2. Add deliverables tracking to creator_campaigns
ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS deliverables_submitted JSONB DEFAULT '[]'::jsonb;

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS all_deliverables_submitted BOOLEAN DEFAULT FALSE;

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS restaurant_review_deadline TIMESTAMPTZ;

ALTER TABLE creator_campaigns
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;

-- 3. Create campaign_deliverables table (detailed tracking)
CREATE TABLE IF NOT EXISTS campaign_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_campaign_id UUID REFERENCES creator_campaigns(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submission details
  deliverable_index INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL,
  post_url TEXT NOT NULL,
  screenshot_url TEXT,
  caption TEXT,
  notes_to_restaurant TEXT,

  -- Engagement metrics (self-reported initially)
  engagement_metrics JSONB DEFAULT '{}'::jsonb,

  -- Review details
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  restaurant_feedback TEXT,
  auto_approved BOOLEAN DEFAULT FALSE,

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creator_campaign_id, deliverable_index)
);

-- 4. Add RLS policies
ALTER TABLE campaign_deliverables ENABLE ROW LEVEL SECURITY;

-- Creators can view and create their own deliverables
CREATE POLICY "Creators can view own deliverables"
  ON campaign_deliverables FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create own deliverables"
  ON campaign_deliverables FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Restaurants can view and update deliverables for their campaigns
CREATE POLICY "Restaurants can view campaign deliverables"
  ON campaign_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
      WHERE c.id = campaign_deliverables.campaign_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurants can update campaign deliverables"
  ON campaign_deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN business_profiles bp ON bp.restaurant_id = c.restaurant_id
      WHERE c.id = campaign_deliverables.campaign_id
      AND bp.user_id = auth.uid()
    )
  );

-- 5. Create indexes
CREATE INDEX idx_deliverables_creator_campaign ON campaign_deliverables(creator_campaign_id);
CREATE INDEX idx_deliverables_status ON campaign_deliverables(status);
CREATE INDEX idx_deliverables_submitted ON campaign_deliverables(submitted_at);
CREATE INDEX idx_campaigns_deliverable_type ON campaigns ((deliverable_requirements->>'type'));

-- 6. Create function to check auto-approval deadline
CREATE OR REPLACE FUNCTION get_auto_approval_deadline(p_deliverable_id UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT submitted_at + INTERVAL '72 hours'
  FROM campaign_deliverables
  WHERE id = p_deliverable_id;
$$ LANGUAGE sql STABLE;

-- 7. Create function to auto-approve overdue deliverables
CREATE OR REPLACE FUNCTION auto_approve_overdue_deliverables()
RETURNS TABLE (
  deliverable_id UUID,
  creator_id UUID,
  campaign_id UUID,
  approved_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE campaign_deliverables
  SET
    status = 'approved',
    auto_approved = TRUE,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE
    status = 'pending'
    AND submitted_at < NOW() - INTERVAL '72 hours'
  RETURNING
    id AS deliverable_id,
    creator_id,
    campaign_id,
    reviewed_at AS approved_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE campaign_deliverables IS 'Tracks individual deliverable submissions with detailed review and approval workflow';
```

---

## 🎨 UI/UX Design Specifications

### Troodie Originals Campaign Badge
- **Shape:** Rounded pill (20px border radius)
- **Background:** Gradient (orange to yellow)
- **Icon:** ⭐ Star icon
- **Text:** "Troodie Original" in bold
- **Size:** Medium (32px height) for cards, Small (24px) for lists

### Deliverable Requirements Form
- **Step 1 (Basic)**: Always visible, white card, 16px padding
- **Step 2 (Creative)**: Collapsible, light gray background when closed
- **Step 3 (Approval)**: Collapsible, light gray background when closed
- **Progress Bar**: Orange fill, shows "X of 9 required fields complete"
- **Tooltips**: (i) icon next to field labels, shows on tap

### Deliverable Submission Screen
- **Layout:** Full screen modal with header
- **Header:** "Submit Deliverable" + Close (X) button
- **Campaign Requirements Card:** Top section, orange border, read-only
- **Form Section:** White cards with 16px padding
- **Submit Button:** Fixed bottom, full width, orange, 48px height
- **Confirmation:** Success checkmark animation + confetti

### Restaurant Review Dashboard
- **Countdown Timer:** Large, prominent at top
  - >24h: Green text
  - 12-24h: Yellow text
  - <12h: Red text + pulsing animation
- **Deliverable Card:** Shows thumbnail, URL, caption
- **Action Buttons:** 3-button layout (Approve/Request Changes/Reject)
- **Feedback Field:** Expandable text area (appears when "Request Changes" selected)

---

## ✅ Definition of Done for This Session

### For "Troodie Originals" System:
- [ ] Campaign preset constant created with all requirements
- [ ] Template selector added to admin campaign wizard
- [ ] "Troodie Original" badge component created and styled
- [ ] Badge appears on campaign cards in creator view
- [ ] Test campaign created using preset and verified in UI

### For Enhanced Deliverable Form:
- [ ] TypeScript interfaces defined for deliverable requirements
- [ ] Database migration created and tested locally
- [ ] DeliverableRequirementsForm component created with 3 sections
- [ ] Form integrated into AdminCampaignWizard as new step
- [ ] Progressive disclosure working (sections expand/collapse)
- [ ] Validation working for required fields
- [ ] Preview shows deliverable requirements correctly

### For Deliverable Submission Flow:
- [ ] deliverableSubmissionService created with all methods
- [ ] Deliverable submission screen created and functional
- [ ] URL validation working for Instagram/TikTok
- [ ] Screenshot upload integrated
- [ ] Submission confirmation screen working
- [ ] Creator campaign detail screen updated with "Submit" button

### For Restaurant Review Dashboard:
- [ ] deliverableReviewService created
- [ ] Restaurant review screen created with pending list
- [ ] Countdown timer calculating correctly
- [ ] Approve/Reject/Request Changes actions working
- [ ] Feedback field saving to database
- [ ] Notifications sent on status changes

### For Auto-Approval System:
- [ ] Database function `auto_approve_overdue_deliverables()` created
- [ ] Supabase Edge Function created for cron job
- [ ] Edge Function deployed and scheduled (hourly)
- [ ] Auto-approval tested with test data
- [ ] Notifications sent when auto-approved

---

## 🧪 Testing Strategy

### Unit Tests Needed
```
__tests__/services/deliverableSubmissionService.test.ts
__tests__/services/deliverableReviewService.test.ts
__tests__/components/DeliverableRequirementsForm.test.tsx
__tests__/functions/auto-approve-deliverables.test.ts
```

### Integration Tests Needed
```
__tests__/integration/deliverable-submission-flow.test.ts
__tests__/integration/restaurant-review-flow.test.ts
__tests__/integration/auto-approval-workflow.test.ts
```

### E2E Tests Needed (Maestro)
```
e2e/flows/admin/create-troodie-original-campaign.yaml
e2e/flows/creator/submit-deliverable.yaml
e2e/flows/business/review-deliverable.yaml
```

### Manual Testing Checklist
- [ ] Create Troodie Originals campaign from preset
- [ ] Apply as creator and get accepted
- [ ] Submit deliverable with URL + screenshot
- [ ] Review as restaurant and approve
- [ ] Verify payment processing triggered
- [ ] Test auto-approval (set submitted_at to 73 hours ago)
- [ ] Test request changes flow
- [ ] Test rejection flow

---

## 📝 Implementation Sequence

### Phase 1: Foundation (Today - Oct 16)
1. Create database migration for enhanced deliverables system
2. Create TypeScript types and interfaces
3. Create deliverableSubmissionService
4. Create deliverableReviewService

### Phase 2: Admin UI (Oct 16-17)
5. Create DeliverableRequirementsForm component
6. Integrate form into AdminCampaignWizard
7. Create Troodie Originals preset
8. Add template selector to campaign creation

### Phase 3: Creator UI (Oct 17-18)
9. Create deliverable submission screen
10. Update creator campaign detail screen
11. Add submission confirmation flow
12. Implement URL validation

### Phase 4: Restaurant UI (Oct 18-19)
13. Create restaurant review dashboard
14. Add countdown timer logic
15. Implement review actions (approve/reject/request changes)
16. Add notification triggers

### Phase 5: Auto-Approval (Oct 19-20)
17. Create Supabase Edge Function for auto-approval
18. Deploy and schedule Edge Function
19. Test auto-approval workflow
20. Add warning notifications (24h before auto-approve)

### Phase 6: Testing (Oct 20-21)
21. Write unit tests
22. Write integration tests
23. Create Maestro E2E tests
24. Manual testing with test accounts

### Phase 7: Documentation & Deployment (Oct 21)
25. Update documentation
26. Create deployment guide
27. Deploy to staging
28. Final QA pass
29. Deploy to production

---

## 🔗 Related Documentation

- [TMC Index](./TROODIE_MANAGED_CAMPAIGNS_INDEX.md) - Complete TMC documentation
- [TMC-001 & TMC-002 Complete](./TMC_001_002_COMPLETE.md) - Database schema done
- [TMC-003 & TMC-004 Complete](./TMC_003_004_COMPLETE.md) - Admin UI done
- [Campaign Deliverables MVP Strategy](./CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md) - Original 70KB strategy
- [PRD](./TROODIE_MANAGED_CAMPAIGNS_PRD.md) - Product requirements
- [Testing Guide](./TROODIE_MANAGED_CAMPAIGNS_MANUAL_TESTING_GUIDE.md) - 53 test cases

---

## 🎯 Success Criteria

### Business Metrics
- [ ] First "Troodie Original" campaign created by end of week
- [ ] 3-5 creators successfully complete deliverables
- [ ] All deliverables reviewed within 72 hours (no auto-approvals)
- [ ] 100% payment success rate
- [ ] Zero disputes in first campaign

### Technical Metrics
- [ ] All new services have >80% test coverage
- [ ] All UI components follow design system
- [ ] Page load times <2 seconds
- [ ] Auto-approval cron runs successfully every hour
- [ ] Zero database errors in production

### User Experience Metrics
- [ ] Campaign creation time <5 minutes (with enhanced form)
- [ ] Deliverable submission completion rate >90%
- [ ] Restaurant review completion rate >80% (before auto-approve)
- [ ] Creator satisfaction with submission flow >4.5/5
- [ ] Restaurant satisfaction with review process >4.0/5

---

## 🚨 Risks & Mitigation

### Risk 1: Complex Form Overwhelming Restaurants
**Mitigation:** Progressive disclosure, smart defaults, "Quick Post" mode that only shows required fields

### Risk 2: Auto-Approval Fires Too Early
**Mitigation:** Multiple warning notifications at 48h, 24h, 12h, 1h before auto-approve

### Risk 3: URL Validation False Positives
**Mitigation:** Allow manual override for edge cases, admin can approve manually

### Risk 4: Payment Processing Delays
**Mitigation:** Clear timeline expectations set upfront, status tracking in UI

### Risk 5: Creator Confusion About Deliverable Requirements
**Mitigation:** Requirements displayed prominently on submission screen, examples shown

---

## 📅 Next Steps After This Session

1. **Deploy to Staging** (Oct 21)
   - Run migration on staging database
   - Test all new flows end-to-end
   - Collect feedback from internal team

2. **Create First Troodie Original Campaign** (Oct 22)
   - Use preset to create "Local Gems" campaign
   - Recruit 5 creators from existing user base
   - Monitor submissions and reviews

3. **Iterate Based on Feedback** (Oct 23-25)
   - Adjust form fields based on restaurant feedback
   - Refine deliverable requirements based on creator feedback
   - Optimize auto-approval timing if needed

4. **Launch to Production** (Oct 26)
   - Deploy to production
   - Announce "Troodie Originals" to user base
   - Monitor metrics and support tickets

5. **Continue TMC Implementation** (Oct 27+)
   - TMC-005: Budget Tracking & Analytics
   - TMC-006: Advanced Deliverables Features
   - TMC-007: Testing & Deployment

---

## 💬 Questions for Stakeholder

1. **Budget Allocation Preference:**
   - Option A: 5 creators × $50 = $250 (higher quality)
   - Option B: 10 creators × $25 = $250 (more variety)
   - **Recommendation:** Option B for MVP to test variety

2. **Auto-Approval Timeline:**
   - Proposed: 72 hours (3 days)
   - Alternative: 48 hours (2 days) for faster turnaround
   - **Recommendation:** Stick with 72 hours for MVP

3. **Payment Timing:**
   - Proposed: After restaurant approval (or auto-approval)
   - Alternative: Immediate after submission
   - **Recommendation:** After approval to allow quality control

4. **Required vs Optional Fields in Deliverable Form:**
   - Proposed: 9 required, 13 optional
   - Alternative: Reduce required to 6, increase optional to 16
   - **Recommendation:** Current split is good

---

**Status:** 📝 **PLAN COMPLETE - READY TO IMPLEMENT**

**Estimated Time:** 5-7 days (Oct 16-21)

**Developer Notes:** This is an ambitious session but builds directly on TMC-001 through TMC-004 which are complete. The stakeholder recommendations align perfectly with our existing TMC strategy and fill critical gaps in the deliverables workflow.

---

_Session Plan Created: October 16, 2025_
_Last Updated: October 16, 2025_
_Next Review: End of day October 16, 2025_
