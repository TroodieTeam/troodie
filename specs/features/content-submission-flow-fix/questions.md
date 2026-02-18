# Stakeholder Questions: Content Submission Flow Fix

> Feature: content-submission-flow-fix
> Spec: `specs/features/content-submission-flow-fix/spec.md`
> Created: 2026-02-17

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: Should proof link submission be required before payment triggers?
- **Context**: The spec proposes that payment only processes after proof links are submitted (confirming content was actually posted). But this adds another gate beyond restaurant approval. Currently, payment triggers on deliverable approval.
- **Options**:
  - A) Payment triggers after restaurant approval (current behavior minus the duplication bug) — proof links are nice-to-have but don't block payment
  - B) Payment triggers only after approval AND proof links submitted — ensures content was actually posted, but adds delay
  - C) Payment triggers after approval, but a follow-up reminder nudges creator to submit proof — hybrid approach
- **AI Recommendation**: Option B — the whole point of this fix is ensuring content actually gets posted. If payment triggers before proof, there's no incentive for the creator to actually post.
- **Answer**: Option B

### Q2: What file size and format limits for uploads?
- **Context**: Video content for TikTok/Reels is typically 15s-3min, resulting in 20-200MB files. The current image upload service handles photos up to ~10MB. Video uploads are a new capability.
- **Options**:
  - A) 100MB max, MP4/MOV/JPEG/PNG only — covers most phone-recorded content
  - B) 250MB max, broader format support (HEVC, WebM) — accommodates higher quality
  - C) 50MB max, require compression before upload — reduces storage costs, may frustrate creators
- **AI Recommendation**: Option A — 100MB covers most phone-shot videos while keeping storage manageable. Creators can compress with built-in phone tools if needed.
- **Answer**: Option A

### Q3: What happens if a creator never submits proof links after approval?
- **Context**: If content is approved but the creator never posts to platforms and never submits proof, the campaign is stuck. There's no timeout mechanism for proof submission.
- **Options**:
  - A) 7-day timeout — auto-complete with warning, payment processes anyway
  - B) 7-day timeout — auto-cancel, no payment, notify both parties
  - C) No timeout — creator can submit proof anytime, business can manually close campaign
  - D) Reminders at 24h, 48h, 72h — then escalate to support
- **AI Recommendation**: Option D — gentle reminders first, then manual resolution. Auto-pay or auto-cancel both have risks.
- **Answer**: Option D

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q4: Single screen with steps or separate screens?
- **Context**: The upload (Step 1) and proof submission (Step 2) could be the same screen with conditional UI, or two separate screens.
- **Options**:
  - A) Single screen with step indicator — less navigation, clear progression
  - B) Two separate screens (`upload-content.tsx` + `submit-proof.tsx`) — cleaner code, clearer purpose
- **AI Recommendation**: Option A — single screen with a step indicator keeps the creator in context and reduces navigation confusion.
- **Default if unanswered**: Option A
- **Answer**: Option A

### Q5: Should the restaurant be able to preview how content will look on each platform?
- **Context**: The restaurant reviews a raw video file, but the final post on Instagram vs TikTok may look different (aspect ratios, filters, captions). Adding platform-specific preview would be nice but adds significant complexity.
- **Options**:
  - A) Just show the raw video/photo — restaurant reviews content quality, not platform formatting
  - B) Add basic platform frame mockups — nice UX but more work
- **AI Recommendation**: Option A — keep it simple. Platform-specific previews can be a future enhancement.
- **Default if unanswered**: Option A
- **Answer**: Option A

## Nice-to-Know (Non-blocking)

### Q6: Is there an existing video player component in the app?
- **Context**: The review screen will need to play uploaded videos inline. If Expo's built-in video player is sufficient, no new dependency is needed. Expo AV (`expo-av`) supports video playback.
- **Answer**: I think so, please review and figure out.

### Q7: What is the expected storage volume?
- **Context**: If 100 creators upload 50MB videos for 50 campaigns, that's ~250GB. Storage costs and cleanup policies need consideration.
- **Answer**: No sure for now

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve content-submission-flow-fix Q1: [answer] Q2: [answer] Q3: [answer] Q4: [answer or "use default"] Q5: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
