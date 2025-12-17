# Restaurant Owner Payment Flow - Production

This document explains what happens from the restaurant owner's perspective when creating a paid campaign in production.

## Current Flow (What Happens Now)

### Step 1: Create Campaign
1. Restaurant owner fills out campaign details (title, description, budget, deliverables)
2. Clicks "Create Campaign"
3. **Payment intent is created** ✅
4. **Campaign is created** with `status: 'pending'` ✅
5. **Payment record is stored** with `status: 'pending'` ✅

### Step 2: Payment Collection (Current: Manual/CLI)
- Currently: Payment intent needs manual confirmation via Stripe CLI or Dashboard
- **This is what needs to change for production**

## Production Flow (What Should Happen)

### Step 1: Create Campaign (Same as Now)
1. Restaurant owner fills out campaign details
2. Clicks "Create Campaign"
3. Payment intent is created ✅
4. Campaign is created with `status: 'pending'` ✅

### Step 2: Payment Collection (Production)
**Instead of manual confirmation, the app should:**

1. **Present Stripe Payment Sheet** immediately after campaign creation
   - User sees a payment form overlay
   - Enters credit card details (or uses saved card)
   - Clicks "Pay $50.00"

2. **Payment is confirmed** via Stripe SDK
   - Payment Sheet handles card collection
   - Stripe processes the payment
   - Payment intent status changes to `succeeded`

3. **Webhook automatically updates everything**
   - `stripe-webhook` Edge Function receives `payment_intent.succeeded` event
   - Updates `campaign_payments.status` → `'succeeded'`
   - Updates `campaigns.payment_status` → `'paid'`
   - Updates `campaigns.status` → `'active'`
   - Creates `payment_transactions` record
   - Sends notification to restaurant owner

4. **User sees success message**
   - "Payment successful! Your campaign is now live."
   - Redirected to campaigns list
   - Campaign appears as "Active"

## What the Restaurant Owner Sees

### Before Payment (Current State)
```
[Campaign Created]
Your campaign has been created. Payment processing will begin shortly.
[OK]
```

### After Payment (Production)
```
[Payment Successful]
Your campaign is now active! Creators can now apply.
[View Campaign]
```

## Implementation Required

### 1. Install Stripe React Native SDK
```bash
npm install @stripe/stripe-react-native
```

### 2. Add Stripe Provider to App
```typescript
// app/_layout.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

<StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
  {/* Your app */}
</StripeProvider>
```

### 3. Update `handleSubmit` in `create.tsx`

Replace the TODO section:

```typescript
import { useStripe } from '@stripe/stripe-react-native';

// In component:
const { initPaymentSheet, presentPaymentSheet } = useStripe();

// After payment intent creation:
if (paymentResult.success && paymentResult.clientSecret) {
  // Initialize Payment Sheet
  const { error: initError } = await initPaymentSheet({
    merchantDisplayName: 'Troodie',
    paymentIntentClientSecret: paymentResult.clientSecret,
  });

  if (initError) {
    Alert.alert('Error', initError.message);
    // Don't delete campaign - let them try again
    return;
  }

  // Present Payment Sheet
  const { error: paymentError } = await presentPaymentSheet();

  if (paymentError) {
    // Payment failed or was cancelled
    if (paymentError.code !== 'Canceled') {
      Alert.alert('Payment Failed', paymentError.message);
    }
    // Campaign stays in 'pending' status - they can retry payment later
    return;
  }

  // Payment successful!
  Alert.alert(
    'Payment Successful',
    'Your campaign is now active!',
    [{ 
      text: 'OK', 
      onPress: () => router.replace('/business/campaigns') 
    }]
  );
}
```

## Error Handling

### Payment Cancelled
- Campaign stays in `status: 'pending'`
- User can retry payment later
- No funds charged

### Payment Failed
- Campaign stays in `status: 'pending'`
- Show error message
- User can retry with different card

### Payment Successful
- Webhook automatically activates campaign
- User sees success message
- Campaign goes live immediately

## User Experience Flow

```
1. Fill campaign form
   ↓
2. Click "Create Campaign"
   ↓
3. Payment Sheet appears
   ↓
4. Enter card details
   ↓
5. Click "Pay"
   ↓
6. Payment processing...
   ↓
7. Success! Campaign is live
```

## Summary

**Current (Testing):**
- Payment intent created ✅
- Manual confirmation needed ❌
- Campaign stays pending until manual confirmation

**Production (What Should Happen):**
- Payment intent created ✅
- Payment Sheet appears automatically ✅
- User pays immediately ✅
- Campaign activates automatically via webhook ✅

The key difference: **Payment Sheet integration** so the restaurant owner can pay directly in the app without manual steps.
