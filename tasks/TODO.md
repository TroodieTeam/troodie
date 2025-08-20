# Troodie — Master TODO (Apple Review Fixes)

## Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Done
- ⏸️ Blocked
- 🔄 Review

---

## Epics

> Define epics first. Keep titles crisp; add a one‑line focus statement.

| ID | Epic | Focus | Owner | Status |
|---|---|---|---|---|
| APPLE | Apple Review Compliance | Fix rejection issues for App Store approval |  | 🔴 |
| E1 | Bug Fixes | Critical bug fixes |  | 🔴 |
| E2 |  |  |  | 🔴 |
| E3 | Discovery & Content | Trending relevance and richer save context |  | 🔴 |

---

## Tasks Backlog

> Keep tasks atomic and shippable. Use IDs you can reference in commits/PRs.

### 🚨 CRITICAL - Apple Review Fixes (Must complete before resubmission)

| ID | Task | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| A.1 | Remove Login Wall for Browsing (`task-apple-1-remove-login-wall.md`) | APPLE | Critical | 2d | 🔴 | Guideline 5.1.1 - Allow anonymous browsing |
| A.2 | Implement Content Moderation (`task-apple-2-content-moderation.md`) | APPLE | Critical | 2d | 🔴 | Guideline 1.2 - Report/block/filter features |
| A.3 | Fix iPad Three-Dots Menu (`task-apple-3-ipad-menu-bug.md`) | APPLE | Critical | 1d | 🔴 | Guideline 2.1 - Touch targets on iPad |

### Other Tasks (After Apple fixes)

| ID | Task | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Fix: Follow Activity Missing Target User Name (`task-bug-1-follow-activity-missing-target.md`) | E1 | High | 0.5d | 🔴 | Activity feed should show target user on follow |
| 1.2 | Fix: Default Profile Image When None Provided (`task-bug-2-default-profile-image.md`) | E1 | Medium | 0.5d | 🔴 | Fallback avatar across app |
| 1.3 | Fix: Followers/Following Navigation Shows Wrong Screen (`task-bug-3-followers-list-navigation.md`) | E1 | High | 0.75d | 🔴 | Correct list routes from profile |
| 1.4 | Fix: Home "Your Saves" Not Showing After Save (`task-bug-4-home-saves-not-showing.md`) | E1 | Medium | 1d | 🔴 | Ensure home widget refreshes |
| 3.1 | Fix: "Share a link" Causes Bug in Create Post (`task-bug-5-share-link-post-flow.md`) | E3 | High | 0.75d | 🔴 | Stabilize link attach flow |
| 3.2 | Feature: Save TikTok With Context (`task-feature-1-save-tiktok-with-context.md`) | E3 | Medium | 1d | 🔴 | Link + note on restaurant save |
| 3.3 | Feature: What's Hot Location-Aware (`task-feature-2-whats-hot-location-aware.md`) | E3 | Medium | 1d | 🔴 | Filter trending by city/region |

---

## Ready Next (Pull Queue)

- [ ] A.1 - Remove login wall (START IMMEDIATELY)
- [ ] A.2 - Content moderation (START AFTER A.1)
- [ ] A.3 - iPad menu fix (Can start in parallel)

---

## Decisions Log

- 2025-08-19: Apple rejected v1.0 - prioritizing 3 critical fixes for resubmission
- 2025-08-19: Target resubmission date: August 23, 2025

---

## Apple Resubmission Checklist

- [ ] All 3 critical issues fixed
- [ ] Anonymous browsing fully functional
- [ ] Content moderation system live
- [ ] iPad touch targets verified (44x44 points minimum)
- [ ] Test on iPad Air 5th Gen specifically
- [ ] Review account (review@troodieapp.com) still works
- [ ] Increment build number
- [ ] Update App Store Connect release notes
- [ ] Add reviewer notes explaining fixes
- [ ] Full regression testing complete

## Release Checklist

- [ ] App config updated (bundle id, version, build)
- [ ] Permissions usage strings reviewed
- [ ] Privacy links and nutrition labels verified
- [ ] Crash/error monitoring on
- [ ] Store metadata/screenshots current

---

_Last Updated: August 19, 2025_
_Apple Rejection: August 18, 2025 (Submission ID: 67d23736-90f6-4ec3-b6cf-98007ae4b75b)_

