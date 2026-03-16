# Implementation Plan: Notification Production Readiness

> Spec: `specs/features/notification-production-readiness/spec.md`
> Created: 2026-03-13
> Depends on: TRO-18 Push Notifications (completed)

## Overview

Fix all production readiness gaps in the notification system across three phases: Core UX (entry point, swipe-delete, realtime fix), Data & Reliability (pagination, date grouping, push preferences), and Quality & Testing (unit tests, E2E coverage, performance).

## Progress Tracking

See `.ralph/PROGRESS.md` for current task status.

---

## Phase 1: Core UX (Must-Have)

**Goal**: Users can discover, access, and manage notifications from the main app interface.

#### Tasks

- [ ] **Task 1.1**: Add notification bell with unread badge to tab bar
  - Description: Replace Activity tab (Heart) with Notifications tab (Bell). Wire `useRealtimeNotifications` hook's `onUnreadCountChanged` to update `NotificationBadge` on the tab icon. The badge already exists (`components/NotificationBadge.tsx`) — just needs to be integrated.
  - Files: `app/(tabs)/_layout.tsx`, `app/(tabs)/activity.tsx`
  - Key details:
    - Current tabs: Home, Explore, Add, Activity, More
    - `NotificationBadge` supports sizes small/medium/large, handles 99+, returns null when count=0
    - `useRealtimeNotifications` exposes `updateUnreadCount()` which calls `supabase.rpc('get_unread_notification_count')`
    - Bell icon already used in home header at `app/(tabs)/index.tsx:414` — match that pattern
    - Import `Bell` from `lucide-react-native` (already available)
  - Tests: Verify bell visible in tab bar, badge shows count, tapping navigates to notifications
  - Acceptance: `npm run typecheck` passes; bell icon with badge visible in simulator

- [ ] **Task 1.2**: Fix realtime subscription churn in useRealtimeNotifications
  - Description: Store callback props in `useRef` to prevent subscription re-establishment on every parent render. Only `user.id` should trigger re-subscription. Add `.unsubscribe()` before `.removeChannel()` in cleanup.
  - Files: `hooks/useRealtimeNotifications.ts`
  - Key details:
    - Current dependency array (line 66): `[user?.id, onNotificationReceived, onNotificationUpdated, onNotificationDeleted]`
    - Fix: `useRef` for all callbacks, only `[user?.id]` in dependency array
    - `onUnreadCountChanged` is called at line 81 but not in dependency array — also needs ref
    - Pattern: `const callbackRef = useRef(callback); callbackRef.current = callback;`
  - Tests: `npm run typecheck`
  - Acceptance: Subscription only re-establishes when user changes

- [ ] **Task 1.3**: Implement swipe-to-delete gesture on NotificationItem
  - Description: Add left-swipe gesture to reveal red delete button. Use `Swipeable` from `react-native-gesture-handler` (v2.28.0 already in package.json). Reference `components/VideoViewer.tsx` for gesture patterns in this codebase.
  - Files: `components/NotificationItem.tsx`
  - Key details:
    - `onSwipeDelete` prop exists (line 53) but is never called
    - Component currently renders plain `TouchableOpacity` (lines 135-162)
    - `react-native-gesture-handler` and `react-native-reanimated` both available
    - Wrap `TouchableOpacity` in `Swipeable` component
    - Right actions: red delete button with Trash icon
    - Animate row removal after delete
    - Add testID `notification-delete-{notification.type}` on delete button
  - Tests: `npm run typecheck`; visual verification in simulator
  - Acceptance: Swipe left reveals delete; tap delete removes notification; normal tap still works

- [ ] **Task 1.4**: Add settings gear icon to notifications header
  - Description: Add a gear icon between the title and mark-all-read button that navigates to `/notifications/settings`.
  - Files: `app/notifications/index.tsx`
  - Key details:
    - Header currently has: X close button (left), "Notifications" title, "Mark all as read" (right)
    - Add `Settings` icon from `lucide-react-native` (already imported by NotificationItem)
    - Position: right side of header, before mark-all-read
    - `router.push('/notifications/settings')`
    - testID: `notifications-settings-button`
  - Tests: `npm run typecheck`
  - Acceptance: Gear icon visible; tapping navigates to settings screen

---

## Phase 2: Data & Reliability

**Goal**: Notifications scale properly, respect user preferences, and don't lose data.
**Depends on**: Phase 1

#### Tasks

- [ ] **Task 2.1**: Add pagination with infinite scroll
  - Description: Replace single 50-notification load with paginated infinite scroll using cursor-based pagination on `created_at`.
  - Files: `app/notifications/index.tsx`, `services/notificationService.ts`
  - Key details:
    - `notificationService.getUserNotifications(userId, limit)` currently at line 31 — add `offset` param
    - Service query: `.range(offset, offset + limit - 1).order('created_at', { ascending: false })`
    - FlatList needs: `onEndReached`, `onEndReachedThreshold={0.5}`, `ListFooterComponent`
    - Track `hasMore` state — set false when returned count < page size
    - Pull-to-refresh resets to page 0
    - Loading spinner in footer while fetching next page
  - Tests: `npm run typecheck`
  - Acceptance: Scrolling loads more; stops when no more results; refresh resets

- [ ] **Task 2.2**: Add date section headers (Today, Yesterday, This Week, Older)
  - Description: Insert date header items into the notifications array before rendering. Keep FlatList (simpler than SectionList migration).
  - Files: `app/notifications/index.tsx`
  - Key details:
    - Create helper function `groupNotificationsByDate(notifications)` that returns array with header items injected
    - Header items: `{ type: 'header', label: 'Today' | 'Yesterday' | 'This Week' | 'Older' }`
    - Render header items with gray text, uppercase, small font, horizontal padding
    - Use `keyExtractor` that handles both notification IDs and header labels
    - Hide empty sections (e.g., if no "Yesterday" notifications, skip that header)
  - Tests: `npm run typecheck`
  - Acceptance: Date headers visible and correct; empty sections hidden

- [ ] **Task 2.3**: Enforce user preferences in push edge function
  - Description: Before sending push notification, query `notification_preferences` for the user's category and check `push_enabled`.
  - Files: `supabase/functions/push-notifications/index.ts`
  - Key details:
    - Map notification type → category:
      - campaigns: `campaign_opportunity`, `campaign_application`, `application_approved`, `campaign_deadline`, `deliverable_submitted`, `payment_sent`, `campaign_invite`, `application_rejected`, `revision_requested`
      - engagement: `friend_post`, `weekly_recap`
      - social: `post_liked`, `post_commented`, `new_follower`, `mentioned_in_post`, `mentioned_in_comment`
      - boards: `board_invite`
      - restaurants: `restaurant_mention`
      - system: `system`
    - Query: `SELECT push_enabled FROM notification_preferences WHERE user_id = ? AND category = ?`
    - If no row found → default to `push_enabled = true`
    - If `push_enabled = false` → skip push, return early (notification still created in DB for in-app)
  - Tests: Create SQL verification script
  - Acceptance: Disabling push in preferences stops push delivery for that category

- [ ] **Task 2.4**: Backfill campaigns and engagement preference rows
  - Description: Existing users are missing `campaigns` and `engagement` rows in `notification_preferences`. Create migration to backfill and update the default creation trigger.
  - Files: `supabase/migrations/20260313_backfill_notification_preference_categories.sql`
  - Key details:
    - INSERT INTO notification_preferences (user_id, category, push_enabled, in_app_enabled, email_enabled, frequency) SELECT id, 'campaigns', true, true, false, 'immediate' FROM auth.users WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE category = 'campaigns')
    - Same for 'engagement'
    - Update the default preferences trigger (if it exists) to include campaigns and engagement
    - Idempotent: uses NOT IN subquery
  - Tests: Run against dev DB, verify all users have 7 rows
  - Acceptance: `node scripts/run-sql.js --dev` succeeds; SELECT count verifies 7 categories per user

---

## Phase 3: Quality & Testing

**Goal**: Regression safety, performance optimization, comprehensive E2E coverage.
**Depends on**: Phase 2

#### Tasks

- [ ] **Task 3.1**: Wrap NotificationItem in React.memo
  - Description: Prevent unnecessary re-renders during scroll.
  - Files: `components/NotificationItem.tsx`
  - Key details:
    - Change `export const NotificationItem: React.FC<...> = (...)` to `const NotificationItemInner: React.FC<...> = (...)`
    - Add `export const NotificationItem = React.memo(NotificationItemInner)`
    - Ensure callback props (`onPress`, `onSwipeDelete`) are wrapped in `useCallback` in parent
  - Tests: `npm run typecheck`
  - Acceptance: Component export unchanged; re-render count reduced

- [ ] **Task 3.2**: Add unit tests for notificationService
  - Description: Test critical CRUD operations with mocked Supabase client.
  - Files: `__tests__/services/notificationService.test.ts`
  - Key details:
    - Follow existing test patterns in `__tests__/services/communityService.test.ts` and `__tests__/helpers/supabaseMocks.ts`
    - Test: getUserNotifications returns sorted results
    - Test: markAsRead updates single notification
    - Test: markAllAsRead updates all user notifications
    - Test: deleteNotification removes notification
    - Test: getUnreadCount returns number
    - Mock supabase with `__tests__/helpers/supabaseMocks.ts` patterns
  - Tests: `npm test -- --testPathPattern=notificationService`
  - Acceptance: All tests pass

- [ ] **Task 3.3**: Add unit tests for NotificationItem component
  - Description: Test icon/color mapping, time formatting, and interaction callbacks.
  - Files: `__tests__/components/NotificationItem.test.tsx`
  - Key details:
    - Test: correct icon returned for each of 31 notification types
    - Test: correct color returned for each type
    - Test: formatRelativeTime handles edge cases (just now, minutes, hours, days, dates)
    - Test: unread dot renders when is_read=false, hidden when is_read=true
    - Test: onPress called with notification object on tap
    - Use React Native Testing Library (`@testing-library/react-native`)
  - Tests: `npm test -- --testPathPattern=NotificationItem`
  - Acceptance: All tests pass

- [ ] **Task 3.4**: Expand E2E seed to cover all 31 notification types
  - Description: Create comprehensive seed script and Maestro test that verifies all notification types render correctly.
  - Files:
    - `data/test-data/dev/seed-all-notification-types-e2e.sql` — one notification per type, all prefixed `[E2E-ALL]`
    - `data/test-data/dev/cleanup-all-notification-types-e2e.sql`
    - `e2e/flows/notifications/all-notification-types.yaml`
  - Key details:
    - Seed 31 notifications for test-consumer1@bypass.com
    - Maestro test scrolls through, asserts each `notification-item-{type}` testID exists
    - Use `scrollUntilVisible` for items below the fold
    - Group assertions logically (social types, campaign types, engagement types)
  - Tests: `maestro test e2e/flows/notifications/all-notification-types.yaml`
  - Acceptance: All 31 types render with correct testIDs

- [ ] **Task 3.5**: Add E2E test for swipe-to-delete
  - Description: Verify swipe gesture and deletion in Maestro.
  - Files: `e2e/flows/notifications/notification-swipe-delete.yaml`
  - Key details:
    - Seed a `system` notification with `[E2E-SWIPE]` prefix
    - Swipe left on `notification-item-system`
    - Tap `notification-delete-system`
    - Assert `notification-item-system` is no longer visible
    - Cleanup: script to remove `[E2E-SWIPE]` notifications
  - Tests: `maestro test e2e/flows/notifications/notification-swipe-delete.yaml`
  - Acceptance: Maestro test passes end-to-end

---

## Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# E2E tests (all notification flows)
maestro test e2e/flows/notifications/

# SQL deployment (dev)
node scripts/run-sql.js --dev <migration-file>
```

## Notes

- The `NotificationCenter.tsx` modal component is dead code — consider removing during Phase 3 if time allows
- `application_rejected` and `revision_requested` triggers already fixed and verified (creator_id → user_id resolution)
- Existing `NotificationBadge` component at `components/NotificationBadge.tsx` handles all edge cases (99+, zero count) — reuse directly
- The `get_unread_notification_count` RPC function already exists in the database
- `react-native-gesture-handler@~2.28.0` and `react-native-reanimated@~4.1.1` are already in package.json
- The home screen header already has a bell icon with badge at `app/(tabs)/index.tsx:414` — match its pattern for tab bar integration
