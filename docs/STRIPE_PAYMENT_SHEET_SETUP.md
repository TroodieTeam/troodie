# Stripe Payment Sheet Setup Guide

## Overview

Stripe Payment Sheet integration requires native modules and a rebuild of your app. This guide walks through the complete setup.

## Prerequisites

- Expo SDK 54+ (you're using ~54.0.0 ✅)
- Development build (not Expo Go) - Payment Sheet requires native modules
- Stripe publishable key configured

## Setup Steps

### 1. Install Correct Version

```bash
npx expo install @stripe/stripe-react-native
```

This ensures you get the version compatible with your Expo SDK.

### 2. Add Config Plugin

Added to `app.config.js`:

```javascript
plugins: [
  // ... other plugins
  [
    "@stripe/stripe-react-native",
    {
      "enableGooglePay": true
    }
  ]
]
```

### 3. Rebuild App (Required!)

**Stripe Payment Sheet requires native modules** - you MUST rebuild:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Or use EAS Build
eas build --profile development --platform ios
```

**Important:** Payment Sheet will NOT work in Expo Go. You need a development build.

### 4. Environment Variables

Ensure `STRIPE_PUBLISHABLE_KEY` is set in your `.env.development`:

```
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

This is automatically loaded via `app.config.js` → `config.stripePublishableKey`.

## Current Implementation

### App Layout (`app/_layout.tsx`)

- Wraps app with `StripeProvider`
- Uses proper `urlScheme` for redirects (per Expo docs)
- Falls back gracefully if publishable key missing

### Campaign Creation (`create.tsx`)

- Uses `useStripe()` hook
- Initializes Payment Sheet after payment intent creation
- Presents Payment Sheet automatically
- Handles success, cancellation, and errors

## Testing

### Test Card Numbers

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

Any future expiry date and any 3-digit CVC.

### Flow

1. Create campaign → Payment intent created
2. Payment Sheet appears automatically
3. Enter test card → Click "Pay"
4. Payment processes → Webhook activates campaign
5. Success message → Campaign is live

## Troubleshooting

### Error: "TurboModuleRegistry.getEnforcing(...): 'OnrampSdk' could not be found"

**Cause:** App hasn't been rebuilt with native modules

**Fix:** Rebuild the app:
```bash
npx expo run:ios
# or
npx expo run:android
```

### Payment Sheet doesn't appear

**Check:**
1. Is `STRIPE_PUBLISHABLE_KEY` set in `.env.development`?
2. Did you rebuild after adding config plugin?
3. Are you using Expo Go? (Switch to development build)

### "Native module not available" warning

This means the app needs a rebuild. The code will gracefully fall back to showing a message, but Payment Sheet won't work until rebuild.

## Production Checklist

- [ ] Rebuild app with native modules
- [ ] Test Payment Sheet with test cards
- [ ] Verify webhook activates campaigns
- [ ] Set production `STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- [ ] Test end-to-end payment flow

## References

- [Expo Stripe Docs](https://docs.expo.dev/versions/latest/sdk/stripe/)
- [Stripe React Native SDK](https://github.com/stripe/stripe-react-native)
