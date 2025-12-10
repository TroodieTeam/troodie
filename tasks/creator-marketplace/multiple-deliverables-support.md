# Multiple Deliverables Support - Engineering Task

## Overview
Currently, creators can only submit one post/deliverable per campaign application. This task tracks the implementation of support for multiple posts/deliverables, allowing creators to submit multiple pieces of content (e.g., Instagram post + TikTok video + YouTube video) for a single campaign in one session.

---

## 🎯 Goal
Enable creators to submit multiple posts/deliverables for a single campaign, with proper tracking, review, and approval workflows for each individual deliverable.

---

## 📍 Current State

### Limitations
- **Single Submission**: Only one post URL can be submitted per deliverable submission
- **No Batch Workflow**: Creators must submit each deliverable separately
- **Limited Tracking**: No way to see progress on multi-deliverable campaigns
- **Manual Process**: Creators must navigate back and submit multiple times

### Affected Files
- `app/creator/campaigns/[id]/submit-deliverable.tsx` - Main submission UI
- `services/deliverableSubmissionService.ts` - Submission service layer
- Database schema (may need adjustments to `campaign_deliverables` table)

---

## 🚀 Implementation Requirements

### 1. UI/UX Changes

#### Submit Deliverable Screen
- [ ] Convert single form to multi-deliverable form
- [ ] Add "Add Another Post" button after first submission
- [ ] Display list of added posts before final submission
- [ ] Allow editing/removing posts before submission
- [ ] Show progress indicator (e.g., "Post 1 of 3")
- [ ] Support different platforms per deliverable
- [ ] Individual validation per post URL
- [ ] Batch validation before final submission

#### State Management
- [ ] Convert single deliverable state to array-based state
  - Current: `postUrl`, `screenshotUri`, `caption`, `notes`
  - Future: Array of deliverable objects
- [ ] Track validation state per deliverable
- [ ] Handle partial failures gracefully
- [ ] Show submission progress for batch operations

### 2. Service Layer Updates

#### `deliverableSubmissionService.ts`
- [ ] Add `submitMultipleDeliverables()` function
  - Accepts array of `SubmitDeliverableParams`
  - Returns array of results with success/error per deliverable
- [ ] Update `deliverable_index` calculation
  - Query existing deliverables for campaign
  - Calculate next index based on count
- [ ] Add transaction support for batch operations
  - Ensure all-or-nothing submission option
  - Or allow partial success with detailed error reporting
- [ ] Add duplicate URL detection within batch
- [ ] Add progress tracking/callbacks for batch submissions

### 3. Database Considerations

#### Schema Updates (if needed)
- [ ] Review `campaign_deliverables` table structure
- [ ] Ensure `deliverable_index` supports multiple entries
- [ ] Consider adding `deliverable_group_id` for batch relationships
- [ ] Verify foreign key constraints allow multiple deliverables per application
- [ ] Check RLS policies support multiple submissions

#### Queries
- [ ] Update queries to fetch all deliverables for a campaign
- [ ] Add aggregation queries for deliverable counts
- [ ] Support filtering by deliverable status across batch

### 4. Review/Approval Flow

#### Restaurant Review
- [ ] Update review UI to show all deliverables for a campaign
- [ ] Allow individual approval/rejection per deliverable
- [ ] Support partial approvals (some approved, some pending)
- [ ] Update notification system for multi-deliverable reviews
- [ ] Track approval status per deliverable

#### Auto-Approval
- [ ] Ensure auto-approval logic works per deliverable
- [ ] Handle 72-hour timer per individual deliverable
- [ ] Process payments per approved deliverable

### 5. Creator Experience

#### Progress Tracking
- [ ] Show deliverable submission status in "My Campaigns"
- [ ] Display count: "3 of 5 deliverables submitted"
- [ ] Show individual status per deliverable (pending/approved/rejected)
- [ ] Allow creators to submit remaining deliverables
- [ ] Show which deliverables are still needed

#### Campaign Requirements
- [ ] Display campaign requirements clearly
- [ ] Show which deliverables fulfill which requirements
- [ ] Allow creators to see what's already submitted
- [ ] Prevent duplicate submissions (same URL)

---

## 🔧 Technical Implementation Details

### State Structure Example
```typescript
interface DeliverableFormData {
  url: string;
  platform: DeliverablePlatform | null;
  screenshotUri: string | null;
  caption: string;
  notes: string;
  isValid: boolean;
  validationError?: string;
}

const [deliverables, setDeliverables] = useState<DeliverableFormData[]>([
  {
    url: '',
    platform: null,
    screenshotUri: null,
    caption: '',
    notes: '',
    isValid: false
  }
]);
```

### Submission Flow
1. Creator adds first deliverable (URL, platform, optional screenshot)
2. Validation runs per deliverable
3. Creator can add more deliverables via "Add Another Post"
4. All deliverables shown in list with edit/remove options
5. Final submission validates all deliverables
6. Batch submission with progress tracking
7. Success/error handling per deliverable
8. Redirect to campaign view showing submission status

### Error Handling
- **Partial Failures**: Some deliverables succeed, some fail
  - Show which ones succeeded
  - Allow retry for failed ones
  - Don't lose successful submissions
- **Validation Errors**: Per-deliverable validation
  - Show errors inline per deliverable
  - Prevent submission of invalid deliverables
  - Allow fixing errors without losing other data
- **Network Errors**: Handle timeouts/connection issues
  - Retry mechanism for failed submissions
  - Save draft state locally
  - Resume submission later

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Update state management to support array of deliverables
- [ ] Create deliverable form component (reusable)
- [ ] Add "Add Another Post" UI
- [ ] Implement deliverable list display
- [ ] Add edit/remove functionality for deliverables

### Phase 2: Service Layer (Week 1-2)
- [ ] Create `submitMultipleDeliverables()` function
- [ ] Update `deliverable_index` calculation logic
- [ ] Add batch validation
- [ ] Implement duplicate URL detection
- [ ] Add transaction support
- [ ] Add progress tracking callbacks

### Phase 3: Database & Queries (Week 2)
- [ ] Review and update database queries
- [ ] Test multiple deliverables per campaign
- [ ] Verify RLS policies
- [ ] Add aggregation queries for counts
- [ ] Test deliverable_index calculation

### Phase 4: Review Flow (Week 2-3)
- [ ] Update restaurant review UI
- [ ] Implement individual approval/rejection
- [ ] Update notification system
- [ ] Test auto-approval per deliverable
- [ ] Update payment processing

### Phase 5: Progress Tracking (Week 3)
- [ ] Add deliverable status to "My Campaigns"
- [ ] Show submission progress
- [ ] Allow submitting remaining deliverables
- [ ] Display individual deliverable status
- [ ] Add completion indicators

### Phase 6: Testing & Polish (Week 3-4)
- [ ] End-to-end testing
- [ ] Error handling testing
- [ ] Performance testing (batch submissions)
- [ ] UI/UX polish
- [ ] Documentation updates

---

## 🎨 UI/UX Considerations

### User Flow
1. Creator navigates to "Submit Deliverable"
2. Sees campaign requirements
3. Adds first post URL (with validation)
4. Optionally adds screenshot, caption, notes
5. Clicks "Add Another Post" button
6. New form appears below
7. Repeats for all required deliverables
8. Reviews list of all deliverables
9. Can edit/remove any before submission
10. Submits all at once
11. Sees progress indicator during submission
12. Gets confirmation with breakdown of submissions

### Visual Design
- **Deliverable Cards**: Each deliverable in its own card
- **Progress Indicator**: "Submitting 2 of 5 deliverables..."
- **Status Badges**: Per-deliverable status (pending/approved/rejected)
- **Add Button**: Prominent "Add Another Post" button
- **List View**: Scrollable list of added deliverables
- **Edit/Remove**: Quick actions per deliverable

---

## 🐛 Edge Cases & Considerations

### Edge Cases
- [ ] Creator adds deliverable but doesn't submit (draft state)
- [ ] Creator submits some, then adds more later
- [ ] Campaign requirements change after partial submission
- [ ] Creator submits duplicate URLs
- [ ] Network failure during batch submission
- [ ] Creator closes app mid-submission
- [ ] Restaurant reviews some but not all deliverables
- [ ] Auto-approval triggers for some but not all

### Performance
- [ ] Batch submission performance (multiple API calls)
- [ ] Large number of deliverables (10+)
- [ ] Image upload performance for multiple screenshots
- [ ] Validation performance for multiple URLs

### Data Integrity
- [ ] Ensure deliverable_index is always sequential
- [ ] Prevent duplicate submissions
- [ ] Maintain referential integrity
- [ ] Handle concurrent submissions

---

## 📊 Success Metrics

### User Experience
- [ ] Creators can submit multiple deliverables in one session
- [ ] Submission time reduced (vs. multiple separate submissions)
- [ ] Clear progress tracking
- [ ] Low error rate on batch submissions

### Technical
- [ ] All deliverables properly tracked in database
- [ ] Individual review/approval works correctly
- [ ] Payment processing handles partial approvals
- [ ] No data loss on partial failures

---

## 🔗 Related Files

### Primary Files
- `app/creator/campaigns/[id]/submit-deliverable.tsx` - Main UI component
- `services/deliverableSubmissionService.ts` - Service layer
- `types/deliverableRequirements.ts` - Type definitions

### Related Features
- Campaign application flow
- Deliverable review/approval
- Payment processing
- Notification system

---

## 📝 Notes

- Consider creating a shared `DeliverableForm` component for reusability
- May want to add "Save Draft" functionality for multi-deliverable submissions
- Consider adding deliverable templates for common combinations
- Think about bulk actions (approve all, reject all) for restaurants
- Consider analytics on deliverable submission patterns

---

## 🚦 Priority: **High**

This feature significantly improves creator experience by reducing friction in submitting multiple deliverables for campaigns that require multiple posts across different platforms.

---

## 📅 Estimated Timeline

**Total**: 3-4 weeks
- **Phase 1-2**: 1-2 weeks (Foundation + Service Layer)
- **Phase 3-4**: 1 week (Database + Review Flow)
- **Phase 5-6**: 1 week (Progress Tracking + Testing)

---

## ✅ Acceptance Criteria

- [ ] Creators can add multiple post URLs in one submission session
- [ ] Each deliverable can have different platform, screenshot, caption, notes
- [ ] All deliverables are validated before submission
- [ ] Batch submission works with progress tracking
- [ ] Partial failures are handled gracefully
- [ ] Individual deliverables can be reviewed/approved separately
- [ ] Progress is clearly displayed in "My Campaigns"
- [ ] Creators can submit remaining deliverables after partial submission
- [ ] No duplicate submissions allowed
- [ ] All edge cases handled properly




