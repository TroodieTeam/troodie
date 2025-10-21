# Comprehensive Testing Gap Analysis & Implementation Roadmap

**Project:** Troodie Mobile Application
**Version:** 1.0
**Date:** October 11, 2025
**Goal:** Enable AI-driven feature development with comprehensive test coverage

---

## Executive Summary

This document provides a complete analysis of the current testing state and a detailed roadmap to achieve comprehensive test coverage that enables AI-driven development. The goal is to reach a state where AI can autonomously build, test, and verify feature implementations with confidence.

### Current State
- **Unit Tests:** 3 services tested (~7% coverage)
- **E2E Tests:** 14 flows covering core user journeys (~40% coverage)
- **Component Tests:** 0 tests (0% coverage)
- **Integration Tests:** 0 tests (0% coverage)
- **Testing Infrastructure:** Basic setup exists but missing key dependencies

### Target State
- **Unit Tests:** 80%+ coverage on all services and utilities
- **Integration Tests:** 60%+ coverage on cross-service operations
- **Component Tests:** 70%+ coverage on reusable UI components
- **E2E Tests:** 100% of critical user flows
- **AI-Driven Development:** Full TDD workflow with automated verification

---

## Table of Contents

1. [Current Testing Infrastructure](#current-testing-infrastructure)
2. [Gap Analysis by Category](#gap-analysis-by-category)
3. [Priority Matrix](#priority-matrix)
4. [Implementation Roadmap](#implementation-roadmap)
5. [AI-Driven TDD Workflow](#ai-driven-tdd-workflow)
6. [Testing Infrastructure Setup](#testing-infrastructure-setup)
7. [Test Coverage Goals](#test-coverage-goals)
8. [Success Metrics](#success-metrics)

---

## 1. Current Testing Infrastructure

### Existing Setup

#### Testing Tools
- **Jest**: Test runner (configured but missing from node_modules)
- **jest-expo**: Expo preset for React Native testing
- **Maestro**: E2E testing framework (installed and working)
- **Missing**: @testing-library/react-native, @testing-library/jest-native

#### Test Configuration
```javascript
// jest.config.js - Properly configured
- Preset: jest-expo
- Module mapping: @ alias support
- Coverage collection: app, services, components, hooks, utils
- Test environment: node
```

#### Existing Tests

**Unit Tests (3 files):**
1. `communityService.test.ts` - ✅ Comprehensive (352 lines)
   - joinCommunity, leaveCommunity, createCommunity, deleteCommunity
   - Edge cases, error handling, permission checks
2. `restaurantService.test.ts` - ✅ Basic coverage
   - getTopRatedRestaurants, getAvailableCities
3. `locationService.test.ts` - ✅ Basic coverage
   - Location permission and retrieval

**E2E Tests (14 flows):**
1. ✅ `auth/login.yaml` - User login
2. ✅ `auth/signup.yaml` - User registration
3. ✅ `auth/logout.yaml` - User logout
4. ✅ `content/create-review.yaml` - Create restaurant review
5. ✅ `content/save-to-board.yaml` - Save restaurant to board
6. ✅ `discovery/search-restaurants.yaml` - Search functionality
7. ✅ `discovery/filter-restaurants.yaml` - Filter restaurants
8. ✅ `discovery/city-selector.yaml` - City selection
9. ✅ `discovery/save-restaurant.yaml` - Save restaurant
10. ✅ `profile/edit-profile.yaml` - Edit user profile
11. ✅ `profile/upload-avatar.yaml` - Upload profile picture
12. ✅ `social/follow-user.yaml` - Follow another user
13. ✅ `social/like-review.yaml` - Like a review
14. ✅ `social/comment-review.yaml` - Comment on review

### Infrastructure Gaps

#### Critical Missing Dependencies
```json
{
  "devDependencies": {
    "@testing-library/react-native": "MISSING - Required for component testing",
    "@testing-library/jest-native": "MISSING - Required for native matchers",
    "@testing-library/react-hooks": "MISSING - Required for hook testing",
    "jest": "MISSING - Core testing framework not in package.json",
    "jest-expo": "MISSING - Not in package.json",
    "@types/jest": "MISSING - TypeScript support for Jest",
    "msw": "MISSING - API mocking for integration tests",
    "nock": "MISSING - HTTP mocking alternative"
  }
}
```

#### Missing Test Utilities
- Mock factories for database records
- Test data builders for complex objects
- Shared test helpers for common assertions
- Supabase mock utilities
- React Navigation test utilities
- Image upload test utilities

---

## 2. Gap Analysis by Category

### 2.1 Service Layer (47 services, 3 tested = 93.6% gap)

#### ❌ Untested - Authentication & User Management (5 services)
- `authService.ts` - Login, signup, OTP verification, session management
- `userService.ts` - User profile CRUD, search users
- `profileService.ts` - Update profile, upload avatar, bio management
- `accountService.ts` - Account deletion, data export, privacy settings
- `creatorApplicationService.ts` - Creator account upgrade applications

**Impact:** HIGH - Core authentication failures would break entire app
**Priority:** P0 (Critical)
**Estimated Tests:** 40-50 unit tests, 5 integration tests

#### ❌ Untested - Board System (3 services)
- `boardService.ts` - CRUD operations, board management
- `boardServiceExtended.ts` - Reorder restaurants, bulk operations
- `boardInvitationService.ts` - Invitation system (recently fixed)

**Impact:** HIGH - Boards are core feature
**Priority:** P0 (Critical)
**Estimated Tests:** 35-45 unit tests, 8 integration tests

#### ❌ Untested - Post & Content (5 services)
- `postService.ts` - Post CRUD, feed generation
- `postEngagementService.ts` - Likes, comments, saves
- `enhancedPostEngagementService.ts` - Advanced engagement features
- `postMediaService.ts` - Image/video handling
- `shareService.ts` - Share functionality

**Impact:** HIGH - Content creation is core feature
**Priority:** P0 (Critical)
**Estimated Tests:** 50-60 unit tests, 10 integration tests

#### ❌ Untested - Social Features (3 services)
- `followService.ts` - Follow/unfollow, followers list
- `blockingService.ts` - Block/unblock users
- `activityFeedService.ts` - Activity feed generation
- `socialActivityService.ts` - Social activity tracking

**Impact:** MEDIUM-HIGH - Social features are key differentiator
**Priority:** P1 (High)
**Estimated Tests:** 30-40 unit tests, 6 integration tests

#### ❌ Untested - Notifications (4 services)
- `notificationService.ts` - In-app notifications
- `pushNotificationService.ts` - Push notification delivery
- `notificationPreferencesService.ts` - User preferences
- `statusNotificationService.ts` - Status change notifications

**Impact:** MEDIUM - Important for engagement but not critical
**Priority:** P1 (High)
**Estimated Tests:** 30-35 unit tests, 5 integration tests

#### ✅ Partially Tested - Restaurants (2 services, 1 tested)
- ✅ `restaurantService.ts` - Basic tests exist
- ❌ `googlePlacesService.ts` - Google Places integration
- ❌ `restaurantImageService.ts` - Restaurant images
- ❌ `restaurantImageSyncService.ts` - Image sync
- ❌ `restaurantPhotosService.ts` - Photo management
- ❌ `restaurantClaimService.ts` - Business ownership claims

**Impact:** HIGH - Restaurant data is core to app
**Priority:** P0 (Critical)
**Estimated Tests:** 40-50 unit tests, 8 integration tests

#### ✅ Partially Tested - Communities (2 services, 1 tested)
- ✅ `communityService.ts` - Good test coverage exists
- ❌ `communityAdminService.ts` - Admin and moderation features
- ❌ `communityDiscoveryService.ts` - Community discovery

**Impact:** MEDIUM - Communities are secondary feature
**Priority:** P2 (Medium)
**Estimated Tests:** 25-30 unit tests, 4 integration tests

#### ❌ Untested - Media & Storage (8 services)
- `imageUploadService.ts` - Base64 upload (legacy)
- `imageUploadServiceV2.ts` - Modern upload service
- `imageUploadServiceFormData.ts` - FormData upload
- `storageService.ts` - Supabase Storage operations
- `intelligentCoverPhotoService.ts` - AI cover selection

**Impact:** HIGH - Image handling is critical for UX
**Priority:** P1 (High)
**Estimated Tests:** 35-40 unit tests, 10 integration tests

#### ❌ Untested - Supporting Services (12 services)
- `saveService.ts` - Save restaurants
- `ratingService.ts` - Restaurant ratings
- `inviteService.ts` - User invitations
- `linkMetadataService.ts` - URL metadata extraction
- `localGemsService.ts` - Local recommendations
- `moderationService.ts` - Content moderation
- `adminReviewService.ts` - Admin review queue
- `achievementService.ts` - User achievements
- `realtimeManager.ts` - Real-time subscriptions
- `toastService.ts` - Toast notifications
- `userSearchService.ts` - User search

**Impact:** MEDIUM - Supporting features
**Priority:** P2 (Medium)
**Estimated Tests:** 60-70 unit tests, 8 integration tests

### 2.2 Component Layer (90+ components, 0 tested = 100% gap)

#### ❌ Critical UI Components (Priority P0)
- `PostCard.tsx` - Main post display component
- `EnhancedPostCard.tsx` - Enhanced post features
- `RestaurantCard.tsx` - Restaurant display
- `RestaurantCardWithSave.tsx` - Restaurant with save button
- `BoardCard.tsx` - Board display
- `BoardSelectionModal.tsx` - Board selection UI
- `EnhancedBoardSelectionModal.tsx` - Enhanced board selection
- `FollowButton.tsx` - Follow/unfollow button
- `AnimatedSaveButton.tsx` - Animated save interactions

**Impact:** HIGH - These render in all major user flows
**Priority:** P0 (Critical)
**Estimated Tests:** 70-90 component tests

#### ❌ Form & Input Components (Priority P1)
- `FormField.tsx` - Reusable form field
- `CitySelector.tsx` - City selection dropdown
- `CommunitySelector.tsx` - Community selection
- `SearchSuggestions.tsx` - Search autocomplete
- `LinkInputModal.tsx` - URL input modal
- `EditProfileModal.tsx` - Profile editing modal

**Impact:** MEDIUM-HIGH - Form validation is critical
**Priority:** P1 (High)
**Estimated Tests:** 40-50 component tests

#### ❌ Navigation & Layout (Priority P1)
- `BottomNavigation.tsx` - Main navigation
- `HapticTab.tsx` - Tab with haptic feedback
- `TabBarBackground.tsx` - Tab styling
- `ParallaxScrollView.tsx` - Scrolling behavior

**Impact:** MEDIUM - Navigation must work reliably
**Priority:** P1 (High)
**Estimated Tests:** 25-30 component tests

#### ❌ Notification Components (Priority P2)
- `NotificationCenter.tsx` - Notification hub
- `NotificationItem.tsx` - Individual notification
- `NotificationBadge.tsx` - Unread badge
- `NotificationSettings.tsx` - Notification preferences
- `CustomToast.tsx` - Toast messages

**Impact:** MEDIUM - Important for engagement
**Priority:** P2 (Medium)
**Estimated Tests:** 30-35 component tests

#### ❌ Activity & Social Components (Priority P2)
- `ActivityFeedItem.tsx` - Activity item display
- `ActivityHeader.tsx` - Activity section header
- `ActivityList.tsx` - Activity list container
- `ActivityFilterToggle.tsx` - Filter controls
- `PostComments.tsx` - Comment thread
- `UserSearchResult.tsx` - User search result item
- `ProfileAvatar.tsx` - User avatar display

**Impact:** MEDIUM - Social features
**Priority:** P2 (Medium)
**Estimated Tests:** 40-45 component tests

#### ❌ Empty States & Loading (Priority P2)
- `EmptyState.tsx` - Generic empty state
- `EmptyActivityState.tsx` - Activity empty state
- `ErrorState.tsx` - Error display
- `LoadingSkeleton.tsx` - Loading placeholder
- `ProgressBar.tsx` - Progress indicator

**Impact:** LOW-MEDIUM - UX polish
**Priority:** P2 (Medium)
**Estimated Tests:** 20-25 component tests

#### ❌ Complex Feature Components (Priority P2)
- `CreatorOnboardingFlow.tsx` - Creator onboarding
- `RestaurantClaimingFlow.tsx` - Business claim flow
- `ReasonModal.tsx` - Community join reason
- `ReportModal.tsx` - Content reporting
- `ReviewModal.tsx` - Admin review modal
- `SettingsModal.tsx` - Settings interface

**Impact:** MEDIUM - Feature-specific flows
**Priority:** P2 (Medium)
**Estimated Tests:** 35-40 component tests

### 2.3 Hook Layer (18 hooks, 0 tested = 100% gap)

#### ❌ Data Fetching Hooks (Priority P1)
- `useActivityFeed.ts` - Activity feed data
- `useSmoothDataFetch.ts` - Smooth data loading
- `usePostForm.ts` - Post creation form state

**Impact:** HIGH - Data fetching is critical
**Priority:** P1 (High)
**Estimated Tests:** 20-25 hook tests

#### ❌ Real-time Hooks (Priority P1)
- `useRealtimeFeed.ts` - Real-time feed updates
- `useRealtimeNotifications.ts` - Real-time notifications
- `useRealtimeCommunity.ts` - Real-time community updates
- `useActivityRealtime.ts` - Real-time activity

**Impact:** HIGH - Real-time features are key differentiator
**Priority:** P1 (High)
**Estimated Tests:** 25-30 hook tests

#### ❌ State Management Hooks (Priority P1)
- `useFollowState.ts` - Follow/unfollow state
- `usePostEngagement.ts` - Post engagement state
- `useOptimisticMutation.ts` - Optimistic updates
- `useAuthRequired.ts` - Auth gate logic

**Impact:** HIGH - State consistency is critical
**Priority:** P1 (High)
**Estimated Tests:** 20-25 hook tests

#### ❌ System Hooks (Priority P2)
- `useNotifications.ts` - Notification system
- `usePushNotifications.ts` - Push notification setup
- `useNetworkStatus.ts` - Network connectivity
- `usePermissions.ts` - Permission handling
- `useAccountType.ts` - Account type detection
- `useColorScheme.ts` - Theme detection
- `useThemeColor.ts` - Theme colors

**Impact:** MEDIUM - System-level features
**Priority:** P2 (Medium)
**Estimated Tests:** 25-30 hook tests

### 2.4 Utility Layer (16 utilities, 0 tested = 100% gap)

#### ❌ Critical Utilities (Priority P0)
- `personaCalculator.ts` - Quiz scoring algorithm
- `communityPermissions.ts` - Permission checking
- `imageQualityAnalysis.ts` - Image quality scoring

**Impact:** HIGH - Core business logic
**Priority:** P0 (Critical)
**Estimated Tests:** 30-40 utility tests

#### ❌ Data Processing (Priority P1)
- `cityNormalization.ts` - City name standardization
- `dateHelpers.ts` - Date formatting and calculations
- `linkMetadata.ts` - URL metadata parsing
- `avatarUtils.ts` - Avatar generation

**Impact:** MEDIUM-HIGH - Data consistency
**Priority:** P1 (High)
**Estimated Tests:** 25-30 utility tests

#### ❌ System Utilities (Priority P2)
- `sessionPersistence.ts` - Session storage
- `backgroundTasks.ts` - Background job management
- `eventBus.ts` - Event system
- `debugComponent.ts` - Debug utilities
- `debugStorage.ts` - Storage debugging
- `imageUploadHelper.ts` - Image upload helpers
- `uploadToSupabase.ts` - Supabase upload utilities

**Impact:** MEDIUM - Supporting features
**Priority:** P2 (Medium)
**Estimated Tests:** 30-35 utility tests

### 2.5 Integration Testing (0 tests = 100% gap)

#### ❌ Authentication Flows (Priority P0)
- Complete signup → verify → login flow
- OTP verification with Supabase Auth
- Session persistence and refresh
- Multi-device session handling

**Impact:** CRITICAL - Auth must work perfectly
**Priority:** P0 (Critical)
**Estimated Tests:** 8-10 integration tests

#### ❌ Content Creation Flows (Priority P0)
- Create post with image upload → storage → database
- Create board → invite users → accept invitation
- Save restaurant → add to board → update cover photo
- Comment on post → notify user → real-time update

**Impact:** HIGH - Core user flows
**Priority:** P0 (Critical)
**Estimated Tests:** 12-15 integration tests

#### ❌ Social Interaction Flows (Priority P1)
- Follow user → activity feed update → notification
- Like post → engagement count → notification
- Block user → filter content → update feed
- Comment thread → nested replies → notifications

**Impact:** HIGH - Social features must work end-to-end
**Priority:** P1 (High)
**Estimated Tests:** 10-12 integration tests

#### ❌ Real-time Features (Priority P1)
- New post → real-time feed update
- New notification → real-time badge update
- Community post → member notification → real-time update
- Board invitation → notification → modal display

**Impact:** HIGH - Real-time is key differentiator
**Priority:** P1 (High)
**Estimated Tests:** 8-10 integration tests

#### ❌ Business Logic Flows (Priority P1)
- Restaurant claim → verification → business account
- Creator application → review → creator status
- Community creation → member invite → event scheduling
- Campaign creation → creator matching → application

**Impact:** MEDIUM-HIGH - Business features
**Priority:** P1 (High)
**Estimated Tests:** 10-12 integration tests

### 2.6 E2E Testing (14 flows, ~20 needed = 30% gap)

#### ✅ Existing E2E Coverage (14 flows)
All critical auth, content creation, and basic social flows covered.

#### ❌ Missing E2E Flows (Priority P1)
1. **Onboarding Flow** - Complete quiz → persona → profile setup
2. **Restaurant Detail View** - View restaurant → see photos → read reviews
3. **Board Management** - Create board → reorder items → share board
4. **Board Invitation** - Accept invitation → view shared board → add items
5. **Community Flows** - Join community → post → interact
6. **Notification Navigation** - Receive notification → tap → navigate to content
7. **Account Upgrade** - Apply for creator → track status → approval
8. **Restaurant Claim** - Submit claim → verification → business dashboard
9. **Search & Filters** - Advanced search → apply filters → save results
10. **Profile Settings** - Privacy settings → notification preferences → blocking

**Impact:** MEDIUM - Fill gaps in user journey coverage
**Priority:** P1 (High)
**Estimated Tests:** 10-12 additional E2E flows

---

## 3. Priority Matrix

### Priority Levels

**P0 - Critical (Must Have for AI Development)**
- Services: Auth, Boards, Posts, Restaurants core functionality
- Utilities: personaCalculator, communityPermissions, imageQualityAnalysis
- Integration: Auth flows, content creation flows
- Components: PostCard, RestaurantCard, BoardCard, Modal components
- Setup: Testing infrastructure with all dependencies

**P1 - High Priority (Needed for Comprehensive Coverage)**
- Services: Social features, notifications, media/storage
- Hooks: Real-time hooks, state management hooks, data fetching
- Components: Forms, navigation, complex interactions
- Integration: Social flows, real-time features, business logic

**P2 - Medium Priority (Nice to Have)**
- Services: Supporting services, admin features, achievements
- Components: Empty states, loading states, polish components
- Utilities: System utilities, helpers
- E2E: Edge cases, admin flows, advanced features

**P3 - Low Priority (Can Defer)**
- Legacy code testing
- Deprecated features
- Debug utilities
- Experimental features

### Dependency Order

```
Phase 0: Foundation (Week 1)
├── Install testing dependencies
├── Setup test utilities and mocks
├── Create test data builders
└── Configure CI/CD for tests

Phase 1: Core Services (Weeks 2-4)
├── Authentication services → Required for all other tests
├── Restaurant services → Core data layer
├── Board services → Core feature
└── Post services → Core feature

Phase 2: Integration & Hooks (Weeks 5-6)
├── Integration tests for Phase 1 services
├── Real-time hooks → Depends on services
├── State management hooks → Depends on services
└── Data fetching hooks → Depends on services

Phase 3: Components (Weeks 7-9)
├── Core display components → Depends on hooks
├── Form components → Depends on services
├── Navigation components → Depends on routing
└── Modal components → Depends on state management

Phase 4: Advanced Features (Weeks 10-11)
├── Social feature services and tests
├── Notification system tests
├── Media/storage integration tests
└── Advanced E2E flows

Phase 5: Polish & Coverage (Week 12)
├── Fill coverage gaps
├── Performance tests
├── Edge case testing
└── Documentation
```

---

## 4. Implementation Roadmap

### Week 1: Foundation & Infrastructure Setup

#### Goals
- Install all testing dependencies
- Create test utilities and mock factories
- Setup CI/CD pipeline for tests
- Document testing patterns

#### Tasks
1. **Install Dependencies** (1 day)
   ```bash
   npm install --save-dev \
     jest \
     @testing-library/react-native \
     @testing-library/jest-native \
     @testing-library/react-hooks \
     @types/jest \
     msw \
     react-test-renderer
   ```

2. **Create Test Utilities** (2 days)
   - `__tests__/helpers/mockFactories.ts` - Database record factories
   - `__tests__/helpers/testBuilders.ts` - Complex object builders
   - `__tests__/helpers/supabaseMocks.ts` - Supabase client mocks
   - `__tests__/helpers/navigationMocks.ts` - Navigation mocks
   - `__tests__/helpers/asyncStorageMocks.ts` - Storage mocks
   - `__tests__/helpers/customMatchers.ts` - Custom Jest matchers

3. **Setup CI/CD** (1 day)
   - GitHub Actions workflow for tests
   - Pre-commit hooks for fast tests
   - PR checks for full test suite
   - Coverage reporting integration

4. **Documentation** (1 day)
   - Update `TDD_WORKFLOW_AND_TEST_PLAN.md`
   - Create `TESTING_PATTERNS.md` with examples
   - Document mock patterns
   - Create testing quick reference

**Deliverable:** Fully configured testing infrastructure ready for test writing

### Week 2-3: P0 Services - Authentication & User Management

#### Coverage Target: 80%+ on all auth services

#### authService.ts (3 days)
```typescript
// Tests to create (15 tests)
describe('authService', () => {
  describe('signInWithOTP', () => {
    it('should send OTP for valid phone number')
    it('should handle invalid phone format')
    it('should handle Supabase errors')
    it('should rate limit OTP requests')
  })

  describe('verifyOTP', () => {
    it('should verify valid OTP code')
    it('should reject invalid OTP code')
    it('should handle expired OTP')
    it('should create user session on success')
  })

  describe('signOut', () => {
    it('should clear session and local storage')
    it('should handle signOut errors gracefully')
  })

  describe('getSession', () => {
    it('should return active session')
    it('should return null for expired session')
    it('should refresh expired tokens')
  })

  describe('updateSession', () => {
    it('should update session in storage')
    it('should handle update failures')
  })
})
```

#### userService.ts (2 days)
```typescript
// Tests to create (12 tests)
describe('userService', () => {
  describe('getUserById', () => {
    it('should fetch user by ID')
    it('should return null for non-existent user')
    it('should handle database errors')
  })

  describe('searchUsers', () => {
    it('should search by username')
    it('should search by display name')
    it('should handle empty results')
    it('should respect pagination')
  })

  describe('updateUserProfile', () => {
    it('should update profile fields')
    it('should validate required fields')
    it('should handle update failures')
    it('should respect RLS policies')
  })
})
```

#### profileService.ts (2 days)
```typescript
// Tests to create (10 tests)
describe('profileService', () => {
  describe('uploadAvatar', () => {
    it('should upload image to storage')
    it('should resize image before upload')
    it('should update user avatar URL')
    it('should handle upload failures')
  })

  describe('updateBio', () => {
    it('should update bio text')
    it('should validate bio length')
    it('should handle special characters')
  })

  describe('updateLocation', () => {
    it('should update user location')
    it('should normalize city names')
  })
})
```

#### Integration Tests (1 day)
```typescript
// Tests to create (5 tests)
describe('Authentication Integration', () => {
  it('should complete full signup flow')
  it('should persist session across restarts')
  it('should handle token refresh')
  it('should handle multi-device sessions')
  it('should enforce RLS policies')
})
```

**Deliverable:** Complete test coverage for authentication system

### Week 4-5: P0 Services - Boards & Posts

#### boardService.ts (3 days)
```typescript
// Tests to create (20 tests)
describe('boardService', () => {
  describe('createBoard', () => {
    it('should create free board')
    it('should create private board')
    it('should create paid board')
    it('should set owner as admin')
    it('should handle duplicate names')
  })

  describe('addRestaurantToBoard', () => {
    it('should add restaurant to board')
    it('should prevent duplicate saves')
    it('should update board cover photo')
    it('should respect board permissions')
  })

  describe('removeRestaurantFromBoard', () => {
    it('should remove restaurant')
    it('should update cover photo if removed')
    it('should handle non-existent saves')
  })

  // ... more tests
})
```

#### boardInvitationService.ts (2 days)
```typescript
// Tests to create (15 tests)
describe('boardInvitationService', () => {
  describe('sendInvitation', () => {
    it('should send invitation to user')
    it('should create notification')
    it('should prevent duplicate invitations')
    it('should respect board permission settings')
  })

  describe('acceptInvitation', () => {
    it('should add user to board members')
    it('should mark invitation as accepted')
    it('should notify board owner')
  })

  // ... more tests
})
```

#### postService.ts (3 days)
```typescript
// Tests to create (18 tests)
describe('postService', () => {
  describe('createPost', () => {
    it('should create review post with restaurant')
    it('should create simple post')
    it('should create post with external content')
    it('should upload images to storage')
    it('should validate post data')
  })

  describe('updatePost', () => {
    it('should update post content')
    it('should verify ownership')
    it('should handle image updates')
  })

  describe('deletePost', () => {
    it('should delete post and images')
    it('should delete engagements cascade')
  })

  // ... more tests
})
```

#### Integration Tests (2 days)
```typescript
// Tests to create (10 tests)
describe('Board & Post Integration', () => {
  it('should create board and add restaurants')
  it('should invite user and accept invitation')
  it('should post to board and notify members')
  it('should handle board permission changes')
  it('should sync board cover photos intelligently')
  // ... more tests
})
```

**Deliverable:** Complete test coverage for boards and posts

### Week 6-7: P1 Services - Social & Notifications

#### Social Services (3 days)
- `followService.ts` (12 tests)
- `blockingService.ts` (10 tests)
- `activityFeedService.ts` (15 tests)

#### Notification Services (3 days)
- `notificationService.ts` (15 tests)
- `pushNotificationService.ts` (12 tests)
- `notificationPreferencesService.ts` (8 tests)

#### Integration Tests (1 day)
- Social interaction flows (6 tests)
- Notification delivery flows (4 tests)

**Deliverable:** Complete social and notification test coverage

### Week 8-9: P1 - Hooks & Utilities

#### Critical Hooks (3 days)
- Real-time hooks: `useRealtimeFeed`, `useRealtimeNotifications`, etc. (25 tests)
- State hooks: `useFollowState`, `usePostEngagement`, etc. (20 tests)
- Data hooks: `useActivityFeed`, `useSmoothDataFetch`, etc. (15 tests)

#### Critical Utilities (2 days)
- `personaCalculator.ts` (15 tests)
- `communityPermissions.ts` (12 tests)
- `imageQualityAnalysis.ts` (10 tests)
- `cityNormalization.ts` (8 tests)

**Deliverable:** Complete hook and utility test coverage

### Week 10-11: P0/P1 Components

#### Core Components (4 days)
- Post components: `PostCard`, `EnhancedPostCard` (30 tests)
- Restaurant components: `RestaurantCard`, `RestaurantCardWithSave` (25 tests)
- Board components: `BoardCard`, `BoardSelectionModal` (20 tests)
- Social components: `FollowButton`, `ActivityFeedItem` (15 tests)

#### Form & Input Components (2 days)
- `FormField`, `CitySelector`, `SearchSuggestions` (25 tests)
- Modal components: `LinkInputModal`, `EditProfileModal` (20 tests)

#### Navigation & Layout (1 day)
- `BottomNavigation`, `HapticTab`, `TabBarBackground` (15 tests)

**Deliverable:** Complete component test coverage for critical UI

### Week 12: Integration, E2E & Polish

#### Additional Integration Tests (2 days)
- Real-time feature flows (8 tests)
- Business logic flows (10 tests)
- Edge case scenarios (6 tests)

#### Additional E2E Tests (2 days)
- Onboarding flow
- Board management flow
- Community interaction flow
- Account upgrade flows
- (10 additional E2E tests)

#### Coverage Analysis & Gap Filling (1 day)
- Run coverage reports
- Identify gaps
- Write missing tests
- Document edge cases

**Deliverable:** 80%+ test coverage across all layers

---

## 5. AI-Driven TDD Workflow

### Workflow Overview

This workflow enables AI to autonomously implement features with full test coverage and verification.

```
┌─────────────────────────────────────────────────────────────┐
│                    FEATURE REQUEST INPUT                     │
│  "Add ability for users to tip on posts"                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 1: ANALYSIS & PLANNING                    │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Parse feature requirements                                │
│ 2. Identify affected layers (DB, services, hooks, UI)       │
│ 3. Analyze dependencies and integration points               │
│ 4. Generate test scenarios and acceptance criteria           │
│ 5. Create implementation plan with test-first approach       │
│                                                              │
│ Output: Detailed plan with test cases for each layer        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           PHASE 2: DATABASE & MIGRATION (if needed)          │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Design database schema changes                            │
│ 2. Create migration file                                     │
│ 3. Update TypeScript types                                   │
│ 4. Document migration                                        │
│                                                              │
│ Verification:                                                │
│ - Run migration on test database                            │
│ - Verify schema changes                                     │
│ - Test rollback                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          PHASE 3: SERVICE LAYER (TDD - Red Phase)            │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create test file: __tests__/services/tipService.test.ts │
│ 2. Write comprehensive test cases:                           │
│    - Happy path tests                                        │
│    - Edge case tests                                         │
│    - Error handling tests                                    │
│    - Permission/validation tests                             │
│ 3. Run tests (EXPECTED: ALL FAIL)                           │
│                                                              │
│ Example Test Structure:                                      │
│ describe('tipService', () => {                              │
│   describe('createTip', () => {                             │
│     it('should create tip with valid amount')               │
│     it('should prevent negative amounts')                   │
│     it('should enforce minimum/maximum')                    │
│     it('should verify post ownership')                      │
│     it('should create notification')                        │
│     it('should handle payment failures')                    │
│   })                                                        │
│ })                                                          │
│                                                              │
│ Verification: npm test -- tipService.test.ts                │
│ Expected: ❌ All tests fail (no implementation)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         PHASE 4: SERVICE IMPLEMENTATION (Green Phase)         │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create services/tipService.ts                            │
│ 2. Implement methods to satisfy tests:                      │
│    - createTip()                                            │
│    - getTipsForPost()                                       │
│    - getUserTips()                                          │
│    - validateTipAmount()                                    │
│ 3. Run tests iteratively until all pass                     │
│ 4. Refactor for code quality (tests still pass)            │
│                                                              │
│ Verification: npm test -- tipService.test.ts                │
│ Expected: ✅ All tests pass                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│      PHASE 5: INTEGRATION TESTS (Cross-Service Testing)      │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create __tests__/integration/tipping.test.ts            │
│ 2. Write integration test cases:                            │
│    - Tip → notification → push delivery                     │
│    - Tip → creator earnings update                          │
│    - Tip → activity feed entry                              │
│    - Tip → real-time UI update                              │
│ 3. Run tests (EXPECTED: FAIL initially)                     │
│ 4. Implement integration points                             │
│ 5. Re-run until all tests pass                              │
│                                                              │
│ Verification: npm test -- integration/tipping.test.ts       │
│ Expected: ✅ All integration tests pass                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            PHASE 6: HOOK LAYER (TDD - Red Phase)             │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create __tests__/hooks/useTipping.test.ts               │
│ 2. Write hook test cases using @testing-library/react-hooks │
│    - Test state management                                   │
│    - Test side effects                                       │
│    - Test error handling                                     │
│    - Test loading states                                     │
│ 3. Run tests (EXPECTED: ALL FAIL)                           │
│                                                              │
│ Verification: npm test -- hooks/useTipping.test.ts          │
│ Expected: ❌ All tests fail (no implementation)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          PHASE 7: HOOK IMPLEMENTATION (Green Phase)          │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create hooks/useTipping.ts                               │
│ 2. Implement hook logic:                                     │
│    - State management                                        │
│    - Service integration                                     │
│    - Error handling                                          │
│    - Optimistic updates                                      │
│ 3. Run tests until all pass                                 │
│ 4. Refactor for code quality                                │
│                                                              │
│ Verification: npm test -- hooks/useTipping.test.ts          │
│ Expected: ✅ All tests pass                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         PHASE 8: COMPONENT LAYER (TDD - Red Phase)           │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create __tests__/components/TipButton.test.tsx          │
│ 2. Write component test cases:                              │
│    - Render states (default, loading, success, error)       │
│    - User interactions (tap, hold, cancel)                  │
│    - Accessibility                                           │
│    - Edge cases (disabled, no auth, etc.)                   │
│ 3. Run tests (EXPECTED: ALL FAIL)                           │
│                                                              │
│ Verification: npm test -- components/TipButton.test.tsx     │
│ Expected: ❌ All tests fail (no implementation)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        PHASE 9: COMPONENT IMPLEMENTATION (Green Phase)        │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create components/TipButton.tsx                          │
│ 2. Implement component:                                      │
│    - UI rendering                                            │
│    - Hook integration                                        │
│    - Event handlers                                          │
│    - Accessibility props                                     │
│ 3. Run tests until all pass                                 │
│ 4. Refactor for code quality                                │
│                                                              │
│ Verification: npm test -- components/TipButton.test.tsx     │
│ Expected: ✅ All tests pass                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            PHASE 10: E2E TESTS (Critical Flows)              │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Create e2e/flows/tipping/tip-on-post.yaml               │
│ 2. Write E2E test flow:                                     │
│    - Navigate to post                                        │
│    - Tap tip button                                          │
│    - Enter amount                                            │
│    - Confirm tip                                             │
│    - Verify success message                                  │
│    - Verify notification sent                                │
│ 3. Add testID props to components                           │
│ 4. Run E2E test                                              │
│                                                              │
│ Verification: npm run test:e2e:smoke                        │
│ Expected: ✅ E2E test passes                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 11: FULL VERIFICATION SUITE               │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Run full unit test suite                                 │
│    npm test                                                  │
│    Expected: ✅ All tests pass                              │
│                                                              │
│ 2. Check test coverage                                       │
│    npm run test:coverage                                     │
│    Expected: ✅ Coverage targets met                        │
│                                                              │
│ 3. Run type checking                                         │
│    npm run typecheck                                         │
│    Expected: ✅ No TypeScript errors                        │
│                                                              │
│ 4. Run linting                                               │
│    npm run lint                                              │
│    Expected: ✅ No linting errors                           │
│                                                              │
│ 5. Run E2E smoke tests                                       │
│    npm run test:e2e:smoke                                    │
│    Expected: ✅ All critical flows pass                     │
│                                                              │
│ 6. Verify no regressions in existing features               │
│    Run full E2E suite if needed                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 12: DOCUMENTATION & CLEANUP               │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Update service documentation                              │
│ 2. Add feature to CLAUDE.md                                 │
│ 3. Document testing patterns used                            │
│ 4. Create migration guide if needed                         │
│ 5. Update API documentation                                  │
│                                                              │
│ Output: Complete, tested, documented feature                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 13: COMMIT & PR                       │
├─────────────────────────────────────────────────────────────┤
│ AI Actions:                                                  │
│ 1. Stage all changes                                         │
│ 2. Create commit with conventional format                   │
│    "feat: add tipping feature with full test coverage"      │
│ 3. Create pull request with:                                │
│    - Feature description                                     │
│    - Test coverage report                                    │
│    - Screenshots/demo                                        │
│    - Checklist of completed tasks                           │
│                                                              │
│ Verification: CI/CD pipeline runs all checks                │
│ Expected: ✅ All checks pass                                │
└─────────────────────────────────────────────────────────────┘
```

### AI Decision Tree for Test Types

```
Feature Requirement
      │
      ├─ Affects Database Schema?
      │   └─ YES → Create migration + Update types
      │
      ├─ New Service Method?
      │   └─ YES → Unit tests (15-20 tests per method)
      │
      ├─ Cross-Service Integration?
      │   └─ YES → Integration tests (5-10 tests per flow)
      │
      ├─ New React Hook?
      │   └─ YES → Hook tests with @testing-library/react-hooks
      │
      ├─ New UI Component?
      │   └─ YES → Component tests with @testing-library/react-native
      │
      ├─ Critical User Flow?
      │   └─ YES → E2E test with Maestro
      │
      └─ Affects Existing Features?
          └─ YES → Regression tests + Update existing tests
```

### AI Test Generation Patterns

#### Pattern 1: Service Method Testing
```typescript
// AI generates this structure for every service method
describe('[ServiceName].[methodName]', () => {
  // Happy path
  it('should [expected behavior] with valid input', async () => {
    // Arrange: Setup mocks and data
    // Act: Call the method
    // Assert: Verify success
  })

  // Edge cases
  it('should handle empty input', async () => {})
  it('should handle null/undefined values', async () => {})
  it('should handle very large inputs', async () => {})

  // Error handling
  it('should return error for invalid input', async () => {})
  it('should handle database errors gracefully', async () => {})
  it('should handle network errors', async () => {})

  // Business logic
  it('should enforce business rules', async () => {})
  it('should validate permissions', async () => {})
  it('should prevent duplicate operations', async () => {})
})
```

#### Pattern 2: Integration Testing
```typescript
// AI generates integration tests for cross-service flows
describe('[Feature] Integration Flow', () => {
  beforeAll(async () => {
    // Setup: Real database connection (test DB)
    // Seed: Minimum required test data
  })

  afterAll(async () => {
    // Cleanup: Remove test data
  })

  it('should complete full feature flow end-to-end', async () => {
    // Step 1: Service A operation
    const result1 = await serviceA.method()
    expect(result1).toBeTruthy()

    // Step 2: Service B operation (depends on Step 1)
    const result2 = await serviceB.method(result1.id)
    expect(result2).toBeTruthy()

    // Step 3: Verify side effects
    const notifications = await notificationService.getForUser(userId)
    expect(notifications).toHaveLength(1)

    // Step 4: Verify real-time updates
    const realtimeData = await getRealtimeState()
    expect(realtimeData).toMatchObject({ /* expected state */ })
  })
})
```

#### Pattern 3: Component Testing
```typescript
// AI generates component tests with all interaction states
describe('[ComponentName]', () => {
  // Rendering tests
  it('should render correctly with required props', () => {})
  it('should render loading state', () => {})
  it('should render error state', () => {})
  it('should render empty state', () => {})

  // Interaction tests
  it('should handle user tap/click', async () => {})
  it('should handle long press', async () => {})
  it('should handle disabled state', () => {})

  // Accessibility tests
  it('should have proper accessibility labels', () => {})
  it('should support screen readers', () => {})

  // Hook integration tests
  it('should use custom hook correctly', () => {})
  it('should handle hook errors', () => {})
})
```

### AI Verification Checklist

After implementing each feature, AI verifies:

```
□ All unit tests pass (npm test)
□ Test coverage meets targets (npm run test:coverage)
  - Services: 80%+
  - Components: 70%+
  - Utilities: 90%+
□ No TypeScript errors (npm run typecheck)
□ No linting errors (npm run lint)
□ E2E smoke tests pass (npm run test:e2e:smoke)
□ Integration tests pass
□ No regressions in existing features
□ Documentation updated
□ Migration tested (if applicable)
□ Accessibility requirements met
□ Performance acceptable (no obvious slowdowns)
```

### AI Self-Improvement Loop

```
┌─────────────────────────────────────────┐
│     Feature Implementation Complete      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Run Full Verification Suite        │
└────────────────┬────────────────────────┘
                 │
                 ├─ PASS → Document Success Pattern
                 │          Store in knowledge base
                 │
                 └─ FAIL → Analyze Failure
                            ├─ What tests failed?
                            ├─ What was missed in planning?
                            ├─ What edge cases weren't considered?
                            └─ Update test generation patterns
```

---

## 6. Testing Infrastructure Setup

### Complete Dependency Installation

```json
{
  "devDependencies": {
    // Core Testing
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "react-test-renderer": "19.1.0",

    // React Native Testing
    "@testing-library/react-native": "^12.4.2",
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-hooks": "^8.0.1",

    // Mocking & API Testing
    "msw": "^2.0.11",
    "nock": "^13.5.0",

    // Utilities
    "@faker-js/faker": "^8.3.1",
    "jest-extended": "^4.0.2"
  }
}
```

### Test Utility Files to Create

#### 1. Mock Factories (`__tests__/helpers/mockFactories.ts`)
```typescript
import { faker } from '@faker-js/faker'

export const mockUser = (overrides?: Partial<User>) => ({
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  display_name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  bio: faker.lorem.sentence(),
  account_type: 'consumer' as const,
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockRestaurant = (overrides?: Partial<Restaurant>) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  city: 'Charlotte',
  state: 'NC',
  google_rating: faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
  google_place_id: faker.string.alphanumeric(27),
  ...overrides,
})

export const mockPost = (overrides?: Partial<Post>) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  content: faker.lorem.paragraph(),
  post_type: 'review' as const,
  restaurant_id: faker.string.uuid(),
  created_at: faker.date.recent().toISOString(),
  ...overrides,
})

// ... more factories for Board, Community, Notification, etc.
```

#### 2. Supabase Mocks (`__tests__/helpers/supabaseMocks.ts`)
```typescript
export const createMockSupabaseQuery = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
  return mockQuery
}

export const createMockSupabaseClient = () => ({
  from: jest.fn((table: string) => createMockSupabaseQuery()),
  auth: {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  storage: {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    })),
  },
})
```

#### 3. Test Builders (`__tests__/helpers/testBuilders.ts`)
```typescript
// Fluent API for complex test data
export class UserBuilder {
  private user: Partial<User>

  constructor() {
    this.user = mockUser()
  }

  withAccountType(type: AccountType) {
    this.user.account_type = type
    return this
  }

  withVerification() {
    this.user.is_verified = true
    return this
  }

  asCreator() {
    this.user.account_type = 'creator'
    this.user.is_verified = true
    return this
  }

  build(): User {
    return this.user as User
  }
}

// Usage in tests:
const creator = new UserBuilder().asCreator().build()
```

#### 4. Custom Matchers (`__tests__/helpers/customMatchers.ts`)
```typescript
expect.extend({
  toBeValidUser(received: any) {
    const pass =
      received.id &&
      received.username &&
      received.email &&
      received.account_type in ['consumer', 'creator', 'business']

    return {
      pass,
      message: () => `Expected ${received} to be a valid user`,
    }
  },

  toHaveSuccessfulResponse(received: any) {
    const pass = received.data && !received.error
    return {
      pass,
      message: () => `Expected response to have data and no error`,
    }
  },
})
```

#### 5. Integration Test Setup (`__tests__/helpers/integrationSetup.ts`)
```typescript
import { supabase } from '@/lib/supabase'

export const setupIntegrationTest = async () => {
  // Create test users, restaurants, etc.
  const testUser = await createTestUser()
  const testRestaurant = await createTestRestaurant()

  return { testUser, testRestaurant }
}

export const cleanupIntegrationTest = async (resources: any) => {
  // Clean up test data
  await deleteTestUser(resources.testUser.id)
  await deleteTestRestaurant(resources.testRestaurant.id)
}
```

### CI/CD Configuration

#### GitHub Actions Workflow (`.github/workflows/test.yml`)
```yaml
name: Test Suite

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run typecheck

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

  e2e-smoke:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Run smoke tests
        run: npm run test:e2e:smoke
```

---

## 7. Test Coverage Goals

### Coverage Targets by Layer

| Layer | Current | Target | Priority |
|-------|---------|--------|----------|
| **Services** | ~7% (3/47) | 80%+ | P0 |
| **Components** | 0% (0/90+) | 70%+ | P1 |
| **Hooks** | 0% (0/18) | 75%+ | P1 |
| **Utilities** | 0% (0/16) | 90%+ | P0 |
| **Integration** | 0% | 60%+ | P1 |
| **E2E Critical Flows** | ~70% (14/20) | 100% | P1 |

### Coverage Metrics to Track

```bash
# Run coverage report
npm run test:coverage

# Expected output after full implementation:
--------------------------------|---------|----------|---------|---------|
File                            | % Stmts | % Branch | % Funcs | % Lines |
--------------------------------|---------|----------|---------|---------|
All files                       |   80.24 |    75.18 |   78.92 |   80.67 |
 services/                      |   82.45 |    78.23 |   80.12 |   83.01 |
  authService.ts               |   85.12 |    82.45 |   83.33 |   86.21 |
  boardService.ts              |   88.45 |    84.12 |   87.50 |   89.23 |
  postService.ts               |   81.23 |    76.89 |   79.12 |   82.45 |
 components/                    |   72.34 |    68.45 |   71.23 |   73.12 |
  PostCard.tsx                 |   75.23 |    71.34 |   74.12 |   76.45 |
  BoardSelectionModal.tsx      |   78.12 |    73.45 |   76.89 |   79.23 |
 hooks/                         |   76.45 |    72.34 |   75.12 |   77.23 |
  useRealtimeFeed.ts          |   80.12 |    76.45 |   78.90 |   81.34 |
 utils/                         |   92.34 |    88.45 |   91.23 |   93.12 |
  personaCalculator.ts        |   95.23 |    92.34 |   94.12 |   96.45 |
--------------------------------|---------|----------|---------|---------|
```

### Minimum Thresholds (jest.config.js)
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75,
    },
    './services/**/*.ts': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    './utils/**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
}
```

---

## 8. Success Metrics

### Quantitative Metrics

1. **Test Coverage**
   - ✅ Target: 80%+ overall coverage
   - ✅ Target: 80%+ service layer coverage
   - ✅ Target: 70%+ component coverage
   - ✅ Target: 90%+ utility coverage

2. **Test Count**
   - ✅ Target: 500+ unit tests
   - ✅ Target: 100+ integration tests
   - ✅ Target: 200+ component tests
   - ✅ Target: 25+ E2E flows

3. **Test Execution Speed**
   - ✅ Target: Unit tests < 30 seconds
   - ✅ Target: Integration tests < 2 minutes
   - ✅ Target: E2E smoke tests < 5 minutes
   - ✅ Target: Full E2E suite < 15 minutes

4. **CI/CD Pipeline**
   - ✅ Target: All PR checks automated
   - ✅ Target: < 5 minutes for fast checks (lint, type, unit)
   - ✅ Target: < 10 minutes for full PR validation

### Qualitative Metrics

1. **AI Development Capability**
   - ✅ AI can implement new features with full test coverage autonomously
   - ✅ AI can verify implementations meet acceptance criteria
   - ✅ AI can detect regressions before code review
   - ✅ AI follows TDD workflow automatically

2. **Code Quality**
   - ✅ No critical bugs reach production
   - ✅ Edge cases are covered by tests
   - ✅ Error handling is comprehensive
   - ✅ Performance regressions are caught early

3. **Developer Experience**
   - ✅ Clear test patterns and examples
   - ✅ Easy to write new tests
   - ✅ Fast feedback loop
   - ✅ Comprehensive documentation

### Milestone Checklist

#### Phase 1: Foundation (Week 1)
- [ ] All testing dependencies installed
- [ ] Test utilities and mocks created
- [ ] CI/CD pipeline configured
- [ ] Documentation updated

#### Phase 2: Core Coverage (Weeks 2-5)
- [ ] Auth services tested (80%+ coverage)
- [ ] Board services tested (80%+ coverage)
- [ ] Post services tested (80%+ coverage)
- [ ] Restaurant services tested (80%+ coverage)
- [ ] Integration tests for core flows

#### Phase 3: Comprehensive Coverage (Weeks 6-9)
- [ ] Social services tested
- [ ] Notification services tested
- [ ] All critical hooks tested
- [ ] All critical utilities tested
- [ ] 50% of components tested

#### Phase 4: Full Coverage (Weeks 10-12)
- [ ] 70%+ component coverage
- [ ] 100% critical E2E flows covered
- [ ] All integration points tested
- [ ] Coverage thresholds met

#### Phase 5: AI-Ready (Ongoing)
- [ ] AI can implement features with tests
- [ ] AI can verify implementations
- [ ] AI follows TDD workflow
- [ ] Zero-defect deployments

---

## Appendix: Quick Reference

### Test Commands
```bash
# Unit tests
npm test                          # Run all unit tests
npm run test:watch                # Watch mode
npm run test:coverage             # With coverage
npm test -- authService.test.ts   # Specific file

# E2E tests
npm run test:e2e                  # All E2E tests
npm run test:e2e:smoke            # Smoke tests only
npm run test:e2e:ios              # iOS only
npm run test:e2e:android          # Android only

# Quality checks
npm run typecheck                 # TypeScript
npm run lint                      # ESLint

# Full validation
npm test && npm run typecheck && npm run lint && npm run test:e2e:smoke
```

### File Structure
```
troodie/
├── __tests__/
│   ├── services/              # Service unit tests
│   ├── components/            # Component tests
│   ├── hooks/                 # Hook tests
│   ├── utils/                 # Utility tests
│   ├── integration/           # Integration tests
│   └── helpers/               # Test utilities
│       ├── mockFactories.ts
│       ├── testBuilders.ts
│       ├── supabaseMocks.ts
│       ├── customMatchers.ts
│       └── integrationSetup.ts
├── e2e/
│   ├── flows/                 # E2E test flows
│   ├── helpers/               # E2E utilities
│   └── fixtures/              # Test data
├── jest.config.js
├── jest.setup.js
└── .github/
    └── workflows/
        └── test.yml           # CI/CD pipeline
```

### Priority Quick Reference

**P0 - Implement First:**
- Testing infrastructure setup
- Auth service tests
- Board service tests
- Post service tests
- Restaurant service tests
- Critical utilities (personaCalculator, permissions, imageQuality)

**P1 - Implement Second:**
- Social service tests
- Notification service tests
- Media/storage tests
- All hook tests
- Core component tests
- Integration tests for critical flows

**P2 - Implement Third:**
- Supporting service tests
- Advanced component tests
- Additional E2E flows
- Edge case coverage

---

**Document Version:** 1.0
**Last Updated:** October 11, 2025
**Next Review:** Weekly during implementation
**Owner:** Development Team
