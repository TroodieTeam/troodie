# Implementation Plan: Push Notifications (TRO-18)

> Spec: `specs/features/push-notifications/spec.md`
> PR Reference: #52 (feat/push-notifications) — audit findings inform this plan
> Created: 2026-03-12

## Overview

Implement push notifications for Troodie covering campaign lifecycle, social interactions, and engagement prompts. This plan addresses the gaps identified in the PR #52 audit and builds on the existing notification infrastructure.

## Progress Tracking

See `.ralph/PROGRESS.md` for current task status.

---

## Phase 1: Foundation — Types & Schema Alignment

**Goal**: Ensure TypeScript types, database constraints, and notification types are fully aligned before building any triggers.

#### Tasks

- [ ] **Task 1.1**: Update `types/notifications.ts` — Add new notification types to `NotificationType` union
  - Add: `campaign_opportunity`, `campaign_application`, `application_approved`, `campaign_deadline`, `deliverable_submitted`, `payment_sent`, `campaign_invite`, `friend_post`, `weekly_recap`
  - Add data interfaces: `CampaignOpportunityData`, `CampaignApplicationData`, `ApplicationApprovedData`, `CampaignDeadlineData`, `DeliverableSubmittedData`, `PaymentSentData`, `CampaignInviteData`, `FriendPostData`, `WeeklyRecapData`
  - Add `'campaigns' | 'engagement'` to `NotificationCategory` union
  - Update `NotificationData` union to include new interfaces
  - Files: `types/notifications.ts`
  - Acceptance: `npm run typecheck` passes

- [ ] **Task 1.2**: Update `lib/supabase.ts` database types — Add new notification type values
  - Update the `type` column union in `notifications` Row/Insert/Update to include all new types
  - Add `campaigns_push_enabled`, `campaigns_in_app_enabled`, `engagement_push_enabled`, `engagement_in_app_enabled` to `notification_preferences` Row/Insert/Update
  - Files: `lib/supabase.ts`
  - Acceptance: `npm run typecheck` passes

- [ ] **Task 1.3**: Create consolidated notification type constraint migration
  - Single SQL migration that drops and recreates the `notifications_type_check` constraint with ALL types (existing + new)
  - Add preference columns to `notification_preferences` table
  - Idempotent (IF NOT EXISTS / IF EXISTS patterns)
  - Files: `supabase/migrations/20260312_consolidated_notification_types.sql`
  - Acceptance: SQL is valid, covers all 18 notification types

---

## Phase 2: Edge Function & Push Delivery

**Goal**: Deploy a working Edge Function that delivers push notifications when rows are inserted into `notifications`.

#### Tasks

- [ ] **Task 2.1**: Create/refine Edge Function `push-notifications`
  - Read the notification record from the webhook payload
  - Fetch active push tokens for `user_id` from `push_tokens`
  - Validate tokens with `Expo.isExpoPushToken()`
  - Send via Expo Push API in batches (chunks of 100)
  - Handle receipts: mark tokens with `DeviceNotRegistered` error as `is_active = false`
  - Return appropriate HTTP status codes
  - Files: `supabase/functions/push-notifications/index.ts`
  - Acceptance: Function handles INSERT webhook, sends to Expo, deactivates bad tokens

- [ ] **Task 2.2**: Create Edge Function deployment script and webhook setup docs
  - Add deployment command to package.json scripts
  - Document webhook configuration in spec
  - Files: `package.json`, `specs/features/push-notifications/deployment.md`
  - Acceptance: Clear deployment steps documented

---

## Phase 3: Campaign Notification Triggers

**Goal**: Create database triggers for all 7 campaign notification types.

#### Tasks

- [ ] **Task 3.1**: Campaign opportunity trigger
  - Fires on `campaigns` UPDATE when `status` changes to `'active'`
  - Finds local creators (same city/area as campaign restaurant)
  - Checks `campaigns_push_enabled` / `campaigns_in_app_enabled` preferences
  - Inserts notification with `type = 'campaign_opportunity'`, `related_id = campaign.id`, `related_type = 'campaign'`
  - Data JSON: `{ campaignId, restaurantId, restaurantName, budget, title }`
  - Files: `supabase/migrations/20260312_campaign_opportunity_trigger.sql`
  - Acceptance: Trigger fires on campaign activation, creates notifications for eligible creators

- [ ] **Task 3.2**: Campaign application trigger
  - Fires on `campaign_applications` INSERT
  - Notifies the business owner (via `campaigns.business_id`)
  - Data JSON: `{ campaignId, campaignTitle, creatorId, creatorName, creatorAvatar }`
  - Files: `supabase/migrations/20260312_campaign_application_trigger.sql`
  - Acceptance: Business owner gets notified when creator applies

- [ ] **Task 3.3**: Application approved trigger
  - Fires on `campaign_applications` UPDATE when `status` changes to `'accepted'`
  - Notifies the creator
  - Data JSON: `{ campaignId, campaignTitle, restaurantName }`
  - Files: `supabase/migrations/20260312_application_approved_trigger.sql`
  - Acceptance: Creator gets notified when application is accepted

- [ ] **Task 3.4**: Campaign deadline reminder (pg_cron)
  - Cron function that runs daily at 9 AM UTC
  - Finds campaigns with `end_date = CURRENT_DATE + INTERVAL '2 days'`
  - Finds hired creators (status = 'accepted' in campaign_applications or creator_campaigns)
  - Deduplicates: skip if notification already sent today for this campaign+creator
  - Files: `supabase/migrations/20260312_campaign_deadline_cron.sql`
  - Acceptance: Creators with upcoming deadlines get reminded, no duplicates

- [ ] **Task 3.5**: Deliverable submitted trigger
  - Fires on `creator_campaigns` UPDATE when `deliverables_status` changes to indicate submission
  - Notifies the business owner
  - Data JSON: `{ campaignId, campaignTitle, creatorId, creatorName }`
  - Files: `supabase/migrations/20260312_deliverable_submitted_trigger.sql`
  - Acceptance: Business owner notified when creator submits content

- [ ] **Task 3.6**: Payment sent trigger
  - Fires on `creator_earnings` INSERT or UPDATE when `status` changes to `'available'` or `'paid'`
  - Notifies the creator
  - Data JSON: `{ campaignId, campaignTitle, amount, currency }`
  - Priority: 3 (high — financial)
  - Files: `supabase/migrations/20260312_payment_sent_trigger.sql`
  - Acceptance: Creator notified when payment is processed

- [ ] **Task 3.7**: Campaign invitation trigger
  - Fires on campaign invitation INSERT (via campaignInvitationService)
  - Notifies the invited creator
  - Data JSON: `{ campaignId, campaignTitle, restaurantName, restaurantId }`
  - Files: `supabase/migrations/20260312_campaign_invite_trigger.sql`
  - Acceptance: Creator notified when invited to a campaign

---

## Phase 4: Engagement Notification Triggers

**Goal**: Create triggers for friend activity and recurring engagement prompts.

#### Tasks

- [ ] **Task 4.1**: Friend posted trigger
  - Fires on `posts` INSERT
  - Finds followers of the post author via follows/friends table
  - Checks `engagement_push_enabled` / `engagement_in_app_enabled` preferences
  - Rate limit: max 1 friend_post notification per follower per hour (prevent spam from prolific posters)
  - Data JSON: `{ postId, postType, authorId, authorName, authorAvatar, restaurantName }`
  - Files: `supabase/migrations/20260312_friend_post_trigger.sql`
  - Acceptance: Followers notified of new posts, respects preferences and rate limits

- [ ] **Task 4.2**: Weekly recap cron job
  - Runs every Sunday at 6 PM UTC
  - Targets active users (logged in within last 30 days)
  - Checks `engagement_push_enabled` preference
  - Inserts notification with `type = 'weekly_recap'`
  - Data JSON: `{ week: '2026-03-08' }`
  - Files: `supabase/migrations/20260312_weekly_recap_cron.sql`
  - Acceptance: Active users receive weekly prompt, inactive users skipped

---

## Phase 5: Frontend — Display & Navigation

**Goal**: Update frontend components to render new notification types and navigate correctly.

#### Tasks

- [ ] **Task 5.1**: Update `NotificationItem.tsx` — icon/color mapping for new types
  - Add icon + color for: `campaign_opportunity`, `campaign_application`, `application_approved`, `campaign_deadline`, `deliverable_submitted`, `payment_sent`, `campaign_invite`, `friend_post`, `weekly_recap`
  - Campaign types: briefcase icon, blue tint
  - Engagement types: appropriate icons per type
  - Files: `components/NotificationItem.tsx`
  - Acceptance: All notification types render with appropriate visual treatment

- [ ] **Task 5.2**: Implement deep link navigation on notification tap
  - Add `handleNotificationPress()` in notification screen / NotificationCenter
  - Switch on `notification.type` → `router.push()` to correct screen
  - Use `notification.data` for route params (campaignId, postId, etc.)
  - Handle missing data gracefully (fallback to notifications list)
  - Files: `components/NotificationItem.tsx`, `components/NotificationCenter.tsx`, `app/notifications/index.tsx`
  - Acceptance: Tapping each notification type navigates to the correct screen

- [ ] **Task 5.3**: Update `NotificationSettings.tsx` — add campaign & engagement toggles
  - Add "Campaigns" section with push + in-app toggles
  - Add "Engagement" section with push + in-app toggles
  - Wire toggles to `notification_preferences` table (new columns)
  - Files: `components/NotificationSettings.tsx`, `services/notificationPreferencesService.ts`
  - Acceptance: Users can toggle campaign and engagement notifications on/off

- [ ] **Task 5.4**: Update `notificationService.ts` — remove TODO stubs
  - Remove `sendBulkPushNotifications()` stub (Edge Function handles delivery now)
  - Remove `campaignNotificationService.ts` if present (triggers handle creation)
  - Ensure `createNotification()` fallback works or uses `create_notification` RPC if it exists
  - Files: `services/notificationService.ts`
  - Acceptance: No TODO stubs, clean service layer

---

## Phase 6: Integration & Validation

**Goal**: End-to-end testing and cleanup.

#### Tasks

- [ ] **Task 6.1**: Run `npm run typecheck && npm run lint`
  - Fix any TypeScript errors from new types
  - Fix any lint warnings
  - Acceptance: Zero errors

- [ ] **Task 6.2**: Create test SQL scripts for manual verification
  - Script to simulate each trigger (insert/update test rows)
  - Script to verify notifications were created correctly
  - Script to clean up test data
  - Files: `testing/push-notifications/verify-triggers.sql`, `testing/push-notifications/cleanup.sql`
  - Acceptance: Scripts exist and are documented

- [ ] **Task 6.3**: Update notification documentation
  - Update `services/notifications/CLAUDE.md` with new types
  - Update notification type table in spec
  - Files: `services/notifications/CLAUDE.md`
  - Acceptance: Documentation matches implementation

---

## Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# SQL validation (run against dev)
node scripts/run-sql.js --dev supabase/migrations/20260312_consolidated_notification_types.sql
```

## Notes

- PR #52 (`feat/push-notifications`) has partial implementation but critical gaps (see audit). This plan starts fresh on main rather than building on that branch.
- PR #40 (`feat/TRO-18-push-notifications`) is older and focused only on restaurant mentions — separate concern.
- The `campaign_deliverables` table may not exist in production. Triggers should use `creator_campaigns.deliverables_status` instead.
- The `campaign_invitations` table migration exists but types aren't in `lib/supabase.ts`. Verify table exists before creating trigger.
