# E2E Flow Implementation Plan - Maestro Testing

**Focus:** Complete user journey coverage with Maestro E2E tests
**Priority:** Real user flows over unit tests

---

## Current E2E Coverage Analysis

### ✅ Existing Flows (14 tests)

#### Authentication (3 flows)
- ✅ `auth/login.yaml` - User login
- ✅ `auth/signup.yaml` - User registration
- ✅ `auth/logout.yaml` - User logout

#### Discovery (4 flows)
- ✅ `discovery/search-restaurants.yaml` - Search functionality
- ✅ `discovery/filter-restaurants.yaml` - Filter restaurants
- ✅ `discovery/city-selector.yaml` - City selection
- ✅ `discovery/save-restaurant.yaml` - Save restaurant

#### Content (2 flows)
- ✅ `content/create-review.yaml` - Create restaurant review
- ✅ `content/save-to-board.yaml` - Save restaurant to board

#### Social (3 flows)
- ✅ `social/follow-user.yaml` - Follow another user
- ✅ `social/like-review.yaml` - Like a review
- ✅ `social/comment-review.yaml` - Comment on review

#### Profile (2 flows)
- ✅ `profile/edit-profile.yaml` - Edit user profile
- ✅ `profile/upload-avatar.yaml` - Upload profile picture

---

## ❌ Missing Critical Flows (Priority Order)

### 🔴 P0 - Critical Business Flows (Must Have)

#### 1. Complete Onboarding Journey
**File:** `e2e/flows/onboarding/complete-onboarding.yaml`
- Launch app first time
- Sign up with phone/email
- Complete persona quiz
- Set username & bio
- Upload profile photo
- Select favorite cuisines
- Choose location
- Complete onboarding

**Why Critical:** First-time user experience determines retention

#### 2. Restaurant Detail View & Interaction
**File:** `e2e/flows/restaurant/view-restaurant-details.yaml`
- View restaurant from feed
- See photos, rating, reviews
- View menu/hours
- Get directions (map integration)
- Call restaurant
- Share restaurant

**Why Critical:** Core discovery feature

#### 3. Board Management Flow
**File:** `e2e/flows/boards/create-and-manage-board.yaml`
- Create new board
- Add multiple restaurants
- Reorder restaurants
- Change board privacy (public/private/paid)
- Edit board details
- Delete board

**Why Critical:** Primary organization feature

#### 4. Board Collaboration
**File:** `e2e/flows/boards/board-collaboration.yaml`
- User A creates board
- User A invites User B
- User B receives notification
- User B accepts invitation
- User B adds restaurant to shared board
- Both users see updates

**Why Critical:** Key social/collaboration feature

#### 5. Notification Flow
**File:** `e2e/flows/notifications/notification-interactions.yaml`
- Receive various notification types
- Tap notification to navigate to content
- Mark as read
- View notification settings
- Update preferences

**Why Critical:** User engagement & retention

### 🟡 P1 - Important Flows (Should Have)

#### 6. Community Flows
**File:** `e2e/flows/community/join-and-participate.yaml`
- Browse communities
- Join community
- Post in community
- Comment on community post
- Leave community

**Why Important:** Growing feature for engagement

#### 7. Feed Interaction Flow
**File:** `e2e/flows/feed/interact-with-feed.yaml`
- Scroll through feed
- Like posts
- Comment on posts
- Save posts
- Share posts
- Filter feed (following/all)

**Why Important:** Main engagement point

#### 8. Advanced Search & Discovery
**File:** `e2e/flows/discovery/advanced-search.yaml`
- Search with filters (cuisine, price, rating)
- Sort results (distance, rating, popularity)
- View on map
- Switch cities
- Save search

**Why Important:** Improves discovery experience

#### 9. Post Management
**File:** `e2e/flows/content/manage-posts.yaml`
- Create post with photos
- Edit existing post
- Delete post
- Report post

**Why Important:** Content moderation

#### 10. Account Upgrade Flows
**File:** `e2e/flows/account/upgrade-to-creator.yaml`
- Apply for creator status
- Submit portfolio/examples
- Track application status
- Receive approval notification

**File:** `e2e/flows/account/claim-restaurant.yaml`
- Search for restaurant
- Submit ownership claim
- Upload verification documents
- Track claim status

**Why Important:** Monetization features

### 🟢 P2 - Nice to Have (Could Have)

#### 11. Settings & Preferences
**File:** `e2e/flows/settings/manage-settings.yaml`
- Update notification preferences
- Change privacy settings
- Manage blocked users
- Export data
- Delete account

#### 12. Offline Behavior
**File:** `e2e/flows/offline/offline-experience.yaml`
- Disconnect network
- Browse cached content
- Attempt to post (queue)
- Reconnect
- Verify queued actions

#### 13. Performance Scenarios
**File:** `e2e/flows/performance/heavy-usage.yaml`
- Scroll long feed
- Load many images
- Switch tabs rapidly
- Memory management

---

## Implementation Plan

### Week 1: P0 Critical Flows (5 flows)
**Days 1-2:**
- ✅ Complete onboarding journey
- ✅ Restaurant detail view

**Days 3-4:**
- ✅ Board management
- ✅ Board collaboration

**Day 5:**
- ✅ Notification interactions
- ✅ Test all P0 flows

### Week 2: P1 Important Flows (5 flows)
**Days 1-2:**
- ✅ Community participation
- ✅ Feed interactions

**Days 3-4:**
- ✅ Advanced search
- ✅ Post management

**Day 5:**
- ✅ Account upgrade flows
- ✅ Test all P1 flows

### Week 3: P2 & Polish (3 flows + optimization)
**Days 1-2:**
- ✅ Settings management
- ✅ Offline behavior

**Days 3-4:**
- ✅ Performance scenarios
- ✅ Optimize existing flows

**Day 5:**
- ✅ Full regression suite
- ✅ Documentation update

---

## Test Organization Structure

```
e2e/
├── flows/
│   ├── onboarding/
│   │   └── complete-onboarding.yaml          [NEW - P0]
│   ├── restaurant/
│   │   └── view-restaurant-details.yaml      [NEW - P0]
│   ├── boards/
│   │   ├── create-and-manage-board.yaml      [NEW - P0]
│   │   └── board-collaboration.yaml          [NEW - P0]
│   ├── notifications/
│   │   └── notification-interactions.yaml    [NEW - P0]
│   ├── community/
│   │   └── join-and-participate.yaml         [NEW - P1]
│   ├── feed/
│   │   └── interact-with-feed.yaml           [NEW - P1]
│   ├── discovery/
│   │   └── advanced-search.yaml              [NEW - P1]
│   ├── content/
│   │   └── manage-posts.yaml                 [NEW - P1]
│   ├── account/
│   │   ├── upgrade-to-creator.yaml           [NEW - P1]
│   │   └── claim-restaurant.yaml             [NEW - P1]
│   ├── settings/
│   │   └── manage-settings.yaml              [NEW - P2]
│   ├── offline/
│   │   └── offline-experience.yaml           [NEW - P2]
│   └── performance/
│       └── heavy-usage.yaml                   [NEW - P2]
├── helpers/
│   ├── auth.yaml                              [EXISTS]
│   ├── navigation.yaml                        [EXISTS]
│   └── test-data.yaml                         [NEW]
└── suites/
    ├── smoke.yaml                             [NEW - Quick validation]
    ├── regression.yaml                        [NEW - Full coverage]
    └── nightly.yaml                           [NEW - Extended tests]
```

---

## Test Suites Configuration

### Smoke Suite (5-10 min)
**File:** `e2e/suites/smoke.yaml`
```yaml
# Critical path only
flows:
  - auth/login.yaml
  - discovery/search-restaurants.yaml
  - content/create-review.yaml
  - boards/create-and-manage-board.yaml
  - notifications/notification-interactions.yaml
```

### Regression Suite (20-30 min)
**File:** `e2e/suites/regression.yaml`
```yaml
# All P0 + P1 flows
flows:
  - onboarding/complete-onboarding.yaml
  - restaurant/view-restaurant-details.yaml
  - boards/board-collaboration.yaml
  - community/join-and-participate.yaml
  - feed/interact-with-feed.yaml
  # ... all P0 and P1
```

### Nightly Suite (45+ min)
**File:** `e2e/suites/nightly.yaml`
```yaml
# Everything including P2 and performance
flows:
  # All P0, P1, P2
  - settings/manage-settings.yaml
  - offline/offline-experience.yaml
  - performance/heavy-usage.yaml
```

---

## TestID Requirements

For new flows to work, components need testIDs. Here's what's needed:

### Onboarding
- `onboarding-quiz-question-{n}`
- `onboarding-answer-{n}`
- `onboarding-username-input`
- `onboarding-bio-input`
- `onboarding-photo-upload`
- `onboarding-continue-button`
- `onboarding-skip-button`

### Restaurant Detail
- `restaurant-detail-header`
- `restaurant-photos-carousel`
- `restaurant-rating-display`
- `restaurant-reviews-list`
- `restaurant-call-button`
- `restaurant-directions-button`
- `restaurant-share-button`
- `restaurant-save-button`

### Boards
- `board-create-button`
- `board-name-input`
- `board-description-input`
- `board-privacy-selector`
- `board-add-restaurant-button`
- `board-restaurant-item-{id}`
- `board-reorder-handle-{id}`
- `board-delete-button`
- `board-invite-button`

### Notifications
- `notification-item-{id}`
- `notification-mark-read-{id}`
- `notification-settings-button`
- `notification-preference-{type}`

### Community
- `community-list-item-{id}`
- `community-join-button`
- `community-post-input`
- `community-post-button`
- `community-leave-button`

---

## Running the Tests

### Commands

```bash
# Run all new flows
npm run test:e2e

# Run smoke suite (quick validation)
maestro test e2e/suites/smoke.yaml

# Run specific flow
maestro test e2e/flows/boards/board-collaboration.yaml

# Run with recording
maestro test e2e/flows/onboarding/complete-onboarding.yaml --record

# Run on specific device
maestro test e2e/flows --device "iPhone 15 Pro"
```

### CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
e2e-smoke:
  runs-on: macos-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install Maestro
      run: curl -Ls "https://get.maestro.mobile.dev" | bash

    - name: Build app
      run: npx expo prebuild && npm run ios -- --configuration Release

    - name: Run smoke tests
      run: maestro test e2e/suites/smoke.yaml
```

---

## Success Metrics

### Coverage Goals
- ✅ **P0 Critical Flows:** 5/5 (100%)
- ✅ **P1 Important Flows:** 5/5 (100%)
- ⚡ **P2 Nice-to-Have:** 3/3 (100%)
- 📊 **Total E2E Coverage:** 27 flows (14 existing + 13 new)

### Quality Gates
- ✅ All smoke tests pass in < 10 minutes
- ✅ All regression tests pass in < 30 minutes
- ✅ Zero flaky tests (99.9% pass rate)
- ✅ All critical user journeys covered

### Performance Targets
- ⚡ Smoke suite: < 10 min
- ⚡ Regression suite: < 30 min
- ⚡ Nightly suite: < 60 min

---

## Next Steps

1. **Week 1 (Now):** Implement P0 critical flows
   - Start with onboarding journey
   - Add restaurant detail flow
   - Board management flows
   - Notification interactions

2. **Week 2:** Implement P1 important flows
   - Community participation
   - Feed interactions
   - Advanced search
   - Account upgrades

3. **Week 3:** Polish and optimize
   - P2 flows
   - Performance testing
   - Full regression suite
   - Documentation

**Let's start with P0 flows!** 🚀
