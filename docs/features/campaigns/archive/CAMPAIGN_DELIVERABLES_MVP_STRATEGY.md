# Campaign Deliverables MVP Strategy

**Project:** Troodie Creator Marketplace
**Date:** 2025-10-12
**Status:** MVP Planning Phase

## Executive Summary

This document addresses critical questions from the team meeting about campaign deliverables, verification, and payment workflows. Based on codebase analysis, we have identified gaps in the current implementation and propose a phased MVP approach focused on simplicity, trust-building, and fraud prevention.

---

## Current State Analysis

### What Exists:
- ✅ Campaign creation and browsing UI
- ✅ Campaign application system (`campaign_applications` table)
- ✅ Database schema for tracking deliverables (`creator_campaigns` table)
- ✅ Earnings and payout tables (`creator_earnings`, `creator_payouts`)
- ✅ Mock data and campaign types defined

### What's Missing:
- ❌ Deliverable submission UI flow
- ❌ Restaurant verification/approval workflow
- ❌ Auto-approval after timeout
- ❌ Payment processing integration
- ❌ Dispute resolution process
- ❌ External content verification (Instagram/TikTok)
- ❌ Creator onboarding requirements enforcement

---

## Question 1: What Does "Campaign Deliverables" Look Like?

### MVP Answer:
A deliverable is **proof of external social media content** posted according to campaign requirements.

### Standard Deliverable Format (MVP):
```typescript
interface CampaignDeliverable {
  id: string;
  type: 'social_post' | 'story' | 'reel' | 'video';
  platform: 'instagram' | 'tiktok' | 'youtube';

  // What creator submits:
  proof: {
    url: string;                    // Link to post (required)
    screenshot_url?: string;        // Screenshot of post (optional but recommended)
    caption: string;                // What they wrote
    engagement_metrics?: {          // Self-reported initially
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
    }
  };

  // Submission metadata:
  submitted_at: timestamp;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  restaurant_feedback?: string;
}
```

### What Counts as Valid (Phase 1):
1. **Must have**: A working URL to the social post
2. **Should have**: A screenshot showing the post exists
3. **Must match**: Campaign requirements (hashtags, mentions, content type)

### Validation Rules:
- URL must be from approved platforms (Instagram, TikTok)
- Post must be public and viewable
- Post date must be within campaign period
- Must include required campaign hashtags/mentions

---

## Question 2: How Should Creators Upload Deliverables?

### MVP User Flow:

#### Creator Side:
```
My Campaigns (Active Tab)
  └─> Campaign Card
      └─> Tap "Submit Deliverable" Button
          └─> Deliverable Submission Modal
              ├─> Select Deliverable Type (from campaign requirements)
              ├─> Paste Social Media URL (Instagram/TikTok link)
              ├─> [Optional] Upload Screenshot
              ├─> Add Notes/Caption
              └─> Submit for Review
```

#### Technical Implementation:
```typescript
// New screen: app/creator/submit-deliverable.tsx
interface DeliverableSubmission {
  campaign_id: string;
  creator_campaign_id: string;
  deliverable_index: number;      // Which deliverable (1, 2, 3...)

  // Required fields
  platform: 'instagram' | 'tiktok';
  post_url: string;

  // Optional but encouraged
  screenshot_file?: File;
  caption?: string;
  notes_to_restaurant?: string;

  // Auto-captured
  submitted_at: timestamp;
  submission_ip?: string;
}
```

#### UI Components Needed:
1. **Deliverable Submission Form** - New component
2. **URL Validator** - Check URL format and platform
3. **Screenshot Uploader** - Use existing image upload service
4. **Submission Confirmation** - Success state

#### Database Changes:
```sql
-- Add to creator_campaigns table:
ALTER TABLE creator_campaigns ADD COLUMN deliverables_submitted JSONB DEFAULT '[]';

-- Structure:
-- [
--   {
--     deliverable_id: "1",
--     platform: "instagram",
--     post_url: "https://instagram.com/p/...",
--     screenshot_url: "https://storage.../proof.jpg",
--     caption: "Amazing tacos at...",
--     notes: "Posted on 3/15, got great engagement",
--     submitted_at: "2025-03-15T10:00:00Z",
--     status: "pending",
--     reviewed_at: null,
--     restaurant_feedback: null
--   }
-- ]
```

---

## Question 3: Restaurant Confirmation Process & Deadlines

### MVP Approval Workflow:

#### Option A: Auto-Approve After Timeout (Recommended for MVP)
```
Creator Submits → Restaurant Notified →
  ├─> Restaurant Approves (within 3 days) → Payment Released
  ├─> Restaurant Rejects (within 3 days) → Creator Notified, Can Resubmit
  └─> No Response (after 3 days) → AUTO-APPROVE → Payment Released
```

#### Option B: Manual Review Required (More control, slower)
```
Creator Submits → Admin Review → Restaurant Review → Payment
```

### Recommendation: **Option A with 3-Day Auto-Approve**

#### Why 3 Days?
- Gives restaurants reasonable time to review
- Not so long that creators feel stuck
- Industry standard (Fiverr uses 3 days, Upwork uses 2 weeks)
- Restaurants can request extension if needed

#### Restaurant Dashboard Flow:
```
Business Dashboard
  └─> Campaigns Tab
      └─> Active Campaign
          └─> "Pending Deliverables (2)" Badge
              └─> Deliverables Review Screen
                  ├─> View submitted content
                  ├─> See countdown timer (72 hours remaining)
                  ├─> Options:
                  │   ├─> ✅ Approve → Release Payment
                  │   ├─> ❌ Request Changes → Send back with notes
                  │   └─> 🚫 Reject → Flag for admin review
                  └─> If no action → Auto-approve after 72h
```

#### Implementation:
```typescript
// New service: deliverableReviewService.ts

interface ReviewAction {
  deliverable_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  feedback?: string;
  reviewer_id: string;
}

// Cron job (run every hour):
// Check creator_campaigns where:
//   - deliverables_submitted has items with status='pending'
//   - submitted_at > 72 hours ago
//   - Auto-approve and trigger payment
```

---

## Question 4: Auto-Approval Timeline & Escalation

### Recommended Timeline:

| Stage | Duration | Action |
|-------|----------|--------|
| **Submission** | Day 0 | Creator submits deliverable |
| **Restaurant Review** | Days 0-3 | Restaurant has 72 hours to review |
| **24h Warning** | Day 2 | Email/push notification: "24 hours left to review" |
| **Auto-Approve** | Day 3 | If no response, automatically approve |
| **Payment Processing** | Day 3-5 | Process payout (Stripe transfer time) |
| **Dispute Window** | Days 3-10 | Restaurant can still dispute (admin review) |

### Escalation Paths:

#### If Restaurant is Unresponsive:
1. **Hour 48**: Send urgent notification
2. **Hour 60**: Email restaurant owner directly
3. **Hour 72**: Auto-approve, release payment
4. **Post-auto-approve**: Restaurant can still dispute within 7 days

#### If Creator Never Submits:
1. **7 days before deadline**: Reminder notification
2. **3 days before deadline**: Urgent reminder
3. **At deadline**: Campaign marked incomplete, no payment
4. **Restaurant options**: Re-open slot, partial refund, or close campaign

#### If There's a Dispute:
```
Dispute Filed →
  ├─> Admin Review (within 48h)
  ├─> Request evidence from both parties
  ├─> Make decision
  └─> Options:
      ├─> Approve (pay creator, mark complete)
      ├─> Partial payment (split difference)
      ├─> Reject (refund restaurant, mark incomplete)
      └─> Request revision (creator has 48h to fix)
```

### Edge Cases:

**Q: What if restaurant marks ALL deliverables as "needs changes"?**
- A: After 2 revision requests, automatically escalate to admin review
- Creator can flag as "bad faith rejection"

**Q: What if creator submits obviously fake content?**
- A: Restaurant rejects with evidence → Admin review → Potential creator account suspension

**Q: What if payment fails (expired card, insufficient funds)?**
- A: Hold deliverable in "pending_payment" state, notify creator, retry in 24h, escalate after 3 failures

---

## Question 5: Payment Setup & Creator Onboarding Requirements

### Before Creators Can Apply to Campaigns:

#### Phase 1 (MVP - Required):
```typescript
interface CreatorOnboardingChecklist {
  ✅ account_created: boolean;           // Basic signup
  ✅ beta_code_verified: boolean;        // Current gate
  ✅ portfolio_uploaded: boolean;        // 3-5 sample photos
  ⚠️ payment_method_added: boolean;      // NEW - Stripe Connect
  ⚠️ terms_accepted: boolean;            // NEW - Creator terms
  ❌ profile_completed: boolean;         // Nice to have
}
```

#### NEW Requirements for Campaign Applications:

1. **Payment Method Setup**
   - Link Stripe Connect account
   - Verify bank account or debit card
   - Complete tax information (W-9 for US creators)

2. **Creator Agreement**
   - Accept marketplace terms
   - Understand payment timeline
   - Agree to content ownership rights
   - Acknowledge dispute resolution process

3. **Profile Completion (Soft Requirement)**
   - Bio describing content style
   - Social media handles (for verification)
   - Content categories/specialties
   - Location (for local campaigns)

#### Implementation Plan:

**Step 1: Update Creator Onboarding Flow**
```typescript
// app/creator/onboarding.tsx - Add new steps

Step 1: Beta Code ✅ (existing)
Step 2: Upload Portfolio ✅ (existing)
Step 3: Connect Payment Method ⚠️ (NEW)
  └─> Stripe Connect integration
  └─> "You'll need this to get paid"
Step 4: Accept Terms ⚠️ (NEW)
  └─> Simple checkbox + link to terms
  └─> "I understand payment terms and dispute process"
Step 5: Complete Profile (Optional)
  └─> Can skip and complete later
```

**Step 2: Add Onboarding Gate to Campaign Applications**
```typescript
// app/creator/explore-campaigns.tsx

const canApplyToCampaigns = () => {
  return (
    creator.payment_method_verified &&
    creator.terms_accepted &&
    creator.portfolio_uploaded
  );
};

// Show warning if not complete:
if (!canApplyToCampaigns()) {
  return (
    <Alert>
      Complete your creator profile to apply to campaigns:
      {!payment_method_verified && "• Add payment method"}
      {!terms_accepted && "• Accept creator terms"}
    </Alert>
  );
}
```

**Step 3: Creator Dashboard Education**
```typescript
// Add to app/creator/dashboard.tsx

<OnboardingProgressCard>
  <ProgressBar current={3} total={5} />
  <ChecklistItem checked={true}>Portfolio uploaded</ChecklistItem>
  <ChecklistItem checked={false}>Payment method added</ChecklistItem>
  <ChecklistItem checked={false}>Creator terms accepted</ChecklistItem>
  <Button>Complete Setup</Button>
</OnboardingProgressCard>
```

---

## Question 6: Off-Platform Verification (Instagram/TikTok)

### The Challenge:
Most campaigns direct creators to post on external platforms, but Troodie can't directly verify these posts without API access.

### MVP Solution: Trust-Based with Spot Checks

#### Phase 1: Manual Verification
1. Creator submits post URL
2. Restaurant clicks through and verifies manually
3. Optional: Creator uploads screenshot as backup proof
4. System stores URL for future reference

#### Phase 2: Basic Automation (Post-MVP)
```typescript
// services/socialMediaVerificationService.ts

interface VerificationResult {
  url_valid: boolean;
  post_exists: boolean;
  post_date: Date | null;
  hashtags_found: string[];
  mentions_found: string[];
  confidence_score: number;
}

// Use web scraping or APIs to check:
async function verifySocialPost(url: string): Promise<VerificationResult> {
  // 1. Check URL is accessible
  // 2. Extract public data (without API)
  // 3. Verify hashtags/mentions present
  // 4. Check post date is valid
  // 5. Return confidence score
}
```

### Fraud Prevention Strategies:

#### Red Flags System:
- [ ] Post deleted shortly after approval
- [ ] URL doesn't match submitted screenshot
- [ ] Same URL submitted multiple times
- [ ] Creator applies with 0 followers
- [ ] Restaurant reports fake engagement

#### Trust Score System:
```typescript
interface CreatorTrustScore {
  successful_campaigns: number;
  dispute_rate: number;
  response_time_avg: number;
  restaurant_ratings_avg: number;
  score: number; // 0-100
}

// Low trust creators:
// - Require screenshot + URL
// - Manual admin review before payment
// - Shorter auto-approve window

// High trust creators:
// - Can submit URL only
// - Faster payment release
// - Higher campaign access
```

### Implementation Priority:

**Week 1-2 (MVP):**
- Simple URL + optional screenshot submission
- Restaurant manual verification
- No automated checking

**Week 3-4 (Enhanced):**
- URL validation (format, platform check)
- Screenshot requirement for new creators
- Flag suspicious patterns

**Month 2+ (Advanced):**
- Automated post verification
- Instagram/TikTok API integration (if available)
- ML-based fraud detection

---

## Question 7: Campaign Types Beyond Social Media

### Current Focus: Social Media Only (MVP)

The MVP should focus exclusively on social media posts because:
- ✅ Easy to verify (public URL)
- ✅ Clear deliverable format
- ✅ Matches creator expectations
- ✅ Restaurant can see reach/engagement

### Future Campaign Types (Post-MVP):

```typescript
enum CampaignType {
  // Phase 1 (MVP):
  SOCIAL_POST = 'social_post',
  INSTAGRAM_STORY = 'instagram_story',
  TIKTOK_VIDEO = 'tiktok_video',
  INSTAGRAM_REEL = 'instagram_reel',

  // Phase 2 (Q2 2025):
  BLOG_ARTICLE = 'blog_article',
  YOUTUBE_VIDEO = 'youtube_video',
  PHOTO_SHOOT = 'photo_shoot',

  // Phase 3 (Q3 2025):
  IN_PERSON_EVENT = 'in_person_event',
  TESTIMONIAL = 'testimonial',
  REVIEW = 'review',
  USER_GENERATED_CONTENT = 'ugc',
}
```

### Flexible Deliverable System Design:

```typescript
// Design for extensibility:
interface CampaignDeliverable {
  id: string;
  type: CampaignType;

  // Generic fields:
  title: string;
  description: string;
  requirements: string[];

  // Type-specific config:
  submission_format: {
    required_fields: string[];      // ['url', 'screenshot']
    optional_fields: string[];      // ['engagement_metrics', 'notes']
    file_types?: string[];          // ['image/jpeg', 'video/mp4']
    max_file_size?: number;         // in MB
    external_url_required?: boolean;
    proof_types: ProofType[];       // ['link', 'screenshot', 'file_upload']
  };

  // Validation rules:
  verification: {
    auto_verify: boolean;
    manual_review_required: boolean;
    verification_criteria: string[];
  };
}
```

### When to Add New Types:

**Signals to expand:**
- 5+ restaurants request same non-social deliverable
- Creators asking for different content types
- Competitive pressure from other platforms
- Revenue opportunity is significant

**Before adding new types, ensure:**
- Verification process is defined
- Payment implications are clear
- Support team can handle issues
- Legal/rights are understood

---

## Question 8: Dispute Resolution & Support Process

### Dispute Types:

```typescript
enum DisputeType {
  DELIVERABLE_INCOMPLETE = 'deliverable_incomplete',
  DELIVERABLE_FAKE = 'deliverable_fake',
  PAYMENT_NOT_RECEIVED = 'payment_not_received',
  RESTAURANT_UNRESPONSIVE = 'restaurant_unresponsive',
  CONTENT_TAKEN_DOWN = 'content_taken_down',
  QUALITY_ISSUE = 'quality_issue',
  OTHER = 'other',
}
```

### MVP Dispute Flow:

#### Step 1: Who Can File a Dispute?
- **Creator**: If not paid 7 days after approval
- **Restaurant**: If deliverable doesn't meet requirements (within 7 days of auto-approval)
- **Admin**: Can initiate if fraud detected

#### Step 2: Dispute Submission
```typescript
// New screen: app/disputes/create-dispute.tsx

interface Dispute {
  type: DisputeType;
  campaign_id: string;
  creator_campaign_id: string;
  filed_by: 'creator' | 'restaurant';

  description: string;
  evidence_urls: string[];      // Screenshots, links, etc.
  requested_resolution: string; // What they want to happen

  status: 'open' | 'under_review' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}
```

#### Step 3: Triage Process
```
Dispute Filed →
  ├─> Auto-categorize by type
  ├─> Check if simple resolution possible
  │   ├─> Payment failed? → Retry payment
  │   ├─> URL broken? → Request new URL
  │   └─> Minor quality issue? → Offer partial payment
  └─> Assign to admin queue
```

#### Step 4: Admin Review Process

**Admin Dashboard View:**
```typescript
// New screen: app/admin/disputes.tsx

interface DisputeReviewScreen {
  dispute_details: Dispute;
  creator_history: {
    total_campaigns: number;
    dispute_rate: number;
    success_rate: number;
  };
  restaurant_history: {
    total_campaigns: number;
    rejection_rate: number;
    avg_review_time: number;
  };
  evidence: {
    submitted_content: DeliverableSubmission[];
    messages: Message[];
    screenshots: string[];
  };
  admin_actions: [
    'approve_deliverable',
    'reject_deliverable',
    'offer_partial_payment',
    'request_more_info',
    'suspend_creator',
    'warn_restaurant',
    'escalate_to_legal'
  ];
}
```

#### Step 5: Resolution Options

**For Creator Disputes:**
1. **Force Payment** - Restaurant didn't respond, payment released
2. **Refund Restaurant** - Creator's content was fake/inadequate
3. **Partial Payment** - Compromise (e.g., 50% if partially complete)
4. **Require Revision** - Give creator one more chance to fix

**For Restaurant Disputes:**
1. **Uphold Deliverable** - Content was adequate, payment stands
2. **Refund Restaurant** - Content didn't meet requirements
3. **Compromise** - Partial refund, partial payment to creator
4. **Blacklist Creator** - If fraud is confirmed

### Response Time SLAs:

| Priority | Initial Response | Resolution Target |
|----------|------------------|-------------------|
| Urgent | 2 hours | 24 hours |
| High | 12 hours | 48 hours |
| Medium | 24 hours | 3-5 days |
| Low | 48 hours | 1 week |

### Support Contact Flow:

**Option 1: In-App Support Tickets (Recommended)**
```
My Campaigns → Campaign Details → "Need Help?" Button →
  ├─> Select Issue Type
  ├─> Describe Problem
  ├─> Attach Evidence
  └─> Submit Ticket
```

**Option 2: Email Support**
- support@troodieapp.com
- Auto-route to admin dashboard
- Create ticket automatically

**Option 3: Live Chat (Post-MVP)**
- For high-priority issues only
- Business hours only initially

### Preventing Disputes (Proactive):

1. **Clear Expectations**
   - Campaign requirements are specific
   - Example posts shown to creators
   - Approval criteria stated upfront

2. **Communication Prompts**
   - "Message restaurant before submitting"
   - "Not sure if this meets requirements? Ask first"
   - Restaurant can preview before formal submission

3. **Milestone Check-ins**
   - Day 3: "How's your campaign going?"
   - Day 7: "Need an extension?"
   - Post-submission: "Did you review the deliverable?"

---

## Implementation Roadmap

### Phase 1: MVP Core (Weeks 1-4)

**Week 1: Deliverable Submission**
- [ ] Build deliverable submission form UI
- [ ] Add URL validation
- [ ] Create screenshot upload flow
- [ ] Update `creator_campaigns` table structure
- [ ] Add submission notifications

**Week 2: Restaurant Review Dashboard**
- [ ] Build restaurant deliverable review screen
- [ ] Add approve/reject/request changes actions
- [ ] Create countdown timer for auto-approve
- [ ] Add email notifications for pending reviews

**Week 3: Auto-Approval & Payment Trigger**
- [ ] Create cron job for auto-approval (72h)
- [ ] Build payment trigger system
- [ ] Add warning notifications (24h before auto-approve)
- [ ] Create payment processing queue

**Week 4: Payment Integration**
- [ ] Integrate Stripe Connect for creator payouts
- [ ] Add payment method setup to onboarding
- [ ] Build payout request flow
- [ ] Create earnings dashboard for creators

### Phase 2: Trust & Safety (Weeks 5-8)

**Week 5: Verification Enhancements**
- [ ] Add screenshot requirement for new creators
- [ ] Build URL validation service
- [ ] Create trust score system
- [ ] Add fraud detection flags

**Week 6: Dispute System**
- [ ] Build dispute filing UI
- [ ] Create admin dispute dashboard
- [ ] Add dispute resolution workflows
- [ ] Implement resolution tracking

**Week 7: Enhanced Onboarding**
- [ ] Add creator terms acceptance
- [ ] Build onboarding progress tracker
- [ ] Create educational tooltips
- [ ] Add pre-application requirements checker

**Week 8: Analytics & Monitoring**
- [ ] Build campaign performance dashboard
- [ ] Add deliverable submission analytics
- [ ] Create auto-approval metrics
- [ ] Monitor dispute rates

### Phase 3: Optimization (Weeks 9-12)

**Week 9: Advanced Verification**
- [ ] Implement basic social media verification
- [ ] Add post existence checking
- [ ] Create engagement metrics tracking
- [ ] Build verification confidence scores

**Week 10: Communication Tools**
- [ ] Add in-app messaging between creator/restaurant
- [ ] Create notification preference controls
- [ ] Build email digest system
- [ ] Add SMS notifications for urgent items

**Week 11: Quality Improvements**
- [ ] Add deliverable templates/examples
- [ ] Create submission guidelines
- [ ] Build best practices education
- [ ] Add campaign preview mode

**Week 12: Scale Prep**
- [ ] Performance optimization
- [ ] Load testing payment system
- [ ] Security audit
- [ ] Documentation completion

---

## Success Metrics

### Phase 1 Targets (Month 1):
- ⚡ **Deliverable submission rate**: >80% of accepted creators submit
- ⏱️ **Average review time**: <48 hours
- ✅ **Auto-approval rate**: <30% (restaurants should review most)
- 💰 **Payment success rate**: >95%
- 🔴 **Dispute rate**: <10%

### Phase 2 Targets (Month 2-3):
- 📈 **Repeat creator rate**: >40%
- ⭐ **Creator satisfaction**: >4.2/5
- 🏪 **Restaurant satisfaction**: >4.0/5
- ⚖️ **Dispute resolution time**: <5 days average
- 💵 **Payment processing time**: <7 days from approval

### Key Health Metrics to Monitor:
- **Submission abandonment rate** - How many start but don't submit?
- **Revision request rate** - How often do restaurants request changes?
- **Auto-approve trigger rate** - Sign of restaurant disengagement
- **Payment failure rate** - Issues with creator bank accounts
- **Support ticket volume** - Are things confusing?

---

## Risk Mitigation

### Risk 1: Creator Payment Fraud
**Mitigation:**
- Start with smaller payouts ($25-50) in MVP
- Require portfolio and trust score for higher payouts
- Screenshot + URL required for first 3 campaigns
- Admin review for new creators

### Risk 2: Restaurant Non-Response
**Mitigation:**
- 3-day auto-approve protects creators
- Email escalation at 24h and 48h
- Allow 7-day post-approval dispute window
- Track restaurant response times

### Risk 3: Platform Disputes
**Mitigation:**
- Clear terms of service
- Evidence collection built into flow
- Admin review for all disputes
- Partial payment option for grey areas

### Risk 4: Payment Processing Failures
**Mitigation:**
- Retry logic for failed transfers
- Clear error messaging
- Support contact prominent
- Hold funds in escrow during dispute

### Risk 5: Content Verification Challenges
**Mitigation:**
- Start with trust-based system
- Add verification for new creators
- Build trust scores over time
- Manual spot-checking by admins

---

## Technical Debt & Future Considerations

### Known Limitations in MVP:
1. **No automated social media verification** - Relies on trust + manual review
2. **Simple linear workflow** - No partial submissions or milestones
3. **Basic dispute resolution** - No negotiation features
4. **Manual payout processing** - No bulk payout automation
5. **Limited campaign types** - Social media only

### Post-MVP Enhancements:
- API integrations with Instagram/TikTok Business APIs
- Automated engagement metrics tracking
- AI-powered content quality scoring
- Smart campaign matching algorithms
- Multi-currency support for international creators
- Bulk campaign management for restaurant chains
- Advanced analytics and ROI tracking

---

## Next Steps

### Immediate Actions (This Week):
1. **Product Team**: Review and approve this strategy
2. **Engineering**: Size effort for Phase 1 implementation
3. **Design**: Create mockups for deliverable submission flow
4. **Legal**: Draft creator payment terms and dispute policy
5. **Finance**: Set up Stripe Connect account structure

### Week 1 Kickoff:
1. Create detailed tickets for deliverable submission UI
2. Set up Stripe Connect sandbox for testing
3. Write technical specs for auto-approval system
4. Design restaurant review dashboard
5. Draft user education content

### Success Criteria for MVP Launch:
- [ ] 10 test campaigns completed successfully
- [ ] 5 creators paid out without issues
- [ ] 3 test disputes resolved within SLA
- [ ] Restaurant review time averaging <36 hours
- [ ] Zero fraud incidents in testing
- [ ] All payment flows working in production
- [ ] Support documentation complete

---

## Appendix A: Database Schema Changes

```sql
-- Add deliverables submission tracking to creator_campaigns
ALTER TABLE creator_campaigns ADD COLUMN IF NOT EXISTS deliverables_submitted JSONB DEFAULT '[]';
ALTER TABLE creator_campaigns ADD COLUMN IF NOT EXISTS all_deliverables_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE creator_campaigns ADD COLUMN IF NOT EXISTS restaurant_review_deadline TIMESTAMPTZ;
ALTER TABLE creator_campaigns ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;

-- Create disputes table
CREATE TABLE campaign_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  creator_campaign_id UUID REFERENCES creator_campaigns(id),

  filed_by VARCHAR(20) CHECK (filed_by IN ('creator', 'restaurant', 'admin')),
  filer_id UUID REFERENCES auth.users(id),

  type VARCHAR(50),
  description TEXT,
  evidence_urls TEXT[],
  requested_resolution TEXT,

  status VARCHAR(20) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'medium',

  assigned_to UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment events log
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_campaign_id UUID REFERENCES creator_campaigns(id),
  earning_id UUID REFERENCES creator_earnings(id),

  event_type VARCHAR(50), -- 'triggered', 'processing', 'completed', 'failed'
  amount_cents INTEGER,

  stripe_transfer_id VARCHAR(255),
  failure_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_disputes_status ON campaign_disputes(status);
CREATE INDEX idx_disputes_created ON campaign_disputes(created_at);
CREATE INDEX idx_payment_events_campaign ON payment_events(creator_campaign_id);
```

---

## Appendix B: API Endpoints Needed

```typescript
// Creator Deliverable Submission
POST   /api/campaigns/:campaign_id/deliverables
GET    /api/campaigns/:campaign_id/deliverables
PUT    /api/campaigns/:campaign_id/deliverables/:id

// Restaurant Review
GET    /api/business/campaigns/:campaign_id/pending-deliverables
POST   /api/business/deliverables/:id/approve
POST   /api/business/deliverables/:id/reject
POST   /api/business/deliverables/:id/request-changes

// Payment Processing
POST   /api/creator/earnings/:id/request-payout
GET    /api/creator/earnings
GET    /api/creator/payouts

// Disputes
POST   /api/disputes
GET    /api/disputes/:id
PUT    /api/disputes/:id/resolve
GET    /api/admin/disputes

// Verification
POST   /api/verify/social-url
GET    /api/creator/:id/trust-score
```

---

## Appendix C: Email Templates Needed

1. **Deliverable Submitted** (to Restaurant)
   - Subject: "New deliverable from [Creator] for [Campaign]"
   - CTA: "Review Deliverable"
   - Countdown: "Review by [Date] or it will auto-approve"

2. **24 Hour Warning** (to Restaurant)
   - Subject: "Action needed: Deliverable auto-approves in 24 hours"
   - Urgency: High
   - CTA: "Review Now"

3. **Auto-Approved** (to Restaurant & Creator)
   - To Restaurant: "Deliverable auto-approved, payment released"
   - To Creator: "Your deliverable was approved! Payment processing."

4. **Deliverable Approved** (to Creator)
   - Subject: "[Restaurant] approved your deliverable!"
   - Payment timeline: "Expect payment in 3-5 days"

5. **Changes Requested** (to Creator)
   - Subject: "[Restaurant] requested changes to your deliverable"
   - What to fix: [Feedback]
   - Deadline: "Resubmit by [Date]"

6. **Payment Processed** (to Creator)
   - Subject: "You've been paid $[Amount] for [Campaign]!"
   - Transaction details
   - Earnings history link

7. **Dispute Filed** (to Both Parties + Admin)
   - Subject: "Dispute filed for [Campaign]"
   - Case number
   - Expected resolution time

---

**Document Version**: 1.0
**Last Updated**: 2025-10-12
**Next Review**: After Phase 1 completion
