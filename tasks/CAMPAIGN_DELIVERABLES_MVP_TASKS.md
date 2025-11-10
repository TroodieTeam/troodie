# Campaign Deliverables MVP - Engineering Tasks

**Status:** 🔴 Not Started
**Epic:** deliverable-submission, trust-safety, optimization
**Total Estimate:** 12 weeks (3 phases)

---

## Overview

This document outlines the complete engineering roadmap for implementing the Campaign Deliverables MVP as detailed in `CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md`. The MVP enables creators to submit campaign deliverables, restaurants to review and approve them, automated payment processing, and trust & safety features.

## Business Goals

1. **Reduce payment friction**: Auto-approve after 72 hours to ensure creators get paid
2. **Quality control**: Restaurant review process with approve/reject/revision options
3. **Trust & safety**: Dispute resolution system to handle conflicts
4. **Marketplace velocity**: Automated workflows reduce manual overhead

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DELIVERABLE LIFECYCLE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SUBMISSION (Creator)                                     │
│     ↓                                                        │
│  2. REVIEW (Restaurant) ──→ Approve/Reject/Revision          │
│     ↓                                                        │
│  3. AUTO-APPROVAL (72h cron job if no review)                │
│     ↓                                                        │
│  4. PAYMENT PROCESSING (Stripe Connect)                      │
│     ↓                                                        │
│  5. DISPUTES (Optional - if issues arise)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Task Breakdown by Phase

### **Phase 1: MVP Core (Weeks 1-4)** - Critical Path

**Goal:** Enable end-to-end deliverable submission, review, and payment.

| Task | File | Priority | Estimate | Status |
|------|------|----------|----------|--------|
| Database schema | [task-cd-001-deliverable-submission-schema.md](task-cd-001-deliverable-submission-schema.md) | P0 | 2 days | 🔴 |
| Service layer | [task-cd-002-deliverable-submission-service.md](task-cd-002-deliverable-submission-service.md) | P0 | 3 days | 🔴 |
| Creator UI | [task-cd-003-creator-deliverable-ui.md](task-cd-003-creator-deliverable-ui.md) | P0 | 4 days | 🔴 |
| Restaurant review UI | [task-cd-004-restaurant-review-dashboard.md](task-cd-004-restaurant-review-dashboard.md) | P0 | 4 days | 🔴 |
| Auto-approval cron | [task-cd-005-auto-approval-cron.md](task-cd-005-auto-approval-cron.md) | P0 | 2 days | 🔴 |
| Payment processing | [task-cd-006-payment-processing.md](task-cd-006-payment-processing.md) | P0 | 5 days | 🔴 |
| Notifications | [task-cd-007-deliverable-notifications.md](task-cd-007-deliverable-notifications.md) | P1 | 2 days | 🔴 |

**Phase 1 Total:** ~22 days (4.4 weeks)

### **Phase 2: Trust & Safety (Weeks 5-8)**

**Goal:** Add quality controls, verification, and dispute handling.

| Task | File | Priority | Estimate | Status |
|------|------|----------|----------|--------|
| Dispute system | [task-cd-008-dispute-system.md](task-cd-008-dispute-system.md) | P2 | 4 days | 🔴 |
| Content verification | TBD | P2 | 3 days | 🔴 |
| Quality scoring | TBD | P2 | 3 days | 🔴 |
| Analytics dashboard | TBD | P2 | 4 days | 🔴 |
| Creator onboarding enhancements | TBD | P2 | 2 days | 🔴 |

**Phase 2 Total:** ~16 days (3.2 weeks)

### **Phase 3: Optimization (Weeks 9-12)**

**Goal:** Polish, performance, advanced features.

| Task | File | Priority | Estimate | Status |
|------|------|----------|----------|--------|
| Batch operations | TBD | P3 | 3 days | 🔴 |
| Advanced filters/search | TBD | P3 | 2 days | 🔴 |
| Performance optimization | TBD | P3 | 3 days | 🔴 |
| Campaign insights | TBD | P3 | 4 days | 🔴 |
| Creator-restaurant messaging | TBD | P3 | 4 days | 🔴 |

**Phase 3 Total:** ~16 days (3.2 weeks)

## Database Schema

### New Tables Created

1. **`campaign_deliverables`** - Core deliverable data
   - Content URLs, status, payment info
   - Approval/rejection workflow
   - Auto-approval timestamps
   - Metrics (views, likes, engagement)

2. **`deliverable_revisions`** - Revision history
   - Track content changes
   - Link to original deliverable

3. **`deliverable_disputes`** - Dispute management
   - Filed by creator or restaurant
   - Evidence URLs
   - Resolution tracking

4. **`dispute_messages`** - Dispute communication
   - Thread-based messaging
   - Admin, creator, restaurant roles

5. **`cron_job_logs`** - Monitoring
   - Track auto-approval runs
   - Success/failure metrics

### Updated Tables

- **`campaign_applications`**: Added deliverable counters, earnings
- **`campaigns`**: Added deliverable tracking fields
- **`creator_profiles`**: Added Stripe Connect fields

## Service Layer

### New Services

1. **`deliverableService.ts`** - Core deliverable CRUD
   - Submit, approve, reject, request revision
   - Get deliverables by creator/restaurant
   - Update metrics

2. **`paymentService.ts`** - Payment processing
   - Stripe Connect integration
   - Transfer creation
   - Onboarding links
   - Retry logic

3. **`deliverableNotificationService.ts`** - Notifications
   - Submission, approval, rejection notifications
   - Auto-approval warnings
   - Payment notifications

4. **`disputeService.ts`** - Dispute handling
   - File disputes
   - Add evidence
   - Admin resolution
   - Dispute messaging

## UI/UX Components

### Creator Screens

- **Campaign detail with deliverables** (`app/creator/campaigns/[id].tsx`)
- **Deliverable submission form** (`app/creator/deliverables/create.tsx`)
- **Deliverable detail view** (`app/creator/deliverables/[id].tsx`)
- **Stripe onboarding** (`app/creator/earnings/stripe-onboarding.tsx`)
- **File dispute** (`app/creator/deliverables/[id]/dispute.tsx`)

### Restaurant Screens

- **Content review dashboard** (`app/(tabs)/business/content/index.tsx`)
- **Deliverable review detail** (`app/(tabs)/business/content/[id].tsx`)
- **Bulk actions** (`app/(tabs)/business/content/bulk-reject.tsx`)
- **File dispute** (`app/business/content/[id]/dispute.tsx`)

### Admin Screens

- **Dispute dashboard** (`app/admin/disputes/index.tsx`)
- **Dispute resolution** (`app/admin/disputes/[id].tsx`)

## Edge Functions (Supabase)

1. **`auto-approve-deliverables`** - Cron job (every 6 hours)
   - Finds deliverables > 72 hours old
   - Auto-approves and triggers payment
   - Logs execution

2. **`auto-approval-warnings`** - Cron job (every 6 hours)
   - Finds deliverables approaching 72h
   - Sends warnings to restaurants

3. **`retry-failed-payments`** - Cron job (daily)
   - Retries failed payments
   - Max 3 attempts
   - Admin alerts on final failure

## Key Features

### ✅ Phase 1 (MVP Core)

- [x] Deliverable submission (photo/video/reel/story)
- [x] Restaurant review (approve/reject/request revision)
- [x] Auto-approval after 72 hours
- [x] Stripe Connect payment processing
- [x] In-app & push notifications
- [x] Payment tracking & history
- [x] Metrics tracking (views, likes, engagement)

### ✅ Phase 2 (Trust & Safety)

- [x] Dispute filing (creator & restaurant)
- [x] Evidence submission
- [x] Admin review & resolution
- [ ] Content verification
- [ ] Quality scoring
- [ ] Enhanced analytics

### ⏳ Phase 3 (Optimization)

- [ ] Bulk approve/reject
- [ ] Advanced search/filters
- [ ] Performance optimization
- [ ] Campaign insights
- [ ] Direct messaging
- [ ] Email notifications

## Testing Strategy

### Unit Tests
- Service layer methods
- Payment processing logic
- Auto-approval function
- Notification logic

### Integration Tests
- End-to-end deliverable flow
- Payment processing
- Auto-approval cron
- Dispute resolution

### Manual Testing
- Creator submission flow
- Restaurant review flow
- Stripe onboarding
- Notification delivery
- Edge cases (failed payments, disputes)

## Deployment Checklist

### Database
- [ ] Run all migrations in order
- [ ] Verify RLS policies
- [ ] Test auto-approval function manually
- [ ] Seed test data

### Edge Functions
- [ ] Deploy `auto-approve-deliverables`
- [ ] Deploy `auto-approval-warnings`
- [ ] Deploy `retry-failed-payments`
- [ ] Configure cron schedules
- [ ] Test manual invocation

### Services
- [ ] Configure Stripe API keys (test & prod)
- [ ] Set up Stripe webhooks
- [ ] Configure notification preferences
- [ ] Test payment processing

### UI/UX
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Verify deep links
- [ ] Test push notifications
- [ ] Accessibility audit

## Monitoring & Metrics

### Key Metrics to Track

1. **Deliverable Flow**
   - Submissions per day
   - Average review time
   - Auto-approval rate
   - Rejection rate
   - Revision request rate

2. **Payment**
   - Payment success rate
   - Payment failure rate
   - Average payment amount
   - Time to payment

3. **Disputes**
   - Dispute rate
   - Resolution time
   - Resolution outcomes (creator/restaurant wins)

4. **Performance**
   - Auto-approval cron execution time
   - Payment processing time
   - Notification delivery rate

### Monitoring Dashboards

- Supabase logs for edge functions
- `cron_job_logs` table for automation tracking
- Stripe dashboard for payment metrics
- Custom analytics in app

## Dependencies

### External Services
- ✅ Supabase (database, auth, edge functions)
- ✅ Stripe Connect (payments)
- ✅ Expo (React Native framework)
- ✅ Push notification service (Expo Notifications)

### Internal Systems
- ✅ Existing campaign system
- ✅ Existing creator profiles
- ✅ Existing business profiles
- ✅ Notification system
- ✅ Image upload service

## Risk Mitigation

### Technical Risks

1. **Auto-approval timing**
   - Risk: Deliverables approved while restaurant is reviewing
   - Mitigation: Lock deliverable when review starts

2. **Payment failures**
   - Risk: Stripe failures leave deliverables in limbo
   - Mitigation: Retry logic + admin alerts

3. **Dispute abuse**
   - Risk: Users filing frivolous disputes
   - Mitigation: Rate limiting + admin review

4. **Performance**
   - Risk: Large number of deliverables slowing queries
   - Mitigation: Proper indexing + pagination

### Business Risks

1. **Creator trust**
   - Risk: Delays in payment damage reputation
   - Mitigation: Auto-approval ensures payment within 72h

2. **Quality control**
   - Risk: Auto-approval of low-quality content
   - Mitigation: Restaurant has 72h to review + dispute system

## Success Criteria

### Phase 1 Success
- [ ] 100 deliverables submitted
- [ ] < 5% payment failures
- [ ] < 10% dispute rate
- [ ] > 90% creator satisfaction with payment speed

### Phase 2 Success
- [ ] < 2% dispute escalations
- [ ] < 24h average dispute resolution time
- [ ] > 85% quality score average

### Phase 3 Success
- [ ] < 1s average page load time
- [ ] > 95% notification delivery rate
- [ ] Advanced features usage > 50% of users

## Next Steps

1. **Week 1-2:** Database schema + service layer (tasks cd-001, cd-002)
2. **Week 2-3:** Creator UI (task cd-003)
3. **Week 3-4:** Restaurant UI (task cd-004)
4. **Week 4:** Auto-approval + payment (tasks cd-005, cd-006)
5. **Week 5:** Notifications (task cd-007)
6. **Week 6-8:** Trust & safety (task cd-008 + additional)
7. **Week 9-12:** Optimization & polish

## Questions & Decisions

### Resolved
- ✅ Auto-approval window: 72 hours
- ✅ Payment method: Stripe Connect transfers
- ✅ Revision limit: Unlimited (but tracked)

### Pending
- ⏳ Email notifications vs in-app only?
- ⏳ Minimum quality score threshold?
- ⏳ Dispute filing fee to prevent abuse?
- ⏳ Multi-currency support?

## Related Documents

- [CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md](../CAMPAIGN_DELIVERABLES_MVP_STRATEGY.md) - Original strategy document
- [tasks/README.md](README.md) - Task template format
- [services/CLAUDE.md](../services/CLAUDE.md) - Services documentation

---

## Task Files

All individual task files follow the format: `task-cd-XXX-<slug>.md`

**Epic: deliverable-submission**
- [task-cd-001-deliverable-submission-schema.md](task-cd-001-deliverable-submission-schema.md)
- [task-cd-002-deliverable-submission-service.md](task-cd-002-deliverable-submission-service.md)
- [task-cd-003-creator-deliverable-ui.md](task-cd-003-creator-deliverable-ui.md)
- [task-cd-004-restaurant-review-dashboard.md](task-cd-004-restaurant-review-dashboard.md)
- [task-cd-005-auto-approval-cron.md](task-cd-005-auto-approval-cron.md)
- [task-cd-006-payment-processing.md](task-cd-006-payment-processing.md)
- [task-cd-007-deliverable-notifications.md](task-cd-007-deliverable-notifications.md)

**Epic: trust-safety**
- [task-cd-008-dispute-system.md](task-cd-008-dispute-system.md)
- task-cd-009-content-verification.md (TBD)
- task-cd-010-quality-scoring.md (TBD)

**Epic: optimization**
- task-cd-011-batch-operations.md (TBD)
- task-cd-012-advanced-filters.md (TBD)
- task-cd-013-campaign-insights.md (TBD)

---

**Last Updated:** 2025-10-12
**Status:** Ready for implementation
