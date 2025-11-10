# Creator Screens Manual Testing Guide

## Prerequisites

### Test Accounts
Use these accounts for testing different scenarios:
- **Qualified Creator:** `consumer2@bypass.com` (52 saves, 7 boards, 15 friends)
- **Not Qualified:** `consumer1@bypass.com` (22 saves, 2 boards, 3 friends)
- **Existing Creator:** `creator1@bypass.com` or `creator2@bypass.com`
- **OTP Code:** `000000` for all test accounts

### Database Setup
1. Run migration: `supabase/migrations/20250113_create_creator_tables.sql`
2. Ensure RLS policies are active (or disabled for testing)
3. Sample campaigns are auto-created by migration

## Test Scenarios

### 1. Creator Onboarding Flow

#### Test 1.1: Not Qualified User
**Steps:**
1. Login as `consumer1@bypass.com`
2. Navigate to More tab
3. Look for "Become a Creator" option
4. Click to start onboarding

**Expected:**
- Qualification screen shows unmet requirements:
  - ❌ 22 restaurant saves (need 40+)
  - ❌ 2 boards created (need 3+)
  - ❌ 3 friends connected (need 5+)
- Continue button is DISABLED
- Button text shows "Complete Requirements to Continue"

#### Test 1.2: Qualified User Onboarding
**Steps:**
1. Login as `consumer2@bypass.com`
2. Navigate to More tab → "Become a Creator"
3. Pass qualification check (all green checkmarks)
4. Select creator focuses (e.g., "Local Favorites", "Trending")
5. Add portfolio images (can skip for testing)
6. Review and accept terms
7. Complete onboarding

**Expected:**
- ✅ All qualification requirements show green
- Continue button is ENABLED
- After completion:
  - Success modal appears
  - User stays on More screen (not redirected)
  - Creator Tools section appears in More tab

### 2. Creator Dashboard Testing

#### Test 2.1: New Creator Empty State
**Steps:**
1. Complete onboarding with `consumer2@bypass.com`
2. Navigate to Creator Dashboard

**Expected:**
- Empty state with trophy icon
- "Welcome to Creator Tools!" message
- "Browse Campaigns" button
- All metrics show 0

#### Test 2.2: Active Creator Dashboard
**Steps:**
1. Login as `creator1@bypass.com`
2. Navigate to More → Creator Tools → Creator Dashboard

**Expected:**
- Metrics display (mock data):
  - Total Views: ~15K
  - Total Saves: ~1.8K
  - Engagement Rate: ~18.5%
  - This Month: $275.00
- Quick Actions cards:
  - My Campaigns (shows active count)
  - Earnings (shows available balance)
  - Analytics
- Recent Activity feed with 3 items
- Pull-to-refresh works

### 3. My Campaigns Testing

#### Test 3.1: Browse Available Campaigns
**Steps:**
1. Login as any creator account
2. Navigate to My Campaigns
3. Click "Available" tab

**Expected:**
- List of 5 sample campaigns
- Each card shows:
  - Restaurant name and image
  - Campaign title
  - Location and deadline
  - Payout amount ($50-$100)
- Tap campaign for full details

#### Test 3.2: Apply to Campaign
**Steps:**
1. Select any available campaign
2. Tap to view details
3. Click "Apply to Campaign"
4. Enter application note
5. Submit application

**Expected:**
- Application modal appears
- Text area for application note
- Submit button disabled until note entered
- After submission:
  - Campaign moves to "Pending" tab
  - Success feedback

#### Test 3.3: Track Active Campaign
**Steps:**
1. View "Active" tab (mock data)
2. See deliverables checklist
3. Tap checkboxes to mark complete

**Expected:**
- Deliverables show as checklist
- Checkboxes are interactive
- Completed items show strikethrough
- Progress saves

#### Test 3.4: Filter and Search
**Steps:**
1. Tap filter icon
2. Try different tabs
3. Pull to refresh

**Expected:**
- Tabs switch content correctly
- Empty states for tabs with no data
- Refresh updates data

### 4. Earnings Testing

#### Test 4.1: View Earnings Summary
**Steps:**
1. Navigate to Earnings screen
2. Review summary cards

**Expected:**
- Available Balance (green highlight)
- This Month earnings
- Pending amount
- Lifetime total
- If balance < $25: info message about minimum
- If balance >= $25: "Request Payout" button

#### Test 4.2: Earnings History
**Steps:**
1. Scroll to Earnings History section
2. Review transaction list
3. Check status badges

**Expected:**
- Each earning shows:
  - Campaign name
  - Restaurant name
  - Date
  - Amount
  - Status (Pending/Available/Paid)
- Color coding:
  - Green: Paid
  - Blue: Available
  - Amber: Processing
  - Gray: Pending

#### Test 4.3: Request Payout (Mock)
**Steps:**
1. Ensure balance >= $25
2. Tap "Request Payout"
3. Review payout details
4. Confirm request

**Expected:**
- Modal shows payout amount
- Bank account placeholder
- Processing time (2-3 days)
- Confirmation message after submit

#### Test 4.4: Filter Earnings
**Steps:**
1. Tap filter icon
2. Select date range (30d, 90d, all)
3. Apply filter

**Expected:**
- Filter modal appears
- Selected range highlighted
- List updates based on filter
- Filter persists until changed

#### Test 4.5: Export Earnings
**Steps:**
1. Tap download icon
2. Confirm export

**Expected:**
- Export confirmation dialog
- Mock success message
- (Actual CSV export not implemented)

### 5. Creator Analytics Testing

#### Test 5.1: Overview Metrics
**Steps:**
1. Navigate to Analytics
2. View Overview tab
3. Change time period (7d, 30d, 90d)

**Expected:**
- 4 metric cards with values and trends
- Green up arrows for positive trends
- Time period selector updates all metrics
- Chart placeholder visible

#### Test 5.2: Content Performance
**Steps:**
1. Switch to Content tab
2. Review top performing content

**Expected:**
- List of content items
- Each shows:
  - Name and type
  - Views, Saves, Engagement %
- Sorted by performance

#### Test 5.3: Audience Insights
**Steps:**
1. Switch to Audience tab
2. Review demographics

**Expected:**
- Total followers with growth %
- Age distribution bars
- Top locations list
- Peak engagement times
- All data is mock but realistic

#### Test 5.4: Campaign Analytics
**Steps:**
1. Switch to Campaigns tab
2. Review campaign performance

**Expected:**
- Campaign cards with metrics
- Impressions, Engagements, Earnings
- ROI Score calculation
- Historical campaign data

### 6. Navigation & Integration

#### Test 6.1: More Tab Integration
**Steps:**
1. Login as creator account
2. Check More tab layout

**Expected:**
- User info at top
- "Content Creator" badge
- Creator Tools section with 4 options:
  - Creator Dashboard
  - My Campaigns
  - Earnings
  - Creator Analytics
- All navigate correctly

#### Test 6.2: Deep Navigation
**Steps:**
1. From Dashboard, tap quick actions
2. Navigate between screens
3. Use back navigation

**Expected:**
- Quick actions navigate correctly
- Back button returns to previous screen
- Tab states preserved

### 7. Error States & Edge Cases

#### Test 7.1: Network Error
**Steps:**
1. Turn on airplane mode
2. Try to load any creator screen
3. Pull to refresh

**Expected:**
- Error message appears
- Retry option available
- Cached data shown if available

#### Test 7.2: Empty States
**Steps:**
1. Check each tab/screen for empty state

**Expected:**
- Appropriate empty state messages
- Helpful action buttons
- Icons and descriptions

#### Test 7.3: Loading States
**Steps:**
1. Navigate to each screen
2. Observe initial load

**Expected:**
- Loading spinner appears
- Smooth transition to content
- No layout shift

## Performance Checklist

- [ ] Screens load within 2 seconds
- [ ] Pull-to-refresh responds immediately
- [ ] Modals open/close smoothly
- [ ] Tab switches are instant
- [ ] Scrolling is smooth (60 fps)
- [ ] No memory leaks on navigation

## Accessibility Checklist

- [ ] All text is readable (contrast)
- [ ] Touch targets >= 44x44 points
- [ ] Screen reader compatible (labels)
- [ ] Keyboard navigation works
- [ ] Error messages are clear

## Device Testing Matrix

Test on:
- [ ] iPhone 15 Pro
- [ ] iPhone SE
- [ ] iPhone 12 mini
- [ ] Android Pixel 7
- [ ] Android Samsung S23

## Known Issues & Limitations

1. **Charts:** Currently show placeholders
2. **Export:** Mock implementation only
3. **Stripe:** Payment setup is mocked
4. **Real-time:** Updates require refresh
5. **Analytics:** Using mock data

## Bug Reporting

When reporting issues, include:
1. Test account used
2. Screen/feature affected
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots if applicable
6. Device and OS version

## Success Criteria

All tests pass when:
- ✅ All qualified users can complete onboarding
- ✅ Unqualified users are properly blocked
- ✅ All 4 creator screens load and display data
- ✅ Navigation between screens works
- ✅ Mock data appears realistic
- ✅ Empty states are helpful
- ✅ Error states are handled
- ✅ Pull-to-refresh works everywhere
- ✅ Modals open and close properly
- ✅ Performance is acceptable