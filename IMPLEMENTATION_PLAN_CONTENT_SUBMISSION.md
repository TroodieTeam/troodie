# Implementation Plan: Content Submission Flow Fix

> Generated from spec: `specs/features/content-submission-flow-fix/spec.md`
> Created: 2026-02-18

## Overview

Redesign the content submission flow so creators upload video/photo content for restaurant review BEFORE posting to social platforms. The flow becomes: upload content for review -> get approval -> post to platforms -> submit proof links -> payment.

## Progress Tracking

See `PROGRESS_CONTENT_SUBMISSION.md` for current task status.

## Phases

### Phase 1: Database & Types (Backend)

**Goal**: Add schema support for the two-stage workflow and update TypeScript types.

#### Tasks

- [ ] **Task 1.1**: Add new columns to `campaign_deliverables` and create storage bucket
  - Description: Add `content_file_url`, `content_file_type`, `proof_submitted_at`, `workflow_stage` columns. Create `campaign-content` storage bucket with RLS policies.
  - Files: `supabase/migrations/20260218_content_submission_flow.sql`
  - Tests: Migration SQL syntax verification
  - Acceptance: Migration file exists with valid SQL, columns and bucket defined

- [ ] **Task 1.2**: Update TypeScript types for new workflow fields
  - Description: Add `workflow_stage`, `content_file_url`, `content_file_type`, `proof_submitted_at` to `DeliverableSubmission` interface. Add `WorkflowStage` type.
  - Files: `types/deliverableRequirements.ts`
  - Tests: `npm run typecheck`
  - Acceptance: Types compile without errors

### Phase 2: Services (Business Logic)

**Goal**: Create content upload service and proof link submission method.

#### Tasks

- [ ] **Task 2.1**: Create `contentUploadService.ts`
  - Description: New service with `uploadContentForReview()` that uploads video/photo to Supabase Storage and creates/updates deliverable record with `status: 'pending_review'` and `workflow_stage: 'review'`.
  - Files: `services/contentUploadService.ts`
  - Tests: `npm run typecheck`
  - Acceptance: Service compiles, follows `{ data, error }` pattern

- [ ] **Task 2.2**: Add `submitProofLinks()` to `deliverableSubmissionService.ts`
  - Description: New method that validates proof URLs, checks workflow_stage is 'approved'/'posting', updates deliverable with proof links and `proof_submitted_at`.
  - Files: `services/deliverableSubmissionService.ts`
  - Tests: `npm run typecheck`
  - Acceptance: Method compiles, blocks submission if not approved

- [ ] **Task 2.3**: Update `approveDeliverable()` in review service for new workflow
  - Description: When approving, set `workflow_stage: 'approved'`. Update approval message to prompt creator to post and submit proof.
  - Files: `services/deliverableReviewService.ts`
  - Tests: `npm run typecheck`
  - Acceptance: Approval sets workflow_stage to 'approved'

### Phase 3: UI (Creator Submission Screen)

**Goal**: Redesign submit-deliverable screen as two-step flow with step indicator.

#### Tasks

- [ ] **Task 3.1**: Refactor `submit-deliverable.tsx` with step indicator and upload UI (Step 1)
  - Description: Replace URL-first flow with file picker (video/photo). Add step indicator showing "1. Upload Content" / "2. Submit Proof". Step 1 shows when workflow_stage is 'upload'. Content upload is required.
  - Files: `app/creator/campaigns/[id]/submit-deliverable.tsx`
  - Tests: `npm run typecheck`, `npm run lint`
  - Acceptance: Step 1 renders file picker, upload is required, step indicator visible

- [ ] **Task 3.2**: Add proof link submission UI (Step 2) to `submit-deliverable.tsx`
  - Description: When workflow_stage is 'approved' or 'posting', show URL inputs per required platform. Submission is required. Shows "Content approved!" banner.
  - Files: `app/creator/campaigns/[id]/submit-deliverable.tsx`
  - Tests: `npm run typecheck`, `npm run lint`
  - Acceptance: Step 2 renders URL inputs, proof submission required

### Phase 4: UI (Business Review Screen)

**Goal**: Update review screen to show uploaded content inline.

#### Tasks

- [ ] **Task 4.1**: Update `review-deliverables.tsx` to display uploaded content
  - Description: Show uploaded video (using VideoViewer) or image inline instead of "tap to view post" link.
  - Files: `app/business/campaigns/[id]/review-deliverables.tsx`
  - Tests: `npm run typecheck`, `npm run lint`
  - Acceptance: Review screen shows video player or image for uploaded content

## Validation Commands

```bash
npm run typecheck
npm run lint
npm test
```

## Notes

- Payment gating (Q1: Option B): Payment triggers ONLY after both approval AND proof links submitted
- Single screen with step indicator (Q4: Option A)
- File limits (Q2: Option A): 100MB video, 10MB image; MP4/MOV/JPEG/PNG
- Existing VideoViewer component reusable for review screen
- Storage bucket: `campaign-content`
