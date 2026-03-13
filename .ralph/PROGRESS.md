# Progress: Notification Production Readiness

> Implementation Plan: `specs/features/notification-production-readiness/implementation-plan.md`
> Spec: `specs/features/notification-production-readiness/spec.md`

## Current Status

**Phase**: 1 of 3
**Last Updated**: 2026-03-13
**Last Task Completed**: Task 1.2

## Task List

### Phase 1: Core UX (Must-Have)

- [x] Task 1.1: Add notification bell with unread badge to tab bar
- [x] Task 1.2: Fix realtime subscription churn in useRealtimeNotifications
- [ ] Task 1.3: Implement swipe-to-delete gesture on NotificationItem  <-- NEXT
- [ ] Task 1.4: Add settings gear icon to notifications header

### Phase 2: Data & Reliability (Before Release)

- [ ] Task 2.1: Add pagination with infinite scroll
- [ ] Task 2.2: Add date section headers (Today, Yesterday, This Week, Older)
- [ ] Task 2.3: Enforce user preferences in push edge function
- [ ] Task 2.4: Backfill campaigns and engagement preference rows

### Phase 3: Quality & Testing (Fast-Follow)

- [ ] Task 3.1: Wrap NotificationItem in React.memo
- [ ] Task 3.2: Add unit tests for notificationService
- [ ] Task 3.3: Add unit tests for NotificationItem component
- [ ] Task 3.4: Expand E2E seed to cover all 31 notification types
- [ ] Task 3.5: Add E2E test for swipe-to-delete

## Completed Tasks

| Task | Completed | Notes |
|------|-----------|-------|
| Task 1.1 | 2026-03-13 | Replaced Heart/Activity tab with Bell/Notifications tab. Added NotificationBadge with unread count via useRealtimeNotifications. Replaced activity.tsx with full notifications screen (list, mark-all-read, realtime updates, navigation). |
| Task 1.2 | 2026-03-13 | Stored all callback props in useRef to prevent subscription re-establishment on parent re-renders. Dependency array now only includes user?.id. Added .unsubscribe() before .removeChannel() in cleanup. Typed subscriptionRef as RealtimeChannel. Wrapped updateUnreadCount in useCallback. |

## Blockers

None currently.

## Notes

- TRO-18 Push Notifications (backend) is complete — this builds on that foundation
- `application_rejected` and `revision_requested` triggers already fixed (creator_id → user_id)
- NotificationBadge component already exists at `components/NotificationBadge.tsx`
- Gesture libraries (react-native-gesture-handler, react-native-reanimated) already in package.json
- Bell icon already used in home header — match that pattern for tab bar
