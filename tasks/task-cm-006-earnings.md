# Earnings Screen

- Epic: Creator Marketplace (cm)
- Priority: High
- Estimate: 2 days
- Status: 🔄 Review
- Assignee: -
- Dependencies: task-cm-005-my-campaigns.md

## Overview
Build the Earnings screen where creators can view their earnings history, pending payouts, and payment settings. This screen provides transparency into creator compensation and facilitates the payout process.

## Business Value
The Earnings screen builds trust with creators by providing clear visibility into their compensation. Transparent earnings tracking and reliable payouts are critical for creator retention and platform credibility.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Earnings Management
  As a creator
  I want to track my earnings and manage payouts
  So that I can understand my income and get paid reliably

  Scenario: View earnings overview
    Given I am a creator with earnings history
    When I navigate to the Earnings screen
    Then I see my total earnings (lifetime)
    And I see current month earnings
    And I see pending payout amount
    And I see available balance

  Scenario: Review earnings history
    Given I have completed campaigns with earnings
    When I scroll through the earnings list
    Then I see each earning entry with campaign name, date, and amount
    And I can filter by date range
    And I can see the payment status (pending, processing, paid)

  Scenario: Request payout
    Given I have available balance above minimum threshold ($25)
    When I tap "Request Payout"
    Then I see my connected payment method (Stripe)
    And I can confirm the payout amount
    And I receive confirmation when payout is initiated

  Scenario: Setup payment method
    Given I haven't connected a payment method
    When I tap "Setup Payments"
    Then I am guided through Stripe Connect onboarding
    And my account is verified for payouts

  Scenario: View payout history
    Given I have received previous payouts
    When I tap on "Payout History"
    Then I see all past payouts with dates and amounts
    And I can see transaction IDs for reference
```

## Technical Implementation

### UI Components (following v1_component_reference.html)
- Summary cards at top showing key metrics
- Use consistent card styling from v1_component_reference.html
- Color coding for earning status:
  - Pending: #F59E0B (amber)
  - Processing: #3B82F6 (blue)
  - Paid: #10B981 (green)
- List view for earnings history
- Action buttons for payout requests

### Screen Structure
```
Earnings/
├── index.tsx                    # Main earnings screen
├── components/
│   ├── EarningsSummary.tsx    # Top metrics cards
│   ├── EarningsChart.tsx      # Monthly earnings visualization
│   ├── EarningsList.tsx       # Transaction history list
│   ├── EarningItem.tsx        # Individual earning row
│   ├── PayoutButton.tsx       # Request payout CTA
│   └── PaymentSetup.tsx       # Stripe Connect integration
├── modals/
│   ├── PayoutModal.tsx        # Payout confirmation
│   └── FilterModal.tsx        # Date range filters
└── hooks/
    ├── useEarnings.ts          # Earnings data management
    └── useStripeConnect.ts     # Payment integration
```

### Data Model
```typescript
interface Earning {
  id: string;
  creator_id: string;
  campaign_id: string;
  campaign_name: string;
  restaurant_name: string;
  amount: number;
  status: 'pending' | 'available' | 'processing' | 'paid';
  earned_date: Date;
  paid_date?: Date;
  payout_id?: string;
}

interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  stripe_transfer_id: string;
  requested_at: Date;
  completed_at?: Date;
  earnings: string[]; // Array of earning IDs
}

interface EarningsSummary {
  lifetime_total: number;
  current_month: number;
  pending_amount: number;
  available_balance: number;
  last_payout_date?: Date;
  next_payout_eligible?: Date;
}
```

### Key Features
1. **Earnings Dashboard**: Clear overview of all earnings metrics
2. **Transaction History**: Detailed list of all earnings
3. **Smart Filtering**: Filter by date, status, campaign
4. **Payout Management**: Request and track payouts
5. **Payment Integration**: Stripe Connect for secure payments
6. **Export Capability**: Download earnings reports (CSV/PDF)
7. **Earnings Chart**: Visual representation of monthly trends

### Services
- Create `earningsService` for earnings data management
- Integrate Stripe Connect API for payments
- Add export functionality for tax purposes
- Implement real-time balance updates

### Minimum Payout Rules
- Minimum payout: $25
- Payout frequency: On-demand or weekly automatic
- Processing time: 2-3 business days
- Payment methods: Bank account via Stripe

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Follows v1_component_reference.html styling guidelines
- [ ] Earnings data loads correctly and updates in real-time
- [ ] Payout flow works end-to-end with Stripe
- [ ] Filtering and sorting work correctly
- [ ] Export functionality generates valid reports
- [ ] Payment method setup integrates with Stripe Connect
- [ ] All monetary values display with proper formatting
- [ ] Loading and error states implemented
- [ ] Empty state for new creators with no earnings

## Notes
- Reference docs/v1_component_reference.html for styling
- Use currency formatting: $X,XXX.XX
- Implement secure handling of financial data
- Add tooltips to explain earning statuses
- Consider adding earnings projections in v2
- Cache earnings data with appropriate TTL
- Add push notifications for successful payouts