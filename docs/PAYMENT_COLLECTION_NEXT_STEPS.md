# Payment Collection - Next Steps

After successfully creating a payment intent, you need to collect payment from the user.

## Current Status

✅ Payment intent created: `pi_3SfILSDt5lHC2XMO0jxOzgDx`  
✅ Payment record stored in database  
⏳ **Payment not yet collected from user**

## Option 1: Test Mode - Manual Confirmation (Quick)

For testing, you can manually confirm the payment in Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/payments
2. Search for payment intent: `pi_3SfILSDt5lHC2XMO0jxOzgDx`
3. Click "Confirm payment"
4. Use test card: `4242 4242 4242 4242`
5. The webhook will automatically:
   - Update `campaign_payments.status` → `'succeeded'`
   - Update `campaigns.payment_status` → `'paid'`
   - Update `campaigns.status` → `'active'`
   - Create `payment_transactions` record

## Option 2: Production - Stripe Payment Sheet Integration

### Install Dependencies

```bash
npm install @stripe/stripe-react-native
```

### Update `create.tsx` to Present Payment Sheet

Replace the TODO section in `handleSubmit`:

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
    return;
  }

  // Present Payment Sheet
  const { error: paymentError } = await presentPaymentSheet();

  if (paymentError) {
    Alert.alert('Payment Failed', paymentError.message);
    return;
  }

  // Payment successful - webhook will handle campaign activation
  Alert.alert(
    'Payment Successful',
    'Your campaign is now active!',
    [{ text: 'OK', onPress: () => router.replace('/business/campaigns') }]
  );
}
```

### Configure Stripe Provider

Wrap your app with StripeProvider:

```typescript
// app/_layout.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      {/* Your app */}
    </StripeProvider>
  );
}
```

## Verification

After payment is collected (manual or via Payment Sheet), verify:

```sql
SELECT 
  c.id,
  c.title,
  c.status,
  c.payment_status,
  cp.status as payment_record_status,
  cp.stripe_payment_intent_id,
  cp.paid_at
FROM campaigns c
LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id
WHERE c.id = 'YOUR_CAMPAIGN_ID';
```

Expected result:
- `campaigns.status` = `'active'`
- `campaigns.payment_status` = `'paid'`
- `campaign_payments.status` = `'succeeded'`
- `campaign_payments.paid_at` = timestamp

## Webhook Flow

The `stripe-webhook` Edge Function automatically:
1. Receives `payment_intent.succeeded` event from Stripe
2. Updates `campaign_payments` table
3. Updates `campaigns` table
4. Creates `payment_transactions` record
5. Sends notification to business

No manual intervention needed - webhook handles everything!
