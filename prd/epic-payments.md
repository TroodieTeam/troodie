# Payments Integration Epic

This document outlines the payment integration strategy for Troodie's creator marketplace, covering the complete flow from restaurant payments to creator payouts.

## Overview

**Goal**: Enable restaurants to pay for campaigns upfront, creators to receive automated payouts, and Troodie to collect platform fees.

**Revenue Model**: 
- Platform fee: 10-15% of campaign budget
- Payment processing: Stripe fees (2.9% + $0.30 per transaction)
- Net revenue: ~7-12% per campaign

## Payment Flow Architecture

```
Restaurant → Stripe Checkout → Troodie Platform → Creator Payouts
     ↓              ↓                ↓                    ↓
   Pay Campaign   Process        Store Balance      Automated
   ($500)         Payment        ($425)            Payout ($425)
```

## Phase 1: MVP Payment System (2-3 weeks)

### Core Features
- **Restaurant Payment**: Stripe Checkout for campaign prepayment
- **Manual Creator Payouts**: Admin panel for manual creator payments
- **Payment Tracking**: Store payment status and balances
- **Basic Webhooks**: Handle payment success/failure events

### Technical Implementation

#### Backend Changes
```sql
-- Add payment tracking tables
CREATE TABLE campaign_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id),
  restaurant_id uuid REFERENCES restaurants(id),
  amount_cents integer NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  status text DEFAULT 'pending',
  created_at timestamp DEFAULT now(),
  paid_at timestamp,
  platform_fee_cents integer,
  creator_payout_cents integer
);

CREATE TABLE creator_payouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid REFERENCES creator_profiles(id),
  campaign_id uuid REFERENCES campaigns(id),
  amount_cents integer NOT NULL,
  status text DEFAULT 'pending',
  payment_method text,
  created_at timestamp DEFAULT now(),
  paid_at timestamp,
  admin_notes text
);
```

#### Stripe Integration
```typescript
// Campaign payment creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: campaignBudget * 100, // Convert to cents
  currency: 'usd',
  metadata: {
    campaign_id: campaign.id,
    restaurant_id: restaurant.id,
    platform_fee_percent: 12
  }
});

// Webhook handling
app.post('/webhooks/stripe', (req, res) => {
  const event = req.body;
  if (event.type === 'payment_intent.succeeded') {
    // Update campaign_payments status
    // Calculate creator payout amounts
    // Send confirmation email to restaurant
  }
});
```

#### UI Components
- **Payment Button**: "Pay to Launch Campaign" CTA
- **Payment Status**: Show payment status on campaign cards
- **Admin Payout Panel**: Manual creator payment interface
- **Payment History**: Track all payments and payouts

### User Experience

#### Restaurant Flow
1. **Create Campaign**: Set budget ($500), select creators (5), set requirements
2. **Payment Screen**: Stripe Checkout integration
3. **Payment Success**: Campaign goes live, creators can apply
4. **Campaign Management**: Track payment status and creator progress

#### Creator Flow
1. **Apply to Campaign**: Standard application process
2. **Submit Deliverables**: Upload content and submit
3. **Approval Process**: Restaurant/admin approves content
4. **Payout Notification**: Receive payment confirmation
5. **Payment History**: Track earnings and payment status

#### Admin Flow
1. **Payment Dashboard**: View all payments and pending payouts
2. **Manual Payouts**: Process creator payments manually
3. **Payment Reports**: Track revenue and payment metrics
4. **Dispute Resolution**: Handle payment disputes

## Phase 2: Automated Creator Payouts (3-4 weeks)

### Core Features
- **Stripe Connect**: Express accounts for creators
- **Automated Payouts**: Automatic payments on content approval
- **Tax Handling**: 1099 forms and tax reporting
- **Dispute Management**: Built-in dispute resolution

### Technical Implementation

#### Stripe Connect Setup
```typescript
// Creator onboarding
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: creator.email,
  capabilities: {
    transfers: { requested: true }
  }
});

// Automated payout
const transfer = await stripe.transfers.create({
  amount: payoutAmount,
  currency: 'usd',
  destination: creator.stripe_account_id,
  metadata: {
    campaign_id: campaign.id,
    creator_id: creator.id
  }
});
```

#### Database Schema Updates
```sql
-- Add Stripe Connect fields
ALTER TABLE creator_profiles 
ADD COLUMN stripe_account_id text,
ADD COLUMN stripe_onboarding_completed boolean DEFAULT false,
ADD COLUMN stripe_onboarded_at timestamp;

-- Add payout tracking
CREATE TABLE automated_payouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid REFERENCES creator_profiles(id),
  campaign_id uuid REFERENCES campaigns(id),
  amount_cents integer NOT NULL,
  stripe_transfer_id text,
  status text DEFAULT 'pending',
  created_at timestamp DEFAULT now(),
  completed_at timestamp,
  failure_reason text
);
```

### User Experience Updates

#### Creator Onboarding
1. **Stripe Connect Setup**: Express account creation
2. **Identity Verification**: KYC compliance
3. **Bank Account Linking**: Direct deposit setup
4. **Tax Information**: W-9 form collection

#### Automated Payout Flow
1. **Content Approval**: Restaurant approves creator content
2. **Automatic Payout**: System processes payment within 24 hours
3. **Payment Notification**: Creator receives payment confirmation
4. **Tax Reporting**: Automatic 1099 generation at year-end

## Phase 3: Advanced Features (4-6 weeks)

### Core Features
- **Refund Management**: Partial and full refunds
- **Chargeback Handling**: Automated dispute resolution
- **Revenue Analytics**: Detailed financial reporting
- **Multi-Currency**: Support for international payments

### Technical Implementation

#### Refund System
```typescript
// Partial refund for rejected content
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount,
  reason: 'requested_by_customer',
  metadata: {
    campaign_id: campaign.id,
    reason: 'content_rejected'
  }
});
```

#### Analytics Dashboard
```sql
-- Revenue reporting queries
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(amount_cents) as total_revenue,
  SUM(platform_fee_cents) as platform_fees,
  COUNT(*) as campaign_count
FROM campaign_payments 
WHERE status = 'completed'
GROUP BY month;
```

## Implementation Timeline

### Week 1-2: Phase 1 Foundation
- [ ] Set up Stripe account and webhooks
- [ ] Create payment tracking tables
- [ ] Implement Stripe Checkout integration
- [ ] Build basic payment UI components

### Week 3-4: Phase 1 Completion
- [ ] Implement webhook handling
- [ ] Create admin payout panel
- [ ] Add payment status tracking
- [ ] Test end-to-end payment flow

### Week 5-7: Phase 2 Setup
- [ ] Implement Stripe Connect
- [ ] Create creator onboarding flow
- [ ] Build automated payout system
- [ ] Add tax compliance features

### Week 8-10: Phase 2 Completion
- [ ] Test automated payouts
- [ ] Implement dispute resolution
- [ ] Add payment analytics
- [ ] Launch with select creators

### Week 11-16: Phase 3 Features
- [ ] Implement refund system
- [ ] Add chargeback handling
- [ ] Build revenue analytics
- [ ] Add multi-currency support

## Success Metrics

### Phase 1 Metrics
- **Payment Success Rate**: >95% successful payments
- **Manual Payout Time**: <48 hours from approval to payout
- **Payment Processing Time**: <5 minutes from payment to campaign activation

### Phase 2 Metrics
- **Creator Onboarding**: >80% completion rate
- **Automated Payout Time**: <24 hours from approval to payout
- **Dispute Rate**: <2% of total payments

### Phase 3 Metrics
- **Refund Processing**: <24 hours for refund requests
- **Chargeback Resolution**: <7 days average resolution time
- **Revenue Growth**: 20% month-over-month growth

## Risk Mitigation

### Payment Risks
- **Fraud Prevention**: Stripe's built-in fraud detection
- **Chargeback Protection**: Dispute resolution procedures
- **Payment Failures**: Retry logic and fallback options

### Compliance Risks
- **Tax Compliance**: Automatic 1099 generation
- **KYC Compliance**: Stripe Connect identity verification
- **PCI Compliance**: Stripe handles all sensitive data

### Technical Risks
- **Webhook Reliability**: Retry logic and idempotency
- **Database Consistency**: Transaction management
- **API Rate Limits**: Proper error handling and retries

## Cost Analysis

### Stripe Fees
- **Payment Processing**: 2.9% + $0.30 per transaction
- **Stripe Connect**: 0.5% per transfer
- **Total Processing**: ~3.4% + $0.30 per transaction

### Platform Revenue
- **Campaign Budget**: $500
- **Stripe Fees**: ~$17.50
- **Platform Fee (12%)**: $60
- **Net Revenue**: ~$42.50 per campaign

### Break-Even Analysis
- **Monthly Campaigns**: 50 campaigns
- **Average Budget**: $500
- **Monthly Revenue**: ~$2,125
- **Annual Revenue**: ~$25,500

## Next Steps

1. **Stripe Account Setup**: Create Troodie platform account
2. **Webhook Infrastructure**: Set up webhook endpoints
3. **Payment UI**: Build payment components
4. **Admin Panel**: Create payout management interface
5. **Testing**: End-to-end payment flow testing
6. **Launch**: Gradual rollout with select restaurants
7. **Scale**: Expand to all restaurants and creators

## Technical Dependencies

### External Services
- **Stripe**: Payment processing and Connect platform
- **Supabase**: Database and authentication
- **Email Service**: Payment notifications and receipts

### Internal Components
- **Campaign Management**: Existing campaign system
- **User Authentication**: Existing auth system
- **Admin Dashboard**: Existing admin interface
- **Notification System**: Existing notification system

## Security Considerations

### Data Protection
- **PCI Compliance**: Stripe handles all sensitive payment data
- **Encryption**: All payment data encrypted in transit and at rest
- **Access Control**: Role-based access to payment information

### Fraud Prevention
- **Stripe Radar**: Built-in fraud detection
- **Velocity Limits**: Prevent rapid-fire payment attempts
- **IP Blocking**: Block suspicious IP addresses
- **Manual Review**: Flag high-risk transactions for review

