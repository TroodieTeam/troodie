# Engineering Request ER-002: Restaurant Analytics Tracking Audit

**Status:** Open  
**Priority:** High  
**Created:** 2025-12-08  
**Related:** Restaurant Analytics Dashboard, Creator Marketplace, User Actions Tracking

## Problem Statement

After claiming a restaurant, business owners need comprehensive analytics to understand how their restaurant is performing on the platform. We need to audit and ensure that every user action that should be tracked is properly captured and displayed in the Restaurant Analytics screen.

## Background

The Restaurant Analytics screen (`app/restaurant/[id]/analytics.tsx`) displays various metrics including saves, mentions, likes, and engagement. However, we need to verify that:

1. All relevant user actions are being tracked
2. Data is properly aggregated and queryable
3. Analytics reflect accurate, real-time data
4. Historical data is preserved for trend analysis

## Scope

Audit and ensure tracking for all user actions that impact restaurant analytics:

### 1. User Engagement Actions
- [ ] **Saves** - Users saving restaurant to boards
  - Track: `board_restaurants` table inserts
  - Verify: Count, trends, board types
  - Display: Total saves, recent saves, trending badge

- [ ] **Likes** - Users liking posts that mention restaurant
  - Track: `post_likes` table inserts
  - Verify: Count per post, total likes
  - Display: Total likes, likes per post, engagement rate

- [ ] **Shares** - Users sharing restaurant or posts mentioning it
  - Track: `shares` table inserts
  - Verify: Share type (restaurant vs post), share destination
  - Display: Total shares, share breakdown by type

- [ ] **Comments** - Comments on posts mentioning restaurant
  - Track: `post_comments` table inserts
  - Verify: Count per post, comment engagement
  - Display: Total comments, comment engagement rate

### 2. Content Actions
- [ ] **Post Mentions** - Posts that mention the restaurant
  - Track: `posts` table with `restaurant_id`
  - Verify: Post type, creator, engagement metrics
  - Display: Total mentions, recent mentions, top creators

- [ ] **Creator Posts** - Posts from creators featuring the restaurant
  - Track: `posts` table filtered by creator accounts
  - Verify: Creator attribution, campaign association
  - Display: Creator posts count, campaign posts count

- [ ] **Campaign Deliverables** - Content submitted for campaigns
  - Track: `campaign_deliverables` table
  - Verify: Campaign association, metrics (views, likes)
  - Display: Deliverables count, total views, total engagement

### 3. User Discovery Actions
- [ ] **Profile Views** - Users viewing restaurant profile
  - Track: `restaurant_views` or analytics events table
  - Verify: Unique views, view duration, user type
  - Display: Total views, unique visitors, view trends

- [ ] **Search Impressions** - Restaurant appearing in search results
  - Track: Search analytics events
  - Verify: Search queries, click-through rate
  - Display: Search impressions, CTR, top search terms

- [ ] **Board Appearances** - Restaurant appearing in board feeds
  - Track: Board view analytics
  - Verify: Board types, visibility
  - Display: Board appearances, discovery sources

### 4. Campaign Performance
- [ ] **Campaign Applications** - Creator applications to campaigns
  - Track: `campaign_applications` table
  - Verify: Application status, creator quality
  - Display: Total applications, acceptance rate, top creators

- [ ] **Campaign Engagement** - Engagement on campaign content
  - Track: `campaign_deliverables` metrics
  - Verify: Views, likes, shares, comments per deliverable
  - Display: Campaign ROI, engagement rates, top performing content

- [ ] **Campaign Reach** - Audience reached through campaigns
  - Track: Aggregate deliverable metrics
  - Verify: Unique viewers, engagement depth
  - Display: Total reach, engagement rate, conversion metrics

### 5. Business Actions
- [ ] **Restaurant Updates** - Business updating restaurant details
  - Track: `restaurants` table updates
  - Verify: Update frequency, fields changed
  - Display: Last updated, update history

- [ ] **Campaign Creation** - Business creating campaigns
  - Track: `campaigns` table inserts
  - Verify: Campaign status, budget, duration
  - Display: Active campaigns, campaign performance

- [ ] **Claim Status** - Restaurant claim and verification
  - Track: `restaurant_claims` table
  - Verify: Claim date, verification status
  - Display: Claim date, verification status

## Technical Requirements

### Database Schema Audit

1. **Verify tracking tables exist and are properly structured:**
   - `board_restaurants` - Restaurant saves
   - `posts` - Post mentions
   - `post_likes` - Post likes
   - `post_comments` - Post comments
   - `shares` - Shares
   - `campaign_deliverables` - Campaign content
   - `campaign_applications` - Campaign applications
   - `restaurant_views` (if exists) - Profile views
   - Analytics events table (if exists) - Custom events

2. **Verify analytics function:**
   - `get_restaurant_analytics()` function exists and is accurate
   - Function aggregates data correctly
   - Function handles edge cases (no data, null values)
   - Function performance is acceptable

3. **Verify indexes:**
   - Indexes on `restaurant_id` columns
   - Indexes on `created_at` for time-based queries
   - Indexes on foreign keys for joins
   - Composite indexes for common query patterns

### Data Integrity

1. **Verify cascading deletes:**
   - When posts are deleted, analytics reflect the change
   - When users are deleted, data is handled appropriately
   - When restaurants are deleted, analytics are cleaned up

2. **Verify data consistency:**
   - Counts match actual records
   - Aggregations are accurate
   - No duplicate tracking
   - Historical data is preserved

3. **Verify real-time updates:**
   - Analytics update when actions occur
   - No stale data in analytics
   - Cache invalidation works correctly

### Analytics Function Review

Review `get_restaurant_analytics()` function in:
- `supabase/migrations/20250122_fix_analytics_data_source.sql`

Verify it:
- [ ] Correctly queries all relevant tables
- [ ] Aggregates data accurately
- [ ] Handles NULL values properly
- [ ] Returns data in expected format
- [ ] Performs well with large datasets
- [ ] Includes all tracked metrics

### Frontend Integration

Review `app/restaurant/[id]/analytics.tsx`:
- [ ] Displays all tracked metrics
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Shows empty states appropriately
- [ ] Updates in real-time (if applicable)
- [ ] Displays trends and comparisons

## Implementation Plan

### Phase 1: Audit Current State (Week 1)
1. Review all user actions in creator marketplace
2. Map actions to database tables
3. Verify tracking exists for each action
4. Document gaps and missing tracking

### Phase 2: Fix Tracking Gaps (Week 2)
1. Add missing tracking tables/columns
2. Add missing triggers/functions
3. Add missing indexes
4. Update analytics function

### Phase 3: Verify Data Integrity (Week 3)
1. Run data consistency checks
2. Verify cascading deletes
3. Test real-time updates
4. Performance test analytics queries

### Phase 4: Enhance Analytics (Week 4)
1. Add missing metrics to analytics function
2. Add trend analysis
3. Add comparison features
4. Add export functionality (if needed)

### Phase 5: Frontend Updates (Week 5)
1. Update analytics UI with all metrics
2. Add visualizations (charts, graphs)
3. Add filtering and date ranges
4. Add export functionality

## Testing Requirements

### Unit Tests
- [ ] Test analytics function with various data scenarios
- [ ] Test tracking inserts/updates
- [ ] Test cascading deletes
- [ ] Test aggregation accuracy

### Integration Tests
- [ ] Test end-to-end user actions → analytics updates
- [ ] Test analytics screen displays correct data
- [ ] Test real-time updates
- [ ] Test performance with large datasets

### Manual Testing
- [ ] Perform each user action and verify tracking
- [ ] Verify analytics screen shows all metrics
- [ ] Verify historical data is preserved
- [ ] Verify trends are accurate

## Success Criteria

1. ✅ Every user action that should be tracked is tracked
2. ✅ Analytics function returns accurate, complete data
3. ✅ Analytics screen displays all relevant metrics
4. ✅ Data updates in real-time (or near real-time)
5. ✅ Historical data is preserved and queryable
6. ✅ Analytics performance is acceptable (< 2s load time)
7. ✅ No data inconsistencies or gaps

## Related Files

- `app/restaurant/[id]/analytics.tsx` - Analytics UI
- `services/restaurantAnalyticsService.ts` - Analytics service
- `supabase/migrations/20250122_fix_analytics_data_source.sql` - Analytics function
- `data/test-data/prod/02g-create-restaurant-analytics-data.sql` - Test data script

## Metrics to Track

### Core Metrics
- Total saves
- Total mentions (posts)
- Total likes
- Total shares
- Total comments
- Total views (if tracked)
- Engagement rate

### Campaign Metrics
- Campaign applications
- Campaign deliverables
- Campaign engagement
- Campaign reach
- Campaign ROI

### Trend Metrics
- Saves over time
- Mentions over time
- Engagement over time
- Trending status

### Creator Metrics
- Top creators (by engagement)
- Creator posts count
- Creator campaign participation

## Notes

- Consider adding an analytics events table for custom events
- Consider adding analytics aggregation table for performance
- Consider adding analytics caching layer
- Consider adding analytics export functionality
- Consider adding analytics API for external integrations

## Acceptance Criteria

- [ ] All user actions are tracked
- [ ] Analytics function is accurate and complete
- [ ] Analytics screen displays all metrics
- [ ] Data updates correctly
- [ ] Performance is acceptable
- [ ] Documentation is updated
