# Business Screens Testing Guide

## Overview
This guide provides manual testing procedures for the Creator Marketplace business owner screens. Follow these steps to verify functionality and identify issues.

## Prerequisites

### Database Setup
1. **Run the migration**:
   ```bash
   supabase migration up
   ```
   Or manually execute: `supabase/migrations/20250913_creator_marketplace_business.sql`

2. **Verify tables exist** in Supabase dashboard:
   - campaigns
   - campaign_applications
   - portfolio_items
   - business_profiles
   - creator_profiles

### Test Data Setup

#### Step 1: Create a Business Profile
```sql
-- Replace YOUR_USER_ID with your actual user ID from auth.users
-- Replace YOUR_RESTAURANT_ID with a valid restaurant ID
INSERT INTO business_profiles (user_id, restaurant_id, verification_status)
VALUES 
  ('YOUR_USER_ID', 'YOUR_RESTAURANT_ID', 'verified');
```

#### Step 2: Create Test Campaigns
```sql
-- Active campaign with applications
INSERT INTO campaigns (
  restaurant_id, 
  owner_id, 
  name, 
  description, 
  status, 
  budget_cents, 
  spent_amount_cents,
  start_date, 
  end_date,
  max_creators,
  selected_creators_count
) VALUES
  ('YOUR_RESTAURANT_ID', 'YOUR_USER_ID', 'Summer Food Festival', 'Promote our summer menu', 'active', 50000, 15000, '2025-09-01', '2025-09-30', 5, 2),
  ('YOUR_RESTAURANT_ID', 'YOUR_USER_ID', 'Weekend Brunch Special', 'Showcase our brunch offerings', 'active', 30000, 5000, '2025-09-10', '2025-10-10', 3, 1),
  ('YOUR_RESTAURANT_ID', 'YOUR_USER_ID', 'Grand Opening Draft', 'Planning grand opening', 'draft', 100000, 0, '2025-10-01', '2025-10-31', 10, 0),
  ('YOUR_RESTAURANT_ID', 'YOUR_USER_ID', 'Past Campaign', 'Completed campaign', 'completed', 25000, 25000, '2025-08-01', '2025-08-31', 3, 3);
```

#### Step 3: Create Test Creator Profiles
```sql
-- Create some test creators
INSERT INTO creator_profiles (user_id, display_name, bio, avatar_url, specialties, location, account_status)
VALUES 
  ('CREATOR_USER_ID_1', 'Food Blogger Jane', 'Love sharing great food finds!', 'https://i.pravatar.cc/150?img=1', ARRAY['brunch', 'fine_dining'], 'Charlotte, NC', 'active'),
  ('CREATOR_USER_ID_2', 'Chef Mike', 'Professional chef and food critic', 'https://i.pravatar.cc/150?img=2', ARRAY['fine_dining', 'desserts'], 'Charlotte, NC', 'active'),
  ('CREATOR_USER_ID_3', 'Foodie Sarah', 'Exploring local cuisine', 'https://i.pravatar.cc/150?img=3', ARRAY['street_food', 'casual'], 'Charlotte, NC', 'active');
```

#### Step 4: Create Test Applications
```sql
-- Add applications to campaigns (use the campaign IDs from step 2)
INSERT INTO campaign_applications (campaign_id, creator_id, proposed_rate_cents, status, cover_letter)
VALUES
  ('CAMPAIGN_ID_1', 'CREATOR_ID_1', 15000, 'accepted', 'Would love to promote your summer menu!'),
  ('CAMPAIGN_ID_1', 'CREATOR_ID_2', 20000, 'pending', 'I can create amazing content for this campaign'),
  ('CAMPAIGN_ID_1', 'CREATOR_ID_3', 10000, 'pending', 'Great fit for my audience'),
  ('CAMPAIGN_ID_2', 'CREATOR_ID_1', 8000, 'accepted', 'Brunch is my specialty!');
```

## Test Scenarios

### 1. Business Dashboard Testing

#### Test Case 1.1: Initial Load
**Steps**:
1. Navigate to More tab
2. Tap "Business Dashboard"
3. Observe loading state

**Expected**:
- Loading spinner shows briefly
- Dashboard loads with restaurant header
- Verification badge shows if verified
- All metric cards display correct counts

#### Test Case 1.2: Empty State
**Setup**: Use account with no campaigns
**Steps**:
1. Navigate to Business Dashboard

**Expected**:
- Welcome message displays
- Benefits list shows
- "Create Your First Campaign" button visible
- Button navigates to campaign creation

#### Test Case 1.3: Metrics Accuracy
**Steps**:
1. Note the displayed metrics
2. Verify against database:
   - Active Campaigns count
   - Pending Applications count
   - Monthly Spend amount
   - Total Creators count

**Expected**:
- All counts match database records
- Monthly spend shows current month only
- Pending badge shows on applications card if > 0

#### Test Case 1.4: Quick Actions
**Steps**:
1. Tap "New Campaign" button
2. Go back
3. Tap "Find Creators" button
4. Go back
5. Tap "Analytics" button

**Expected**:
- Each button navigates to correct screen
- Back navigation returns to dashboard

#### Test Case 1.5: Campaign Cards
**Steps**:
1. Review campaign cards (max 3 shown)
2. Check each card shows:
   - Campaign name
   - Status badge with color
   - Creator count (X/Y format)
   - Spent amount
   - Days remaining
   - Progress bar

**Expected**:
- Only first 3 campaigns show
- "See All" link visible if > 3 campaigns
- Progress bar color changes at 80% budget

#### Test Case 1.6: Pull to Refresh
**Steps**:
1. Pull down on dashboard
2. Release to trigger refresh

**Expected**:
- Refresh indicator shows
- Data reloads
- Any new data appears

### 2. Manage Campaigns Testing

#### Test Case 2.1: Filter Functionality
**Steps**:
1. Navigate to Manage Campaigns
2. Tap each filter tab:
   - All
   - Active
   - Drafts
   - Completed

**Expected**:
- Filter tabs show counts
- List updates to show only matching campaigns
- Active filter highlighted
- Empty state shows for filters with no campaigns

#### Test Case 2.2: Campaign List Items
**Steps**:
1. Review each campaign item

**Expected for Active Campaigns**:
- Green status badge
- Shows creators, budget, time remaining
- Deliverables progress bar (if applicable)
- New applications badge if pending > 0

**Expected for Draft Campaigns**:
- Gray status badge
- "Tap to continue editing" message
- Shows "Not started" for timeline

**Expected for Completed Campaigns**:
- Blue status badge
- Shows "Ended" for timeline

#### Test Case 2.3: Navigation
**Steps**:
1. Tap on any campaign card
2. Verify navigation to detail screen
3. Use back button to return

**Expected**:
- Smooth navigation to campaign detail
- Back button returns to list
- List maintains scroll position

#### Test Case 2.4: Create Campaign
**Steps**:
1. Tap plus icon in header

**Expected**:
- Navigates to campaign creation wizard

### 3. Business Analytics Testing

#### Test Case 3.1: Period Selection
**Steps**:
1. Navigate to Analytics
2. Select "This Month"
3. Note metrics
4. Select "Last Month"
5. Note metrics change
6. Select "All Time"

**Expected**:
- Period selector highlights active choice
- Metrics update for each period
- Loading state shows during update

#### Test Case 3.2: Overview Metrics
**Steps**:
1. Verify each metric card displays:
   - Total Spend (dollar amount)
   - Campaigns (count)
   - Creators (count)
   - Content Pieces (count)

**Expected**:
- Icons and colors match design
- Values formatted correctly
- Cards responsive to screen size

#### Test Case 3.3: Performance Highlights
**Steps**:
1. Check "Best Performing Campaign" card
2. Check "Top Creator" card
3. Verify average metrics display

**Expected**:
- Best campaign shows name and metric
- Top creator shows avatar, name, stats
- Tap on top creator navigates to profile
- Average cost and engagement rate display

#### Test Case 3.4: Content Gallery
**Steps**:
1. Scroll content gallery horizontally
2. Tap on a content item

**Expected**:
- Gallery scrolls smoothly
- Thumbnails load correctly
- View count overlays visible
- Creator names show below images
- Tap navigates to content detail

#### Test Case 3.5: Empty Analytics
**Setup**: Use account with no campaigns
**Steps**:
1. Navigate to Analytics

**Expected**:
- Empty state illustration
- "No Analytics Yet" message
- "Create Your First Campaign" button
- Button navigates to campaign creation

### 4. Edge Cases & Error Handling

#### Test Case 4.1: Network Error
**Steps**:
1. Turn on airplane mode
2. Navigate to any business screen
3. Try to refresh

**Expected**:
- Error alert shows
- User-friendly error message
- Option to retry

#### Test Case 4.2: Missing Business Profile
**Setup**: Use account without business profile
**Steps**:
1. Try to access Business Dashboard

**Expected**:
- Error or redirect to claim flow
- Clear messaging about requirements

#### Test Case 4.3: Large Data Sets
**Setup**: Create 50+ campaigns
**Steps**:
1. Load Manage Campaigns screen
2. Scroll through list

**Expected**:
- Smooth scrolling performance
- No lag or jank
- All items render correctly

### 5. Cross-Screen Integration

#### Test Case 5.1: Data Consistency
**Steps**:
1. Note metrics on Dashboard
2. Navigate to Manage Campaigns
3. Verify counts match
4. Navigate to Analytics
5. Verify totals match

**Expected**:
- All screens show consistent data
- Counts and amounts match across screens

#### Test Case 5.2: Navigation Flow
**Steps**:
1. Start at Dashboard
2. Navigate through: Campaigns → Analytics → Back → Back
3. Try various navigation paths

**Expected**:
- Navigation stack works correctly
- Back button behavior consistent
- No navigation loops or dead ends

## Performance Testing

### Load Times
- Dashboard: Should load < 2 seconds
- Campaigns list: Should load < 1.5 seconds
- Analytics: Should load < 2 seconds

### Memory Usage
- Monitor memory during navigation
- Check for memory leaks on screen transitions
- Verify images properly released

### Battery Impact
- Test extended usage (15+ minutes)
- Monitor battery drain
- Check for excessive re-renders

## Accessibility Testing

### Screen Reader
1. Enable screen reader (VoiceOver/TalkBack)
2. Navigate all screens
3. Verify all elements are announced
4. Check navigation is possible

### Text Size
1. Set device to largest text size
2. Verify all text remains readable
3. Check layout doesn't break

### Color Contrast
1. Verify text meets WCAG standards
2. Check status badges are distinguishable
3. Test in dark mode (if applicable)

## Regression Testing

After any code changes:
1. Run through all critical paths
2. Verify existing functionality unchanged
3. Check for visual regressions
4. Test data persistence

## Bug Reporting Template

When reporting issues, include:

```
**Screen**: [Dashboard/Campaigns/Analytics]
**Device**: [iPhone/Android model]
**OS Version**: [iOS/Android version]
**App Version**: [version number]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots/Videos**:
[Attach if applicable]

**Additional Context**:
[Any other relevant information]
```

## Testing Checklist

### Pre-Release Checklist
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Performance metrics met
- [ ] Accessibility standards met
- [ ] Cross-device testing complete
- [ ] Data integrity verified
- [ ] Error handling tested
- [ ] Empty states tested
- [ ] Loading states smooth
- [ ] Navigation flows correctly

## Automated Testing (Future)

### Recommended Test Coverage
1. Unit tests for data calculations
2. Integration tests for API calls
3. Snapshot tests for components
4. E2E tests for critical paths

### Test Data Management
1. Seed scripts for consistent test data
2. Test database separate from production
3. Data cleanup after test runs
4. Mock data for offline testing