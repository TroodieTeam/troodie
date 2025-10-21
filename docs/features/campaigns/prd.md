# Troodie-Managed Campaigns - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** October 13, 2025
**Status:** Ready for Implementation
**Epic:** TMC (Troodie-Managed Campaigns)

---

## Executive Summary

Troodie-Managed Campaigns solves the creator cold-start problem by enabling the platform to act as a "virtual restaurant" to provide guaranteed creator opportunities while real restaurant supply grows. This feature allows Troodie to create campaigns directly, subsidize partner restaurant campaigns, and run community challenges—ensuring creators always have monetization opportunities.

**Key Value Propositions:**
- **For Creators:** Guaranteed campaign opportunities, faster payments, no restaurant disputes
- **For Platform:** Control over marketplace liquidity, ability to drive strategic initiatives
- **For Restaurants:** Partnership model reduces risk, Troodie subsidizes marketing costs
- **For Business:** Transparent budget tracking, ROI measurement, financial accountability

---

## Problem Statement

### Current State
- Creators onboard but have no campaigns to apply to (cold-start problem)
- Restaurant supply is growing slower than creator supply
- No mechanism for platform to create content opportunities
- Risk of creator churn due to lack of monetization

### Target State
- Platform can create campaigns independently of restaurants
- Creators always have 5-10 active opportunities
- Transparent system for budget tracking and ROI
- White-label partnership model for restaurant collaboration

---

## Business Goals & Success Metrics

### Goals
1. **Solve Creator Cold-Start:** 100% of onboarded creators see at least 3 opportunities
2. **Control Marketplace:** Maintain minimum campaign density across all markets
3. **Enable Strategic Initiatives:** Run platform campaigns for testing, growth, retention
4. **Financial Accountability:** Track all platform spend with clear ROI metrics
5. **Scale Partnerships:** Onboard restaurants via subsidized campaign model

### Success Metrics (First 90 Days)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Platform campaigns created | 15-20 | Campaign creation count |
| Creator applications | 150-200 | Application volume |
| Creator acceptance rate | 60-75% | Accepted / Applied |
| Content completion rate | 80-90% | Completed / Accepted |
| Average deliverable approval time | <36 hours | Time to approval |
| Budget utilization | 70-85% | Spend / Approved Budget |
| Cost per content piece | $25-75 | Total spend / pieces |
| Creator satisfaction (NPS) | 50+ | Post-campaign survey |

### Financial Targets
- **Budget:** $13,500 - $30,000 for first 3 months
- **Content Output:** 180-400 pieces of creator content
- **Cost per Creator:** $25-75 average
- **ROI Target:** 100,000+ reach per $1,000 spent

---

## User Personas

### 1. Platform Admin (Primary User)
**Role:** Creates and manages Troodie campaigns
**Goals:** Provide creator opportunities, track budget, demonstrate ROI
**Pain Points:** Manual budget tracking, unclear campaign performance
**Needs:** Easy campaign creation, real-time analytics, budget alerts

### 2. Creator (End User)
**Role:** Applies to and completes campaigns
**Goals:** Earn money, build portfolio, create great content
**Pain Points:** Lack of opportunities, slow restaurant payments, disputes
**Needs:** Guaranteed opportunities, fast approval, reliable payment

### 3. Partnership Restaurant (Secondary User)
**Role:** Benefits from Troodie-subsidized campaigns
**Goals:** Get marketing at lower cost, test creator content
**Pain Points:** High upfront marketing costs, uncertain ROI
**Needs:** Risk-free trial, professional content, clear value

---

## Feature Specifications

### Epic 1: Database & System Account (TMC-001, TMC-002)
**Description:** Foundational database schema and Troodie system account

**Features:**
1. **Extended Database Schema**
   - `restaurants.is_platform_managed` - Flag for Troodie-owned restaurants
   - `campaigns.campaign_source` - Track campaign origin (restaurant, troodie_direct, troodie_partnership, community_challenge)
   - `platform_managed_campaigns` table - Internal tracking for budget, metrics, partnerships

2. **Troodie System Account**
   - User: `kouame@troodieapp.com` with admin role
   - Restaurant: "Troodie Community" as official platform restaurant
   - Business profile linking user to restaurant

**Acceptance Criteria:**
- ✅ Migration runs successfully without errors
- ✅ RLS policies restrict platform_managed_campaigns to admins only
- ✅ Triggers automatically update spend when applications accepted
- ✅ System account can create campaigns

---

### Epic 2: Admin Campaign Creation (TMC-003)
**Description:** Admin interface for creating all 3 types of platform campaigns

**Features:**
1. **Multi-Step Campaign Wizard**
   - Step 1: Select campaign type (Direct, Partnership, Challenge)
   - Step 2: Enter campaign details (title, description, requirements)
   - Step 3: Set budget and targets (budget source, approved amount, target metrics)
   - Step 4: Partnership details (if applicable - partner selection, subsidy amount)
   - Step 5: Preview and publish

2. **Campaign Types**
   - **Direct (Troodie-branded):** Platform-branded campaigns for portfolio building, testing, initiatives
   - **Partnership (White-label):** Appears as restaurant campaign but Troodie subsidizes costs
   - **Community Challenge:** Gamified campaigns with prize pools and voting

3. **Budget Tracking**
   - Select budget source (marketing, growth, product, partnerships, content, retention)
   - Set approved budget in dollars
   - Define cost center (optional)
   - Set target metrics (creators, content pieces, reach)

**User Flow:**
```
Admin → More → Admin Panel → Create Platform Campaign
  → Select Type → Enter Details → Set Budget → [Partnership Info] → Preview → Publish
  → Success → Campaign appears in creator marketplace
```

**Acceptance Criteria:**
- ✅ Admin can create all 3 campaign types
- ✅ Form validation prevents invalid data
- ✅ Created campaigns appear in creator feed immediately
- ✅ platform_managed_campaigns record created with budget tracking
- ✅ Error handling for network/database failures

---

### Epic 3: Creator Campaign UI (TMC-004)
**Description:** Creator-facing updates to show Troodie campaigns with trust signals

**Features:**
1. **Campaign Card Badges**
   - "Troodie Official" badge (orange) for direct campaigns
   - "Challenge" badge (purple) for community challenges
   - No badge for partnership campaigns (appear as regular)
   - Green shield icon for guaranteed payment indicator

2. **Enhanced Campaign Detail Screen**
   - Special header for Troodie/Challenge campaigns
   - Trust indicators: "Guaranteed Payment", "Fast Approval", "Platform Managed"
   - Campaign requirements and deliverable expectations
   - Apply button (identical flow for all types)

3. **Campaign Filters**
   - Filter by source: All, Troodie Official, Challenges, Restaurants
   - Bottom sheet modal design for mobile
   - Filter persistence across sessions

**User Flow:**
```
Creator → Campaigns Tab → Sees campaigns with badges
  → Filter → Select "Troodie Official" → See only platform campaigns
  → Tap Campaign → See trust indicators → Apply Now
  → Submit Application → Same flow as restaurant campaigns
```

**Acceptance Criteria:**
- ✅ Badges display correctly on campaign cards
- ✅ Trust indicators show only for Troodie campaigns
- ✅ Partnership campaigns appear identical to restaurant campaigns
- ✅ Filters work correctly
- ✅ Application flow identical across all types

---

### Epic 4: Budget Analytics (TMC-005)
**Description:** Admin dashboard for tracking spend, ROI, and campaign performance

**Features:**
1. **Budget Overview Dashboard**
   - Total approved budget vs. actual spend
   - Remaining budget available
   - Budget utilization percentage with warning at 80%+
   - Progress bar visualization

2. **Key Metrics Grid**
   - Total creators reached
   - Total content pieces created
   - Cost per creator
   - Cost per content piece
   - Acceptance rate
   - Completion rate

3. **Budget Source Breakdown**
   - Spend by budget source (marketing, growth, etc.)
   - ROI per budget source (content pieces per dollar)
   - Campaign count per source
   - Utilization by source

4. **Campaign Performance List**
   - Each campaign's budget vs. actual
   - Target vs. actual creators/content
   - Application acceptance rate
   - Status and dates

5. **Date Range Filtering**
   - Custom date range selection
   - Month/quarter/year presets
   - Comparative analysis

6. **Export Functionality**
   - Export to CSV for financial reporting
   - Includes all campaign financials
   - Formatted for accounting review

**User Flow:**
```
Admin → More → Admin Panel → Campaign Analytics
  → View Overview → See Budget Breakdown → Filter by Date
  → Review Campaign Performance → Export Report → Download CSV
```

**Acceptance Criteria:**
- ✅ Analytics load in <3 seconds
- ✅ All calculations accurate (verified manually)
- ✅ Real-time updates when applications accepted
- ✅ CSV export generates valid data
- ✅ Date filtering works correctly

---

### Epic 5: Deliverables Integration (TMC-006)
**Description:** Integrate platform campaigns with existing deliverable submission/review system

**Features:**
1. **Creator Deliverable Submission**
   - Submit content URL (Instagram, TikTok, YouTube, etc.)
   - Upload screenshot proof
   - Enter optional caption and engagement metrics
   - Works identically for all campaign types

2. **Admin Review Dashboard**
   - List of all pending deliverables
   - View screenshot and URL
   - Approve or reject with reason
   - 72-hour auto-approve timer display

3. **Auto-Approval System** *(Note: Backend cron job required)*
   - Deliverables auto-approve after 72 hours
   - Creator notified of approval
   - Payment processing triggered

4. **Partnership Routing**
   - White-label partnerships route to partner restaurant for review
   - Troodie admins don't review partner campaign deliverables
   - Maintains partnership authenticity

**User Flow:**
```
Creator completes campaign → Submit Deliverables → Enter URL + Upload Screenshot
  → Submit → Status: Pending Review → 72-hour timer starts

Admin → Review Deliverables Dashboard → See pending items
  → View URL and screenshot → Approve or Reject
  → Creator notified → If approved, payment processed
```

**Acceptance Criteria:**
- ✅ Creators can submit deliverables for any campaign type
- ✅ Admin sees all pending Troodie campaign deliverables
- ✅ Approve/reject actions work correctly
- ✅ Auto-approve timer displays remaining time
- ✅ Partnership campaigns route to partner (not Troodie admin)

---

### Epic 6: Testing & Deployment (TMC-007)
**Description:** Comprehensive testing and safe production deployment

**Features:**
1. **Automated Testing**
   - Unit tests for all service functions
   - Integration tests for full campaign lifecycle
   - Maestro E2E tests for admin and creator flows

2. **Manual QA**
   - 60+ item checklist covering all scenarios
   - Performance benchmarks (<2s load times)
   - Security audit (RLS, admin access, data privacy)

3. **Deployment Process**
   - Staging environment testing
   - Phased rollout (10% → 25% → 50% → 100%)
   - Rollback plan documented
   - Monitoring and alerts configured

**Acceptance Criteria:**
- ✅ All automated tests passing
- ✅ Manual QA checklist 100% complete
- ✅ Performance benchmarks met
- ✅ Security audit passed
- ✅ Deployed to production successfully

---

## User Stories

### Admin Stories

**As a Platform Admin:**
1. I want to create a Troodie-direct campaign so creators have opportunities
2. I want to set a budget for each campaign so I can control spend
3. I want to track campaign performance so I can measure ROI
4. I want to export financial reports so I can report to leadership
5. I want to approve creator deliverables so I can ensure quality
6. I want to create partnership campaigns so I can subsidize restaurant marketing

### Creator Stories

**As a Creator:**
1. I want to see Troodie campaigns in my feed so I know they're available
2. I want to see trust signals on Troodie campaigns so I know they're reliable
3. I want to apply to Troodie campaigns just like restaurant campaigns for consistency
4. I want to submit deliverables easily so I can get paid quickly
5. I want fast approval times so I'm not waiting for payment
6. I want to filter campaigns by source so I can find what I'm looking for

### Restaurant Stories

**As a Partnership Restaurant:**
1. I want Troodie to subsidize my first campaign so I can test creator content
2. I want the campaign to appear as my own so it feels authentic
3. I want to review creator deliverables so I maintain quality control
4. I want clear ROI metrics so I can decide to continue

---

## Technical Architecture

### Database Schema
```
restaurants
  + is_platform_managed (boolean)
  + managed_by (varchar)

campaigns
  + campaign_source (enum: restaurant, troodie_direct, troodie_partnership, community_challenge)
  + is_subsidized (boolean)
  + subsidy_amount_cents (integer)

platform_managed_campaigns (NEW TABLE)
  - id (uuid)
  - campaign_id (uuid → campaigns)
  - management_type (enum: direct, partnership, challenge)
  - partner_restaurant_id (uuid → restaurants, nullable)
  - budget_source (enum: marketing, growth, product, partnerships, content, retention)
  - approved_budget_cents (integer)
  - actual_spend_cents (integer)
  - target_creators, actual_creators (integer)
  - target_content_pieces, actual_content_pieces (integer)
  - internal_notes (text)
```

### Services Architecture
```
services/
  platformCampaignService.ts - Create, update, query platform campaigns
  systemAccountService.ts - Verify Troodie system account
  analyticsService.ts - Campaign analytics and reporting
  deliverableReviewService.ts - Admin deliverable review
```

### Component Architecture (React Native)
```
app/admin/
  create-platform-campaign.tsx - Campaign creation wizard
  campaign-analytics.tsx - Analytics dashboard
  review-deliverables.tsx - Deliverable review dashboard

components/admin/
  CampaignTypeSelector.tsx - Campaign type selection
  CampaignDetailsForm.tsx - Campaign details input
  BudgetTrackingForm.tsx - Budget configuration
  PartnershipDetailsForm.tsx - Partnership info
  CampaignPreview.tsx - Preview before publish
  BudgetOverviewCard.tsx - Budget visualization
  BudgetSourceBreakdown.tsx - Source breakdown
  CampaignPerformanceList.tsx - Campaign list

components/creator/
  CampaignCard.tsx (updated) - Add badges and trust signals
  CampaignFilters.tsx - Filter modal
```

---

## Non-Functional Requirements

### Performance
- Campaign browse screen: <2s load time with 100+ campaigns
- Analytics dashboard: <3s load time
- Campaign creation: <5s completion time
- Deliverable submission: <10s including image upload

### Security
- RLS policies restrict platform_managed_campaigns to admins only
- Creators cannot view internal notes or budget details
- XSS/SQL injection prevention
- Secure image upload to Supabase Storage

### Scalability
- Support 100+ simultaneous platform campaigns
- Handle 1000+ creator applications per campaign
- Real-time budget updates via database triggers
- Efficient query performance with proper indexing

### Reliability
- 99.9% uptime for campaign systems
- Automatic failover for critical operations
- Graceful degradation if analytics temporarily unavailable
- Transaction rollback on campaign creation failure

### Accessibility
- WCAG AA compliance for admin screens
- 44x44px minimum touch targets
- Readable text at default font size
- Screen reader support for key actions

---

## Dependencies & Risks

### Dependencies
1. **Database Migration:** Must complete TMC-001 before any other task
2. **System Account:** TMC-002 required before campaign creation
3. **Deliverables System:** Relies on existing campaign_applications table
4. **Image Upload:** Uses existing imageUploadService for screenshots
5. **Auth System:** Uses existing auth and RLS policies

### Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Budget tracking inaccurate | High | Low | Comprehensive testing, manual verification |
| Creator confusion about campaign sources | Medium | Medium | Clear UI badges, help documentation |
| Partnership restaurants feel misled | High | Low | Transparent partnership agreements, clear communication |
| Auto-approval not working | High | Low | Extensive testing, fallback to manual approval |
| Admin abuse of platform campaigns | Medium | Low | Audit logs, leadership oversight, budget limits |
| Database migration fails | High | Low | Test on staging, rollback plan, backups |

---

## Launch Plan

### Phase 1: Foundation (Week 1-2)
- ✅ TMC-001: Database migration
- ✅ TMC-002: System account creation
- Test on staging environment
- Verify RLS policies

### Phase 2: Admin Features (Week 3-4)
- ✅ TMC-003: Admin campaign creation UI
- ✅ TMC-005: Budget analytics dashboard
- Internal admin testing
- Train admin team

### Phase 3: Creator Features (Week 4-5)
- TMC-004: Creator UI updates
- TMC-006: Deliverables integration
- Beta test with 10 creators
- Gather feedback

### Phase 4: Testing & Launch (Week 5-6)
- TMC-007: Comprehensive testing
- Staged rollout: 10% → 25% → 50% → 100%
- Monitor metrics daily
- Adjust based on feedback

### Phase 5: Scale & Optimize (Week 7-12)
- Create first 15-20 platform campaigns
- Onboard 3-5 partnership restaurants
- Run first community challenge
- Optimize based on data

---

## Success Criteria

### MVP Launch Criteria (Must Have)
- [x] Database schema deployed to production
- [x] Troodie system account created
- [ ] Admin can create all 3 campaign types
- [ ] Creators see campaigns with proper badges
- [ ] Budget analytics dashboard functional
- [ ] Deliverable submission works for platform campaigns
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit complete
- [ ] Admin training complete

### V1.1 Criteria (Should Have)
- [ ] Partnership program launched with 3+ restaurants
- [ ] First community challenge completed
- [ ] 150+ creator applications
- [ ] Budget tracking verified accurate
- [ ] ROI demonstrated to leadership

### V2.0 Criteria (Nice to Have)
- [ ] Automated budget alerts
- [ ] Predictive budget forecasting
- [ ] Creator campaign recommendations
- [ ] Advanced analytics with charts
- [ ] Public challenge leaderboards

---

## Appendices

### A. Campaign Type Comparison

| Feature | Troodie-Direct | Partnership | Challenge |
|---------|---------------|-------------|-----------|
| **Appears as** | Troodie branded | Restaurant branded | Challenge branded |
| **Badge** | "Troodie Official" | None (regular) | "Challenge" |
| **Budget** | 100% platform | Troodie subsidized | Prize pool |
| **Review** | Troodie admin | Partner restaurant | Troodie admin |
| **Payment** | Guaranteed | Guaranteed | Prize winners |
| **Use Cases** | Portfolio, testing | Restaurant marketing | Engagement, viral |

### B. Budget Allocations (Sample)

| Budget Source | Monthly Allocation | Campaign Types | Target ROI |
|---------------|-------------------|----------------|------------|
| Marketing | $5,000 | Direct, Challenge | 50,000+ reach |
| Growth | $3,000 | Direct | 100+ new creators |
| Partnerships | $7,000 | Partnership | 3+ restaurants |
| Content | $2,000 | Direct | 80+ content pieces |
| **Total** | **$17,000** | | |

### C. Key Terminology

- **Platform-Managed Campaign:** Any campaign created by Troodie (not a restaurant)
- **Direct Campaign:** Troodie-branded campaign for portfolio building
- **Partnership Campaign:** White-label campaign where Troodie subsidizes restaurant
- **Community Challenge:** Gamified campaign with prize pool
- **Budget Source:** Internal accounting category (marketing, growth, etc.)
- **Subsidy:** Amount Troodie pays toward a partnership campaign
- **Auto-Approval:** Automatic approval of deliverables after 72 hours

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-13 | Claude | Initial PRD creation |

---

**Approval Sign-Off:**

- [ ] Product Lead: ________________ Date: ______
- [ ] Engineering Lead: ________________ Date: ______
- [ ] Design Lead: ________________ Date: ______
- [ ] Finance/Operations: ________________ Date: ______
