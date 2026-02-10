# Stakeholder Questions: Update Toast Banner

> Feature: update-toast-banner
> Spec: `specs/features/update-toast-banner/spec.md`
> Created: 2026-02-09

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: What are the App Store and Play Store URLs for Troodie?
- **Context**: The "Update" CTA button needs to deep link to the correct store listing. The iOS bundle ID is `com.troodie.troodie.com` (from `app.config.js`). I need the Apple App ID (numeric) and the Play Store listing URL.
- **Options**:
  - A) Provide the App Store URL (e.g., `https://apps.apple.com/app/troodie/id123456789`)
  - B) Provide just the Apple App ID and I'll construct the URL
  - C) Use the bundle ID with `itms-apps://` scheme for iOS and `market://` for Android
- **AI Recommendation**: Option C is most reliable for opening the native store app directly
- **Answer**: App Store URL: `https://apps.apple.com/us/app/troodie/id6746138280`. Play Store URL: `https://play.google.com/store/apps/details?id=com.troodie.troodie.com`

### Q2: Version check source — Supabase config table or app store API?
- **Context**: The spec proposes a Supabase `app_config` table that an admin manually updates. An alternative is querying the App Store/Play Store APIs directly, which is automatic but adds external dependencies.
- **Options**:
  - A) Supabase `app_config` table (manual admin update) — Simple, fast, reliable, no external deps
  - B) App Store/Play Store lookup APIs — Automatic but more complex, rate-limited
  - C) Both — Supabase as primary, store API as fallback
- **AI Recommendation**: Option A — simplest for Sprint 1, can add automatic checks later
- **Answer**: Option B — Use App Store/Play Store lookup APIs for automatic version checking

## Design Tradeoffs (Affects Scope)

### Q3: Banner style — toast notification or inline banner?
- **Context**: The app uses `react-native-toast-message` for transient toasts (auto-dismiss after 3s). An inline banner within the ScrollView would be more persistent and visible. The ticket says "toast / banner" suggesting either approach.
- **Options**:
  - A) Inline banner in ScrollView (below header, persistent until dismissed) — More visible, stays on screen
  - B) Toast notification (auto-dismiss, re-shows on each visit) — Less intrusive, uses existing toast infra
  - C) Sticky banner at top (outside ScrollView, fixed position) — Most prominent, always visible
- **AI Recommendation**: Option A (inline banner) — persistent enough to be noticed, dismissible, doesn't block content
- **Default if unanswered**: Option A
- **Answer**: Use default — Option A (inline banner in ScrollView)

### Q4: Dismissal duration — how long should the banner stay hidden?
- **Context**: After a user dismisses the banner, it should stay hidden for some period to avoid annoyance, but reappear eventually.
- **Options**:
  - A) 24 hours — re-appears daily
  - B) Until next app restart — gone for the session
  - C) Until a new version is released — only shows once per version
- **AI Recommendation**: Option C — least annoying, shows once per new version, user only sees it when there's genuinely something new
- **Default if unanswered**: Option C
- **Answer**: Use default — Option C (until a new version is released)

## Nice-to-Know (Non-blocking)

### Q5: Should the banner show to unauthenticated users?
- **Context**: The home screen requires authentication. If there's a pre-auth screen or splash where this would be useful, let me know.
- **Answer**: Not answered — home screen is auth-gated, so banner only shows to authenticated users

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve update-toast-banner Q1: [answer] Q2: [answer] Q3: [answer or "use default"] Q4: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
