# Implementation Plan

This document contains the ordered task list for Ralph Loop execution.

## Task Overview

| ID | Task | Ticket | Dependencies | Complexity |
|----|------|--------|--------------|------------|
| 1-4 | TRO-144: Creator Stats Fields | TRO-144 | None | Medium |
| 5-9 | TRO-145: Browse Creators Filters | TRO-145 | TRO-144 | Medium |
| 10-16 | TRO-137: Subscription Payments | TRO-137 | None | High |
| 17-21 | TRO-146: Creator Notifications | TRO-146 | None | Medium |

---

## TRO-144: Creator Stats - Extended Profile Fields

### Task 1: Database migration for creator stats fields
- [ ] Create migration file `supabase/migrations/[timestamp]_creator_stats_fields.sql`
- [ ] Add columns: `primary_city`, `instagram_handle`, `instagram_engagement_rate`, `instagram_last_post_date`
- [ ] Add columns: `tiktok_handle`, `tiktok_engagement_rate`, `tiktok_last_post_date`
- [ ] Add column: `past_restaurant_collabs` TEXT
- [ ] Add columns: `social_stats_verified` BOOLEAN, `social_stats_verified_at` TIMESTAMP
- [ ] Update `preferred_compensation` constraint to allow new values

**Validation:** `npm run db:migrate` (or manual SQL execution)

### Task 2: Update creatorDiscoveryService with new fields
- [ ] Update return types to include new fields
- [ ] Modify `getCreatorProfile()` to return all new fields
- [ ] Modify `getCreators()` to include social handles in list view
- [ ] Add `updateCreatorStats()` function for profile updates

**Validation:** `npm run typecheck && npm run lint`

### Task 3: Creator profile edit - social stats section
- [ ] Add "Social Stats" section to `/app/creator/profile/edit.tsx`
- [ ] Add Instagram fields (handle, followers, engagement rate, last post date)
- [ ] Add TikTok fields (handle, followers, engagement rate, last post date)
- [ ] Add validation for handles (alphanumeric + underscore)
- [ ] Connect form to `updateCreatorStats()` service

**Validation:** `npm run typecheck && npm run lint`

### Task 4: Creator profile edit - compensation & collabs section
- [ ] Add "Compensation Preferences" section with multi-select chips
- [ ] Options: Free, Compensated meals, Pay under $150, Pay $150-500, Pay $500+
- [ ] Add "Primary City" field with text input
- [ ] Add "Past Restaurant Collabs" textarea
- [ ] Integrate all fields into form submission

**Validation:** `npm run typecheck && npm run lint && npm test`

---

## TRO-145: Browse Creators - Filter & Sort Enhancements

### Task 5: Database function update for advanced filtering
- [ ] Create migration to update `get_creators()` function
- [ ] Add `p_follower_min` and `p_follower_max` parameters for bucket filtering
- [ ] Add `p_compensation_types` parameter for compensation filtering
- [ ] Add `p_sort_by` parameter (recently_active, followers_high, followers_low)
- [ ] Join with `users` table to get `last_login_at` for sorting

**Validation:** Test function in Supabase SQL editor

### Task 6: Update CreatorFilters interface and service
- [ ] Update `CreatorFilters` interface in `creatorDiscoveryService.ts`
- [ ] Add: `followerBucket`, `preferredCompensation[]`, `sortBy`
- [ ] Update `getCreators()` to pass new parameters to database function
- [ ] Add helper function `getFollowerRange(bucket)` to convert bucket to min/max

**Validation:** `npm run typecheck && npm run lint`

### Task 7: Filter UI - Follower count buckets
- [ ] Add filter section to `/app/(tabs)/business/creators/browse.tsx`
- [ ] Create segmented control or chip group for follower buckets
- [ ] Options: All, Under 5K, 5K-20K, 20K+
- [ ] Connect to filter state and trigger refetch

**Validation:** `npm run typecheck && npm run lint`

### Task 8: Filter UI - Compensation and city filters
- [ ] Add multi-select chips for preferred compensation filter
- [ ] Add city dropdown/searchable field
- [ ] Populate city list from existing creator locations
- [ ] Add "Clear filters" button when filters active

**Validation:** `npm run typecheck && npm run lint`

### Task 9: Sort dropdown implementation
- [ ] Add sort dropdown to browse screen header
- [ ] Options: Recently Active, Followers (High to Low), Followers (Low to High)
- [ ] Default to "Recently Active"
- [ ] Connect to sort state and trigger refetch

**Validation:** `npm run typecheck && npm run lint && npm test`

---

## TRO-137: Subscription Payment Collection

### Task 10: Database schema for subscriptions
- [ ] Create migration for subscription fields on `business_profiles` or `restaurant_claims`
- [ ] Add: `stripe_subscription_id`, `subscription_status`, `trial_start_date`, `trial_end_date`
- [ ] Add: `subscription_reminder_dismissed_at`
- [ ] Add RLS policies for subscription data access

**Validation:** `npm run db:migrate`

### Task 11: Create subscriptionService
- [ ] Create `/services/subscriptionService.ts`
- [ ] Function: `createSubscription(restaurantId, paymentMethodId)` - Create Stripe sub with trial
- [ ] Function: `getSubscriptionStatus(restaurantId)` - Get current status
- [ ] Function: `canPostCampaign(restaurantId)` - Check if posting allowed
- [ ] Function: `dismissTrialReminder(restaurantId)` - Mark reminder dismissed

**Validation:** `npm run typecheck && npm run lint`

### Task 12: Stripe subscription creation integration
- [ ] Create Stripe Price for $49/month product (or use existing)
- [ ] Implement subscription creation with 14-day trial
- [ ] Store subscription ID in database
- [ ] Handle subscription creation errors

**Validation:** `npm run typecheck && npm run lint`

### Task 13: Trial modal after first campaign
- [ ] Create `SubscriptionTrialModal.tsx` component
- [ ] Message: "Campaign posted! You're on a 14-day free trial..."
- [ ] Buttons: [Subscribe Now], [Remind me in 12 days]
- [ ] Integrate into campaign creation success flow
- [ ] Only show for first campaign (check campaign count)

**Validation:** `npm run typecheck && npm run lint`

### Task 14: Webhook handlers for subscription events
- [ ] Create Supabase Edge Function or API route for Stripe webhooks
- [ ] Handle `customer.subscription.trial_will_end` → email reminder
- [ ] Handle `customer.subscription.updated` → update status
- [ ] Handle `invoice.payment_failed` → set status to 'past_due'

**Validation:** Test with Stripe webhook testing tool

### Task 15: Campaign posting restriction
- [ ] Update `campaignService.createCampaign()` to check subscription status
- [ ] If status is 'past_due' or trial expired without sub → reject
- [ ] Return appropriate error message
- [ ] Create `PaymentRequiredModal.tsx` for restricted users

**Validation:** `npm run typecheck && npm run lint`

### Task 16: Dashboard subscription status display
- [ ] Add subscription status section to `/app/(tabs)/business/dashboard.tsx`
- [ ] Display: trial end date, subscription status, manage link
- [ ] "Manage subscription" → Stripe Customer Portal
- [ ] Show "Payment failed" alert if past_due

**Validation:** `npm run typecheck && npm run lint && npm test`

---

## TRO-146: Creator Contact Method - Notifications

### Task 17: Add notification preference types
- [ ] Create migration to add notification preference types
- [ ] Add: `new_campaign_opportunity` for creators
- [ ] Add: `new_campaign_applicant` for restaurants
- [ ] Set default enabled = true for both

**Validation:** `npm run db:migrate`

### Task 18: Notification helper functions
- [ ] Add `notifyMatchingCreators(campaignId)` to `notificationService.ts`
- [ ] Query creators by: city, compensation match, open_to_collabs
- [ ] Batch create in-app notifications
- [ ] Add `notifyRestaurantOfApplicant(applicationId)` function

**Validation:** `npm run typecheck && npm run lint`

### Task 19: Push notification integration for campaigns
- [ ] Update `pushNotificationService.ts` with campaign notification types
- [ ] Payload for creators: title, body, campaign_id, route
- [ ] Payload for restaurants: title, body, application_id, route
- [ ] Respect notification preferences before sending

**Validation:** `npm run typecheck && npm run lint`

### Task 20: Trigger notifications on campaign create
- [ ] Update `campaignService.createCampaign()` to call notification function
- [ ] After successful creation, call `notifyMatchingCreators()`
- [ ] Log notification count for debugging
- [ ] Handle errors gracefully (don't fail campaign creation)

**Validation:** `npm run typecheck && npm run lint`

### Task 21: Trigger notifications on application submit
- [ ] Update `creatorApplicationService.applyToCampaign()` to notify restaurant
- [ ] After successful application, call `notifyRestaurantOfApplicant()`
- [ ] Include creator name and campaign name in notification
- [ ] Handle errors gracefully

**Validation:** `npm run typecheck && npm run lint && npm test`

---

## Execution Notes

- Tasks are ordered to respect dependencies
- TRO-144 should be completed before TRO-145 (creator fields used in browse)
- TRO-137 and TRO-146 can run in parallel with other features
- Each task should be one commit
- Run validation commands before marking complete
