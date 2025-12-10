# Engineering Request ER-003: Stripe Integration and Payouts

**Status:** Open  
**Priority:** High  
**Created:** 2025-12-08  
**Related:** Creator Marketplace, Campaign Payments, Creator Payouts, Business Payments

## Problem Statement

The creator marketplace requires a payment system to handle:
1. Business payments for campaigns (paying creators for deliverables)
2. Creator payouts (receiving payment for completed work)
3. Platform fees and commission handling
4. Payment tracking and reconciliation

Stripe is the industry standard for payment processing and should be integrated to handle all payment flows in the creator marketplace.

## Background

Currently, the creator marketplace has campaigns and deliverables, but no payment processing. Businesses need to pay creators for completed work, and creators need to receive payouts. This requires:

- Stripe account integration
- Payment processing for campaign payments
- Payout system for creators
- Platform fee handling
- Payment tracking and history
- Invoice generation
- Tax handling (1099 forms for creators)

## Scope

### 1. Stripe Account Setup
- [ ] **Business Stripe Connect Accounts**
  - Onboard businesses to Stripe Connect
  - Handle account verification
  - Store Stripe account IDs
  - Handle account status updates

- [ ] **Creator Stripe Connect Accounts**
  - Onboard creators to Stripe Connect
  - Handle account verification
  - Store Stripe account IDs
  - Handle payout preferences (bank account, debit card)

- [ ] **Platform Stripe Account**
  - Set up platform Stripe account
  - Configure application fees
  - Set up webhooks

### 2. Campaign Payment Flow
- [ ] **Campaign Creation Payment**
  - Business creates campaign with budget
  - Hold/authorize payment when campaign is approved
  - Store payment intent ID
  - Handle payment failures

- [ ] **Deliverable Approval Payment**
  - When deliverable is approved, transfer payment to creator
  - Deduct platform fee
  - Handle partial payments (multiple deliverables)
  - Handle payment disputes

- [ ] **Campaign Completion Payment**
  - Finalize all payments when campaign completes
  - Handle refunds if needed
  - Generate invoices

### 3. Creator Payout System
- [ ] **Payout Scheduling**
  - Automatic payouts (daily/weekly/monthly)
  - Manual payout requests
  - Minimum payout threshold
  - Payout status tracking

- [ ] **Payout Processing**
  - Transfer funds to creator Stripe account
  - Handle payout failures
  - Retry failed payouts
  - Payout notifications

- [ ] **Payout History**
  - Track all payouts
  - Payout status (pending, processing, completed, failed)
  - Payout amounts and fees
  - Payout dates

### 4. Platform Fees
- [ ] **Fee Calculation**
  - Platform commission percentage
  - Fee calculation logic
  - Fee tracking per transaction
  - Fee reporting

- [ ] **Fee Collection**
  - Collect fees on each payment
  - Transfer fees to platform account
  - Fee reconciliation

### 5. Payment Tracking & History
- [ ] **Payment Records**
  - Store all payment transactions
  - Payment status tracking
  - Payment metadata
  - Payment disputes

- [ ] **Invoice Generation**
  - Generate invoices for businesses
  - Generate receipts for creators
  - Store invoice PDFs
  - Email invoices

- [ ] **Payment Reports**
  - Business payment history
  - Creator payout history
  - Platform revenue reports
  - Tax reporting (1099 forms)

### 6. Webhooks & Events
- [ ] **Stripe Webhook Integration**
  - Payment succeeded events
  - Payment failed events
  - Payout completed events
  - Account updated events
  - Dispute events

- [ ] **Event Processing**
  - Update payment status
  - Update deliverable status
  - Send notifications
  - Handle errors

## Technical Requirements

### Database Schema

1. **Payment Tables**
   ```sql
   -- Stripe accounts for businesses and creators
   stripe_accounts (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     account_type VARCHAR (business|creator),
     stripe_account_id VARCHAR,
     stripe_account_status VARCHAR,
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   )

   -- Payment intents for campaigns
   campaign_payments (
     id UUID PRIMARY KEY,
     campaign_id UUID REFERENCES campaigns(id),
     business_id UUID REFERENCES users(id),
     stripe_payment_intent_id VARCHAR,
     amount DECIMAL,
     currency VARCHAR,
     status VARCHAR (pending|succeeded|failed|refunded),
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   )

   -- Payouts to creators
   creator_payouts (
     id UUID PRIMARY KEY,
     creator_id UUID REFERENCES users(id),
     stripe_payout_id VARCHAR,
     amount DECIMAL,
     currency VARCHAR,
     platform_fee DECIMAL,
     status VARCHAR (pending|processing|completed|failed),
     scheduled_at TIMESTAMP,
     completed_at TIMESTAMP,
     created_at TIMESTAMP
   )

   -- Payment transactions (detailed record)
   payment_transactions (
     id UUID PRIMARY KEY,
     campaign_id UUID REFERENCES campaigns(id),
     deliverable_id UUID REFERENCES campaign_deliverables(id),
     creator_id UUID REFERENCES users(id),
     business_id UUID REFERENCES users(id),
     stripe_payment_intent_id VARCHAR,
     stripe_transfer_id VARCHAR,
     amount DECIMAL,
     platform_fee DECIMAL,
     creator_amount DECIMAL,
     currency VARCHAR,
     status VARCHAR,
     transaction_type VARCHAR (payment|payout|refund),
     metadata JSONB,
     created_at TIMESTAMP
   )

   -- Invoices
   invoices (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     invoice_type VARCHAR (business|creator),
     stripe_invoice_id VARCHAR,
     amount DECIMAL,
     currency VARCHAR,
     status VARCHAR,
     pdf_url VARCHAR,
     created_at TIMESTAMP
   )
   ```

2. **Campaign Updates**
   - Add `payment_status` to `campaigns` table
   - Add `payment_intent_id` to `campaigns` table
   - Add `budget` and `currency` to `campaigns` table

3. **Deliverable Updates**
   - Add `payment_status` to `campaign_deliverables` table
   - Add `payment_amount` to `campaign_deliverables` table
   - Add `paid_at` timestamp to `campaign_deliverables` table

### Stripe Integration

1. **Stripe SDK Setup**
   - Install Stripe SDK
   - Configure Stripe API keys (test and production)
   - Set up Stripe webhook endpoints
   - Implement Stripe error handling

2. **Stripe Connect Setup**
   - Implement Connect onboarding flow
   - Handle OAuth redirects
   - Store Connect account IDs
   - Handle account status updates

3. **Payment Processing**
   - Create payment intents
   - Confirm payments
   - Handle 3D Secure
   - Handle payment failures
   - Process refunds

4. **Transfer Processing**
   - Create transfers to creators
   - Handle transfer failures
   - Process payouts
   - Handle payout failures

### API Endpoints

1. **Payment Endpoints**
   - `POST /api/payments/create-intent` - Create payment intent for campaign
   - `POST /api/payments/confirm` - Confirm payment
   - `POST /api/payments/refund` - Process refund
   - `GET /api/payments/history` - Get payment history

2. **Payout Endpoints**
   - `POST /api/payouts/request` - Request payout
   - `GET /api/payouts/history` - Get payout history
   - `GET /api/payouts/balance` - Get current balance

3. **Stripe Connect Endpoints**
   - `POST /api/stripe/connect/onboard` - Start Connect onboarding
   - `GET /api/stripe/connect/status` - Get Connect account status
   - `POST /api/stripe/connect/update` - Update Connect account

4. **Webhook Endpoint**
   - `POST /api/webhooks/stripe` - Handle Stripe webhooks

### Frontend Integration

1. **Payment UI**
   - Payment form for campaign creation
   - Payment confirmation screen
   - Payment history screen
   - Invoice download

2. **Payout UI**
   - Payout request screen
   - Payout history screen
   - Balance display
   - Payout settings (bank account, schedule)

3. **Stripe Connect UI**
   - Onboarding flow
   - Account status display
   - Account verification status

## Implementation Plan

### Phase 1: Stripe Setup & Infrastructure (Week 1-2)
1. Set up Stripe account and API keys
2. Install Stripe SDK
3. Create database schema for payments
4. Set up webhook endpoints
5. Implement basic Stripe API integration

### Phase 2: Stripe Connect Onboarding (Week 3-4)
1. Implement Connect onboarding flow for businesses
2. Implement Connect onboarding flow for creators
3. Store Connect account IDs
4. Handle account verification
5. Test onboarding flows

### Phase 3: Campaign Payment Flow (Week 5-6)
1. Implement payment intent creation for campaigns
2. Implement payment confirmation
3. Handle payment failures
4. Update campaign payment status
5. Test payment flows

### Phase 4: Creator Payout System (Week 7-8)
1. Implement payout scheduling
2. Implement payout processing
3. Handle payout failures
4. Implement payout history
5. Test payout flows

### Phase 5: Platform Fees & Reporting (Week 9-10)
1. Implement fee calculation
2. Implement fee collection
3. Implement payment reports
4. Implement invoice generation
5. Test fee and reporting flows

### Phase 6: Webhooks & Events (Week 11-12)
1. Implement webhook handlers
2. Process payment events
3. Process payout events
4. Handle errors and retries
5. Test webhook flows

### Phase 7: Frontend Integration (Week 13-14)
1. Build payment UI
2. Build payout UI
3. Build Connect onboarding UI
4. Integrate with backend
5. Test end-to-end flows

### Phase 8: Testing & Documentation (Week 15-16)
1. End-to-end testing
2. Security testing
3. Performance testing
4. Documentation
5. Production deployment

## Security Requirements

1. **API Key Security**
   - Store Stripe keys securely (environment variables)
   - Never expose keys in frontend
   - Use different keys for test/production

2. **Webhook Security**
   - Verify webhook signatures
   - Idempotency handling
   - Error handling and retries

3. **Payment Security**
   - PCI compliance considerations
   - Secure payment data handling
   - Fraud detection

4. **Access Control**
   - Only authorized users can create payments
   - Only creators can request payouts
   - Only admins can view all transactions

## Testing Requirements

### Unit Tests
- [ ] Test payment intent creation
- [ ] Test payment confirmation
- [ ] Test payout processing
- [ ] Test fee calculation
- [ ] Test webhook processing

### Integration Tests
- [ ] Test Stripe Connect onboarding
- [ ] Test end-to-end payment flow
- [ ] Test end-to-end payout flow
- [ ] Test webhook handling
- [ ] Test error scenarios

### Manual Testing
- [ ] Test payment with test cards
- [ ] Test payout to test accounts
- [ ] Test webhook events
- [ ] Test error handling
- [ ] Test UI flows

## Success Criteria

1. ✅ Businesses can pay for campaigns via Stripe
2. ✅ Creators can receive payouts via Stripe
3. ✅ Platform fees are collected correctly
4. ✅ Payment tracking is complete and accurate
5. ✅ Invoices are generated automatically
6. ✅ Webhooks process events correctly
7. ✅ Payment flows are secure and compliant
8. ✅ UI is intuitive and user-friendly

## Related Files

- `services/campaignService.ts` - Campaign management
- `services/deliverableService.ts` - Deliverable management
- `app/(tabs)/business/campaigns/` - Business campaign UI
- `app/creator/campaigns/` - Creator campaign UI

## Stripe Resources

- Stripe Connect Documentation
- Stripe Payment Intents API
- Stripe Transfers API
- Stripe Payouts API
- Stripe Webhooks Guide
- Stripe Testing Guide

## Notes

- Consider using Stripe Connect Express for faster onboarding
- Consider implementing escrow for campaign payments
- Consider implementing automatic payouts vs manual requests
- Consider tax handling (1099 forms for US creators)
- Consider multi-currency support
- Consider payment method preferences
- Consider dispute handling and resolution

## Acceptance Criteria

- [ ] Stripe Connect onboarding works for businesses and creators
- [ ] Campaign payments process correctly
- [ ] Creator payouts process correctly
- [ ] Platform fees are collected
- [ ] Payment tracking is complete
- [ ] Invoices are generated
- [ ] Webhooks work correctly
- [ ] UI is complete and functional
- [ ] Security requirements are met
- [ ] Documentation is complete
