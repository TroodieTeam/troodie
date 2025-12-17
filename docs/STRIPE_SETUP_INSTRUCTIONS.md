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
   
   **You need TWO webhook endpoints** (one for dev, one for prod):
   
   **Development Webhook (Test Mode):**
   - Go to https://dashboard.stripe.com/webhooks (make sure you're in **Test mode**)
   - Click "Add endpoint"
   - Set endpoint URL to: `https://[your-dev-supabase-project].supabase.co/functions/v1/stripe-webhook`
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `transfer.created`
     - `transfer.paid`
     - `transfer.failed`
     - `account.updated`
   - Copy the "Signing secret" → `STRIPE_WEBHOOK_SECRET` (for dev environment)
   
   **Production Webhook (Live Mode):**
   - Switch to **Live mode** in Stripe Dashboard
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Set endpoint URL to: `https://[your-prod-supabase-project].supabase.co/functions/v1/stripe-webhook`
   - Select the same events as above
   - Copy the "Signing secret" → `STRIPE_WEBHOOK_SECRET` (for prod environment)
   
   **Note:** Each webhook endpoint gets its own unique signing secret. Make sure to use the correct secret for each environment.

### 4. Environment Variables

Add these to your environment configuration:

**For `.env` files (local development):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**For Supabase Edge Functions (webhook):**

You need to deploy the `stripe-webhook` function to **both** your dev and prod Supabase projects. The function code is the same, but each deployment uses environment-specific variables.

**Deploy to Dev Supabase Project:**
1. Link to your dev project (if not already linked):
   ```bash
   supabase link --project-ref [your-dev-project-ref]
   ```
2. Deploy the function:
   ```bash
   supabase functions deploy stripe-webhook
   ```
3. Set environment variables in Supabase Dashboard:
   - Go to Supabase Dashboard → Project Settings → Edge Functions
   - Add:
     - `STRIPE_SECRET_KEY` (test mode: `sk_test_...`)
     - `STRIPE_WEBHOOK_SECRET` (dev webhook secret: `whsec_...`)
   - Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available

**Deploy to Prod Supabase Project:**
1. Link to your prod project:
   ```bash
   supabase link --project-ref [your-prod-project-ref]
   ```
2. Deploy the function:
   ```bash
   supabase functions deploy stripe-webhook
   ```
3. Set environment variables in Supabase Dashboard:
   - Go to Supabase Dashboard → Project Settings → Edge Functions
   - Add:
     - `STRIPE_SECRET_KEY` (live mode: `sk_live_...`)
     - `STRIPE_WEBHOOK_SECRET` (prod webhook secret: `whsec_...`)
   - Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available

**Important:** The function code in `supabase/functions/stripe-webhook/index.ts` is shared, but you deploy it separately to each project. Each deployment reads from its own project's environment variables.

**For Expo/React Native app:**
- Add to `app.config.js` under `extra`:
```javascript
extra: {
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  // ... other config
}
```

### 5. Stripe Connect Settings

Stripe Connect allows businesses and creators to receive payments through your platform. You need to configure Connect settings separately for **Test mode** and **Live mode**.

#### Step 1: Navigate to Connect Settings

1. Go to https://dashboard.stripe.com/settings/connect
2. Make sure you're in the correct mode (Test mode for development, Live mode for production)
3. You should see the "Connect" settings page

#### Step 2: Enable Express Accounts

Express accounts are the recommended account type for Troodie because they:
- Provide a streamlined onboarding experience
- Allow creators/businesses to get started quickly
- Handle tax collection automatically
- Support automatic payouts

**To enable:**
1. In the Connect settings, find the "Account types" section
2. Enable **"Express accounts"** (this should be the default)
3. Ensure "Standard accounts" and "Custom accounts" are disabled (unless you have specific needs)

#### Step 3: Configure Redirect URLs

**⚠️ Important:** Stripe Dashboard requires **HTTPS URLs** for redirect URIs, not custom deep link schemes like `troodie://`. You need to create HTTPS redirect pages that then redirect to your app's deep links.

**Solution: Create HTTPS Redirect Pages**

You have two options:

**Option A: Use Supabase Edge Function (Recommended)**

Create a simple redirect Edge Function that redirects to your deep link:

1. Create `supabase/functions/stripe-redirect/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Determine redirect type and parameters
  const isReturn = path.includes('/return');
  const isRefresh = path.includes('/refresh');
  
  // Get query parameters (e.g., account_type)
  const accountType = url.searchParams.get('account_type') || '';
  const params = accountType ? `?account_type=${accountType}` : '';
  
  // Build deep link
  const deepLink = isReturn 
    ? `troodie://stripe/onboarding/return${params}`
    : `troodie://stripe/onboarding/refresh`;
  
  // Return HTML that redirects to deep link
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Redirecting...</title>
      </head>
      <body>
        <script>
          // Try to open deep link
          window.location.href = '${deepLink}';
          
          // Fallback: Show message if app not installed
          setTimeout(function() {
            document.body.innerHTML = '<p>Opening Troodie app...</p><p>If the app doesn\'t open, <a href="${deepLink}">click here</a></p>';
          }, 1000);
        </script>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  });
});
```

2. **Deploy to Dev Supabase Project:**
   ```bash
   # Link to dev project (if not already linked)
   supabase link --project-ref [your-dev-project-ref]
   
   # Deploy the function
   supabase functions deploy stripe-redirect
   ```

3. **Deploy to Prod Supabase Project:**
   ```bash
   # Link to prod project
   supabase link --project-ref [your-prod-project-ref]
   
   # Deploy the function
   supabase functions deploy stripe-redirect
   ```

4. **Use HTTPS URLs in Stripe Dashboard:**

   **For Test Mode (Development):**
   - **Return URL:** `https://tcultsriqunnxujqiwea.supabase.co/functions/v1/stripe-redirect/return`
   - **Refresh URL:** `https://tcultsriqunnxujqiwea.supabase.co/functions/v1/stripe-redirect/refresh`

   **For Live Mode (Production):**
   - **Return URL:** `https://cacrjcekanesymdzpjtt.supabase.co/functions/v1/stripe-redirect/return`
   - **Refresh URL:** `https://cacrjcekanesymdzpjtt.supabase.co/functions/v1/stripe-redirect/refresh`

   **Important:** Each Stripe mode (test/live) needs its own redirect URLs pointing to the corresponding Supabase project.

**Option B: Use Your Website Domain**

If you have a website (e.g., `troodie.com`), create simple HTML redirect pages:

1. Create `https://troodie.com/stripe/onboarding/return.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=troodie://stripe/onboarding/return">
</head>
<body>
  <script>window.location.href = 'troodie://stripe/onboarding/return';</script>
  <p>Redirecting to Troodie app...</p>
</body>
</html>
```

2. Create `https://troodie.com/stripe/onboarding/refresh.html` (similar)

3. Use these URLs in Stripe Dashboard:
   - **Return URL:** `https://troodie.com/stripe/onboarding/return.html`
   - **Refresh URL:** `https://troodie.com/stripe/onboarding/refresh.html`

**For Test Mode (Development):**
1. Scroll to the "Redirect URLs" section in Stripe Dashboard
2. Click "Add redirect URI"
3. Add your HTTPS return URL (from Option A or B above)
4. Add your HTTPS refresh URL (from Option A or B above)

**For Live Mode (Production):**
1. Switch to **Live mode** in Stripe Dashboard
2. Repeat the same HTTPS URL configuration
3. Use production Supabase project URL or production website domain

**Important Notes:**
- ✅ **Stripe Dashboard requires HTTPS URLs** - custom schemes like `troodie://` will be rejected
- ✅ The HTTPS pages redirect to your deep link (`troodie://stripe/onboarding/return`)
- ✅ Your app must handle the deep links properly (already configured in your routing)
- ✅ When creating account links programmatically (via API), you can use deep links directly, but HTTPS URLs are more reliable
- ✅ Test both the HTTPS redirect and the deep link handling before going live

**Update Your Code (Optional but Recommended):**

To use HTTPS URLs when creating account links programmatically, update `services/stripeService.ts` to use your existing `SUPABASE_URL`:

```typescript
// Instead of:
refresh_url: `${process.env.APP_URL || 'troodie://'}/stripe/onboarding/refresh`,
return_url: `${process.env.APP_URL || 'troodie://'}/stripe/onboarding/return?account_type=${accountType}`,

// Use:
const supabaseUrl = process.env.SUPABASE_URL || '';
refresh_url: `${supabaseUrl}/functions/v1/stripe-redirect/refresh`,
return_url: `${supabaseUrl}/functions/v1/stripe-redirect/return?account_type=${accountType}`,
```

This uses your existing `SUPABASE_URL` environment variable, so no new variable is needed. The URLs will automatically match your Stripe Dashboard configuration since they use the same Supabase project URL.

#### Step 4: Additional Connect Settings (Optional but Recommended)

**Onboarding Requirements:**
- Enable "Collect business information" (required for businesses)
- Enable "Collect bank account information" (required for payouts)
- Enable "Collect identity verification" (required for compliance)

**Payout Settings:**
- Set default payout schedule (e.g., "Daily" or "Weekly")
- Configure minimum payout amount if needed
- Enable automatic payouts (recommended)

**Branding (Optional):**
- Upload your platform logo (appears in Stripe onboarding)
- Set your platform name (should be "Troodie")
- Customize colors to match your brand

#### Step 6: Verify Configuration

After configuring, verify your settings:
1. **Test Mode:**
   - Create a test Express account
   - Go through the onboarding flow
   - Verify redirect URLs work correctly

2. **Live Mode:**
   - Complete the same verification in Live mode
   - Ensure all settings match between Test and Live modes
   - Document any differences for your team

#### Troubleshooting

**Redirect URLs not working:**
- Verify deep link scheme is registered in your app
- Check that your app handles the routes: `/stripe/onboarding/return` and `/stripe/onboarding/refresh`
- Test deep links manually: `troodie://stripe/onboarding/return`

**Onboarding flow issues:**
- Ensure Express accounts are enabled
- Verify all required information is being collected
- Check webhook events for `account.updated` to track status changes

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

## Support

If you need help with Stripe setup:
- Stripe Docs: https://stripe.com/docs/connect
- Stripe Support: https://support.stripe.com

---

**Status:** Implementation complete, awaiting Stripe account setup and API keys
