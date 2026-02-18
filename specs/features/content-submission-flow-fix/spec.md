# Content Submission Flow Fix Technical Specification

> Status: APPROVED
> Created: 2026-02-17
> Source: Raw ticket — Content Submission Flow is Backwards
> Feature: content-submission-flow-fix

## Overview

Redesign the content submission flow so creators upload video/content for restaurant review BEFORE posting to social platforms. The current flow is backwards: creators paste published post links (content already public) before getting restaurant approval. The correct flow is: upload content for review → get approval → post to platforms → submit proof links.

## Problem Statement

The current `submit-deliverable.tsx` screen asks creators to paste social media post URLs as the primary input. This means content must already be publicly posted before the restaurant can review it, defeating the purpose of the approval workflow. Additionally, the URL field and all other fields (screenshot, caption, notes) are optional — creators can skip the entire submission.

**Current flow** (broken):
1. Creator visits restaurant (maybe)
2. Creator posts content to social platforms
3. Creator pastes post links into Troodie (optional!)
4. Restaurant reviews already-public content
5. Payment processes

**Expected flow**:
1. Creator visits restaurant
2. Creator uploads raw video/photo content for review (required)
3. Restaurant reviews and approves content
4. Creator posts approved content to platforms
5. Creator submits post links as proof (required)
6. Payment processes after all proof links submitted

## User Stories

- As a business owner, I want to review content BEFORE it goes public, so I can ensure quality and brand alignment.
- As a creator, I want clear guidance on the submission steps, so I know exactly what to do and when.
- As a business owner, I want proof that content was actually posted, so I know the creator fulfilled their obligations.

## User Experience

### Screens & Views

| Screen | Purpose | Entry Points | Account Types |
|--------|---------|--------------|---------------|
| Upload Content (new) | Creator uploads video/photos for review | Campaign detail → "Submit Content" | Creator |
| Submit Proof Links (existing, modified) | Creator submits post URLs after approval | Campaign detail → "Submit Proof" (after approval) | Creator |
| Review Content (existing, modified) | Restaurant reviews uploaded content | Campaign detail → "Review" | Business |

### User Flows

1. **Content Upload Flow (New Step 1)**
   - Step 1: Creator navigates to accepted campaign → taps "Upload Content for Review"
   - Step 2: Creator selects video/photo from device (required)
   - Step 3: Creator adds caption and notes (optional)
   - Step 4: Creator taps "Submit for Review" → content uploaded to Supabase Storage
   - Step 5: Status changes to `pending_review` → restaurant notified

2. **Restaurant Review Flow (Modified)**
   - Step 1: Restaurant sees uploaded content (video/photo) in review screen
   - Step 2: Restaurant watches/views the actual content (not just a URL)
   - Step 3: Restaurant approves/rejects/requests changes
   - Step 4: If approved → creator notified to post and submit proof

3. **Proof Link Submission (New Step 2)**
   - Step 1: Creator receives approval notification
   - Step 2: Creator posts content to required platforms
   - Step 3: Creator returns to Troodie → taps "Submit Post Links"
   - Step 4: Creator pastes URLs for each required platform (required, not optional)
   - Step 5: URLs validated → deliverable marked as `proof_submitted`

### States

| State | Visual | Trigger |
|-------|--------|---------|
| Awaiting Upload | "Upload your content for review" CTA | Application accepted |
| Pending Review | "Content submitted — awaiting review" | Content uploaded |
| Approved | "Content approved! Post to platforms and submit links" | Restaurant approves |
| Rejected | "Content rejected — see feedback" | Restaurant rejects |
| Revision Requested | "Changes requested — see feedback and resubmit" | Restaurant requests changes |
| Proof Submitted | "Post links submitted — payment processing" | Creator submits proof |

## Technical Design

### Database Schema

#### Schema Changes

Table: `campaign_deliverables`
- Add: `content_file_url` TEXT — URL to the uploaded content file in Supabase Storage (video/photo for review)
- Add: `content_file_type` TEXT — MIME type of uploaded content ('video/mp4', 'image/jpeg', etc.)
- Add: `proof_submitted_at` TIMESTAMPTZ — when proof links were submitted
- Add: `workflow_stage` TEXT DEFAULT 'upload' — tracks 'upload' | 'review' | 'approved' | 'posting' | 'proof'

The existing `platform_post_url` field will be repurposed for proof links (Step 2) instead of being the primary submission.
The existing `content_url` field currently stores the same URL as `platform_post_url` — it will now store the uploaded content file URL.

#### Storage Bucket

**Decision (Q2: Option A — 100MB max, MP4/MOV/JPEG/PNG only)**

New Supabase Storage bucket:
- Bucket: `campaign-content`
- Path pattern: `{campaign_id}/{application_id}/{deliverable_id}.{ext}`
- Max file size: 100MB (video) / 10MB (image)
- Allowed types: video/mp4, video/mov, video/quicktime, image/jpeg, image/png (no HEIC — convert on upload if needed)

### Services

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| ContentUploadService (new) | `services/contentUploadService.ts` | `uploadContentForReview`, `getUploadedContent` | Handle video/photo upload to Storage |
| DeliverableSubmissionService | `services/deliverableSubmissionService.ts` | `submitDeliverable` (modified), `submitProofLinks` (new) | Split into two stages |
| DeliverableReviewService | `services/deliverableReviewService.ts` | (minor updates) | Review uploaded content instead of URLs |

#### New: `contentUploadService.ts`

```typescript
interface UploadContentParams {
  campaign_application_id: string;
  campaign_id: string;
  creator_id: string;
  file_uri: string;       // Local file URI from ImagePicker
  file_type: 'video' | 'photo';
  caption?: string;
  notes_to_restaurant?: string;
}

async function uploadContentForReview(params: UploadContentParams): Promise<{
  data: DeliverableSubmission | null;
  error: Error | null;
}>
```

#### Modified: `deliverableSubmissionService.ts`

Add new method for proof link submission (Step 2):

```typescript
interface SubmitProofLinksParams {
  deliverable_id: string;
  platform_urls: {
    platform: DeliverablePlatform;
    url: string;
  }[];
}

async function submitProofLinks(params: SubmitProofLinksParams): Promise<{
  data: DeliverableSubmission | null;
  error: Error | null;
}>
```

### Navigation Changes

**Decision: Single screen with step indicator (Q4: Option A)**

- Modify `app/creator/campaigns/[id]/submit-deliverable.tsx` to be a two-step flow with step indicator:
  - **Step 1**: Upload content (video/photo picker, caption, notes) — when `workflow_stage === 'upload'`
  - **Step 2**: Submit proof links (URL inputs per platform) — when `workflow_stage === 'approved'` or `workflow_stage === 'posting'`
- Step indicator at top shows "1. Upload Content" / "2. Submit Proof" with current step highlighted

### Integration Points

- **imageUploadServiceV2.ts**: Reuse for uploading content files to Supabase Storage
- **notificationService.ts**: Notify creator when content is approved (prompt to post and submit proof)
- **review-deliverables.tsx**: Update to display uploaded content (video player / image viewer) instead of external URL
- **components/VideoViewer.tsx**: Existing full-featured video player component using `expo-video` (Q6: confirmed available). Supports play/pause, seek, progress bar, swipe between videos. Reuse for review screen video playback.
- **Payment gating (Q1: Option B)**: Payment triggers ONLY after both restaurant approval AND proof links submitted. This ensures creators actually post content to platforms before receiving payment.

## Security

### Access Control

| Action | Consumer | Creator | Business | Unauthenticated |
|--------|----------|---------|----------|-----------------|
| Upload content | No | Yes (own campaigns) | No | No |
| View uploaded content | No | Yes (own) | Yes (own restaurant's campaigns) | No |
| Submit proof links | No | Yes (own approved deliverables) | No | No |

### Data Protection

- Uploaded content stored in private Supabase Storage bucket
- RLS policies restrict access to campaign participants only
- Content files deleted after campaign completion + retention period

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| Creator uploads video but restaurant never reviews | Auto-approval after 72 hours still applies | `submitted_at` tracks when content was uploaded |
| Creator tries to submit proof before approval | Block — show "Content must be approved first" | Check `workflow_stage` or `status` |
| Multiple deliverables with different platforms | Each deliverable can be in different workflow stages | Track `workflow_stage` per deliverable |
| Large video upload fails | Show retry option, save draft | Use resumable upload if available |
| Creator uploads wrong content | Can delete and re-upload if status is still `pending_review` | Reuse existing `deleteDeliverable` logic |
| Restaurant approves but creator never submits proof | Reminders at 24h, 48h, 72h after approval; then escalate to support | Q3: Option D — gentle reminders then manual resolution |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| Upload fails (network) | "Upload failed. Tap to retry." | Retry button, draft saved locally |
| File too large | "File exceeds 100MB limit. Please compress your video." | Show file size, suggest compression |
| Unsupported format | "Please upload MP4, MOV, JPEG, or PNG files." | Show accepted formats |
| Proof URL invalid | "Invalid URL. Please paste the direct link to your post." | Inline validation (existing) |
| Proof submission before approval | "Your content must be approved before submitting post links." | Disable proof form, show status |

## Implementation Phases

### Phase 1: Content Upload (MVP)
**Goal**: Creators can upload video/photo content for review instead of pasting URLs.

#### Tasks
- [ ] **Task 1.1**: Add `content_file_url`, `content_file_type`, `proof_submitted_at`, `workflow_stage` columns to `campaign_deliverables`
  - Files: `supabase/migrations/YYYYMMDD_content_submission_flow.sql`
  - Acceptance: Migration runs successfully, columns exist
- [ ] **Task 1.2**: Create Supabase Storage bucket for campaign content uploads
  - Files: `supabase/migrations/YYYYMMDD_content_submission_flow.sql`
  - Acceptance: Bucket exists with correct RLS policies
- [ ] **Task 1.3**: Create `contentUploadService.ts` with `uploadContentForReview()`
  - Files: `services/contentUploadService.ts`
  - Acceptance: Video/photo uploads to Storage, creates deliverable record with `status: 'pending_review'`
- [ ] **Task 1.4**: Modify `submit-deliverable.tsx` Step 1 — replace URL input with file picker
  - Files: `app/creator/campaigns/[id]/submit-deliverable.tsx`
  - Acceptance: Creator sees file picker (video/photo) instead of URL input; upload required, not optional

### Phase 2: Review Flow Update
**Goal**: Restaurant reviews actual content files, not URLs.

#### Tasks
- [ ] **Task 2.1**: Update `review-deliverables.tsx` to display uploaded content (video player, image viewer)
  - Files: `app/business/campaigns/[id]/review-deliverables.tsx`
  - Acceptance: Restaurant sees video/photo inline instead of "tap to view post" link
- [ ] **Task 2.2**: Update approval notification to prompt creator to post and submit proof
  - Files: `services/notificationService.ts`
  - Acceptance: Creator receives "Content approved! Post to your platforms and submit proof links."

### Phase 3: Proof Link Submission
**Goal**: After approval, creators submit proof that content was posted.

#### Tasks
- [ ] **Task 3.1**: Create `submitProofLinks()` method in `deliverableSubmissionService.ts`
  - Files: `services/deliverableSubmissionService.ts`
  - Acceptance: Validates URLs, updates deliverable with proof links and `proof_submitted_at`
- [ ] **Task 3.2**: Add Step 2 UI to `submit-deliverable.tsx` — proof link submission form
  - Files: `app/creator/campaigns/[id]/submit-deliverable.tsx`
  - Acceptance: After approval, creator sees URL inputs per required platform; submission required
- [ ] **Task 3.3**: Connect proof submission to payment trigger
  - Files: `services/deliverableSubmissionService.ts`, `services/deliverableReviewService.ts`
  - Acceptance: Payment only processes after proof links are submitted (depends on payment-duplication-fix)

## Testing Requirements

### Unit Tests
- [ ] Content upload creates deliverable with `workflow_stage: 'upload'`, `status: 'pending_review'`
- [ ] Proof submission blocked when deliverable is not approved
- [ ] URL validation still works for proof link step
- [ ] File type validation rejects unsupported formats

### E2E Tests (Maestro)
- [ ] Full flow: upload content → restaurant approves → submit proof → payment

### Manual Testing
- [ ] Upload video for review → verify restaurant sees video, not a URL
- [ ] Restaurant approves → verify creator is prompted to post and submit proof
- [ ] Submit proof links → verify deliverable status updates
- [ ] Try to submit proof before approval → verify blocked

## Acceptance Criteria

- [ ] Creators upload video/photo files for review (not paste URLs) as Step 1
- [ ] Content upload is required, not optional
- [ ] Restaurant reviews actual uploaded content in the review screen
- [ ] After approval, creators submit platform post URLs as proof (Step 2)
- [ ] Proof link submission is required for payment processing
- [ ] Existing URL validation still works for proof links
- [ ] Auto-approval (72h) still functions for uploaded content
