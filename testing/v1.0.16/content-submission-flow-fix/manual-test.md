# Manual Test Script: Content Submission Flow Fix

## Prerequisites
- Creator account with an accepted campaign application
- Business account for the restaurant owning the campaign
- Test video file (MP4, <100MB) and image file (JPEG/PNG, <10MB)

## Test Cases

### TC-1: Upload Content for Review (Step 1)
1. Log in as creator
2. Navigate to accepted campaign detail
3. Tap "Submit Deliverable"
4. Verify step indicator shows "1. Upload Content" as active
5. Tap the file picker area
6. Select a video or photo from device
7. Verify preview shows (image thumbnail or video selected indicator)
8. Add optional caption and notes
9. Tap "Submit for Review"
10. Verify success message: "Content Uploaded"
11. Verify screen shows "Content Submitted - Awaiting Review" status

**Expected**: Content uploads to Supabase Storage, deliverable created with status `pending_review` and workflow_stage `review`

### TC-2: Unsupported File Type
1. Try to upload a .gif or .heic file
2. Verify error: "Unsupported file type"

### TC-3: File Too Large
1. Try to upload a video >100MB
2. Verify error about file size limit

### TC-4: Restaurant Reviews Uploaded Content
1. Log in as restaurant business owner
2. Navigate to campaign > Review Deliverables
3. Verify uploaded content shows inline (image visible, video placeholder visible)
4. Tap on a deliverable to open review modal
5. Verify content is visible in the modal

### TC-5: Approve Content
1. In review modal, tap "Approve"
2. Verify message mentions proof links and payment deferral
3. Confirm approval
4. Verify success message

**Expected**: Deliverable status = 'approved', workflow_stage = 'approved'. NO payment triggered yet.

### TC-6: Submit Proof Links (Step 2)
1. Log in as creator
2. Navigate to the campaign > Submit Deliverable
3. Verify step indicator shows Step 2 active
4. Verify green "Content approved!" banner
5. Enter a valid Instagram/TikTok/YouTube URL
6. Verify platform detection badge appears
7. Tap "Submit Proof Links"
8. Verify success message

**Expected**: platform_post_url updated, workflow_stage = 'proof', proof_submitted_at set

### TC-7: Block Proof Before Approval
1. Creator tries to submit proof when content is still pending_review
2. Verify the screen shows "Content Submitted - Awaiting Review" (no proof form)

### TC-8: Reject and Resubmit
1. Restaurant rejects content with feedback
2. Creator sees feedback banner on upload screen
3. Creator can re-upload new content

### TC-9: Auto-Approval (72h)
1. Verify auto-approval still functions for uploaded content
2. After auto-approval, creator should see Step 2 (proof links)

## Verification Queries
See `testing/sql/content-submission-flow-fix-verify.sql`
