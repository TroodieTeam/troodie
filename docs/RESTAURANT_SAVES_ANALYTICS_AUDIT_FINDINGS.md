# Restaurant Saves & Analytics Audit Findings

**Audit Date**: 2025-12-03
**Status**: Complete
**Auditor**: Engineering Team

---

## Executive Summary

This audit identified a **critical data discrepancy** between the save mechanism used in the application and the analytics system. The app saves restaurants to `board_restaurants`, but the analytics function queries `restaurant_saves`. This results in **inaccurate analytics data** for restaurant owners.

### Key Findings

| Issue | Severity | Impact |
|-------|----------|--------|
| Dual save mechanism confusion | Critical | Analytics show 0 saves even when restaurants are saved |
| `restaurant_saves` table is legacy | High | Table exists but is not used by current save flow |
| Analytics querying wrong table | Critical | All save-related metrics are incorrect |
| Missing trackable actions | Medium | Lost opportunity for valuable insights |

---

## 1. Current State Analysis

### 1.1 How Saves Work Today

**Primary Flow (What Actually Happens):**

```
User taps save button
    → saveService.toggleSave()
        → boardService.saveRestaurantToQuickSaves()
            → boardService.ensureQuickSavesBoard()
                → Creates "Your Saves" board if not exists
            → boardService.addRestaurantToBoard()
                → INSERT INTO board_restaurants
```

**Data Flow Diagram:**

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  User Interface │────▶│   saveService    │────▶│   boardService    │
│  (Save Button)  │     │                  │     │                   │
└─────────────────┘     └──────────────────┘     └───────────────────┘
                                                          │
                                                          ▼
                                               ┌───────────────────┐
                                               │  board_restaurants │
                                               │      (table)       │
                                               └───────────────────┘
```

### 1.2 Tables Involved

#### `board_restaurants` (ACTIVE - Primary Save Mechanism)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| board_id | UUID | Reference to boards table |
| restaurant_id | VARCHAR(255) | Restaurant being saved |
| added_by | UUID | User who saved |
| added_at | TIMESTAMP | When saved |
| notes | TEXT | User notes about restaurant |
| rating | INTEGER | Personal rating (1-5) |
| visit_date | DATE | When user visited |
| position | INTEGER | Order in board |
| external_url | TEXT | Context link (e.g., Instagram post) |

**Location**: `supabase/migrations/012_boards_schema.sql`

#### `restaurant_saves` (LEGACY - Not Used in Current Flow)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who saved |
| restaurant_id | UUID | Restaurant being saved |
| board_id | UUID | Added later via migration |
| personal_rating | INTEGER | Rating (1-5) |
| visit_date | DATE | Visit date |
| photos | TEXT[] | Array of photos |
| notes | TEXT | Notes |
| tags | TEXT[] | Tags |
| would_recommend | BOOLEAN | Recommendation flag |
| price_range | VARCHAR | Price range |
| visit_type | VARCHAR | Dine in/takeout/delivery |
| privacy | VARCHAR | Public/friends/private |

**Location**: `supabase/migrations/001_initial_schema.sql`

#### `boards` (Active)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Board owner |
| title | VARCHAR(100) | Board name (e.g., "Your Saves") |
| type | VARCHAR(20) | free/private/paid |
| is_private | BOOLEAN | Privacy setting |

### 1.3 Key Service Files

| File | Purpose | Uses |
|------|---------|------|
| `services/saveService.ts` | Orchestrates save/unsave | `board_restaurants` via boardService |
| `services/boardService.ts` | Board CRUD, add restaurants | `board_restaurants` |
| `services/boardServiceExtended.ts` | Get all user saves | `board_restaurants` |
| `services/restaurantAnalyticsService.ts` | Analytics for restaurants | `restaurant_saves` (WRONG!) |

---

## 2. Findings

### 2.1 Critical: Analytics Query Wrong Table

**Location**: `supabase/migrations/20250122_restaurant_analytics.sql`

The `get_restaurant_analytics()` function queries `restaurant_saves`:

```sql
SELECT COUNT(*) FROM restaurant_saves
WHERE restaurant_id = p_restaurant_id
```

But the app writes to `board_restaurants`. This means:

- **Total saves**: Always 0 (or only legacy data)
- **Saves this month**: Always 0
- **Saves last 24h**: Always 0
- **Is trending**: Never true
- **Daily saves**: Empty array
- **Top savers**: Empty array

**Impact**: Restaurant owners see no save activity, even if their restaurant is popular.

### 2.2 Critical: Real-time Subscription on Wrong Table

**Location**: `services/restaurantAnalyticsService.ts:86-113`

```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'restaurant_saves',  // WRONG TABLE
  filter: `restaurant_id=eq.${restaurantId}`,
}, ...)
```

Real-time updates will never fire because saves go to `board_restaurants`.

### 2.3 High: Schema Mismatch Between Tables

The `restaurant_saves` table was designed for a different data model:
- Has `privacy` field (public/friends/private)
- Has `would_recommend` field
- Has `visit_type` field
- Has `photos` array

The `board_restaurants` table has:
- `position` for ordering
- `external_url` for context links
- `added_by` instead of `user_id`

### 2.4 Medium: Attempted Integration (Incomplete)

Migration `20250130_fix_restaurant_saves_board_id.sql` tried to link `restaurant_saves` to boards by adding `board_id`, but:
- The save flow still uses `board_restaurants`
- The function `save_restaurant_instant()` writes to `restaurant_saves` but is not called by the app

### 2.5 Medium: Missing Triggers for Analytics

No triggers exist to sync data or update analytics when saves occur.

---

## 3. User Flow Documentation

### 3.1 Quick Save Flow

1. User taps bookmark icon on restaurant card
2. `RestaurantCardWithSave` calls `saveService.toggleSave()`
3. `saveService` checks current state via `boardService.getBoardsForRestaurant()`
4. If not saved:
   - `boardService.ensureQuickSavesBoard()` creates/gets "Your Saves" board
   - `boardService.addRestaurantToBoard()` inserts into `board_restaurants`
5. Events emitted: `QUICK_SAVES_UPDATED`, `RESTAURANT_SAVED`
6. Toast shown: "Added to Your Saves"

### 3.2 Board Save Flow

1. User long-presses or taps "Add to Board" in toast
2. `BoardSelectionModal` opens
3. User selects board(s)
4. `saveService.saveToBoards()` calls `boardService.addRestaurantToBoard()` for each
5. Events emitted for each board

### 3.3 Unsave Flow

1. User taps bookmark icon on already-saved restaurant
2. `saveService.toggleSave()` detects save exists
3. `boardService.removeRestaurantFromBoard()` deletes from `board_restaurants`
4. Toast shown: "Removed from Your Saves"

---

## 4. Product Decisions

### 4.1 Should saves be board-based only, or should there be a separate "saved restaurants" concept?

**Decision**: Board-based only.

**Rationale**:
- Current architecture already uses board-based saves successfully
- Users understand the "Your Saves" default board concept
- Allows saving to multiple boards for organization
- Simpler data model with single source of truth
- Custom boards enable features like sharing curated lists

### 4.2 What analytics metrics are most valuable for restaurant owners?

**Decision**: Focus on actionable metrics that drive business decisions.

**Tier 1 - Core Metrics (Must Have)**:
| Metric | Value Proposition |
|--------|-------------------|
| Total saves | Overall popularity indicator |
| Saves over time (trend) | Growth trajectory |
| Trending status | Viral moment detection |
| Total mentions (posts) | Content engagement |
| Creator mentions | Influencer attention |

**Tier 2 - Engagement Metrics (High Value)**:
| Metric | Value Proposition |
|--------|-------------------|
| Post engagement (likes, comments) | Content resonance |
| Save demographics (creator vs consumer) | Audience understanding |
| Average post rating | Quality perception |
| Repeat savers | Loyalty indicator |

**Tier 3 - Discovery Metrics (Future)**:
| Metric | Value Proposition |
|--------|-------------------|
| Profile views | Discovery reach |
| Search appearances | Visibility |
| Geographic reach | Market expansion |

### 4.3 Should we track "intent to visit" vs "has visited" separately?

**Decision**: Yes, but phase it in.

**Phase 1 (Current)**:
- Track saves as "intent to visit"
- Use `visit_date` in `board_restaurants` when populated

**Phase 2 (Future)**:
- Add explicit "Mark as Visited" action
- Track conversion rate: saves → visits
- This is high-value for restaurant owners to see actual foot traffic impact

### 4.4 Do we need to track saves to multiple boards separately for analytics?

**Decision**: No, for simplicity.

**Rationale**:
- A save is a save regardless of which board
- Unique saves (per user) matters more than total board placements
- Avoids inflating numbers artificially
- Simplifies analytics queries

### 4.5 Should analytics show board-level insights?

**Decision**: Yes, as a premium feature.

**Example insights**:
- "Saved to 'Date Night' board 15 times" → signals romantic dining appeal
- "Saved to 'Work Lunches' 25 times" → signals weekday lunch opportunity
- Board category distribution helps restaurants understand use cases

---

## 5. Recommendations

### 5.1 Immediate Fix: Update Analytics to Query board_restaurants

**Priority**: Critical
**Effort**: 1-2 hours

Update `get_restaurant_analytics()` to query correct table:

```sql
-- Replace restaurant_saves with board_restaurants
SELECT COUNT(DISTINCT br.id)
FROM board_restaurants br
WHERE br.restaurant_id = p_restaurant_id::text
```

### 5.2 Deprecate restaurant_saves Table

**Priority**: High
**Effort**: 1 day

1. Remove all references to `restaurant_saves` from analytics
2. Remove `save_restaurant_instant()` function
3. Add migration to drop table (after verifying no production dependencies)
4. Clean up related functions: `unsave_restaurant()`, `save_boards`, `save_interactions`

### 5.3 Update Real-time Subscription

**Priority**: High
**Effort**: 30 minutes

Change subscription from `restaurant_saves` to `board_restaurants`:

```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'board_restaurants',
  filter: `restaurant_id=eq.${restaurantId}`,
}, ...)
```

### 5.4 Add Analytics Triggers

**Priority**: Medium
**Effort**: 2-3 hours

Create trigger on `board_restaurants` to update denormalized analytics:

```sql
CREATE TRIGGER update_restaurant_analytics_on_save
AFTER INSERT OR DELETE ON board_restaurants
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_analytics();
```

### 5.5 Implement Missing Trackable Actions

**Priority**: Medium
**Effort**: 1-2 days

Add tracking for:
- Restaurant profile views
- Restaurant shares
- Direction requests
- Website/phone clicks

---

## 6. Migration Plan

### Phase 1: Fix Analytics (Immediate)

1. Create new migration: `YYYYMMDD_fix_analytics_data_source.sql`
2. Update `get_restaurant_analytics()` to use `board_restaurants`
3. Update `restaurant_analytics_summary` view
4. Test in staging
5. Deploy

### Phase 2: Clean Up Legacy Tables (Week 2)

1. Audit for any remaining references to `restaurant_saves`
2. Create migration to:
   - Drop `save_restaurant_instant()` function
   - Drop `unsave_restaurant()` function
   - Mark `restaurant_saves` as deprecated
3. Update test data scripts

### Phase 3: Enhance Analytics (Week 3-4)

1. Add profile view tracking
2. Add share tracking
3. Implement board category insights
4. Add export functionality

---

## 7. Test Data Implications

The test data setup scripts (steps 06-07) should be updated to:

1. Create saves via `board_restaurants` (not `restaurant_saves`)
2. Remove any references to `restaurant_saves` table
3. Add sample data for:
   - Multiple boards per user
   - Various board categories
   - Visit dates for conversion tracking

---

## 8. Conclusion

The core issue is straightforward: the analytics system queries a legacy table that the application no longer writes to. The fix is also straightforward: update the analytics queries to use `board_restaurants`.

The broader recommendation is to fully deprecate `restaurant_saves` and consolidate on the board-based save model, which better supports the product's organizing features while maintaining accurate analytics for restaurant owners.

---

## Appendix A: File References

| File | Line(s) | Issue |
|------|---------|-------|
| `services/restaurantAnalyticsService.ts` | 46-50 | Calls `get_restaurant_analytics` RPC |
| `services/restaurantAnalyticsService.ts` | 86-113 | Real-time subscription on wrong table |
| `supabase/migrations/20250122_restaurant_analytics.sql` | 23-91 | All queries use `restaurant_saves` |
| `services/saveService.ts` | 142 | Correct: uses `boardService.saveRestaurantToQuickSaves()` |
| `services/boardService.ts` | 235-326 | Correct: writes to `board_restaurants` |

## Appendix B: Schema Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CURRENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐         ┌──────────────────┐         ┌─────────────┐ │
│   │  users   │────────▶│      boards      │◀────────│board_members│ │
│   └──────────┘         └──────────────────┘         └─────────────┘ │
│        │                        │                                    │
│        │                        │                                    │
│        │                        ▼                                    │
│        │               ┌──────────────────┐                          │
│        │               │ board_restaurants │ ◀─── ACTUAL SAVES       │
│        │               │   (ACTIVE)       │                          │
│        │               └──────────────────┘                          │
│        │                                                             │
│        │               ┌──────────────────┐                          │
│        └──────────────▶│ restaurant_saves │ ◀─── ANALYTICS QUERIES  │
│                        │    (LEGACY)      │       (WRONG!)           │
│                        └──────────────────┘                          │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────────┐│
│   │                        POSTS SYSTEM                             ││
│   │  ┌──────────┐     ┌──────────────┐     ┌────────────────────┐  ││
│   │  │  posts   │────▶│  restaurant  │◀────│ get_restaurant_    │  ││
│   │  │          │     │   mentions   │     │ analytics()        │  ││
│   │  └──────────┘     └──────────────┘     │ (WORKS CORRECTLY)  │  ││
│   │                                        └────────────────────┘  ││
│   └────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Appendix C: Recommended Updated Analytics Function

```sql
CREATE OR REPLACE FUNCTION get_restaurant_analytics(
  p_restaurant_id UUID,
  p_start_date DATE DEFAULT (NOW() - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT NOW()::DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_restaurant_id_text TEXT := p_restaurant_id::TEXT;
BEGIN
  SELECT json_build_object(
    'total_saves', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
    ),
    'saves_this_month', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
        AND br.added_at >= DATE_TRUNC('month', NOW())
    ),
    'saves_last_24h', (
      SELECT COUNT(DISTINCT br.id) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
        AND br.added_at >= NOW() - INTERVAL '24 hours'
    ),
    'is_trending', (
      SELECT COUNT(DISTINCT br.id) > 10 FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
        AND br.added_at >= NOW() - INTERVAL '24 hours'
    ),
    'unique_savers', (
      SELECT COUNT(DISTINCT br.added_by) FROM board_restaurants br
      WHERE br.restaurant_id = v_restaurant_id_text
    ),
    'mentions_count', (
      SELECT COUNT(*) FROM posts
      WHERE restaurant_id = v_restaurant_id_text
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ),
    'creator_posts_count', (
      SELECT COUNT(*) FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.restaurant_id = v_restaurant_id_text
        AND u.is_creator = true
        AND p.created_at >= p_start_date
        AND p.created_at <= p_end_date
    ),
    'total_post_likes', (
      SELECT COALESCE(SUM(likes_count), 0) FROM posts
      WHERE restaurant_id = v_restaurant_id_text
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ),
    'daily_saves', (
      SELECT COALESCE(json_agg(daily_data ORDER BY date DESC), '[]'::json)
      FROM (
        SELECT
          DATE_TRUNC('day', br.added_at)::DATE as date,
          COUNT(DISTINCT br.id) as count
        FROM board_restaurants br
        WHERE br.restaurant_id = v_restaurant_id_text
          AND br.added_at >= p_start_date
          AND br.added_at <= p_end_date
        GROUP BY DATE_TRUNC('day', br.added_at)
      ) daily_data
    ),
    'top_savers', (
      SELECT COALESCE(json_agg(saver_data), '[]'::json)
      FROM (
        SELECT
          u.id,
          u.username,
          u.avatar_url,
          u.is_creator,
          COUNT(DISTINCT br.id) as save_count
        FROM board_restaurants br
        JOIN users u ON br.added_by = u.id
        WHERE br.restaurant_id = v_restaurant_id_text
        GROUP BY u.id, u.username, u.avatar_url, u.is_creator
        ORDER BY COUNT(DISTINCT br.id) DESC
        LIMIT 10
      ) saver_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
