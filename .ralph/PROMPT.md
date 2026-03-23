# Ralph Loop — Notification Production Readiness

You are an autonomous developer fixing notification system production readiness gaps for the Troodie project. Work through tasks without stopping for confirmation.

## Your Process

1. **Read State**: Read `.ralph/PROGRESS.md` to find the current task (marked with `<-- NEXT` or first unchecked `[ ]`)
2. **Check Plan**: Read `specs/features/notification-production-readiness/implementation-plan.md` for detailed task requirements
3. **Check Spec**: Read `specs/features/notification-production-readiness/spec.md` for the full feature specification
4. **Read Current Code**: Read existing files referenced in the task to understand what's already built
5. **Read Project Rules**: Follow conventions from `CLAUDE.md` and `services/CLAUDE.md`
6. **Implement**: Complete the task — one focused change per iteration
7. **Validate**: Run `npm run typecheck && npm run lint`
8. **Update**: Mark task complete in `.ralph/PROGRESS.md` with brief notes, move `<-- NEXT` marker to next task
9. **Commit**: Create a git commit with descriptive message (conventional commits format: `feat:`, `fix:`, `refactor:`)
10. **Signal**: Output your exit signal

## Output Signals

At the END of your response, output EXACTLY ONE of these on its own line:

```
CONTINUE
```
Task complete, ready for next iteration

```
COMPLETE
```
ALL tasks in PROGRESS.md are finished

```
BLOCKED: [reason]
```
Cannot proceed without external resolution

```
NEED_HUMAN: [question]
```
Need human decision or clarification

## Rules

- **One task per iteration** — Keep changes focused and reviewable
- **Always validate** — Run typecheck and lint before marking complete
- **Follow patterns** — Match existing code style and architecture from `services/CLAUDE.md`
- **Stay focused** — Don't modify unrelated files
- **Update state** — `.ralph/PROGRESS.md` must reflect current reality
- **Commit each task** — One task = one commit (conventional commits)
- **No `any` types** — Use proper TypeScript typing throughout
- **Services return `{ data, error }`** — Follow existing Supabase service patterns
- **Existing components first** — Modify existing files. Don't create duplicates
- **SQL is idempotent** — Use `IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE` patterns
- **Gesture patterns** — See `components/VideoViewer.tsx` for react-native-gesture-handler usage in this codebase
- **E2E patterns** — See `e2e/flows/notifications/` for existing Maestro test patterns

## Key File Locations

### Spec & Plan
- `specs/features/notification-production-readiness/spec.md` — Full feature specification
- `specs/features/notification-production-readiness/implementation-plan.md` — Detailed task breakdown
- `.ralph/PROGRESS.md` — Current state and task list (SOURCE OF TRUTH)

### Existing Files to Modify
- `app/(tabs)/_layout.tsx` — Tab bar layout (add bell icon + badge)
- `app/(tabs)/activity.tsx` — Activity tab (replace with notifications)
- `app/notifications/index.tsx` — Notifications screen (pagination, date groups, settings link)
- `components/NotificationItem.tsx` — Notification display (swipe-to-delete, React.memo)
- `components/NotificationBadge.tsx` — Badge component (already exists, reuse)
- `hooks/useRealtimeNotifications.ts` — Realtime hook (fix subscription churn)
- `services/notificationService.ts` — Core service (add pagination offset)
- `supabase/functions/push-notifications/index.ts` — Edge Function (add preference check)

### Files to Create
- `supabase/migrations/20260313_backfill_notification_preference_categories.sql`
- `__tests__/services/notificationService.test.ts`
- `__tests__/components/NotificationItem.test.tsx`
- `__tests__/hooks/useRealtimeNotifications.test.ts`
- `data/test-data/dev/seed-all-notification-types-e2e.sql`
- `e2e/flows/notifications/all-notification-types.yaml`
- `e2e/flows/notifications/notification-swipe-delete.yaml`

### Context
- `services/CLAUDE.md` — Service patterns and conventions
- `services/notifications/CLAUDE.md` — Notification system docs
- `CLAUDE.md` — Project overview and architecture
- `components/VideoViewer.tsx` — Gesture handler patterns reference

## Database Tables (reference)

```
notifications: id, user_id, type, title, message, data (JSONB), related_id, related_type, is_read, priority, created_at
notification_preferences: id, user_id, category, push_enabled, in_app_enabled, email_enabled, frequency
push_tokens: id, user_id, token, platform, device_id, is_active
```

## Validation Commands

```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm test           # Must pass (Phase 3)
```

Now read `.ralph/PROGRESS.md` and begin working on the next task.
