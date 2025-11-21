# Creator Marketplace Flow Diagram

## Overview
This document details the complete flow of the Creator Marketplace feature, specifically focusing on restaurant claiming and admin review processes.

---

## Admin Users

**Admin User IDs** (hardcoded in `services/adminReviewService.ts`):
- `b08d9600-358d-4be9-9552-4607d9f50227`
- `31744191-f7c0-44a4-8673-10b34ccbb87f`

**Additional Admin** (only in `app/(tabs)/more.tsx`):
- `a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599` (kouame@troodieapp.com)

**Note**: Admin access is checked by comparing the authenticated user's ID against this hardcoded list. There is no database role or flag system.

---

## Restaurant Claim Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESTAURANT CLAIM FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. USER INITIATES CLAIM
   │
   ├─> Navigate to: /business/claim
   │
   ├─> Beta Access Gate (BetaAccessGate component)
   │   ├─> Shows passcode prompt
   │   ├─> User enters passcode: '2468'
   │   └─> On success: Access granted
   │
   └─> Step 1: SEARCH RESTAURANT
       │
       ├─> User searches by restaurant name (min 2 chars)
       │
       ├─> Query: restaurants table
       │   └─> SELECT id, name, address, is_claimed, owner_id
       │       WHERE name ILIKE '%query%'
       │       LIMIT 10
       │
       ├─> Results displayed:
       │   ├─> Existing restaurants (if found)
       │   │   ├─> Shows: name, address
       │   │   └─> Badge if already claimed
       │   │
       │   └─> "Add New Restaurant" option
       │       └─> Creates new restaurant record if selected
       │
       └─> User selects restaurant OR adds new one
           │
           └─> Step 2: CONTACT INFORMATION
               │
               ├─> Form fields:
               │   ├─> Email Address * (required)
               │   └─> Phone Number (optional)
               │
               ├─> Validation:
               │   ├─> Email format check
               │   └─> Restaurant name required
               │
               └─> User clicks "Submit Claim"
                   │
                   └─> Step 3: SUBMIT CLAIM
                       │
                       ├─> Service: restaurantClaimService.submitRestaurantClaim()
                       │
                       ├─> Checks:
                       │   ├─> User authenticated?
                       │   ├─> Existing pending claim for this restaurant?
                       │   ├─> Restaurant already claimed by someone else?
                       │   └─> User already has approved claim?
                       │
                       ├─> If restaurant doesn't exist:
                       │   └─> INSERT INTO restaurants
                       │       (name, address, data_source: 'user')
                       │
                       └─> INSERT INTO restaurant_claims
                           │
                           ├─> user_id: current_user.id
                           ├─> restaurant_id: selected_restaurant.id
                           ├─> status: 'pending' ⭐
                           ├─> email: business_email || user.email
                           ├─> business_phone: phone (optional)
                           ├─> ownership_proof_type: 'other'
                           ├─> additional_notes: 'Claimed via mobile simplified flow'
                           └─> submitted_at: NOW()
                           │
                           └─> Step 4: PENDING STATE
                               │
                               ├─> UI shows success message:
                               │   ├─> "Claim Submitted Successfully!"
                               │   ├─> "Pending review - 24-48 hours"
                               │   └─> "What happens next?" info card
                               │
                               ├─> Claim now appears in:
                               │   └─> pending_review_queue view
                               │
                               └─> User redirected to More tab
```

---

## Admin Review Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN REVIEW FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. ADMIN ACCESS CHECK
   │
   ├─> Admin navigates to: More Tab
   │
   ├─> Admin check in more.tsx:
   │   └─> isAdmin = ADMIN_USER_IDS.includes(user.id)
   │
   ├─> If admin:
   │   └─> "Admin Tools" section appears at top
   │       │
   │       └─> Menu item: "Review Queue"
   │           ├─> Badge shows: pending count
   │           └─> Action: router.push('/admin/reviews')
   │
   └─> Admin clicks "Review Queue"
       │
       └─> 2. REVIEW QUEUE SCREEN
           │
           ├─> Screen: app/admin/reviews.tsx
           │
           ├─> Service: adminReviewService.getPendingReviews()
           │   │
           │   ├─> Admin check: requireAdmin()
           │   │   └─> Throws error if not in ADMIN_USER_IDS
           │   │
           │   └─> Query: SELECT * FROM pending_review_queue
           │       │
           │       └─> pending_review_queue VIEW:
           │           │
           │           ├─> UNION of:
           │           │   ├─> restaurant_claims (status='pending')
           │           │   │   JOIN users, restaurants
           │           │   │
           │           │   └─> creator_applications (status='pending')
           │           │       JOIN users
           │           │
           │           └─> Returns:
           │               ├─> type: 'restaurant_claim' | 'creator_application'
           │               ├─> id: claim/application id
           │               ├─> user_id, user_name, user_email
               │               ├─> status: 'pending'
           │               ├─> submitted_at
           │               └─> details: JSONB with type-specific data
           │
           ├─> UI displays:
           │   ├─> Filter tabs: All Types | Restaurants | Creators
           │   ├─> List of pending items:
           │   │   ├─> Expandable cards
           │   │   ├─> Shows: type badge, time ago, user info
           │   │   └─> Expand shows: details + "Review" button
           │   │
           │   └─> Pull-to-refresh support
           │
           └─> Admin clicks "Review" on an item
               │
               └─> 3. REVIEW MODAL
                   │
                   ├─> Component: ReviewModal (or inline modal in reviews.tsx)
                   │
                   ├─> Displays full details:
                   │   ├─> Type (Restaurant Claim / Creator Application)
                   │   ├─> Submitted by (name, email)
                   │   ├─> Submitted at (timestamp)
                   │   │
                   │   ├─> For Restaurant Claims:
                   │   │   ├─> Restaurant name
                   │   │   ├─> Proof type
                   │   │   ├─> Business email
                   │   │   └─> Business phone
                   │   │
                   │   └─> For Creator Applications:
                   │       ├─> Follower count
                   │       ├─> Platforms (Instagram, TikTok, etc.)
                   │       └─> Content categories
                   │
                   ├─> Action buttons:
                   │   ├─> Approve
                   │   └─> Reject
                   │
                   ├─> Optional fields:
                   │   ├─> Rejection reason (required if reject)
                   │   │   └─> Predefined options:
                   │   │       ├─> Insufficient proof of ownership
                   │   │       ├─> Information doesn't match records
                   │   │       ├─> Duplicate claim
                   │   │       ├─> Insufficient followers
                   │   │       ├─> Content quality below standards
                   │   │       ├─> Incomplete application
                   │   │       └─> Other (specify in notes)
                   │   │
                   │   └─> Internal notes (optional)
                   │
                   └─> Admin selects action and submits
                       │
                       ├─> IF APPROVE:
                       │   │
                       │   ├─> For Restaurant Claim:
                       │   │   │
                       │   │   ├─> Service: adminReviewService.approveRestaurantClaim()
                       │   │   │
                       │   │   ├─> Step 1: Update claim status
                       │   │   │   └─> UPDATE restaurant_claims
                       │   │   │       SET status = 'approved'
                       │   │   │       SET reviewed_at = NOW()
                       │   │   │       SET reviewed_by = admin.id
                       │   │   │       SET review_notes = notes
                       │   │   │
                       │   │   ├─> Step 2: Link restaurant to user
                       │   │   │   └─> UPDATE restaurants
                       │   │   │       SET owner_id = claim.user_id
                       │   │   │       SET claimed_at = NOW()
                       │   │   │
                       │   │   ├─> Step 3: Update user profile
                       │   │   │   └─> UPDATE users
                       │   │   │       SET is_restaurant = true
                       │   │   │       SET account_type = 'business'
                       │   │   │
                       │   │   ├─> Step 4: Create business profile
                       │   │   │   └─> INSERT INTO business_profiles
                       │   │   │       (user_id, restaurant_id, verification_status: 'verified', business_email)
                       │   │   │       IF NOT EXISTS
                       │   │   │
                       │   │   └─> Step 5: Send notification
                       │   │       └─> statusNotificationService.notifyStatusChange()
                       │   │           ├─> userId: claim.user_id
                       │   │           ├─> submissionType: 'restaurant_claim'
                       │   │           ├─> newStatus: 'approved'
                       │   │           └─> restaurantName: restaurant.name
                       │   │
                       │   └─> For Creator Application:
                       │       │
                       │       ├─> Service: adminReviewService.approveCreatorApplication()
                       │       │
                       │       ├─> Step 1: Update application status
                       │       │   └─> UPDATE creator_applications
                       │       │       SET status = 'approved'
                       │       │       SET reviewed_at = NOW()
                       │       │       SET reviewed_by = admin.id
                       │       │       SET review_notes = notes
                       │       │
                       │       ├─> Step 2: Update user profile
                       │       │   └─> UPDATE users
                       │       │       SET is_creator = true
                       │       │       SET account_type = 'creator'
                       │       │
                       │       ├─> Step 3: Create creator profile
                       │       │   └─> INSERT INTO creator_profiles
                       │       │       (user_id, instagram_handle, tiktok_handle, etc.)
                       │       │
                       │       └─> Step 4: Send notification
                       │           └─> statusNotificationService.notifyStatusChange()
                       │
                       └─> IF REJECT:
                           │
                           ├─> For Restaurant Claim:
                           │   │
                           │   ├─> Service: adminReviewService.rejectRestaurantClaim()
                           │   │
                           │   ├─> UPDATE restaurant_claims
                           │   │   SET status = 'rejected'
                           │   │   SET reviewed_at = NOW()
                           │   │   SET reviewed_by = admin.id
                           │   │   SET rejection_reason = reason
                           │   │   SET review_notes = notes
                           │   │   SET can_resubmit = true (default)
                           │   │
                           │   └─> Send notification
                           │       └─> statusNotificationService.notifyStatusChange()
                           │           ├─> newStatus: 'rejected'
                           │           └─> rejectionReason: reason
                           │
                           └─> For Creator Application:
                               │
                               ├─> Service: adminReviewService.rejectCreatorApplication()
                               │
                               └─> UPDATE creator_applications
                                   SET status = 'rejected'
                                   SET reviewed_at = NOW()
                                   SET reviewed_by = admin.id
                                   SET rejection_reason = reason
                                   SET review_notes = notes
                                   SET can_resubmit = true (default)
                                   └─> Send notification

4. POST-REVIEW
   │
   ├─> Claim/Application removed from pending_review_queue
   │   └─> (No longer status='pending')
   │
   ├─> Review action logged:
   │   └─> INSERT INTO review_logs
   │       (entity_type, entity_id, actor_id, action, status_before, status_after)
   │
   ├─> User receives notification:
   │   ├─> In-app notification
   │   └─> Email notification (if auto_notify=true)
   │
   └─> UI updates:
       ├─> Review queue refreshes
       ├─> Item removed from list
       └─> Success alert shown to admin
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE STRUCTURE                         │
└─────────────────────────────────────────────────────────────────┘

restaurant_claims
├─> id (UUID, PK)
├─> user_id (UUID, FK → users.id)
├─> restaurant_id (UUID, FK → restaurants.id)
├─> status: 'pending' | 'approved' | 'rejected'
├─> submitted_at (TIMESTAMP)
├─> reviewed_at (TIMESTAMP, nullable)
├─> reviewed_by (UUID, FK → auth.users.id, nullable)
├─> rejection_reason (TEXT, nullable)
├─> review_notes (TEXT, nullable)
├─> can_resubmit (BOOLEAN, default: true)
├─> email (TEXT) - business email
├─> business_phone (VARCHAR(20), nullable)
├─> ownership_proof_type: 'business_license' | 'utility_bill' | 'lease' | 'domain_match' | 'other'
├─> ownership_proof_url (TEXT, nullable)
└─> additional_notes (TEXT, nullable)

Indexes:
├─> idx_restaurant_claims_status
├─> idx_restaurant_claims_submitted
└─> idx_restaurant_claims_user_status

---

restaurants
├─> id (UUID, PK)
├─> name (TEXT)
├─> address (TEXT)
├─> owner_id (UUID, FK → users.id, nullable) ⭐ Set on approval
├─> claimed_at (TIMESTAMP, nullable) ⭐ Set on approval
├─> is_claimed (BOOLEAN, computed)
└─> data_source: 'user' | 'import' | 'api'

---

users
├─> id (UUID, PK)
├─> email (TEXT)
├─> name (TEXT)
├─> is_restaurant (BOOLEAN) ⭐ Set to true on approval
├─> is_creator (BOOLEAN)
└─> account_type: 'consumer' | 'creator' | 'business' ⭐ Set to 'business' on approval

---

business_profiles
├─> id (UUID, PK)
├─> user_id (UUID, FK → users.id)
├─> restaurant_id (UUID, FK → restaurants.id) ⭐ Created on approval
├─> verification_status: 'verified' ⭐ Set on approval
└─> business_email (TEXT)

---

pending_review_queue (VIEW)
├─> Combines restaurant_claims + creator_applications
├─> Filters: status = 'pending'
├─> Returns unified structure:
│   ├─> type: 'restaurant_claim' | 'creator_application'
│   ├─> id
│   ├─> user_id, user_name, user_email
│   ├─> status: 'pending'
│   ├─> submitted_at
│   └─> details: JSONB (type-specific data)
└─> Used by admin review queue UI

---

review_logs (Audit Trail)
├─> id (UUID, PK)
├─> entity_type: 'restaurant_claim' | 'creator_application'
├─> entity_id (UUID)
├─> actor_id (UUID, FK → auth.users.id) - admin who reviewed
├─> action: 'approve' | 'reject'
├─> status_before: 'pending'
├─> status_after: 'approved' | 'rejected'
├─> metadata (JSONB)
└─> created_at (TIMESTAMP)
```

---

## Key Files

```
┌─────────────────────────────────────────────────────────────────┐
│                         CODE FILES                              │
└─────────────────────────────────────────────────────────────────┘

User-Facing:
├─> app/business/claim.tsx
│   └─> 3-step claim flow (search → contact → pending)
│
├─> app/business/_layout.tsx
│   └─> Stack navigator for business routes
│
└─> components/BetaAccessGate.tsx
    └─> Beta passcode gate (passcode: '2468')

Admin-Facing:
├─> app/admin/reviews.tsx
│   └─> Main admin review queue screen
│
├─> components/admin/ReviewModal.tsx
│   └─> Modal for approve/reject actions
│
└─> app/(tabs)/more.tsx
    └─> Admin Tools section (shows for admin users only)

Services:
├─> services/restaurantClaimService.ts
│   ├─> submitRestaurantClaim()
│   ├─> getClaimStatus()
│   └─> canClaimRestaurant()
│
├─> services/adminReviewService.ts
│   ├─> getPendingReviews()
│   ├─> approveRestaurantClaim()
│   ├─> rejectRestaurantClaim()
│   ├─> approveCreatorApplication()
│   └─> rejectCreatorApplication()
│
└─> services/statusNotificationService.ts
    └─> notifyStatusChange() - sends notifications

Database:
└─> supabase/migrations/20250116_add_pending_state_system.sql
    ├─> Creates restaurant_claims columns
    ├─> Creates creator_applications table
    ├─> Creates pending_review_queue view
    └─> Creates review_logs table
```

---

## Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      STATUS TRANSITIONS                          │
└─────────────────────────────────────────────────────────────────┘

Restaurant Claim:
┌──────────┐     submit      ┌──────────┐     approve     ┌──────────┐
│   N/A    │ ──────────────> │ pending  │ ─────────────> │ approved │
└──────────┘                 └──────────┘                 └──────────┘
                                      │
                                      │ reject
                                      │
                                      v
                                ┌──────────┐
                                │ rejected │
                                └──────────┘
                                      │
                                      │ (can_resubmit=true)
                                      │
                                      v
                                ┌──────────┐
                                │ pending  │ (new claim)
                                └──────────┘

User Account Type:
┌──────────┐     approve      ┌──────────┐
│ consumer │ ───────────────> │ business │
└──────────┘                  └──────────┘
     │
     │ (creator application approved)
     │
     v
┌──────────┐
│ creator  │
└──────────┘
```

---

## Security & Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY MODEL                                │
└─────────────────────────────────────────────────────────────────┘

Admin Access:
├─> Hardcoded user IDs in:
│   ├─> services/adminReviewService.ts (2 IDs)
│   └─> app/(tabs)/more.tsx (3 IDs - includes kouame@troodieapp.com)
│
├─> Check performed:
│   └─> ADMIN_USER_IDS.includes(user.id)
│
└─> No database role system
    └─> All admin checks are client-side (can be bypassed if API not protected)

Database RLS:
├─> pending_review_queue view
│   └─> Access via check_review_queue_access() function
│       └─> Checks: account_type = 'admin' OR is_verified = true
│
└─> restaurant_claims table
    ├─> Users can only see their own claims
    └─> Admins can see all claims (via service layer)

⚠️  SECURITY NOTE:
    Admin checks are primarily client-side. Ensure Supabase RLS policies
    properly restrict access at the database level for production.
```

---

## Notification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

On Approval:
├─> statusNotificationService.notifyStatusChange()
│   ├─> userId: claim.user_id
│   ├─> submissionType: 'restaurant_claim'
│   ├─> newStatus: 'approved'
│   ├─> restaurantName: restaurant.name
│   └─> reviewNotes: admin notes (optional)
│
├─> Creates in-app notification
│   └─> User sees notification in app
│
└─> Sends email notification (if auto_notify=true)
    └─> Email to user's registered email

On Rejection:
├─> statusNotificationService.notifyStatusChange()
│   ├─> newStatus: 'rejected'
│   └─> rejectionReason: reason provided by admin
│
├─> Creates in-app notification
│   └─> User sees rejection reason
│
└─> Sends email notification
    └─> Includes rejection reason and resubmission info
```

---

## Summary

**After a user claims a restaurant:**
1. Claim is created with `status='pending'`
2. Claim appears in `pending_review_queue` view
3. Admin accesses review queue via More Tab → Admin Tools → Review Queue
4. Admin reviews claim details
5. Admin approves or rejects:
   - **Approve**: Restaurant linked to user, user becomes business account, business profile created
   - **Reject**: Status set to rejected, user notified with reason, can resubmit if allowed

**Admin Users:**
- Two hardcoded admin IDs in `adminReviewService.ts`
- Third admin ID (kouame@troodieapp.com) only in `more.tsx` (may not have full access)
- Admin access checked by comparing user ID against hardcoded list

**Key Components:**
- User flow: `app/business/claim.tsx` (3-step process)
- Admin flow: `app/admin/reviews.tsx` (review queue)
- Services: `restaurantClaimService.ts`, `adminReviewService.ts`
- Database: `pending_review_queue` view aggregates pending items

