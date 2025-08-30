# Troodie — Master TODO (MVP Critical Fixes)

## Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Done
- ⏸️ Blocked
- 🔄 Review

---

## Epics

| ID | Epic | Focus | Owner | Status |
|---|---|---|---|---|
| MVP | MVP Critical Fixes | Nine critical fixes needed by 9/3 | - | 🔴 |

---

## Tasks Backlog

### 🚨 CRITICAL MVP FIXES - Due by September 3, 2025

| ID | Task | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| MVP.1 | Fix Index Flash on App Download (`task-mvp-1-index-flash-fix.md`) | MVP | High | 1d | 🔄 | Index screen flashes during first launch - **Needs Review** |
| MVP.2 | Fix Non-Functional Restaurant Buttons (`task-mvp-2-restaurant-buttons-fix.md`) | MVP | Critical | 1d | 🔴 | Three buttons don't work on detail screen |
| MVP.3 | Implement Leave Review Flow (`task-mvp-3-leave-review-flow.md`) | MVP | High | 2d | 🔴 | Core feature for user engagement |
| MVP.4 | Clarify Share vs Review Options (`task-mvp-4-share-clarification.md`) | MVP | Medium | 0.5d | 🔄 | Confusing "What would you like to share?" - **Needs Review** |
| MVP.5 | Fix Review Post Confirmation Flow (`task-mvp-5-review-confirmation-flow.md`) | MVP | High | 1d | 🔄 | Replace fullscreen with toast, stay on screen - **Needs Review** |
| MVP.6 | Import SF Restaurant Data (`task-mvp-6-download-sf-restaurants.md`) | MVP | Critical | 1d | 🔴 | Download and import SF restaurants (TD to provide) |
| MVP.7 | Fix Top Rated Spacing Issues (`task-mvp-7-top-rated-spacing-fix.md`) | MVP | High | 0.5d | 🔄 | Winston-Salem text pushes buttons off screen - **Needs Review** |
| MVP.8 | Update Welcome Toast Logic (`task-mvp-8-welcome-toast-logic.md`) | MVP | Medium | 0.5d | 🔴 | Disappear after 3 uses or show relevant CTAs |
| MVP.9 | Fix Discussion Post Confirmation (`task-mvp-9-discussion-post-confirmation.md`) | MVP | High | 0.5d | 🔄 | Replace fullscreen with toast for discussions - **Needs Review** |
| MVP.10 | Streamline Add Restaurant (New) (`task-mvp-10-add-restaurant-not-in-db.md`) | MVP | Critical | 1.5d | 🔄 | Eliminate double entry for new restaurants - **Needs Review** |
| MVP.11 | Streamline Add Restaurant (Existing) (`task-mvp-11-add-restaurant-already-exists.md`) | MVP | Critical | 1d | 🔴 | Direct save instead of "already exists" error |

---

## Execution Order (Recommended)

### Phase 1: Critical Database & Core Functions (Days 1-2)
- [ ] MVP.6 - Import SF restaurants (coordinate with TD first)
- [ ] MVP.2 - Fix restaurant detail buttons
- [ ] MVP.10 - Streamline new restaurant addition
- [ ] MVP.11 - Streamline existing restaurant addition

### Phase 2: User Experience Fixes (Days 3-4)
- [ ] MVP.1 - Fix index flash issue
- [ ] MVP.3 - Implement leave review flow
- [ ] MVP.5 - Fix review confirmation flow
- [ ] MVP.9 - Fix discussion confirmation flow

### Phase 3: Polish & UI Fixes (Day 5)
- [ ] MVP.7 - Fix spacing issues
- [ ] MVP.4 - Clarify share vs review
- [ ] MVP.8 - Update welcome toast

---

## Sprint Summary

**Total Estimate**: 11 days of work
**Timeline**: Must complete by September 3 (5 days)
**Strategy**: Parallel work required, prioritize blocking issues

### Day-by-Day Plan
- **Day 1**: MVP.6 (database) + MVP.2 (buttons) in parallel
- **Day 2**: MVP.10 + MVP.11 (restaurant flows)
- **Day 3**: MVP.1 + MVP.3 (review implementation)
- **Day 4**: MVP.5 + MVP.9 (confirmations) + MVP.7 (spacing)
- **Day 5**: MVP.4 + MVP.8 (final polish) + testing

---

## Definition of Done Checklist

- [ ] All 11 MVP tasks completed
- [ ] Full regression testing performed
- [ ] Tested on iPhone (12-15) and iPad
- [ ] No console errors or warnings
- [ ] Performance acceptable
- [ ] Build number incremented
- [ ] Release notes prepared

---

## Dependencies & Blockers

- **MVP.6**: Waiting for restaurant data from TD
- **MVP.5**: Depends on MVP.3 completion
- **MVP.11**: Should be done after MVP.10 for consistency

---

## Release Checklist

- [ ] All critical fixes verified
- [ ] App version/build updated
- [ ] Store metadata current
- [ ] Testing on all device types
- [ ] Performance profiling complete
- [ ] Error monitoring enabled
- [ ] Analytics tracking verified

---

## Implementation Notes

### Completed Tasks Needing Review (8/30/2025)

1. **MVP.1 - Index Flash Fix**: Coordinated splash screen hiding with both font and auth loading states
2. **MVP.4 - Share vs Review Clarification**: Updated UI copy to "Share to Community" vs "Restaurant Review"  
3. **MVP.5 - Review Confirmation**: Replaced full-screen confirmation with toast notifications
4. **MVP.7 - Spacing Fix**: Added text truncation and flexible layout for long city names
5. **MVP.9 - Discussion Confirmation**: Uses same toast system as MVP.5
6. **MVP.10 - Add Restaurant Flow**: Automatically saves restaurants to user profile, handles duplicates gracefully

### Testing Required
- Test on various iOS devices (iPhone SE to iPad)
- Verify toast notifications appear correctly
- Confirm restaurant addition and saving flow
- Check text truncation for long city names
- Validate splash screen timing on slow devices

---

_Last Updated: August 30, 2025_
_Target Completion: September 3, 2025_
_Implementation: 6 of 11 tasks completed, needs testing_