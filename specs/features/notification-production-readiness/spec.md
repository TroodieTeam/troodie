# Notification System Production Readiness

> Status: APPROVED
> Created: 2026-03-13
> Source: Production readiness audit of notification system
> Feature: notification-production-readiness
> Depends on: TRO-18 Push Notifications (completed)
> Release Target: v1.0.19

## Overview

The notification system (TRO-18) backend is complete — triggers, edge function, types, and preferences are deployed. However, a production readiness audit revealed critical frontend gaps that make the feature unusable: no entry point from the app UI, no unread badge, broken swipe-to-delete, no pagination, and push notifications ignoring user preferences. This spec covers all fixes across three phases.

## Problem Statement

Users cannot discover or use notifications effectively:
1. **No tab bar bell** — users can only reach notifications via deep link or the home screen header bell (easy to miss)
2. **Swipe-to-delete accepts the callback but never implements the gesture** — feature is silently broken
3. **No pagination** — only first 50 notifications load, the rest are invisible
4. **Push notifications ignore user preferences** — edge function sends pushes unconditionally
5. **No settings link** from the notification screen itself
6. **Realtime subscription churn** — callbacks in useEffect dependency array cause constant re-subscribes

## Phases

### Phase 1: Core UX (Must-Have)
Tab bar integration, swipe-to-delete, settings link, realtime fix

### Phase 2: Data & Reliability (Before Release)
Pagination, date grouping, push preference enforcement, preferences schema alignment

### Phase 3: Quality & Testing (Fast-Follow)
Unit tests, React.memo optimization, E2E coverage for all notification types

---

## Phase 1: Core UX

### Task 1.1: Add notification bell with badge to tab bar

**Description**: Replace the Activity tab (Heart icon) with a Notifications tab (Bell icon) that shows the unread notification count badge. The Activity tab content moves into the notifications screen as a secondary concern — the primary function becomes viewing notifications.

**Alternative (less disruptive)**: Add a bell icon to the tab bar header area on ALL tabs, similar to how it's already done in the home screen header (`app/(tabs)/index.tsx:414`). This avoids changing tab structure.

**Recommended approach**: Add bell icon with badge to the tab bar's Activity tab position, since "Activity" semantically maps to notifications.

**Files**:
- Modify: `app/(tabs)/_layout.tsx` — change Activity tab icon from Heart to Bell, add NotificationBadge overlay
- Modify: `app/(tabs)/activity.tsx` — redirect to notifications or embed notifications list
- Reuse: `components/NotificationBadge.tsx` (already exists, supports small/medium/large sizes, shows 99+)
- Modify: `hooks/useRealtimeNotifications.ts` — wire `onUnreadCountChanged` to badge state

**Acceptance**:
- Bell icon visible in tab bar
- Orange badge shows unread count (disappears when 0)
- Tapping bell navigates to notification list
- Badge updates in real-time when new notifications arrive

---

### Task 1.2: Fix realtime subscription churn in useRealtimeNotifications

**Description**: The `useEffect` in `useRealtimeNotifications.ts` has callback props (`onNotificationReceived`, `onNotificationUpdated`, `onNotificationDeleted`) in its dependency array. These are frequently recreated on parent re-renders, causing the Supabase channel to constantly unsubscribe/resubscribe. Additionally, `onUnreadCountChanged` is called inside `updateUnreadCount()` but is NOT in the dependency array — stale closure risk.

**Fix**:
- Store callbacks in `useRef` instead of including them in the dependency array
- Only re-subscribe when `user.id` changes
- Call `.unsubscribe()` before `.removeChannel()` in cleanup (Supabase best practice)

**Files**:
- Modify: `hooks/useRealtimeNotifications.ts`

**Acceptance**:
- Subscription only re-establishes when user changes (not on every render)
- `npm run typecheck` passes
- No console warnings about subscription churn

---

### Task 1.3: Implement swipe-to-delete gesture on NotificationItem

**Description**: `NotificationItem` accepts `onSwipeDelete` prop but renders a plain `TouchableOpacity` with no gesture handling. Implement a left-swipe gesture that reveals a red delete button, using `react-native-gesture-handler` (already in package.json) and `react-native-reanimated` (already available — used by `VideoViewer.tsx`).

**Pattern reference**: `components/VideoViewer.tsx` already imports and uses `Gesture`, `GestureDetector`, `GestureHandlerRootView` from react-native-gesture-handler.

**Files**:
- Modify: `components/NotificationItem.tsx` — wrap in Swipeable or implement PanGesture with animated translateX, reveal delete action on left swipe

**Acceptance**:
- Swiping left on a notification reveals a red "Delete" action
- Tapping delete calls `onSwipeDelete(notification.id)`
- Notification animates out on delete
- Regular tap (no swipe) still fires `onPress`
- testID `notification-delete-{type}` on delete button for E2E

---

### Task 1.4: Add settings gear icon to notifications header

**Description**: The notifications screen header has a close button (X) and "Mark all as read" but no way to access notification preferences. Add a gear icon that navigates to `notifications/settings`.

**Files**:
- Modify: `app/notifications/index.tsx` — add Settings (gear) icon to header between title and mark-all-read button

**Acceptance**:
- Gear icon visible in notifications header
- Tapping gear navigates to `notifications/settings`
- testID `notifications-settings-button` on gear icon

---

## Phase 2: Data & Reliability

### Task 2.1: Add pagination with infinite scroll

**Description**: Currently loads only 50 notifications with no way to see older ones. Implement cursor-based pagination using `onEndReached` on the FlatList.

**Files**:
- Modify: `app/notifications/index.tsx` — add `onEndReached`, `onEndReachedThreshold`, `ListFooterComponent` (loading spinner)
- Modify: `services/notificationService.ts` — add `offset` parameter to `getUserNotifications()`, or use cursor-based pagination with `created_at`

**Pattern**:
```typescript
// Service: add offset-based pagination
getUserNotifications(userId: string, limit: number, offset: number): Promise<Notification[]>

// Screen: load more on scroll
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  if (!hasMore || loadingMore) return;
  const next = await notificationService.getUserNotifications(user.id, 50, (page + 1) * 50);
  if (next.length < 50) setHasMore(false);
  setNotifications(prev => [...prev, ...next]);
  setPage(p => p + 1);
};
```

**Acceptance**:
- Scrolling to bottom loads next 50 notifications
- Loading spinner shows while fetching
- Stops loading when no more results
- Pull-to-refresh resets to first page

---

### Task 2.2: Add date section headers

**Description**: Group notifications by date: Today, Yesterday, This Week, Older. Use `SectionList` instead of `FlatList`, or add inline date headers.

**Recommended approach**: Keep FlatList but inject date header items into the data array (simpler, no API change needed).

**Files**:
- Modify: `app/notifications/index.tsx` — group notifications by date, render section headers
- Create style for date headers (gray text, small font, padding)

**Acceptance**:
- Notifications grouped under "Today", "Yesterday", "This Week", "Older" headers
- Headers are sticky (visible while scrolling within section)
- Empty sections are hidden

---

### Task 2.3: Enforce user preferences in push edge function

**Description**: The edge function at `supabase/functions/push-notifications/index.ts` sends push notifications to ALL active tokens without checking `notification_preferences`. Users who disable push for a category still receive pushes.

**Fix**: Before sending, query `notification_preferences` for the user and check if the relevant category has `push_enabled = true`. Map notification types to categories:
- `campaign_opportunity`, `campaign_application`, `application_approved`, `campaign_deadline`, `deliverable_submitted`, `payment_sent`, `campaign_invite`, `application_rejected`, `revision_requested` → `campaigns`
- `friend_post`, `weekly_recap` → `engagement`
- `post_liked`, `post_commented`, `new_follower`, `mentioned_in_post`, `mentioned_in_comment` → `social`
- `board_invite` → `boards`
- `restaurant_mention` → `restaurants`
- `system` → `system`

**Files**:
- Modify: `supabase/functions/push-notifications/index.ts` — add preference check before sending

**Acceptance**:
- Push NOT sent when user has `push_enabled = false` for the notification's category
- Push still sent when no preference row exists (default = enabled)
- Tested with SQL verification script

---

### Task 2.4: Ensure campaigns and engagement preference rows exist for all users

**Description**: The `notification_preferences` default creation trigger only creates 5 categories (social, achievements, restaurants, boards, system). Users created before the TRO-18 migration don't have `campaigns` or `engagement` rows, causing preference checks to fall back to defaults.

**Fix**: Create a backfill migration that inserts missing `campaigns` and `engagement` rows for all existing users. Also update the default creation trigger to include these categories.

**Files**:
- Create: `supabase/migrations/20260313_backfill_notification_preference_categories.sql`

**Acceptance**:
- All users have 7 preference category rows
- New users automatically get all 7 on signup
- Idempotent (safe to run multiple times)

---

## Phase 3: Quality & Testing

### Task 3.1: Wrap NotificationItem in React.memo

**Description**: Every parent re-render causes all NotificationItems to re-render. With pagination loading potentially hundreds of items, this causes jank during scrolling.

**Files**:
- Modify: `components/NotificationItem.tsx` — wrap export with `React.memo()`, ensure props are stable references

**Acceptance**:
- `npm run typecheck` passes
- Component only re-renders when its notification prop changes

---

### Task 3.2: Add unit tests for notification service and components

**Description**: Zero unit tests exist for the notification system. Add tests for the critical paths.

**Files**:
- Create: `__tests__/services/notificationService.test.ts`
  - Test: `getUserNotifications` returns sorted notifications
  - Test: `markAsRead` updates notification
  - Test: `markAllAsRead` updates all user notifications
  - Test: `deleteNotification` removes notification
  - Test: `getUnreadCount` returns correct count

- Create: `__tests__/components/NotificationItem.test.tsx`
  - Test: Correct icon for each notification type (31 types)
  - Test: Correct color for each notification type
  - Test: `formatRelativeTime` — "Just now", "5m ago", "2h ago", "3d ago", date
  - Test: Unread dot renders when `is_read = false`
  - Test: Unread dot hidden when `is_read = true`
  - Test: `onPress` called with notification on tap

- Create: `__tests__/hooks/useRealtimeNotifications.test.ts`
  - Test: Subscribes to channel on mount
  - Test: Unsubscribes on unmount
  - Test: INSERT event triggers `onNotificationReceived`
  - Test: Only re-subscribes when user changes

**Acceptance**:
- `npm test` passes with new tests
- Coverage for critical notification paths

---

### Task 3.3: Expand E2E seed data to cover all notification types

**Description**: Current E2E tests only cover 6 of 31 notification types. Create comprehensive seed script that covers all types and a Maestro test that scrolls through and verifies each renders correctly.

**Files**:
- Create: `data/test-data/dev/seed-all-notification-types-e2e.sql` — seeds one notification per type (31 notifications)
- Create: `data/test-data/dev/cleanup-all-notification-types-e2e.sql`
- Create: `e2e/flows/notifications/all-notification-types.yaml` — scrolls through list, asserts each testID `notification-item-{type}` is visible

**Acceptance**:
- All 31 notification types render with correct icons
- Maestro test passes on iOS simulator
- Seed/cleanup scripts are idempotent

---

### Task 3.4: Add E2E test for swipe-to-delete

**Description**: After Task 1.3 implements swipe-to-delete, add Maestro E2E test to verify it works.

**Files**:
- Create: `e2e/flows/notifications/notification-swipe-delete.yaml`

**Pattern**:
```yaml
# Seed a notification, swipe left, tap delete, verify it's gone
- swipe:
    id: "notification-item-system"
    direction: LEFT
- tapOn:
    id: "notification-delete-system"
- assertNotVisible:
    id: "notification-item-system"
```

**Acceptance**:
- Maestro test swipes, deletes, and verifies removal
- Test is idempotent (seeds own data)

---

### Task 3.5: Add E2E test for pagination

**Description**: Seed >50 notifications, verify infinite scroll loads more.

**Files**:
- Create: `data/test-data/dev/seed-pagination-e2e.sql` — seeds 60 notifications with varied types
- Create: `e2e/flows/notifications/notification-pagination.yaml`

**Acceptance**:
- Scrolling to bottom triggers load of additional notifications
- Total visible count exceeds initial 50

---

## Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# E2E tests
maestro test e2e/flows/notifications/

# SQL deployment (dev)
node scripts/run-sql.js --dev <migration-file>
```

## Notes

- Phase 1 is the minimum viable release — without tab bar integration, users can't find notifications
- Phase 2 should ship in the same release if possible — pagination prevents data loss for active users
- Phase 3 can be a fast-follow but should ship within 1 week of release
- The `NotificationCenter.tsx` modal component is dead code — consider removing it during Phase 3 cleanup
- The `application_rejected` and `revision_requested` triggers were already fixed (creator_id → user_id resolution) and verified passing
- Existing gesture infrastructure (react-native-gesture-handler, reanimated) makes swipe-to-delete straightforward
- NotificationBadge component already exists and handles 99+ display — just needs to be wired to tab bar
