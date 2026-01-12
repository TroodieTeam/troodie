#!/bin/bash
# Check Stripe Payout Settings via API
# Usage: ./check-payout-via-api.sh

echo "=== Checking Stripe Payout Settings ==="
echo ""

# Get your Stripe secret key from environment or prompt
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "Enter your Stripe Secret Key (sk_live_... or sk_test_...):"
  read STRIPE_SECRET_KEY
fi

echo "Fetching account payout settings..."
echo ""

# Get account details
ACCOUNT_RESPONSE=$(curl -s https://api.stripe.com/v1/account \
  -u "$STRIPE_SECRET_KEY:")

# Extract payout schedule
SCHEDULE=$(echo "$ACCOUNT_RESPONSE" | jq -r '.settings.payouts.schedule.interval // "not set"')
DELAY_DAYS=$(echo "$ACCOUNT_RESPONSE" | jq -r '.settings.payouts.schedule.delay_days // "not set"')
MINIMUM_BALANCE=$(echo "$ACCOUNT_RESPONSE" | jq -r '.settings.payouts.schedule.minimum_amount // "not set"')

echo "Current Payout Settings:"
echo "  Schedule: $SCHEDULE"
echo "  Delay Days: $DELAY_DAYS"
echo "  Minimum Amount: $MINIMUM_BALANCE"
echo ""

if [ "$SCHEDULE" != "manual" ] && [ "$SCHEDULE" != "not set" ]; then
  echo "⚠️  WARNING: Payout schedule is set to '$SCHEDULE'"
  echo "   This means Stripe will automatically pay out funds!"
  echo ""
  echo "To change to manual, run:"
  echo "  curl https://api.stripe.com/v1/account \\"
  echo "    -u $STRIPE_SECRET_KEY: \\"
  echo "    -X POST \\"
  echo "    -d 'settings[payouts][schedule][interval]=manual'"
else
  echo "✅ Payout schedule is set to manual (or not configured)"
fi

echo ""
echo "Full account settings:"
echo "$ACCOUNT_RESPONSE" | jq '.settings.payouts'

