# Engineering Task: Restaurant Saves & Analytics Audit

**Status**: 🔴 Not Started  
**Priority**: High  
**Epic**: Creator Marketplace / Analytics  
**Estimated Effort**: 3-5 days  
**Created**: 2025-01-22

## Problem Statement

During test data setup, we discovered that the `restaurant_saves` table may not be the primary mechanism for tracking restaurant saves in the application. There appears to be confusion between:

1. `board_restaurants` table (junction table for boards)
2. `restaurant_saves` table (appears to be a separate save mechanism)

The analytics system queries `restaurant_saves`, but the actual save functionality primarily uses `board_restaurants`. This discrepancy needs to be audited and resolved to ensure analytics are accurate and valuable for restaurant owners.

## Objectives

1. **Understand Current Implementation**: Document how restaurant saves actually work in the app today
2. **Identify Data Sources**: Determine which tables/mechanisms are the source of truth
3. **Audit Analytics**: Review what metrics are trackable and valuable for restaurants
4. **Recommend Solution**: Propose a unified approach for saves and analytics

## Scope

### In Scope
- Audit all save-related functionality in the codebase
- Review database schema and relationships
- Document current user flows for saving restaurants
- Identify all trackable actions valuable for restaurant analytics
- Review existing analytics implementation
- Propose improvements to analytics data model

### Out of Scope
- Implementation of recommended changes (separate task)
- UI/UX changes to save functionality
- New analytics features (unless critical gaps identified)

## Investigation Areas

### 1. Save Functionality Audit

**Questions to Answer:**
- How do users save restaurants in the app today?
- What happens when a user taps the "save" button on a restaurant card?
- Which database tables are written to when a save occurs?
- Is `restaurant_saves` table actively used or is it legacy?
- What is the relationship between `board_restaurants` and `restaurant_saves`?

**Files to Review:**
- `services/saveService.ts` - Main save service
- `services/boardService.ts` - Board operations
- `components/cards/RestaurantCardWithSave.tsx` - Save UI component
- `supabase/migrations/*restaurant_saves*.sql` - Database migrations
- `supabase/migrations/*boards*.sql` - Board-related migrations

**Key Functions to Trace:**
- `saveService.toggleSave()`
- `boardService.saveRestaurantToQuickSaves()`
- `boardService.addRestaurantToBoard()`
- `save_restaurant_instant()` (database function)

### 2. Database Schema Analysis

**Tables to Document:**
- `restaurant_saves` - Current schema, usage, triggers
- `board_restaurants` - Current schema, usage, relationships
- `boards` - Board structure and default boards
- `save_boards` - Junction table (if exists and used)

**Questions:**
- What is the primary key/unique constraint structure?
- Are there triggers that sync between tables?
- What is the data flow when a save occurs?
- Are there any orphaned records or inconsistencies?

**Migration History to Review:**
- `20250130_fix_restaurant_saves_board_id.sql` - Added board_id to restaurant_saves
- `20250130_fix_save_function_final.sql` - Save function implementation
- `001_initial_schema.sql` - Original schema definitions

### 3. User Flow Documentation

**Flows to Document:**

1. **Quick Save Flow** (Your Saves board):
   - User taps save button on restaurant card
   - System creates/uses default "Your Saves" board
   - Restaurant added to board
   - What tables are written to?

2. **Board Save Flow** (Custom boards):
   - User saves to a specific board
   - Restaurant added to selected board
   - What tables are written to?

3. **Unsave Flow**:
   - User removes save
   - What tables are updated/deleted from?

**UI Components to Review:**
- `app/quick-saves.tsx` - Quick saves screen
- `components/home/QuickSavesBoard.tsx` - Quick saves widget
- `app/(tabs)/profile.tsx` - Profile saves tab
- Save button implementations across the app

### 4. Analytics Implementation Review

**Current Analytics:**
- `services/restaurantAnalyticsService.ts` - Analytics service
- `supabase/migrations/20250122_restaurant_analytics.sql` - Analytics function
- `app/(tabs)/business/analytics.tsx` - Analytics UI (if exists)

**Metrics Currently Tracked:**
- Total saves (from `restaurant_saves`)
- Saves this month
- Saves last 24h
- Trending status (>10 saves in 24h)
- Mentions count (from `posts`)
- Creator posts count
- Total post likes
- Daily saves trend
- Top savers

**Questions:**
- Are these metrics accurate given the save mechanism?
- What metrics are missing that would be valuable?
- Are there data inconsistencies?

### 5. Trackable Actions & Valuable Metrics

**Actions to Identify:**

1. **Save Actions:**
   - Initial save
   - Save to multiple boards
   - Unsave
   - Save with notes/rating
   - Save with visit date

2. **Engagement Actions:**
   - Post creation (mention)
   - Post likes
   - Post comments
   - Post shares
   - Review submission (post with rating)

3. **Creator Actions:**
   - Creator posts about restaurant
   - Campaign applications
   - Deliverable submissions
   - Creator engagement metrics

4. **Discovery Actions:**
   - Restaurant profile views
   - Restaurant searches
   - Restaurant shares
   - Directions requests
   - Website clicks
   - Phone calls

**Valuable Metrics for Restaurants:**

**Engagement Metrics:**
- Total saves (all-time, monthly, weekly, daily)
- Save velocity (trending score)
- Unique savers count
- Repeat saves (same user, multiple boards)
- Save-to-visit conversion (if trackable)
- Save demographics (creators vs consumers)

**Content Metrics:**
- Total mentions in posts
- Creator mentions vs consumer mentions
- Post engagement (likes, comments, shares)
- Average post rating
- Content sentiment (if available)

**Discovery Metrics:**
- Profile views
- Search appearances
- Trending status duration
- Geographic reach (where savers are located)

**Creator Marketplace Metrics:**
- Creator posts count
- Campaign applications received
- Deliverables submitted
- Creator engagement rates
- Campaign ROI

**Competitive Metrics:**
- Market share (saves vs competitors in area)
- Category ranking
- Growth rate vs competitors

## Deliverables

### 1. Audit Report Document

**Sections:**
1. **Current State Analysis**
   - How saves work today (step-by-step)
   - Database tables involved
   - Data flow diagrams
   - Code flow diagrams

2. **Findings**
   - Inconsistencies discovered
   - Redundant tables/functions
   - Missing functionality
   - Data quality issues

3. **Recommendations**
   - Unified save mechanism proposal
   - Analytics data model improvements
   - Migration strategy (if needed)
   - New metrics to track

### 2. Data Model Documentation

- Entity relationship diagrams
- Table schemas with usage notes
- Function/trigger documentation
- Data flow diagrams

### 3. User Flow Diagrams

- Save flow (current state)
- Unsave flow
- Board management flow
- Analytics data collection flow

### 4. Analytics Requirements Document

- List of all trackable actions
- Metrics definitions
- Data sources for each metric
- Calculation formulas
- Display recommendations

### 5. Migration Plan (if needed)

- Steps to unify save mechanism
- Data migration scripts
- Backward compatibility considerations
- Testing strategy

## Acceptance Criteria

- [ ] Complete audit of save functionality documented
- [ ] Database schema relationships clearly documented
- [ ] All user flows for saving restaurants documented
- [ ] Current analytics implementation reviewed and documented
- [ ] List of all trackable actions compiled
- [ ] Valuable metrics for restaurants identified
- [ ] Recommendations provided for unified approach
- [ ] Migration plan created (if schema changes needed)
- [ ] Test data setup updated to reflect actual usage

## Technical Notes

### Key Files to Review

**Services:**
- `services/saveService.ts`
- `services/boardService.ts`
- `services/restaurantService.ts`
- `services/restaurantAnalyticsService.ts`

**Components:**
- `components/cards/RestaurantCardWithSave.tsx`
- `components/home/QuickSavesBoard.tsx`
- `app/quick-saves.tsx`
- `app/(tabs)/profile.tsx`

**Database:**
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/20250130_*.sql` (save-related)
- `supabase/migrations/20250122_restaurant_analytics.sql`
- `supabase/migrations/*boards*.sql`

### Database Functions to Review

- `save_restaurant_instant()` - Main save function
- `get_or_create_default_board()` - Board creation
- `get_restaurant_analytics()` - Analytics function
- `log_restaurant_save_activity()` - Activity feed trigger

### Potential Issues to Investigate

1. **Dual Save Mechanism**: Both `board_restaurants` and `restaurant_saves` may be tracking saves
2. **Analytics Accuracy**: Analytics query `restaurant_saves` but saves may go to `board_restaurants`
3. **Activity Feed**: Trigger tries to insert into `activity_feed` view (UNION view, not insertable)
4. **Data Consistency**: Need to verify if both tables stay in sync

## Related Tasks

- [CM-6: Restaurant Analytics Dashboard](tasks/creator-marketplace/task-cm-6-restaurant-analytics-dashboard.md)
- Test data setup scripts (steps 06-07)

## References

- [Restaurant Analytics PRD](docs/prd-data-flywheel-analytics.md)
- [Creator Marketplace Review](docs/CREATOR_MARKETPLACE_REVIEW.md)
- [Business Screens Implementation](docs/business-screens-implementation.md)

## Questions for Product/Design

1. Should saves be board-based only, or should there be a separate "saved restaurants" concept?
2. What analytics metrics are most valuable for restaurant owners?
3. Should we track "intent to visit" vs "has visited" separately?
4. Do we need to track saves to multiple boards separately for analytics?
5. Should analytics show board-level insights (e.g., "saved to 'Date Night' board 15 times")?

## Next Steps After Audit

1. Review audit findings with team
2. Decide on unified save mechanism
3. Create implementation task for recommended changes
4. Update analytics to use correct data sources
5. Update test data setup to match actual usage
6. Implement new trackable actions if needed

