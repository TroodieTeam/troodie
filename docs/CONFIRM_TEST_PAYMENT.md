# How to Confirm Test Payment in Stripe

When a payment intent is in "Incomplete" status, you need to confirm it. Here are the options:

## Option 1: Stripe CLI (Recommended for Testing)

Install Stripe CLI if you haven't:
```bash
brew install stripe/stripe-cli/stripe
# or
# https://stripe.com/docs/stripe-cli
```

Login:
```bash
stripe login
```

Confirm the payment intent:
```bash
stripe payment_intents confirm pi_3SfILSDt5IHC2XMO0jxOzgDx \
  --payment-method=pm_card_visa
```

Or use a test card:
```bash
stripe payment_intents confirm pi_3SfILSDt5IHC2XMO0jxOzgDx \
  --payment-method='{"type":"card","card":{"number":"4242424242424242","exp_month":12,"exp_year":2025,"cvc":"123"}}'
```

## Option 2: Stripe Dashboard - Test Payment Methods

1. Go to: https://dashboard.stripe.com/test/payments
2. Click on the payment intent
3. Look for "Test payment methods" section
4. Click "Confirm with test card"
5. Select a test card (e.g., "Visa")
6. Click "Confirm"

**Note:** This option may not be available for all payment intents. If you don't see it, use Stripe CLI.

## Option 3: Integrate Payment Sheet (Production)

For production, integrate Stripe Payment Sheet in your app:

```typescript
import { useStripe } from '@stripe/stripe-react-native';

const { initPaymentSheet, presentPaymentSheet } = useStripe();

// After creating payment intent:
const { error } = await initPaymentSheet({
  merchantDisplayName: 'Troodie',
  paymentIntentClientSecret: paymentResult.clientSecret,
});

if (!error) {
  const { error: paymentError } = await presentPaymentSheet();
  // Payment confirmed!
}
```

## Option 4: Use Stripe API Directly

```bash
curl https://api.stripe.com/v1/payment_intents/pi_3SfILSDt5IHC2XMO0jxOzgDx/confirm \
  -u sk_test_YOUR_SECRET_KEY: \
  -d "payment_method=pm_card_visa"
```

## After Confirmation

Once confirmed, the webhook will automatically:
- Update `campaign_payments.status` → `'succeeded'`
- Update `campaigns.payment_status` → `'paid'`
- Update `campaigns.status` → `'active'`
- Create `payment_transactions` record

Check your webhook logs in Stripe Dashboard to verify it was processed.
