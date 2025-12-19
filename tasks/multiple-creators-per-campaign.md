# Multiple Creators Per Campaign - Follow-up Story

## Overview
Currently, the MVP only supports 1 creator per campaign. This story explores the requirements and design considerations for supporting multiple creators applying to and working on a single campaign.

## Current State (MVP)
- Campaigns are limited to 1 creator (`max_creators: 1`)
- Budget is allocated to a single creator
- Campaign creation flow assumes single creator
- UI displays creator count as `1/1` (now removed from campaign cards)

## Problem Statement
As the platform scales, restaurant owners may want to:
- Work with multiple creators for broader reach
- Split budget across multiple creators
- Compare performance across creators
- Manage multiple creator relationships within one campaign

## Key Questions to Answer

### 1. Budget Allocation
- **How should budget be split?**
  - Equal split (e.g., $1000 campaign → $500 per creator if 2 creators)
  - Custom allocation per creator (e.g., $700 + $300)
  - Percentage-based split
  - Fixed amount per creator with remaining budget as buffer

- **When is budget allocated?**
  - At campaign creation (pre-allocate)
  - When creators are accepted (dynamic allocation)
  - After deliverables are approved (pay-as-you-go)

- **What happens if a creator drops out?**
  - Reallocate budget to remaining creators?
  - Keep budget reserved?
  - Allow new creator to fill the slot?

### 2. Campaign Creation Flow
- **How does the creation flow change?**
  - Current: Select 1 creator or allow applications
  - Proposed: Select multiple creators OR allow multiple applications
  
- **Creator Selection Options:**
  - Option A: Pre-select multiple creators during creation
  - Option B: Allow multiple creators to apply, accept top N
  - Option C: Hybrid - invite specific creators + allow open applications

- **Budget Input:**
  - Total budget with auto-split?
  - Per-creator budget input?
  - Minimum/maximum per creator?

### 3. Application & Acceptance Flow
- **Application Limits:**
  - How many applications can be accepted?
  - Can restaurant owner accept more than `max_creators`?
  - What happens when `max_creators` is reached?

- **Acceptance Workflow:**
  - Accept applications one at a time?
  - Batch accept multiple applications?
  - First-come-first-served vs. selective acceptance?

- **Creator Replacement:**
  - Can a creator be removed after acceptance?
  - What happens to their deliverables and budget?

### 4. Deliverables & Content Management
- **Deliverable Tracking:**
  - Track deliverables per creator separately?
  - Aggregate view across all creators?
  - Per-creator deliverable requirements?

- **Content Review:**
  - Review all deliverables together?
  - Per-creator review workflow?
  - Comparative analytics view?

### 5. Payment & Payout Flow
- **Payment Collection:**
  - Single payment for total budget upfront?
  - Multiple payments as creators are accepted?
  - Per-creator payment intents?

- **Payout Processing:**
  - Payout per creator as deliverables approved?
  - Batch payouts?
  - Prorated payouts if campaign ends early?

### 6. UI/UX Considerations
- **Campaign Cards:**
  - Show all creators or just count?
  - Display creator avatars?
  - Show per-creator progress?

- **Campaign Detail View:**
  - Tab per creator?
  - Unified deliverables view?
  - Per-creator performance metrics?

- **Creator Selection:**
  - Multi-select interface?
  - Drag-and-drop budget allocation?
  - Creator comparison view?

## Proposed Implementation Approach

### Phase 1: Foundation
1. **Database Schema Updates:**
   - Allow `max_creators > 1` in campaigns table
   - Add `campaign_creator_allocations` table to track budget per creator
   - Update application acceptance logic to check against `max_creators`

2. **Budget Allocation System:**
   - Create `budget_allocation_service.ts` to handle splitting logic
   - Support equal split as MVP
   - Track allocated vs. spent per creator

### Phase 2: Campaign Creation
1. **Update Creation Flow:**
   - Allow `max_creators` input (default: 1 for backward compatibility)
   - Add budget allocation method selection
   - Update validation to ensure budget can cover max creators

2. **Creator Selection:**
   - Support multiple creator invitations
   - Allow multiple applications (up to `max_creators`)

### Phase 3: Application Management
1. **Acceptance Logic:**
   - Check `selected_creators_count < max_creators` before acceptance
   - Auto-allocate budget when creator accepted
   - Update UI to show remaining slots

2. **Application UI:**
   - Show "X/Y creators selected" indicator
   - Disable accept button when at capacity
   - Show budget allocation per creator

### Phase 4: Deliverables & Analytics
1. **Per-Creator Tracking:**
   - Group deliverables by creator
   - Show per-creator spend vs. allocated budget
   - Per-creator performance metrics

2. **Unified Views:**
   - Aggregate deliverables view
   - Comparative analytics dashboard
   - Per-creator breakdown option

## Technical Considerations

### Database Changes
```sql
-- New table for budget allocations
CREATE TABLE campaign_creator_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  creator_id UUID REFERENCES creator_profiles(id),
  allocated_budget_cents INTEGER NOT NULL,
  spent_budget_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, creator_id)
);

-- Update campaigns table constraints
-- Ensure selected_creators_count <= max_creators
```

### Service Layer Updates
- `campaignService.ts`: Update creation/update logic
- `applicationService.ts`: Update acceptance logic
- `paymentService.ts`: Handle multiple payment intents or split allocation
- `payoutService.ts`: Process per-creator payouts

### API Changes
- Campaign creation endpoint: Accept `max_creators` and allocation method
- Application acceptance: Check capacity before accepting
- Budget allocation endpoints: CRUD operations for allocations

## Open Questions
1. Should we support changing `max_creators` after campaign creation?
2. What happens to pending applications when `max_creators` is reached?
3. Should creators see other creators working on the same campaign?
4. How do we handle creator conflicts or disputes?
5. Should there be a minimum budget per creator?
6. Do we need creator collaboration features (e.g., shared campaign brief)?

## Success Metrics
- Number of campaigns with multiple creators
- Average creators per multi-creator campaign
- Budget utilization rate per creator
- Creator satisfaction with multi-creator campaigns
- Restaurant owner satisfaction with multi-creator campaigns

## Dependencies
- Budget allocation system
- Enhanced payment processing
- Per-creator analytics
- Updated campaign creation flow
- Multi-creator application management

## Related Stories
- [ ] Budget allocation service implementation
- [ ] Multi-creator campaign creation UI
- [ ] Per-creator analytics dashboard
- [ ] Batch application acceptance
- [ ] Creator comparison view
