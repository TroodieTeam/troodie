# Test-Driven Development (TDD) Workflow & Comprehensive Test Plan

## Table of Contents
1. [TDD Workflow](#tdd-workflow)
2. [Test Strategy Overview](#test-strategy-overview)
3. [Comprehensive Test Plan](#comprehensive-test-plan)
4. [Testing Tools & Setup](#testing-tools--setup)
5. [Best Practices](#best-practices)

---

## TDD Workflow

### Overview
This document outlines the complete Test-Driven Development workflow from task requirement through development to final testing verification.

### Workflow Phases

#### Phase 1: Requirements Analysis
**Goal:** Understand what needs to be built and define testable acceptance criteria

**Steps:**
1. **Review Task Requirements**
   - Read feature request or bug report
   - Identify user stories and acceptance criteria
   - Clarify ambiguities with stakeholders

2. **Define Success Criteria**
   - What should the feature do?
   - What edge cases exist?
   - What error scenarios need handling?

3. **Document Test Scenarios**
   - List all user flows
   - Identify integration points
   - Note performance requirements

**Output:** Written test scenarios and acceptance criteria

---

#### Phase 2: Test Planning
**Goal:** Design tests before writing implementation code

**Steps:**
1. **Choose Test Type(s)**
   - **Unit Tests**: For isolated services, utilities, calculations
   - **Integration Tests**: For API interactions, database operations
   - **E2E Tests**: For critical user flows
   - **Component Tests**: For React components (if using React Testing Library)

2. **Write Test Cases (Red Phase)**
   ```bash
   # Create test file first
   touch __tests__/services/myNewService.test.ts
   ```

   Example structure:
   ```typescript
   import { myNewService } from '@/services/myNewService';

   describe('MyNewService', () => {
     describe('methodName', () => {
       it('should handle success case', () => {
         // Test will fail - feature not implemented yet
       });

       it('should handle error case', () => {
         // Test will fail - feature not implemented yet
       });

       it('should validate input', () => {
         // Test will fail - feature not implemented yet
       });
     });
   });
   ```

3. **Run Tests (Should Fail)**
   ```bash
   npm test
   ```
   All tests should fail initially - this confirms tests are valid

**Output:** Test files with failing tests

---

#### Phase 3: Implementation (Green Phase)
**Goal:** Write minimal code to make tests pass

**Steps:**
1. **Create Implementation Files**
   ```bash
   touch services/myNewService.ts
   ```

2. **Implement Feature**
   - Write code to satisfy test requirements
   - Focus on making tests pass, not perfection
   - One test at a time

3. **Run Tests Frequently**
   ```bash
   # Watch mode for continuous feedback
   npm run test:watch
   ```

4. **Iterate Until All Tests Pass**
   - Fix failing tests
   - Add missing functionality
   - Handle edge cases

**Output:** Working implementation with passing tests

---

#### Phase 4: Refactoring
**Goal:** Improve code quality while maintaining passing tests

**Steps:**
1. **Refactor Code**
   - Extract reusable functions
   - Improve naming
   - Optimize performance
   - Reduce duplication

2. **Run Tests After Each Change**
   ```bash
   npm test
   ```
   Tests should still pass after refactoring

3. **Add Additional Tests**
   - Edge cases discovered during implementation
   - Error handling scenarios
   - Performance tests if needed

**Output:** Clean, well-tested code

---

#### Phase 5: Integration Testing
**Goal:** Verify feature works in the broader application context

**Steps:**
1. **Write Integration Tests**
   ```bash
   # For API integrations, cross-service interactions
   touch __tests__/integration/featureName.test.ts
   ```

2. **Test Database Interactions**
   - Verify Supabase queries work correctly
   - Test transaction handling
   - Validate data integrity

3. **Test Component Integration**
   - Test components with real services (not mocks)
   - Verify state management
   - Check data flow

**Output:** Integration tests confirming feature works with other parts of the app

---

#### Phase 6: End-to-End Testing
**Goal:** Verify complete user flows work as expected

**Steps:**
1. **Identify Critical User Flows**
   - What will users actually do?
   - What paths are most important?

2. **Write Maestro E2E Tests**
   ```bash
   touch e2e/flows/feature-name/user-flow.yaml
   ```

   Example:
   ```yaml
   appId: com.troodie.app
   ---
   - launchApp:
       clearState: true

   # Navigate to feature
   - tapOn:
       id: "tab-explore"

   # Interact with feature
   - tapOn:
       id: "search-input"
   - inputText: "Pizza"

   # Verify results
   - assertVisible: "Results"
   ```

3. **Run E2E Tests**
   ```bash
   npm run test:e2e
   ```

4. **Add TestIDs to Components**
   - Update React components with testID props
   - Follow naming conventions from e2e/implementation-guide.md

**Output:** E2E tests covering user journeys

---

#### Phase 7: Verification & Deployment
**Goal:** Confirm everything works before shipping

**Steps:**
1. **Run Full Test Suite**
   ```bash
   # Unit & Integration tests
   npm test

   # E2E smoke tests
   npm run test:e2e:smoke

   # Full E2E suite (if time permits)
   npm run test:e2e

   # Type checking
   npm run typecheck

   # Linting
   npm run lint
   ```

2. **Manual Testing**
   - Test on iOS simulator
   - Test on Android emulator
   - Verify edge cases manually
   - Check offline behavior

3. **Code Review Checklist**
   - [ ] All tests passing
   - [ ] Test coverage meets standards
   - [ ] TypeScript has no errors
   - [ ] Code follows style guide
   - [ ] Documentation updated

4. **Create Pull Request**
   ```bash
   git add .
   git commit -m "feat: add new feature with tests"
   git push origin feature-branch
   ```

**Output:** Deployable, tested feature

---

## Test Strategy Overview

### Test Pyramid

```
        /\
       /  \    E2E Tests (Few, Slow, Expensive)
      /    \   - Critical user flows
     /______\  - Smoke tests
    /        \
   / Integration Tests (Some, Medium Speed)
  /  - API calls, database operations
 /    - Cross-service interactions
/______________________________\
        Unit Tests (Many, Fast, Cheap)
        - Services, utilities, calculations
        - Pure functions, business logic
```

### Test Coverage Goals

| Layer | Coverage Target | Purpose |
|-------|----------------|---------|
| Unit Tests | 80%+ | Fast feedback on individual functions |
| Integration Tests | 60%+ | Verify services work together |
| E2E Tests | Critical Flows | Ensure user journeys work end-to-end |

### When to Write Each Test Type

#### Write Unit Tests For:
- Services (restaurantService, communityService, etc.)
- Utility functions (personaCalculator, linkMetadata, etc.)
- Business logic
- Data transformations
- Validators

#### Write Integration Tests For:
- Supabase queries
- Authentication flows
- File uploads
- External API calls (Google Places)
- Real-time subscriptions

#### Write E2E Tests For:
- Login/Signup
- Restaurant discovery
- Saving restaurants
- Creating posts
- Following users
- Critical user journeys

---

## Comprehensive Test Plan

### 1. Authentication & Onboarding

#### Unit Tests
- [ ] **authService**
  - Login with email/password
  - Signup validation
  - Password reset flow
  - Token refresh logic
  - Error handling

- [ ] **personaCalculator**
  - Quiz scoring algorithm
  - Persona assignment logic
  - Edge cases (all same answers, skipped questions)

#### Integration Tests
- [ ] **Full Auth Flow**
  - Signup → Email verification → Login
  - OAuth providers (if implemented)
  - Session persistence
  - Token expiration handling

#### E2E Tests
- [x] Login flow (e2e/flows/auth/login.yaml)
- [x] Signup flow (e2e/flows/auth/signup.yaml)
- [x] Logout flow (e2e/flows/auth/logout.yaml)
- [ ] Onboarding quiz completion
- [ ] Profile setup flow

---

### 2. Restaurant Discovery & Search

#### Unit Tests
- [x] **restaurantService**
  - getTopRatedRestaurants()
  - getAvailableCities()
  - Error handling
  - Fallback data

- [ ] **googlePlacesService**
  - Search restaurants by query
  - Get place details
  - Photo URL generation
  - Rate limiting

- [ ] **locationService**
  - Get current location
  - Reverse geocoding
  - Permission handling

#### Integration Tests
- [ ] **Restaurant Discovery**
  - Fetch restaurants with filters
  - Search functionality
  - City selector
  - Sort by rating/distance
  - Pagination

- [ ] **Google Places Integration**
  - Real API calls (with test API key)
  - Error handling
  - Caching

#### E2E Tests
- [x] Search restaurants (e2e/flows/discovery/search-restaurants.yaml)
- [x] Filter restaurants (e2e/flows/discovery/filter-restaurants.yaml)
- [x] City selector (e2e/flows/discovery/city-selector.yaml)
- [x] Save restaurant (e2e/flows/discovery/save-restaurant.yaml)
- [ ] Restaurant detail view
- [ ] Navigate with map

---

### 3. Boards & Collections

#### Unit Tests
- [ ] **boardService**
  - createBoard()
  - addRestaurantToBoard()
  - removeRestaurantFromBoard()
  - updateBoardSettings()
  - deleteBoard()
  - Permission checks

- [ ] **boardServiceExtended**
  - Reorder restaurants
  - Bulk operations
  - Board sharing

- [ ] **boardInvitationService**
  - Send invitation
  - Accept/decline invitation
  - Permission validation

#### Integration Tests
- [ ] **Board Management**
  - Create board with restaurants
  - Add/remove members
  - Update board privacy
  - Delete board cascade
  - Board recommendations

- [ ] **Intelligent Cover Photo**
  - Auto-select best photo
  - Fallback handling

#### E2E Tests
- [x] Save to board (e2e/flows/content/save-to-board.yaml)
- [ ] Create new board
- [ ] View board details
- [ ] Reorder restaurants
- [ ] Share board
- [ ] Accept board invitation

---

### 4. Social Features

#### Unit Tests
- [ ] **followService**
  - Follow user
  - Unfollow user
  - Get followers list
  - Get following list
  - Prevent duplicate follows

- [ ] **blockingService**
  - Block user
  - Unblock user
  - Check if blocked
  - Filter blocked content

- [ ] **postEngagementService**
  - Like post
  - Unlike post
  - Save post
  - Share post
  - Track engagement metrics

#### Integration Tests
- [ ] **Social Graph**
  - Follow/unfollow operations
  - Follower notifications
  - Privacy settings respect
  - Blocked user filtering

- [ ] **Activity Feed**
  - Fetch personalized feed
  - Filter by type
  - Real-time updates
  - Pagination

#### E2E Tests
- [x] Follow user (e2e/flows/social/follow-user.yaml)
- [x] Like review (e2e/flows/social/like-review.yaml)
- [x] Comment on review (e2e/flows/social/comment-review.yaml)
- [ ] View activity feed
- [ ] Block/unblock user
- [ ] Report content

---

### 5. Content Creation

#### Unit Tests
- [ ] **postService**
  - createPost()
  - updatePost()
  - deletePost()
  - Validate post data
  - Handle media attachments

- [ ] **postMediaService**
  - Upload images
  - Process images
  - Delete images
  - Image optimization

- [ ] **linkMetadataService**
  - Extract metadata from URLs
  - Handle invalid URLs
  - Timeout handling

- [ ] **ratingService**
  - Create rating
  - Update rating
  - Calculate aggregate ratings
  - Traffic light system logic

#### Integration Tests
- [ ] **Post Creation Flow**
  - Create post with images
  - Create post with link preview
  - Tag restaurant
  - Tag users
  - Upload to storage
  - Notify followers

- [ ] **Image Upload**
  - Multiple upload services (V1, V2, FormData)
  - Compression
  - Error recovery
  - Progress tracking

#### E2E Tests
- [x] Create review (e2e/flows/content/create-review.yaml)
- [ ] Create post with photos
- [ ] Create post with link
- [ ] Edit post
- [ ] Delete post
- [ ] Add rating to restaurant

---

### 6. Communities

#### Unit Tests
- [x] **communityService**
  - joinCommunity()
  - leaveCommunity()
  - createCommunity()
  - deleteCommunity()
  - Permission checks
  - Duplicate handling

- [ ] **communityAdminService**
  - Manage members
  - Moderate content
  - Update settings
  - Audit logs

- [ ] **communityDiscoveryService**
  - Find communities
  - Recommendations
  - Search communities

#### Integration Tests
- [ ] **Community Management**
  - Create and join community
  - Post to community
  - Member management
  - Event-based communities
  - Privacy settings

- [ ] **Community Moderation**
  - Remove posts
  - Ban members
  - Audit trail

#### E2E Tests
- [ ] Join community
- [ ] Create community
- [ ] Post in community
- [ ] Leave community
- [ ] Community settings
- [ ] Event-based community flow

---

### 7. Profile & Settings

#### Unit Tests
- [ ] **profileService**
  - updateProfile()
  - uploadAvatar()
  - updateBio()
  - Validation

- [ ] **userService**
  - getUserProfile()
  - searchUsers()
  - Update preferences

- [ ] **notificationPreferencesService**
  - Update preferences
  - Get preferences
  - Default settings

- [ ] **accountService**
  - Delete account
  - Export data
  - Privacy settings

#### Integration Tests
- [ ] **Profile Updates**
  - Update all fields
  - Avatar upload
  - Validation errors
  - Privacy changes

- [ ] **User Search**
  - Search by username
  - Search by name
  - Filters
  - Pagination

#### E2E Tests
- [x] Edit profile (e2e/flows/profile/edit-profile.yaml)
- [x] Upload avatar (e2e/flows/profile/upload-avatar.yaml)
- [ ] View own profile
- [ ] View other user profile
- [ ] Update notification settings
- [ ] Change privacy settings

---

### 8. Notifications

#### Unit Tests
- [ ] **notificationService**
  - createNotification()
  - markAsRead()
  - deleteNotification()
  - Batch operations

- [ ] **pushNotificationService**
  - Register device token
  - Send push notification
  - Handle permissions
  - Platform differences (iOS/Android)

- [ ] **statusNotificationService**
  - Creator status changes
  - Campaign notifications

#### Integration Tests
- [ ] **Notification System**
  - Follow notifications
  - Like notifications
  - Comment notifications
  - Real-time updates
  - Notification preferences respect

- [ ] **Push Notifications**
  - Token registration
  - Notification delivery
  - Deep linking from notification

#### E2E Tests
- [ ] View notifications
- [ ] Mark notification as read
- [ ] Navigate from notification
- [ ] Update notification settings

---

### 9. Business & Creator Features

#### Unit Tests
- [ ] **restaurantClaimService**
  - Submit claim
  - Verify claim
  - Approve/reject claim

- [ ] **creatorApplicationService**
  - Submit application
  - Review application
  - Approve/reject

- [ ] **adminReviewService**
  - Review submissions
  - Approve/reject content
  - Moderation actions

#### Integration Tests
- [ ] **Restaurant Claiming**
  - Full claim flow
  - Verification process
  - Status tracking

- [ ] **Creator Program**
  - Application flow
  - Status tracking
  - Campaign management

#### E2E Tests
- [ ] Business claim flow
- [ ] Creator application
- [ ] Campaign creation
- [ ] View analytics
- [ ] Review applications

---

### 10. Utilities & Helpers

#### Unit Tests
- [ ] **imageQualityAnalysis**
  - Analyze image quality
  - Scoring algorithm
  - Edge cases

- [ ] **communityPermissions**
  - Check permissions
  - Role-based access
  - Permission inheritance

- [ ] **linkMetadata**
  - Parse URLs
  - Extract metadata
  - Handle errors

- [ ] **storageService**
  - Upload files
  - Delete files
  - Generate signed URLs
  - Error handling

#### Integration Tests
- [ ] **Storage Operations**
  - Upload various file types
  - Large file handling
  - Concurrent uploads
  - Error recovery

---

### 11. Error Handling & Edge Cases

#### Test Scenarios
- [ ] **Network Errors**
  - Offline mode
  - Slow connection
  - Request timeout
  - Retry logic

- [ ] **Authentication Errors**
  - Expired token
  - Invalid credentials
  - Session timeout
  - Concurrent sessions

- [ ] **Data Validation**
  - Invalid input
  - Missing required fields
  - Type mismatches
  - SQL injection prevention

- [ ] **Permission Errors**
  - Unauthorized access
  - Role validation
  - Resource ownership

- [ ] **Edge Cases**
  - Empty states
  - Very long text
  - Special characters
  - Concurrent operations
  - Race conditions

---

### 12. Performance Testing

#### Test Scenarios
- [ ] **Load Testing**
  - Feed loading with many items
  - Image loading performance
  - Search with many results

- [ ] **Memory Usage**
  - Image memory management
  - List virtualization
  - Memory leaks

- [ ] **Offline Performance**
  - Cached data access
  - Offline queue
  - Sync after reconnection

---

## Testing Tools & Setup

### Current Testing Stack

#### Unit & Integration Testing
- **Jest**: Test runner and assertion library
- **jest-expo**: Expo-specific Jest preset
- **@react-native-async-storage/async-storage**: Mock storage
- **Supabase client**: Mocked for unit tests

#### E2E Testing
- **Maestro**: Mobile E2E testing framework
- **YAML-based test flows**: Declarative test syntax
- **Platform support**: iOS and Android

### Setup Instructions

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Jest Configuration
File: `jest.config.js`
- Preset: `jest-expo`
- Test environment: `node`
- Setup file: `jest.setup.js`
- Module mapper: `@/` alias support

#### 3. Run Unit Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

#### 4. E2E Test Setup
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run E2E tests
npm run test:e2e

# Run smoke tests only
npm run test:e2e:smoke

# Platform-specific
npm run test:e2e:ios
npm run test:e2e:android
```

### Test File Structure

```
troodie/
├── __tests__/
│   ├── services/           # Unit tests for services
│   │   ├── communityService.test.ts
│   │   ├── restaurantService.test.ts
│   │   └── locationService.test.ts
│   ├── utils/             # Unit tests for utilities
│   ├── components/        # Component tests (to add)
│   └── integration/       # Integration tests (to add)
├── e2e/
│   ├── flows/             # E2E test flows
│   │   ├── auth/
│   │   ├── discovery/
│   │   ├── social/
│   │   └── content/
│   ├── helpers/           # Shared test utilities
│   └── fixtures/          # Test data
├── jest.config.js         # Jest configuration
└── jest.setup.js          # Test setup & mocks
```

---

## Best Practices

### General Testing Principles

#### 1. Test Behavior, Not Implementation
```typescript
// ❌ Bad - tests implementation details
it('should call internal method', () => {
  expect(service._privateMethod).toHaveBeenCalled();
});

// ✅ Good - tests behavior
it('should return restaurants for valid city', async () => {
  const result = await restaurantService.getTopRatedRestaurants('Charlotte');
  expect(result).toHaveLength(10);
  expect(result[0]).toHaveProperty('google_rating');
});
```

#### 2. Arrange-Act-Assert Pattern
```typescript
it('should join community successfully', async () => {
  // Arrange
  const userId = 'user-123';
  const communityId = 'community-456';
  mockSupabase.from.mockReturnValue(mockQuery);

  // Act
  const result = await communityService.joinCommunity(userId, communityId);

  // Assert
  expect(result).toEqual({ success: true });
});
```

#### 3. One Assertion Per Test (when possible)
```typescript
// ❌ Bad - testing multiple things
it('should handle user operations', async () => {
  expect(await createUser()).toBeTruthy();
  expect(await updateUser()).toBeTruthy();
  expect(await deleteUser()).toBeTruthy();
});

// ✅ Good - separate tests
it('should create user', async () => {
  expect(await createUser()).toBeTruthy();
});

it('should update user', async () => {
  expect(await updateUser()).toBeTruthy();
});

it('should delete user', async () => {
  expect(await deleteUser()).toBeTruthy();
});
```

#### 4. Test Edge Cases
```typescript
describe('restaurantService.getAvailableCities', () => {
  it('should return unique cities', () => {
    // Test main functionality
  });

  it('should handle null city values', () => {
    // Test edge case
  });

  it('should return default cities on error', () => {
    // Test error case
  });

  it('should handle empty result', () => {
    // Test edge case
  });
});
```

#### 5. Use Descriptive Test Names
```typescript
// ❌ Bad
it('works', () => { });
it('test1', () => { });

// ✅ Good
it('should successfully join a community when not already a member', () => { });
it('should return error when database operation fails', () => { });
it('should prevent owners from leaving their own community', () => { });
```

### Mocking Best Practices

#### 1. Mock External Dependencies
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));
```

#### 2. Reset Mocks Between Tests
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Clear service cache if needed
  communityService.clearAllCache();
});
```

#### 3. Mock Realistic Data
```typescript
const mockRestaurant = {
  id: '123',
  name: 'Test Restaurant',
  city: 'Charlotte',
  google_rating: 4.5,
  // Include all required fields
};
```

### E2E Test Best Practices

#### 1. Use Test IDs
```yaml
# ✅ Good - stable selector
- tapOn:
    id: "save-button"

# ❌ Bad - fragile selector
- tapOn: "Save"
```

#### 2. Wait for Elements
```yaml
- assertVisible:
    id: "restaurant-list"
    timeout: 10000
```

#### 3. Clear State Between Tests
```yaml
- launchApp:
    clearState: true
    clearKeychain: true
```

#### 4. Tag Tests for Filtering
```yaml
# In e2e/flows/auth/login.yaml
tags:
  - smoke
  - auth
  - p1
```

### Code Coverage Guidelines

#### Coverage Targets
- **Services**: 80%+ coverage
- **Utilities**: 90%+ coverage
- **Components**: 70%+ coverage
- **Overall**: 75%+ coverage

#### Run Coverage Report
```bash
npm run test:coverage
```

#### Focus on Critical Paths
- Authentication flows
- Payment operations
- Data mutations
- Permission checks

### Continuous Integration

#### Pre-Commit Checks
```bash
# Run before committing
npm run typecheck
npm run lint
npm test
```

#### PR Checks
- All unit tests pass
- All smoke E2E tests pass
- Code coverage maintained or improved
- No TypeScript errors
- Linting passes

#### Pre-Release Checks
```bash
# Full test suite
npm test
npm run test:e2e
npm run typecheck
npm run lint
```

---

## Appendix: Quick Reference

### Common Test Commands
```bash
# Unit tests
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# E2E tests
npm run test:e2e            # All E2E tests
npm run test:e2e:smoke      # Smoke tests only
npm run test:e2e:ios        # iOS only
npm run test:e2e:android    # Android only

# Quality checks
npm run typecheck           # TypeScript check
npm run lint                # ESLint check
```

### Test File Naming
- Unit tests: `__tests__/services/serviceName.test.ts`
- Integration tests: `__tests__/integration/featureName.test.ts`
- E2E tests: `e2e/flows/category/flow-name.yaml`

### Test Priority Levels
- **P1 (Smoke)**: Critical flows, must always work (5-10 min)
- **P2 (Regression)**: Important features (20-30 min)
- **P3 (Full Suite)**: Complete coverage (45+ min)

### When to Write Each Test Type
| Scenario | Test Type |
|----------|-----------|
| Pure function, business logic | Unit Test |
| Database operation | Integration Test |
| External API call | Integration Test |
| Critical user flow | E2E Test |
| Edge case validation | Unit Test |
| Multi-step user journey | E2E Test |

---

**Document Version:** 1.0
**Last Updated:** 2025-10-06
**Maintained By:** Development Team
