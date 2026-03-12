# Progress: Push Notifications (TRO-18)

> Implementation Plan: `specs/features/push-notifications/implementation-plan.md`
> Spec: `specs/features/push-notifications/spec.md`
> Branch: `feat/push-notifications-v2`

## Current Status

**Phase**: 2 of 6
**Last Updated**: 2026-03-12
**Last Task Completed**: Task 3.7

## Task List

### Phase 1: Foundation — Types & Schema Alignment

- [x] Task 1.1: Update `types/notifications.ts` — add new NotificationType values and data interfaces
- [x] Task 1.2: Update `lib/supabase.ts` — add new notification types and preference columns to database types
- [x] Task 1.3: Create consolidated notification type constraint migration SQL

### Phase 2: Edge Function & Push Delivery

- [x] Task 2.1: Create Edge Function `push-notifications` with Expo Push API + dead token cleanup
- [x] Task 2.2: Create deployment script and webhook setup documentation

### Phase 3: Campaign Notification Triggers

- [x] Task 3.1: Campaign opportunity trigger (campaigns status → active)
- [x] Task 3.2: Campaign application trigger (campaign_applications INSERT)
- [x] Task 3.3: Application approved trigger (campaign_applications status → accepted)
- [x] Task 3.4: Campaign deadline reminder cron (pg_cron daily, 2-day warning)
- [x] Task 3.5: Deliverable submitted trigger (creator_campaigns deliverables_status change)
- [x] Task 3.6: Payment sent trigger (creator_earnings status → available/paid)
- [x] Task 3.7: Campaign invitation trigger (campaign invitation INSERT)

### Phase 4: Engagement Notification Triggers

- [ ] Task 4.1: Friend posted trigger (posts INSERT → notify followers, rate-limited) <-- NEXT
- [ ] Task 4.2: Weekly recap cron job (Sunday 6 PM UTC)

### Phase 5: Frontend — Display & Navigation

- [ ] Task 5.1: Update NotificationItem.tsx — icon/color mapping for new types
- [ ] Task 5.2: Implement deep link navigation on notification tap
- [ ] Task 5.3: Update NotificationSettings.tsx — add campaign & engagement toggles
- [ ] Task 5.4: Clean up notificationService.ts — remove TODO stubs

### Phase 6: Integration & Validation

- [ ] Task 6.1: Run typecheck and lint, fix all errors
- [ ] Task 6.2: Create test SQL scripts for manual verification
- [ ] Task 6.3: Update notification documentation

## Completed Tasks

| Task | Completed | Notes |
|------|-----------|-------|
| Task 1.1 | 2026-03-12 | Added 9 new NotificationType values, 9 data interfaces, 2 new NotificationCategory values, updated NotificationData union and UserNotificationPreferences |
| Task 1.2 | 2026-03-12 | Added 9 new notification types to notifications Row/Insert/Update type union, added campaigns_push/in_app_enabled and engagement_push/in_app_enabled columns to notification_preferences |
| Task 1.3 | 2026-03-12 | Created consolidated migration: drops/recreates notifications_type_check with all 18 types, adds 4 preference columns, updates default prefs trigger for campaigns/engagement, backfills existing users |
| Task 2.1 | 2026-03-12 | Created Edge Function: webhook handler for notifications INSERT, fetches push_tokens, validates Expo tokens, sends in batches of 100, processes receipts, deactivates DeviceNotRegistered tokens, maps priority and channelId |
| Task 2.2 | 2026-03-12 | Added `functions:deploy:push` and `functions:logs:push` npm scripts; created deployment.md with webhook setup (Dashboard + SQL), verification steps, env vars, and troubleshooting |
| Task 3.1 | 2026-03-12 | Created campaign opportunity trigger: fires on campaigns UPDATE to 'active', finds local creators by matching city/location, checks campaigns notification preferences, uses create_notification() helper |
| Task 3.2 | 2026-03-12 | Created campaign application trigger: fires on campaign_applications INSERT, looks up campaign business_id, fetches creator name/avatar, checks campaigns_in_app_enabled preference, notifies business owner |
| Task 3.3 | 2026-03-12 | Created application approved trigger: fires on campaign_applications UPDATE to 'accepted', looks up campaign title and restaurant name, checks creator's campaigns_in_app_enabled preference, notifies creator |
| Task 3.4 | 2026-03-12 | Created pg_cron job: runs daily at 9 AM UTC, finds active campaigns ending in 2 days, notifies hired creators (from campaign_applications + creator_campaigns), deduplicates by checking existing notifications for same campaign+creator+date |
| Task 3.5 | 2026-03-12 | Created deliverable submitted trigger: fires on creator_campaigns UPDATE when deliverables_status JSONB changes, looks up campaign business_id and creator name, checks campaigns_in_app_enabled preference, notifies business owner |
| Task 3.6 | 2026-03-12 | Created payment sent trigger: fires on creator_earnings INSERT/UPDATE when status becomes 'available' or 'paid', notifies creator with amount and campaign title, priority 3 (financial), checks campaigns_in_app_enabled preference |
| Task 3.7 | 2026-03-12 | Created campaign invite trigger: fires on campaign_invitations INSERT, resolves creator user_id from creator_profiles, looks up campaign title and restaurant name, checks campaigns_in_app_enabled preference, notifies creator |

## Blockers

None currently.

## Notes

- Starting fresh on main, not building on PR #52 branch (too many issues identified in audit)
- Existing infrastructure: NotificationItem, NotificationCenter, NotificationSettings, NotificationBadge components all exist
- Existing services: notificationService.ts, notificationPreferencesService.ts, pushNotificationService.ts all exist
- Edge Function approach: database webhook on notifications INSERT → Edge Function → Expo Push API
- campaign_deliverables table may not exist — use creator_campaigns.deliverables_status instead
