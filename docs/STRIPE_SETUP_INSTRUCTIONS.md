# Stripe Payment System Setup Instructions

## Overview

The payment system for the creator marketplace has been fully implemented. To activate it, we need Stripe account setup and API keys.

## What Was Implemented

✅ Complete payment system with Stripe Connect Express
✅ Business payment onboarding and campaign payment processing
✅ Creator payout onboarding and automatic payouts
✅ Webhook handlers for payment events
✅ Payment notifications and error handling
✅ Full transaction tracking and payment history

## Required Stripe Setup

### 1. Platform Stripe Account

You need to create a Stripe account for Troodie (the platform):

1. Go to https://dashboard.stripe.com/register
2. Create account as a "Platform" (not just a regular account)
3. Complete business verification
4. Enable Stripe Connect in settings

### 2. API Keys Needed

Once the Stripe account is set up, we need these keys:

**For Development/Testing:**
- `STRIPE_SECRET_KEY` (test mode) - starts with `sk_test_`
- `STRIPE_PUBLISHABLE_KEY` (test mode) - starts with `pk_test_`
- `STRIPE_WEBHOOK_SECRET` (test mode) - for webhook signature verification

**For Production:**
- `STRIPE_SECRET_KEY` (live mode) - starts with `sk_live_`
- `STRIPE_PUBLISHABLE_KEY` (live mode) - starts with `pk_live_`
- `STRIPE_WEBHOOK_SECRET` (live mode) - for webhook signature verification

### 3. Where to Find These Keys

1. **Secret & Publishable Keys:**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy "Secret key" (test mode) → `STRIPE_SECRET_KEY`
   - Copy "Publishable key" (test mode) → `STRIPE_PUBLISHABLE_KEY`
   - Repeat for live mode when ready for production

2. **Webhook Secret:**
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Set endpoint URL to: `https://[your-supabase-project].supabase.co/functions/v1/stripe-webhook`
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `transfer.created`
     - `transfer.paid`
     - `transfer.failed`
     - `account.updated`
   - Copy the "Signing secret" → `STRIPE_WEBHOOK_SECRET`

### 4. Environment Variables

Add these to your environment configuration:

**For `.env` files (local development):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**For Supabase Edge Functions (webhook):**
- Go to Supabase Dashboard → Project Settings → Edge Functions
- Add environment variables:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

**For Expo/React Native app:**
- Add to `app.config.js` under `extra`:
```javascript
extra: {
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  // ... other config
}
```

### 5. Stripe Connect Settings

In Stripe Dashboard:
1. Go to Settings → Connect
2. Enable "Express accounts"
3. Set redirect URLs:
   - Return URL: `troodie://stripe/onboarding/return`
   - Refresh URL: `troodie://stripe/onboarding/refresh`
4. Configure application fee (10% as per plan)

### 6. Testing

Once keys are configured:
1. Use Stripe test cards: https://stripe.com/docs/testing
2. Test business onboarding flow
3. Test creator onboarding flow
4. Test payment intent creation
5. Test webhook delivery

## Next Steps

1. **Set up Stripe account** (if not already done)
2. **Provide API keys** - Add to secure location (password manager, env files)
3. **Configure webhook endpoint** in Stripe dashboard
4. **Test payment flows** with test cards
5. **Deploy to staging** for full integration testing

## Important Notes

- **Never commit API keys to git** - Use environment variables only
- **Test mode first** - Always test thoroughly before switching to live mode
- **Webhook endpoint** must be publicly accessible for Stripe to send events
- **Stripe Connect** requires business verification before going live
- **Platform fees** are set to 10% (configurable in code)

## Support

If you need help with Stripe setup:
- Stripe Docs: https://stripe.com/docs/connect
- Stripe Support: https://support.stripe.com

---

**Status:** Implementation complete, awaiting Stripe account setup and API keys
