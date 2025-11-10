# Test Data Created Summary

## Overview
This document summarizes all test data created for the Pending State system implementation in the React Native app.

## Database Tables Created

### 1. restaurant_claims
- Stores restaurant ownership claims
- Status workflow: pending → approved/rejected
- Links users to restaurants upon approval

### 2. creator_applications
- Manages creator program applications
- Status workflow: pending → approved/rejected
- Creates creator profile upon approval

### 3. review_logs
- Audit trail for all review actions
- Immutable log of who reviewed what and when
- Includes action metadata and notes

### 4. notifications
- In-app notifications for users
- Tracks read status and expiration
- Related entity linking for context

### 5. notification_emails
- Email queue for async processing
- Template-based email system
- Retry logic for failed sends

### 6. push_tokens
- Device tokens for push notifications
- Platform-specific (iOS/Android/Web)
- Active/inactive state management

## Views Created

### pending_review_queue
Combined view showing all pending claims and applications with user details for admin review dashboard.

### notification_counts
Real-time aggregated view of unread notification counts per user.

## Services Implemented

### AdminReviewService
Location: `/services/adminReviewService.ts`
- Handles all admin review operations
- Approval and rejection workflows
- Bulk operations support
- Review statistics and logging

### StatusNotificationService
Location: `/services/statusNotificationService.ts`
- Manages all notification types
- Email, push, and in-app notifications
- Batch notification support

### RestaurantClaimService
Location: `/services/restaurantClaimService.ts`
- Handles restaurant claim submissions
- Validation and verification
- Status checking

### CreatorApplicationService
Location: `/services/creatorApplicationService.ts`
- Manages creator applications
- Social media verification
- Application status tracking

## UI Components Created (React Native)

### Admin Screens
- `/app/admin/reviews.tsx` - Admin review screen with:
  - Pull-to-refresh ScrollView
  - Filter tabs (All/Restaurants/Creators)
  - Expandable queue items
  - Review modal for approve/reject
  - Native alerts and loading states

### User Screens
- `/app/my-submissions.tsx` - User submissions screen with:
  - Pull-to-refresh functionality
  - Expandable submission cards
  - Status badges (pending/approved/rejected)
  - Resubmission actions
  - Empty state for no submissions

### Shared Components
- `/components/PendingSubmissionSuccessNative.tsx` - React Native success screen
- Inline components for cards, modals, and filters

### Navigation Integration
- Updated `/app/(tabs)/more.tsx` with:
  - Admin Tools section for admins
  - My Submissions link for all users
  - Entry points to claim/application flows

## Migration Files

### 20250116_add_pending_state_system.sql
- Creates core tables for pending state
- Adds review workflow tables
- Creates necessary indexes and constraints

### 20250116_add_notification_tables.sql
- Creates notification system tables
- Adds email queue and push token storage
- Implements cleanup functions

## Test Accounts (Direct Auth - Bypass OTP)

### Admin Accounts
```
Admin 1:
  Email: admin@troodie.test
  Password: Admin123!
  ID: admin-test-001
  Features: Full admin access, review queue, "Admin Tools" section in More tab

Admin 2:
  Email: reviewer@troodie.test
  Password: Reviewer123!
  ID: admin-test-002
  Features: Admin review permissions, can approve/reject submissions
```

### Test User Accounts
```
Restaurant Owner:
  Email: owner@restaurant.test
  Password: Owner123!
  ID: user-test-001
  Purpose: Test restaurant claims, view My Submissions

Content Creator:
  Email: creator@social.test
  Password: Creator123!
  ID: user-test-002
  Purpose: Test creator applications, track submission status
```

### Account Creation SQL
```sql
-- Creates auth.users entries with encrypted passwords (bypasses OTP)
-- No email verification needed - instant login capability
-- Full SQL available in pending-state-testing-guide.md

-- Example for admin account:
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'admin-test-001',
  'admin@troodie.test',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"account_type": "admin", "is_admin": true}'
);
```

### Test Restaurant Claim
```javascript
{
  id: 'claim-001',
  user_id: 'owner-001',
  restaurant_id: 'rest-001',
  ownership_proof_type: 'business_email',
  email: 'owner@restaurant.com',
  status: 'pending',
  submitted_at: '2025-01-16T10:00:00Z'
}
```

### Test Creator Application
```javascript
{
  id: 'app-001',
  user_id: 'creator-001',
  instagram_handle: '@foodie',
  follower_count: 10000,
  content_categories: ['food', 'restaurant_reviews'],
  status: 'pending',
  submitted_at: '2025-01-16T11:00:00Z'
}
```

## Service Methods (No REST API)

### Admin Review Service Methods
```typescript
// Direct service calls from React Native screens
adminReviewService.getPendingReviews(filters)
adminReviewService.approveRestaurantClaim(id, request)
adminReviewService.approveCreatorApplication(id, request)
adminReviewService.rejectRestaurantClaim(id, request)
adminReviewService.rejectCreatorApplication(id, request)
```

### User Service Methods
```typescript
// Restaurant claims
restaurantClaimService.submitRestaurantClaim(request)
restaurantClaimService.getClaimStatus(claimId)

// Creator applications
creatorApplicationService.submitCreatorApplication(request)
creatorApplicationService.getApplicationStatus(appId)

// Direct Supabase queries for submissions
supabase.from('restaurant_claims').select()
supabase.from('creator_applications').select()
```

## Environment Variables Required
```bash
# Notification Services
RESEND_API_KEY=your_resend_key
PUSH_NOTIFICATION_SERVER_KEY=your_fcm_key
EXPO_PUSH_TOKEN=your_expo_token

# Admin Configuration
ADMIN_REVIEW_NOTIFICATION_EMAIL=admin@troodie.com
REVIEW_SLA_HOURS=48
```

## Mobile App Testing Flow (React Native)

### Admin Testing Flow
```
1. Login as admin@troodie.test (Password: Admin123!)
2. Navigate to More tab (bottom navigation)
3. "Admin Tools" section appears at top (red shield icon)
4. Tap "Review Queue" to open /app/admin/reviews.tsx
5. Use filter tabs to view All/Restaurants/Creators
6. Tap queue items to expand details
7. Tap "Review" to open modal
8. Select Approve/Reject with optional notes
9. Verify success alert and queue refresh
10. Check notifications sent to users
```

### User Testing Flow
```
1. Login as owner@restaurant.test (Password: Owner123!)
2. Navigate to More tab
3. Under "Growth Opportunities":
   - Tap "Claim Your Restaurant" → /business/claim
   - OR tap "Become a Creator" → /creator/onboarding
4. Complete submission flow
5. View PendingSubmissionSuccessNative component:
   - Clock icon with "Pending Review" badge
   - Timeline shows "24-48 hours"
   - "Track Status" button → /my-submissions
6. In "My Submissions" screen:
   - See all submissions with status badges
   - Tap cards to expand details
   - Pull down to refresh status
7. After admin review:
   - Status updates to approved/rejected
   - Rejection shows reason and resubmit option
```

### Creator Testing Flow
```
1. Login as creator@social.test
2. Go to More tab
3. Tap "Become a Creator"
4. Complete application
5. Track in "My Submissions"
```

### Cleanup Test Data
```sql
-- Remove test accounts and related data
DELETE FROM public.review_logs
  WHERE actor_id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');

DELETE FROM public.notifications
  WHERE user_id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');

DELETE FROM public.restaurant_claims
  WHERE user_id IN ('user-test-001', 'user-test-002');

DELETE FROM public.creator_applications
  WHERE user_id IN ('user-test-001', 'user-test-002');

DELETE FROM public.users
  WHERE id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');

DELETE FROM auth.users
  WHERE id IN ('admin-test-001', 'admin-test-002', 'user-test-001', 'user-test-002');
```

## Performance Benchmarks (Mobile)

### Target Response Times
- App launch to More tab: < 2 seconds
- Queue load with pull-to-refresh: < 3 seconds for 100 items
- Single approval with modal: < 1 second
- Bulk operation (10 items): < 5 seconds
- Modal open/close animation: < 500ms
- Notification delivery: < 500ms
- Card expansion animation: < 300ms

### Database Indexes Created
- `idx_restaurant_claims_status` - Fast status filtering
- `idx_creator_applications_status` - Fast status filtering
- `idx_notifications_user_read` - Quick unread counts
- `idx_review_logs_entity` - Audit trail queries

## Security Considerations

### RLS Policies
- Users can only view their own submissions
- Admin access required for review operations
- Notifications scoped to user
- Review logs append-only

### Data Validation
- Email format validation
- Phone number format validation
- Follower count minimum thresholds
- Rejection reason required

## Known Issues & TODOs

### Future Enhancements
- [ ] Email service integration (currently using queue table)
- [ ] Push notification service integration
- [ ] SMS notifications
- [ ] Review assignment system
- [ ] SLA tracking and alerts
- [ ] Analytics dashboard

### Technical Debt
- [ ] Add comprehensive error logging
- [ ] Implement retry logic for failed notifications
- [ ] Add integration tests
- [ ] Optimize bulk operations for 100+ items
- [ ] Add caching for frequently accessed data

## Documentation

### Created Documents
1. `/docs/backend-design.md` - Updated with pending state tables
2. `/docs/pending-state-implementation.md` - Implementation guide
3. `/docs/pending-state-testing-guide.md` - Testing procedures
4. `/docs/test-data-created-summary.md` - This document

### Implementation Status

#### Completed Tasks
- ✅ `task-ps-006-admin-review-endpoints.md` - Admin review service integrated
- ✅ `task-ps-007-admin-review-queue.md` - React Native admin UI created
- ✅ `task-ps-008-pending-state-ui.md` - User submission tracking UI
- ✅ `task-ps-009-status-notifications.md` - Notification service integrated

#### Key React Native Implementation Details
- **No REST API**: Direct Supabase integration via services
- **Components**: View, Text, TouchableOpacity, ScrollView, Modal
- **Navigation**: Expo Router with file-based routing
- **Styling**: StyleSheet.create() with React Native styles
- **Interactions**:
  - Pull-to-refresh with RefreshControl
  - TouchableOpacity for all tappable elements
  - Native Alert for confirmations
  - Modal slides up from bottom
- **Icons**: @expo/vector-icons (Ionicons)
- **State Management**: React hooks (useState, useEffect)

#### Testing Requirements
- **iOS**: Simulator (iPhone 12+ with iOS 14+)
- **Android**: Emulator (Pixel 4+ with Android 11+)
- **Development**: Expo SDK 49+ with TypeScript
- **Authentication**: Test accounts bypass OTP for instant login
- **Backend**: Supabase connection required
- **Tools**:
  - Expo Go app for device testing
  - React Native Debugger for debugging
  - Flipper for network inspection


  OLD FILE:

  # Test Data Creation Summary

## ✅ Successfully Created Test Data

### 🎨 Creator Dashboard & Analytics Test Scenarios (Added 2025-01-13)

#### Creator Dashboard Testing
1. **New Creator Empty State**
   - Login as `consumer1@bypass.com` after upgrading to creator
   - Dashboard should show welcome message and tips to get started
   - All metrics should be at 0

2. **Active Creator with Metrics**
   - Login as `creator1@bypass.com` or `creator2@bypass.com`
   - Dashboard should display mock metrics:
     - Total views: 15K+
     - Total saves: 1.8K+
     - Engagement rate: 18.5%
     - Current month earnings: $275
   - Quick actions should navigate to respective screens

#### My Campaigns Testing
1. **Browse Available Campaigns**
   - Any creator account can view "Available" tab
   - Should see 5 sample campaigns from migration
   - Filter by location, payout amount

2. **Apply to Campaign**
   - Select any available campaign
   - Submit application with note
   - Campaign moves to "Pending" tab

3. **Track Deliverables** (Mock)
   - Active tab shows campaigns with checkable deliverables
   - Mark items as complete to track progress

#### Earnings Testing
1. **View Earnings Summary**
   - Creator accounts show mock earnings data
   - Available balance, pending, and lifetime totals
   - Minimum $25 for payout eligibility

2. **Request Payout** (Mock)
   - If balance >= $25, payout button enabled
   - Shows Stripe Connect setup prompt
   - Mock payout request flow

3. **Export Earnings**
   - Download CSV option (mock implementation)
   - Filter by date range (30d, 90d, all)

#### Analytics Testing
1. **Performance Metrics**
   - View trends over different time periods (7d, 30d, 90d)
   - Mock data shows positive growth trends
   - Engagement rate calculations

2. **Content Performance**
   - Top performing content by views/saves
   - Per-item engagement metrics

3. **Audience Insights**
   - Demographics: age, location, interests
   - Peak engagement times
   - Follower growth trends

## ✅ Successfully Created Test Data

### 🎯 Creator Qualification Requirements
To become a creator, users must meet these thresholds:
- **40+ restaurant saves** (demonstrates platform engagement)
- **3+ boards created** (shows curation ability)
- **Profile photo uploaded** (professional presence)
- **5+ friend connections** (community involvement)

**Testing Note:** Consumer test accounts are configured with different activity levels to test both qualified and not-qualified user journeys.

### 📱 Test User Accounts

All test accounts use:
- **Email pattern:** `*@bypass.com`
- **OTP Code:** `000000`
- **Password:** Not needed (OTP bypass is active)

#### Consumer Accounts (Default Type)
| Email | Username | Account Type | Description | Qualifying Data |
|-------|----------|--------------|-------------|-----------------|
| `consumer1@bypass.com` | test_consumer_1 | consumer | New user, **NOT qualified yet** | 22 saves, 2 boards, 3 friends ❌ |
| `consumer2@bypass.com` | test_consumer_2 | consumer | Power user, **qualified for creator** | 52 saves, 7 boards, 15 friends ✅ |
| `consumer3@bypass.com` | test_consumer_3 | consumer | Active user, **qualified for creator** | 41 saves, 5 boards, 8 friends ✅ |

#### Creator Accounts
| Email | Username | Account Type | Features |
|-------|----------|--------------|----------|
| `creator1@bypass.com` | test_creator_1 | creator | • 5K followers<br>• Verified status<br>• Specialties: Restaurant Reviews, Food Photography |
| `creator2@bypass.com` | test_creator_2 | creator | • 8K followers<br>• Verified status<br>• Specialties: Travel Food, Street Food |

#### Business Owner Accounts
| Email | Username | Account Type | Restaurant Claimed |
|-------|----------|--------------|-------------------|
| `business1@bypass.com` | test_business_1 | business | The Rustic Table ✅ |
| `business2@bypass.com` | test_business_2 | business | Sakura Sushi ✅ |
| **`business_complete@bypass.com`** | **michael_rodriguez** | **business** | **Barcelona Wine Bar & Restaurant ✅** |

#### Multi-Role Account
| Email | Username | Account Type | Roles | Restaurant |
|-------|----------|--------------|-------|------------|
| `multi_role@bypass.com` | test_multi_role | business | Creator + Business Owner | Bella Vista Italian Kitchen ✅ |

---

### 🍽️ Test Restaurants Created

#### Claimed Restaurants (4)
| Restaurant Name | Owner | Location | Cuisine | Price |
|----------------|-------|----------|---------|-------|
| **The Rustic Table** | business1@bypass.com | Portland, OR | American, Farm-to-Table | $$$ |
| **Sakura Sushi** | business2@bypass.com | Seattle, WA | Japanese, Sushi | $$$$ |
| **Bella Vista Italian Kitchen** | multi_role@bypass.com | San Francisco, CA | Italian, Pizza | $$$ |
| **Barcelona Wine Bar & Restaurant** | business_complete@bypass.com | Charlotte, NC | Spanish, Tapas | $$$ |

#### Unclaimed Restaurants (10+)
Available for testing the claiming flow:
- Taco Libre (Austin, TX) - Mexican, $$
- The Green Garden (Los Angeles, CA) - Vegetarian/Vegan, $$$
- Bombay Spice House (Chicago, IL) - Indian, $$
- Le Petit Bistro (New York, NY) - French, $$$$
- Dragon Palace (Boston, MA) - Chinese, $$$
- BBQ Pit Master (Nashville, TN) - BBQ, $$
- Pho Saigon (Houston, TX) - Vietnamese, $
- Mediterranean Mezze (Miami, FL) - Mediterranean, $$$
- Seoul Kitchen (Denver, CO) - Korean, $$$
- The Breakfast Club (Phoenix, AZ) - American Breakfast, $$

---

## 🧪 Testing Scenarios

### Scenario 1: Consumer NOT Qualified Testing
**Test Account:** `consumer1@bypass.com` (John Smith)

**Current Activity (Below Requirements):**
- ❌ 22 restaurant saves (needs 40+)
- ❌ 2 boards created (needs 3+)
- ✅ Profile photo uploaded
- ❌ 3 friend connections (needs 5+)

1. **Sign In:**
   ```
   Email: consumer1@bypass.com
   OTP Code: 000000
   ```

2. **Test Creator Onboarding (Not Qualified Path):**
   - Navigate to **More** tab
   - Tap **"Become a Creator"** (should be visible)
   - **Step 1**: Value proposition screen
   - **Step 2**: Qualification check shows:
     - Red X's for unmet requirements
     - Message: "Almost there! Keep saving restaurants"
     - Shows what's needed to qualify
   - Can still continue but sees encouragement to be more active first

### Scenario 2: Consumer Qualified Testing
**Test Account:** `consumer2@bypass.com` (Jane Doe)

**Pre-qualified Data:**
- ✅ 52 restaurant saves (exceeds 40 minimum)
- ✅ 7 boards created (Vegan, International, Budget, etc.)
- ✅ Profile photo uploaded
- ✅ 15 friend connections

1. **Sign In:**
   ```
   Email: consumer2@bypass.com
   OTP Code: 000000
   ```

2. **Test Creator Onboarding (Qualified Path):**
   - Navigate to **More** tab
   - Tap **"Become a Creator"** (should be visible)
   - **Step 1**: Value proposition screen
   - **Step 2**: Qualification check shows all green checks ✅
   - **Step 3**: Upload 3-5 portfolio photos
   - Complete setup → Account type changes to "creator"

3. **Verify Consumer Features:**
   - Navigate to **More** tab
   - Should see "Food Explorer" badge
   - Should see "Grow with Troodie" section with:
     - "Become a Creator" option (BETA badge)
     - "Claim Your Restaurant" option
   - Can explore and save restaurants
   - Can create posts and reviews

3. **Expected More Tab Structure:**
   ```
   Profile Card
   └── Test Consumer One
       └── Food Explorer badge
   
   Grow with Troodie
   ├── Become a Creator (BETA)
   └── Claim Your Restaurant
   
   Account & Settings
   └── [Standard options]
   ```

---

### Scenario 2: Creator Upgrade Flow
**Test Account:** `consumer2@bypass.com`

1. **Sign In as Consumer:**
   ```
   Email: consumer2@bypass.com
   OTP Code: 000000
   ```

2. **Upgrade to Creator:**
   - Go to More tab
   - Tap "Become a Creator"
   - Complete creator onboarding
   - Fill in specialties and social links

3. **Verify Creator Features:**
   - Profile badge changes to "Content Creator"
   - New "Creator Tools" section appears with:
     - Creator Dashboard
     - My Campaigns
     - Earnings
     - Creator Analytics

4. **Expected More Tab After Upgrade:**
   ```
   Profile Card
   └── Test Consumer Two
       └── Content Creator badge
   
   Creator Tools (NEW)
   ├── Creator Dashboard
   ├── My Campaigns
   ├── Earnings
   └── Creator Analytics
   
   Grow with Troodie
   └── Claim Your Restaurant (only option left)
   ```

---

### Scenario 3: Business Claiming Flow
**Test Account:** `consumer3@bypass.com`

1. **Sign In as Consumer:**
   ```
   Email: consumer3@bypass.com
   OTP Code: 000000
   ```

2. **Claim a Restaurant:**
   - Go to More tab
   - Tap "Claim Your Restaurant"
   - Search for an unclaimed restaurant (e.g., "Taco Libre")
   - Complete verification process
   - Provide business information

3. **Verify Business Features:**
   - Profile badge changes to "Business Owner"
   - New "Business Tools" section appears with:
     - Business Dashboard
     - Manage Campaigns
     - Analytics
     - Restaurant Settings

4. **Expected More Tab After Claiming:**
   ```
   Profile Card
   └── Test Consumer Three
       └── Business Owner badge
   
   Business Tools (NEW)
   ├── Business Dashboard - Taco Libre
   ├── Manage Campaigns
   ├── Analytics
   └── Restaurant Settings
   
   [Growth section disappears - no more upgrades]
   ```

---

### Scenario 4: Multi-Role User Testing
**Test Account:** `multi_role@bypass.com`

1. **Sign In:**
   ```
   Email: multi_role@bypass.com
   OTP Code: 000000
   ```

2. **Verify Both Role Sections:**
   - Should see BOTH Creator Tools and Business Tools
   - Business Tools appears first (higher priority)
   - All features from both roles accessible

3. **Expected More Tab Structure:**
   ```
   Profile Card
   └── Test Multi Role User
       └── Business Owner badge (highest level)
   
   Business Tools
   ├── Business Dashboard - Bella Vista Italian Kitchen
   ├── Manage Campaigns
   ├── Analytics
   └── Restaurant Settings
   
   Creator Tools
   ├── Creator Dashboard
   ├── My Campaigns
   ├── Earnings
   └── Creator Analytics
   
   [No Growth section - already at highest level]
   ```

---

### Scenario 5: Existing Creator Account Testing
**Test Account:** `creator1@bypass.com`

1. **Sign In:**
   ```
   Email: creator1@bypass.com
   OTP Code: 000000
   ```

2. **Verify Creator Profile:**
   - Already has creator status
   - Has 5,000 followers in metrics
   - Specialties: Restaurant Reviews, Food Photography, Local Cuisine
   - Can still claim a restaurant to become multi-role

---

### Scenario 6: Existing Business Account Testing
**Test Account:** `business1@bypass.com`

1. **Sign In:**
   ```
   Email: business1@bypass.com
   OTP Code: 000000
   ```

2. **Verify Business Profile:**
   - Owns "The Rustic Table"
   - Has full management permissions
   - Restaurant shows as claimed and verified
   - Business Dashboard shows restaurant name

---

### Scenario 7: Complete Business Account Testing (Full Data)
**Test Account:** `business_complete@bypass.com` (Michael Rodriguez)

**This account has comprehensive test data for all business features:**

1. **Sign In:**
   ```
   Email: business_complete@bypass.com
   OTP Code: 000000
   ```

2. **Restaurant Details:**
   - **Name**: Barcelona Wine Bar & Restaurant
   - **Location**: Charlotte, NC
   - **Cuisine**: Spanish, Tapas
   - **Verified**: ✅ Yes

3. **Campaigns Data (5 Total):**
   - **Active Campaigns (2)**:
     - Summer Tapas Festival: $500 budget, 3/5 creators, ends in 15 days
     - Happy Hour Spotlight: $300 budget, 2/3 creators, ends in 25 days
   - **Pending Campaign (1)**:
     - Wine Tasting Event: $1000 budget, not started
   - **Completed Campaigns (2)**:
     - Grand Opening Campaign: $800 spent, 5 creators, 10 content pieces
     - Valentine's Special: $400 spent, 2 creators, 5 content pieces

4. **Applications (6 Total)**:
   - 3 Accepted (actively working)
   - 2 Pending (awaiting review)
   - 1 Rejected

5. **Analytics Data:**
   - **Total Spend**: $2,850
   - **Total Creators**: 8 unique creators
   - **Content Delivered**: 7 portfolio items
   - **Total Engagement**: 52,900+ views, 6,320+ likes
   - **Top Performing Content**: Grand Opening reel (15,000 views)
   - **Top Creator**: Emma Johnson (28,900 total views)

6. **Dashboard Metrics:**
   - Active Campaigns: 2
   - Pending Applications: 2 (with red badge)
   - Monthly Spend: $800
   - Total Creators: 8

7. **Test Content Gallery:**
   - Photos, Reels, and Stories
   - Various engagement levels (500-15,000 views)
   - Multiple restaurants featured

**Testing Points:**
- ✅ Full campaign lifecycle (pending → active → completed)
- ✅ Multiple application statuses
- ✅ Rich analytics data with real metrics
- ✅ Content portfolio with engagement
- ✅ Budget tracking and spending
- ✅ Creator performance metrics

---

## 🔍 Database Verification Queries

### Check All Test Users
```sql
SELECT 
    email,
    account_type,
    CASE 
        WHEN is_creator THEN '✓' ELSE '✗'
    END as is_creator,
    CASE 
        WHEN is_restaurant THEN '✓' ELSE '✗'
    END as is_business
FROM users 
WHERE email LIKE '%@bypass.com'
ORDER BY 
    CASE account_type 
        WHEN 'business' THEN 1
        WHEN 'creator' THEN 2
        WHEN 'consumer' THEN 3
    END,
    email;
```

### Check Creator Profiles
```sql
SELECT 
    u.email,
    cp.verification_status,
    cp.specialties,
    cp.metrics->>'followers' as followers
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE '%@bypass.com';
```

### Check Business Profiles
```sql
SELECT 
    u.email,
    r.name as restaurant_name,
    bp.verification_status,
    r.is_claimed,
    r.is_verified
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email LIKE '%@bypass.com';
```

### Check Available Restaurants for Claiming
```sql
SELECT 
    name,
    city,
    state,
    cuisine_types[1] as primary_cuisine,
    price_range
FROM restaurants 
WHERE website LIKE '%.test' 
    AND is_claimed = false
ORDER BY name;
```

---

## 🎯 Key Testing Points

### Authentication
- ✅ All accounts use `@bypass.com` pattern
- ✅ OTP code `000000` works for all test accounts
- ✅ No email verification needed

### Account Types
- ✅ Consumer accounts show "Food Explorer" badge
- ✅ Creator accounts show "Content Creator" badge
- ✅ Business accounts show "Business Owner" badge
- ✅ Multi-role shows highest level badge (Business Owner)

### More Tab Sections
- ✅ Growth section only shows for non-maxed accounts
- ✅ Creator Tools only shows for creators
- ✅ Business Tools only shows for business owners
- ✅ Multi-role users see both tool sections

### Permissions
- ✅ Consumers can't access creator/business features
- ✅ Creators can't access business features (unless multi-role)
- ✅ Business owners have full restaurant management
- ✅ Account downgrades are prevented

---

## 🛠️ Troubleshooting

### If login fails with "Test account not found"
- The auth bypass is working but the user doesn't exist in the database
- Re-run the SQL seeding script

### If OTP code 000000 doesn't work
- Check that `services/authService.ts` has the bypass logic for `@bypass.com` emails
- Verify the bypass pattern is active in the code

### If More tab doesn't show expected sections
- Check the account type in the database
- Verify creator_profiles or business_profiles exist for the user
- Check that the migration has been run

### If restaurant claiming fails
- Ensure the restaurant exists and is not already claimed
- Check that business_profiles table is properly set up
- Verify the user doesn't already have a business profile

---

## 🧹 Cleanup

To remove all test data:

```sql
-- Remove test data in order (respects foreign keys)
DELETE FROM portfolio_items WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com'));
DELETE FROM campaign_applications WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com'));
DELETE FROM campaigns WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM board_restaurants WHERE board_id IN (SELECT id FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com'));
DELETE FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM users WHERE email LIKE '%@bypass.com';
DELETE FROM restaurants WHERE website LIKE '%.test';
```

---

## 🎯 Business Management Screens Test Scenarios (Added 2025-01-13)

All business management screens have been implemented and are accessible through the business dashboard and navigation. Test with the `business_complete@bypass.com` account for comprehensive data.

### Restaurant Settings Screen
**Test Path:** Business Dashboard → Settings Icon (top-right) → Restaurant Settings

**Test Scenarios:**
1. **View Restaurant Information**
   - Display restaurant cover photo, name, address, verification status
   - Show contact information (phone, website, business email)
   - Display campaign preferences and notification settings

2. **Edit Restaurant Details**
   - Toggle edit mode to modify phone and website
   - Update business email and role
   - Save changes successfully

3. **Campaign Preferences**
   - Toggle auto-approve verified creators setting
   - Enable/disable campaign notification alerts
   - Settings persist after save

4. **Danger Zone Actions**
   - Transfer ownership option (shows contact support alert)
   - Remove restaurant claim option (shows confirmation dialog)

### Create Campaign Screen
**Test Path:** Business Dashboard → "Create Campaign" button OR Manage Campaigns → "+" button

**Test Scenarios:**
1. **Step-by-Step Campaign Creation**
   - **Step 1**: Enter campaign title, description, brand guidelines
   - **Step 2**: Set budget, deadline, posting schedule
   - **Step 3**: Add deliverables (Instagram posts, stories, reels, etc.)
   - **Step 4**: Select content types and target audience

2. **Form Validation**
   - Cannot proceed without required fields in each step
   - Step indicator shows progress and completion status
   - Previous/Next navigation works correctly

3. **Deliverables Management**
   - Add multiple deliverable types with descriptions and quantities
   - Remove deliverables before submission
   - Various deliverable types available (Instagram Post, Reel, YouTube Video, etc.)

4. **Campaign Submission**
   - Creates campaign successfully with all data
   - Redirects back to campaigns list
   - Campaign appears in active status

### Browse/Find Creators Screen
**Test Path:** Business Dashboard → "Find Creators" button

**Test Scenarios:**
1. **Creator Discovery**
   - Browse list of available creators with profiles
   - View creator stats (followers, engagement, rating, completed campaigns)
   - See creator portfolios with recent posts

2. **Search and Filtering**
   - Search creators by name, username, or bio
   - Filter by content type (Food Photography, Video Reviews, etc.)
   - Sort by rating, followers, engagement, or price range

3. **Creator Profiles**
   - Detailed creator information with bio and social links
   - Performance metrics and statistics
   - Recent work samples with engagement data
   - Contact creator functionality

4. **Advanced Filters**
   - Filter by location (NYC, LA, Chicago, etc.)
   - Filter by budget range
   - Toggle between different sorting options

### Applications Management Screen
**Test Path:** Business Dashboard → "View Applications" OR More tab → Applications

**Test Scenarios:**
1. **Application Overview**
   - List all applications with status filters (All, Pending, Accepted, Rejected, Completed)
   - Show application details (creator info, campaign, proposed rate, reach estimates)
   - Display urgency indicators (high, medium, low priority)

2. **Application Review**
   - Accept or reject applications directly from list view
   - Filter applications by status
   - Sort by performance score, date, or urgency

3. **Bulk Actions**
   - Multiple application management
   - Status counts for each filter tab
   - Quick decision making interface

### Application Detail Screen
**Test Path:** Applications list → Tap any application

**Test Scenarios:**
1. **Detailed Application View**
   - Full creator profile with social links and statistics
   - Complete proposal text and project details
   - Deliverables breakdown with quantities
   - Timeline and additional notes

2. **Portfolio Review**
   - Creator's work samples with engagement metrics
   - Image and video content previews
   - Performance data for each piece

3. **Communication**
   - Send messages to creator
   - Ask questions about the proposal
   - Provide additional campaign details

4. **Application Actions**
   - Accept application (shows confirmation)
   - Reject application (shows confirmation)
   - Actions update application status immediately

### Content Gallery Screen
**Test Path:** Business Dashboard → "View Content" OR More tab → Business Tools → Content Gallery

**Test Scenarios:**
1. **Content Overview**
   - Grid and list view toggle
   - Filter by content type (photos/videos), platform, status
   - Search content by caption, campaign, or creator

2. **Content Management**
   - View content performance scores and engagement metrics
   - Filter by high-performing content
   - Platform-specific content (Instagram, TikTok, YouTube)

3. **Content Actions**
   - Download high-resolution content
   - Share content externally
   - Archive content when needed

### Content Detail Screen
**Test Path:** Content Gallery → Tap any content item

**Test Scenarios:**
1. **Comprehensive Content View**
   - Full-size content display with platform indicators
   - Creator information and campaign context
   - Complete engagement analytics

2. **Performance Analytics**
   - Detailed engagement metrics (likes, comments, shares, saves)
   - Reach and impression data
   - Performance score with recommendations

3. **Content Actions**
   - Download original content files
   - Share content across platforms
   - Approve content for posting
   - Archive content when necessary

4. **Analytics Insights**
   - Performance score explanations
   - Engagement rate calculations
   - Platform-specific metrics

### Creators Management Screen
**Test Path:** More tab → Business Tools → Creators Management

**Test Scenarios:**
1. **Creator Relationship Management**
   - View all creators by status (Active, Past, Favorites, Blacklisted)
   - Track creator performance across campaigns
   - See collaboration history and success rates

2. **Creator Actions**
   - Add creators to favorites
   - Blacklist problematic creators
   - Remove from blacklist when appropriate
   - Direct message creators

3. **Performance Tracking**
   - View creator metrics (rating, engagement, delivery rate)
   - See recent work and campaign performance
   - Track response rates and reliability

4. **Creator Discovery**
   - Browse new creators link to creator search
   - Manage existing relationships
   - Performance-based sorting and filtering

### Navigation and Integration Testing

**Test Navigation Flows:**
1. Dashboard → Settings → Restaurant Settings ✅
2. Dashboard → Create Campaign → Campaign Creation Flow ✅
3. Dashboard → Find Creators → Creator Browse ✅
4. Dashboard → Applications → Application Management ✅
5. Applications → Application Detail → Detailed Review ✅
6. Dashboard → Content → Content Gallery ✅
7. Content Gallery → Content Detail → Analytics View ✅
8. More Tab → Creators → Creator Management ✅

**Cross-Screen Integration:**
- All "Create Campaign" buttons lead to campaign creation flow
- All "Find Creators" buttons lead to creator browse screen
- Application counts and navigation work correctly
- Content and analytics data flows between screens

**Data Consistency:**
- Restaurant information shows consistently across screens
- Campaign data appears in relevant screens
- Creator information matches across different views
- Performance metrics align between screens

---

## 📝 Notes

- All test restaurants have `.test` domain websites for easy identification
- Test users have placeholder avatar URLs from ui-avatars.com
- Creator metrics are pre-populated with sample follower counts
- Business profiles have full management permissions array
- The system prevents account type downgrades automatically
- **Complete business test data** available at: `/supabase/seed/complete_business_test_data.sql`
- Run the seed script to create the `business_complete@bypass.com` account with full data
- **All business management screens implemented** - test with comprehensive navigation flows
- Mock data provides realistic testing scenarios for all business features