# TRO-137: Subscription Payment Collection

## Overview

Implement subscription payment collection for restaurants after their first campaign post. Restaurants get a 14-day free trial, then are charged $49/month.

## Problem Statement

Currently not collecting the $49/month subscription fee from restaurant business users.

## Jobs To Be Done

- Collect subscription payment after 14-day trial
- Notify restaurants before trial ends
- Prevent campaign posting if subscription lapses

## New User Flow

```
Restaurant posts first campaign
    ↓
Success message appears:
"Campaign posted! You're on a 14-day free trial.
After that, it's $49/month to keep posting."
[Subscribe Now] or [Remind me in 12 days]
    ↓
(If Subscribe Now)
→ Create Stripe subscription with saved payment method
→ Trial period: 14 days
    ↓
(Day 12)
→ Webhook: customer.subscription.trial_will_end
→ Send email reminder
    ↓
(Day 14)
→ Trial ends → charges $49
→ If payment fails → immediate restriction on posting
```

## Acceptance Criteria

### Subscription Creation

- [ ] After first campaign post, show trial modal with subscribe CTA
- [ ] "Subscribe Now" creates Stripe subscription using saved payment method
- [ ] "Remind me in 12 days" dismisses modal, stores reminder date
- [ ] Subscription created with 14-day trial period
- [ ] Store `stripe_subscription_id` in restaurant/business profile

### Trial Management

- [ ] Track trial start date in database
- [ ] Track trial end date in database
- [ ] Webhook handler for `customer.subscription.trial_will_end`
- [ ] Send email reminder on day 12 (via webhook)

### Payment Enforcement

- [ ] After trial ends, subscription auto-charges $49/month
- [ ] If payment fails → immediately restrict new campaign posts
- [ ] Show "Payment required" message when restricted user tries to post
- [ ] Allow access to existing campaigns (read-only)

### Dashboard Display

- [ ] Restaurant dashboard shows subscription status:
  - During trial: "Trial ends [Date] | Manage subscription"
  - Active: "Subscription active | Manage subscription"
  - Failed: "Payment failed | Update payment method"
- [ ] "Manage subscription" links to Stripe Customer Portal

### Database Changes

- [ ] Add to `business_profiles` or `restaurant_claims` table:
  ```sql
  stripe_subscription_id TEXT
  subscription_status VARCHAR(20) -- 'trialing', 'active', 'past_due', 'canceled'
  trial_start_date TIMESTAMP
  trial_end_date TIMESTAMP
  subscription_reminder_dismissed_at TIMESTAMP
  ```

### Webhook Handlers

- [ ] `customer.subscription.trial_will_end` → Send reminder email
- [ ] `customer.subscription.updated` → Update subscription_status
- [ ] `invoice.payment_failed` → Set status to 'past_due', restrict posting

## Technical Constraints

- Use existing Stripe integration (already has `@stripe/stripe-react-native`)
- Use saved payment method from onboarding
- Price: $49/month (create Stripe Price object if not exists)
- Product ID should be configurable via environment

## Files to Create/Modify

1. `services/subscriptionService.ts` - New service for subscription management
2. `components/SubscriptionTrialModal.tsx` - Modal shown after first campaign
3. `app/api/webhooks/stripe.ts` or Supabase Edge Function - Webhook handler
4. `supabase/migrations/XXXXXX_subscription_fields.sql` - Database changes
5. `app/(tabs)/business/dashboard.tsx` - Add subscription status display
6. `services/campaignService.ts` - Add subscription check before posting

## API Endpoints Needed

- `POST /api/subscriptions/create` - Create subscription with trial
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `GET /api/subscriptions/status` - Get current subscription status

## Out of Scope

- Multiple subscription tiers
- Annual billing option
- Refunds/proration
- Grace period (immediate restriction on failure as specified)
