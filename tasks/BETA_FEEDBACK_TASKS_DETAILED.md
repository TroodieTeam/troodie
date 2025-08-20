# Beta Feedback Tasks - Detailed Implementation Guide

## Status Legend
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Done
- ⏸️ Blocked
- 🔄 Review

---

# SECTION 1: FUNCTIONAL ISSUES (Code Fixes)

## F.1: Fix "Your Saves" Not Refreshing After Save Action
**Impact**: High | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **F.1.1: Implement refresh event emitter**
   - Create event emitter in `services/eventService.ts`
   - Add events: `BOARD_UPDATED`, `RESTAURANT_SAVED`, `BOARD_DELETED`
   - Integrate with existing board service methods
   - **Files**: Create `services/eventService.ts`, update `services/boardService.ts`

2. **F.1.2: Update QuickSavesBoard component to listen for events**
   - Add event listener in useEffect hook
   - Trigger silentRefresh when save events fire
   - Clean up listeners on unmount
   - **Files**: `components/home/QuickSavesBoard.tsx`

3. **F.1.3: Update RestaurantCardWithSave to emit events**
   - Emit `RESTAURANT_SAVED` event after successful save
   - Include board ID and restaurant ID in event payload
   - Handle both add and remove save actions
   - **Files**: `components/cards/RestaurantCardWithSave.tsx`

### Acceptance Criteria:
- [ ] Saving a restaurant immediately updates "Your Saves" section
- [ ] No full page refresh required
- [ ] Works for both adding and removing saves
- [ ] Loading states don't flash during silent refresh

### Testing:
```
1. Navigate to home screen
2. Save a restaurant to a board
3. Verify "Your Saves" updates within 500ms
4. Remove save and verify update
```

---

## F.2: Fix Follow Activity Missing Target User Name
**Impact**: High | **Estimate**: 0.5d | **Status**: 🔴

### Subtasks:
1. **F.2.1: Update activity query to include target user data**
   - Modify `getActivityFeed` in `services/activityService.ts`
   - Add JOIN to fetch target_user profile data
   - Include target_username and target_avatar in response
   - **Files**: `services/activityService.ts`

2. **F.2.2: Update ActivityItem component to display target user**
   - Add target user name to follow activity text
   - Make target user name clickable (navigate to profile)
   - Handle null/undefined target user gracefully
   - **Files**: `components/ActivityItem.tsx`

3. **F.2.3: Add activity item type definitions**
   - Create TypeScript interface for activity types
   - Include target_user fields in FollowActivity type
   - Update existing activity rendering logic
   - **Files**: `types/activity.ts`, `components/ActivityItem.tsx`

### Acceptance Criteria:
- [ ] Follow activities show "User A followed User B"
- [ ] Target user names are clickable
- [ ] Works for all follow activity types
- [ ] No broken activities for deleted users

### Testing:
```
1. User A follows User B
2. Check User B's activity feed
3. Verify shows "User A followed you"
4. Check User C's feed shows "User A followed User B"
```

---

## F.3: Fix Followers/Following Navigation Showing Wrong Screen
**Impact**: High | **Estimate**: 0.75d | **Status**: 🔴

### Subtasks:
1. **F.3.1: Create separate route files for followers/following**
   - Create `app/profile/followers/[id].tsx`
   - Create `app/profile/following/[id].tsx`
   - Remove shared route that's causing confusion
   - **Files**: Create new route files in `app/profile/`

2. **F.3.2: Update ProfileScreen navigation links**
   - Fix follower count touchable to use `/profile/followers/[id]`
   - Fix following count touchable to use `/profile/following/[id]`
   - Pass user ID as route parameter
   - **Files**: `app/(tabs)/profile.tsx`, `app/user/[id].tsx`

3. **F.3.3: Implement proper list components**
   - Create `FollowersList` component with correct query
   - Create `FollowingList` component with correct query
   - Add proper loading and empty states
   - **Files**: Create `components/profile/FollowersList.tsx`, `components/profile/FollowingList.tsx`

### Acceptance Criteria:
- [ ] Clicking followers shows followers list
- [ ] Clicking following shows following list
- [ ] Back navigation returns to correct profile
- [ ] Lists update when follow/unfollow actions occur

### Testing:
```
1. Navigate to profile with followers
2. Click followers count
3. Verify followers list displays
4. Go back, click following count
5. Verify following list displays
```

---

## F.4: Fix Default Profile Image Fallback
**Impact**: Medium | **Estimate**: 0.5d | **Status**: 🔴

### Subtasks:
1. **F.4.1: Create default avatar component**
   - Design default avatar with user initials
   - Add background color based on user ID hash
   - Support different sizes (small, medium, large)
   - **Files**: Create `components/common/DefaultAvatar.tsx`

2. **F.4.2: Update Avatar component with fallback logic**
   - Add onError handler to Image component
   - Show DefaultAvatar when image fails to load
   - Show DefaultAvatar when URL is null/undefined
   - **Files**: `components/Avatar.tsx`

3. **F.4.3: Apply avatar updates across all screens**
   - Update PostCard avatar display
   - Update ActivityItem avatar display
   - Update profile header avatar display
   - **Files**: `components/PostCard.tsx`, `components/ActivityItem.tsx`, `app/(tabs)/profile.tsx`

### Acceptance Criteria:
- [ ] Users without photos show initials avatar
- [ ] Broken image URLs show fallback avatar
- [ ] Consistent avatar appearance across app
- [ ] No flashing/jumping during image load

### Testing:
```
1. Create user without profile photo
2. Verify initials avatar shows everywhere
3. Create user with broken photo URL
4. Verify fallback avatar displays
```

---

## F.5: Fix "Share a Link" Causing Post Creation Bug
**Impact**: High | **Estimate**: 0.75d | **Status**: 🔴

### Subtasks:
1. **F.5.1: Debug link attachment flow**
   - Add console logs to track state changes
   - Identify where post creation state gets corrupted
   - Document the exact reproduction steps
   - **Files**: `app/add/create-post.tsx`

2. **F.5.2: Refactor link attachment state management**
   - Separate link state from post content state
   - Add validation for link format
   - Prevent double submissions during link processing
   - **Files**: `app/add/create-post.tsx`, `components/LinkPreview.tsx`

3. **F.5.3: Add link preview component**
   - Fetch link metadata (title, description, image)
   - Show preview while user continues typing
   - Allow removal of attached link
   - **Files**: Create `components/LinkPreview.tsx`, update `services/linkService.ts`

### Acceptance Criteria:
- [ ] Can attach links without breaking post flow
- [ ] Link preview shows before posting
- [ ] Can remove attached link before posting
- [ ] Post submits successfully with link

### Testing:
```
1. Start creating a post
2. Click "Share a link"
3. Paste a restaurant URL
4. Continue writing post content
5. Submit post successfully
```

---

## F.6: Fix Blocked Users Still Appearing in Feeds
**Impact**: Critical | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **F.6.1: Update feed queries to filter blocked users**
   - Modify home feed query to exclude blocked user content
   - Add LEFT JOIN to user_blocks table
   - Filter WHERE blocked_id IS NULL
   - **Files**: `services/postService.ts`, `services/restaurantService.ts`

2. **F.6.2: Create blocking context for app-wide state**
   - Create BlockingContext with blocked users list
   - Load blocked users on app initialization
   - Update list when block/unblock actions occur
   - **Files**: Create `contexts/BlockingContext.tsx`, update `app/_layout.tsx`

3. **F.6.3: Filter blocked content client-side as backup**
   - Add filtering utility function
   - Apply to all feed components
   - Filter comments, reviews, and activity items
   - **Files**: Create `utils/blockingUtils.ts`, update feed components

### Acceptance Criteria:
- [ ] Blocked users' posts don't appear in feeds
- [ ] Blocked users' comments are hidden
- [ ] Blocked users' activity is filtered out
- [ ] Blocking is bidirectional (they can't see you either)

### Testing:
```
1. User A blocks User B
2. Verify User B's content hidden for User A
3. Verify User A's content hidden for User B
4. Unblock and verify content reappears
```

---

## F.7: Fix Network Progress Counter Incorrect Calculation
**Impact**: Low | **Estimate**: 0.5d | **Status**: 🔴

### Subtasks:
1. **F.7.1: Debug network progress state logic**
   - Add console logs to track state updates
   - Identify why counter shows 0 after completion
   - Check for race conditions in state updates
   - **Files**: `contexts/AppContext.tsx`

2. **F.7.2: Fix progress calculation in AppContext**
   - Ensure state updates are synchronous
   - Use callback form of setState to avoid stale values
   - Add proper dependency arrays to useEffect hooks
   - **Files**: `contexts/AppContext.tsx`

3. **F.7.3: Update home screen progress display**
   - Calculate progress based on boolean flags
   - Show "3 of 3 completed" when all done
   - Hide section when all tasks complete
   - **Files**: `app/(tabs)/index.tsx`

### Acceptance Criteria:
- [ ] Progress shows "0 of 3" initially
- [ ] Updates to "1 of 3" after first task
- [ ] Shows "3 of 3 completed" when done
- [ ] Section hides after all completion

### Testing:
```
1. Fresh user sees "0 of 3 completed"
2. Create a board, see "1 of 3"
3. Create a post, see "2 of 3"
4. Join community, see "3 of 3"
5. Verify section hides on refresh
```

---

# SECTION 2: DATA & STATE MANAGEMENT

## D.1: Fix Board Refresh Not Propagating to All Views
**Impact**: Medium | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **D.1.1: Implement global board state management**
   - Create BoardContext for centralized state
   - Add methods for CRUD operations
   - Emit events on board changes
   - **Files**: Create `contexts/BoardContext.tsx`

2. **D.1.2: Update all board-displaying components**
   - Replace local state with context state
   - Remove individual API calls
   - Subscribe to board change events
   - **Files**: `components/home/QuickSavesBoard.tsx`, `app/(tabs)/profile.tsx`

3. **D.1.3: Add optimistic updates for better UX**
   - Update UI immediately on user action
   - Revert on API failure
   - Show success/error toasts
   - **Files**: `services/boardService.ts`, update components

### Acceptance Criteria:
- [ ] Board changes reflect everywhere instantly
- [ ] No duplicate API calls for same data
- [ ] Optimistic updates with proper rollback
- [ ] Works across tab navigation

### Testing:
```
1. Open profile and home tabs
2. Add restaurant to board on home
3. Switch to profile, verify update
4. Delete board on profile
5. Switch to home, verify removal
```

---

## D.2: Fix Notification Count Not Clearing After Read
**Impact**: Medium | **Estimate**: 0.5d | **Status**: 🔴

### Subtasks:
1. **D.2.1: Fix markAsRead API call**
   - Debug why API call isn't updating database
   - Check for proper notification IDs being sent
   - Verify RLS policies allow updates
   - **Files**: `services/notificationService.ts`

2. **D.2.2: Update notification badge logic**
   - Clear count when notification center opens
   - Recalculate count after marking as read
   - Handle batch mark-as-read operations
   - **Files**: `components/NotificationBadge.tsx`, `components/NotificationCenter.tsx`

3. **D.2.3: Add real-time notification updates**
   - Subscribe to notification changes
   - Update count when new notifications arrive
   - Clear count when notifications are read elsewhere
   - **Files**: `contexts/NotificationContext.tsx`

### Acceptance Criteria:
- [ ] Badge count clears when viewing notifications
- [ ] Count updates in real-time
- [ ] Persists correctly across app restarts
- [ ] Handles batch operations properly

### Testing:
```
1. Receive 3 notifications (badge shows 3)
2. Open notification center
3. Verify badge clears to 0
4. Close and reopen app
5. Verify count remains 0
```

---

## D.3: Fix City Selector Not Persisting Selection
**Impact**: Low | **Estimate**: 0.5d | **Status**: 🔴

### Subtasks:
1. **D.3.1: Add AsyncStorage for city preference**
   - Store selected city in AsyncStorage
   - Load saved city on app start
   - Update when user changes selection
   - **Files**: `services/storageService.ts`

2. **D.3.2: Create location context for app-wide state**
   - Manage selected city globally
   - Provide methods to update city
   - Initialize from storage or GPS
   - **Files**: Create `contexts/LocationContext.tsx`

3. **D.3.3: Update city selector component**
   - Use location context instead of local state
   - Save to storage on selection change
   - Show loading state during initialization
   - **Files**: `components/CitySelector.tsx`

### Acceptance Criteria:
- [ ] City selection persists across app restarts
- [ ] Falls back to GPS if no saved preference
- [ ] Updates all city-dependent content
- [ ] Shows correct city in selector

### Testing:
```
1. Select "Austin" in city selector
2. Kill and restart app
3. Verify Austin is still selected
4. Clear app data
5. Verify defaults to GPS location
```

---

## D.4: Fix Anonymous User State Persistence
**Impact**: High | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **D.4.1: Store anonymous state in SecureStore**
   - Save isAnonymous flag securely
   - Add timestamp for session expiry
   - Clear on explicit logout
   - **Files**: `contexts/AuthContext.tsx`, `utils/secureStorage.ts`

2. **D.4.2: Restore anonymous state on app launch**
   - Check for saved anonymous session
   - Validate session hasn't expired
   - Restore appropriate UI state
   - **Files**: `contexts/AuthContext.tsx`, `app/index.tsx`

3. **D.4.3: Handle app backgrounding properly**
   - Save state when app backgrounds
   - Restore when app foregrounds
   - Handle memory pressure scenarios
   - **Files**: `app/_layout.tsx`, add AppState listener

### Acceptance Criteria:
- [ ] Anonymous mode survives app backgrounding
- [ ] Persists for reasonable session length
- [ ] Clears on explicit sign out
- [ ] Handles edge cases gracefully

### Testing:
```
1. Choose "Browse as Guest"
2. Background app for 5 minutes
3. Reopen and verify still anonymous
4. Kill app and restart
5. Verify anonymous state preserved
```

---

# SECTION 3: PERFORMANCE OPTIMIZATION

## P.1: Optimize Image Loading in Restaurant Cards
**Impact**: High | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **P.1.1: Implement image caching strategy**
   - Install and configure FastImage library
   - Set up memory and disk cache limits
   - Add cache preloading for visible cards
   - **Files**: Install expo-fast-image, update `components/cards/RestaurantCard.tsx`

2. **P.1.2: Add progressive image loading**
   - Show blurred placeholder while loading
   - Implement lazy loading for off-screen images
   - Add image dimension optimization
   - **Files**: Create `components/common/ProgressiveImage.tsx`

3. **P.1.3: Optimize image URLs and sizes**
   - Request appropriate image sizes from API
   - Add srcset for different screen densities
   - Implement WebP format where supported
   - **Files**: `services/imageService.ts`, update components

### Acceptance Criteria:
- [ ] Smooth scrolling at 60fps
- [ ] Images load progressively
- [ ] Previously viewed images load instantly
- [ ] Memory usage stays under control

### Testing:
```
1. Scroll through 50+ restaurant cards
2. Verify no jank or stuttering
3. Check memory usage in profiler
4. Test on low-end device
5. Verify cached images load instantly
```

---

## P.2: Fix Multiple API Calls on Screen Focus
**Impact**: Medium | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **P.2.1: Implement request deduplication**
   - Create request cache with TTL
   - Check cache before making API calls
   - Return cached promise for duplicate requests
   - **Files**: Create `utils/apiCache.ts`, update `services/api.ts`

2. **P.2.2: Add focus throttling to screens**
   - Implement focus event debouncing
   - Add minimum time between refreshes
   - Skip refresh if data is fresh enough
   - **Files**: Update all tab screens, create `hooks/useFocusRefresh.ts`

3. **P.2.3: Optimize useSmoothDataFetch hook**
   - Add better cache key generation
   - Implement stale-while-revalidate pattern
   - Reduce unnecessary re-renders
   - **Files**: `hooks/useSmoothDataFetch.ts`

### Acceptance Criteria:
- [ ] No duplicate API calls within 5 seconds
- [ ] Tab switching doesn't trigger refresh if data < 1min old
- [ ] Network tab shows reduced API calls
- [ ] Data stays fresh and accurate

### Testing:
```
1. Open network inspector
2. Switch between tabs rapidly
3. Verify single API call per endpoint
4. Wait 1 minute and switch
5. Verify refresh triggers appropriately
```

---

## P.3: Implement Proper Caching for Restaurant Data
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **P.3.1: Set up Redux Persist for offline storage**
   - Install and configure redux-persist
   - Define data schemas for restaurants
   - Set up migration strategy
   - **Files**: Install packages, create `store/index.ts`

2. **P.3.2: Implement cache invalidation strategy**
   - Add timestamps to cached data
   - Define TTL for different data types
   - Create background sync mechanism
   - **Files**: Create `services/cacheService.ts`

3. **P.3.3: Add offline mode support**
   - Detect network connectivity
   - Serve cached data when offline
   - Queue actions for later sync
   - Show offline indicator
   - **Files**: Create `services/offlineService.ts`, `components/OfflineIndicator.tsx`

### Acceptance Criteria:
- [ ] App works offline with cached data
- [ ] Data syncs when connection restored
- [ ] Cache doesn't grow unbounded
- [ ] Fresh data replaces stale cache

### Testing:
```
1. Load app with connection
2. Browse several restaurants
3. Enable airplane mode
4. Verify cached content displays
5. Make changes offline
6. Restore connection and verify sync
```

---

# SECTION 4: UX/DESIGN IMPROVEMENTS

## UX.1: Redesign Onboarding Flow for Clearer Value Prop
**Impact**: Critical | **Estimate**: 3d | **Status**: 🔴

### Subtasks:
1. **UX.1.1: Create new onboarding screens**
   - Design "What brings you here?" screen
   - Create value prop carousel (3 slides)
   - Add permission request screens
   - **Files**: Create `app/onboarding/purpose.tsx`, `app/onboarding/value.tsx`

2. **UX.1.2: Implement personalized first experience**
   - Show different content based on user intent
   - Pre-populate feed with relevant content
   - Skip irrelevant onboarding steps
   - **Files**: Update `contexts/OnboardingContext.tsx`

3. **UX.1.3: Add progress indicator and skip option**
   - Show onboarding progress dots
   - Allow skipping to browse immediately
   - Save progress for returning users
   - **Files**: Create `components/onboarding/ProgressIndicator.tsx`

### Acceptance Criteria:
- [ ] Users understand app purpose in < 30 seconds
- [ ] Can skip onboarding at any point
- [ ] Personalized content based on selection
- [ ] Smooth transition to main app

### Testing:
```
1. Fresh install shows onboarding
2. Select "Find new restaurants"
3. Verify feed shows discovery content
4. Reinstall and select "Organize favorites"
5. Verify shows board creation prompt
```

---

## UX.2: Add Interactive Tutorial for First-Time Users
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.2.1: Implement tooltip coach marks**
   - Create reusable tooltip component
   - Add coach marks to key features
   - Show in sequence on first use
   - **Files**: Create `components/tutorial/Tooltip.tsx`, `components/tutorial/CoachMark.tsx`

2. **UX.2.2: Create interactive feature walkthrough**
   - Highlight save button with animation
   - Guide through creating first board
   - Show how to write a review
   - **Files**: Create `components/tutorial/FeatureTour.tsx`

3. **UX.2.3: Add help button with tutorials**
   - Create help menu in profile
   - List available tutorials
   - Track completion status
   - **Files**: Create `app/help/tutorials.tsx`

### Acceptance Criteria:
- [ ] First save shows helpful tooltip
- [ ] Can replay tutorials from help
- [ ] Dismissible but accessible
- [ ] Doesn't interfere with regular use

### Testing:
```
1. New user sees save tooltip
2. Following prompt creates board
3. Can dismiss and continue
4. Can replay from help menu
5. Doesn't show for returning users
```

---

## UX.3: Implement Progressive Disclosure for Features
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.3.1: Define feature unlock levels**
   - Level 1: Browse and search only
   - Level 2: Save and organize (after registration)
   - Level 3: Social features (after first save)
   - Level 4: Advanced features (after 5 saves)
   - **Files**: Create `services/featureGating.ts`

2. **UX.3.2: Create feature gate components**
   - Build FeatureGate wrapper component
   - Add "unlock" animations
   - Show teasers for locked features
   - **Files**: Create `components/FeatureGate.tsx`

3. **UX.3.3: Implement gradual UI revelation**
   - Hide complex features initially
   - Reveal as user demonstrates engagement
   - Celebrate feature unlocks
   - **Files**: Update all screens with gating logic

### Acceptance Criteria:
- [ ] New users see simplified interface
- [ ] Features unlock based on usage
- [ ] Clear indication of locked features
- [ ] Smooth progression feeling

### Testing:
```
1. Anonymous user sees basic UI
2. Register and see save features
3. Save 3 restaurants
4. Verify social features unlock
5. Check all features accessible eventually
```

---

## UX.4: Add Empty State Illustrations and CTAs
**Impact**: Medium | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **UX.4.1: Design empty state illustrations**
   - Create illustrations for each empty state
   - Ensure consistent visual style
   - Add subtle animations
   - **Files**: Add SVGs to `assets/illustrations/`

2. **UX.4.2: Build EmptyState component**
   - Support different empty state types
   - Include illustration, title, message, CTA
   - Make fully customizable
   - **Files**: Create `components/common/EmptyState.tsx`

3. **UX.4.3: Implement across all screens**
   - Replace text-only empty states
   - Add appropriate CTAs
   - Ensure consistent messaging
   - **Files**: Update all screens with empty states

### Acceptance Criteria:
- [ ] Every empty state has illustration
- [ ] Clear CTA to resolve empty state
- [ ] Consistent design language
- [ ] Helpful, encouraging messaging

### Testing:
```
1. New user profile shows empty state
2. CTA leads to appropriate action
3. Empty search shows helpful message
4. Empty boards prompts creation
```

---

## UX.5: Simplify Tab Navigation Structure
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.5.1: Redesign tab bar with new structure**
   - Change to: Discover | Map | [+] | Saved | You
   - Update icons to be more intuitive
   - Add labels below icons
   - **Files**: Update `app/(tabs)/_layout.tsx`

2. **UX.5.2: Consolidate scattered features**
   - Move explore into Discover tab
   - Combine activity into notifications
   - Merge add actions into FAB menu
   - **Files**: Restructure `app/(tabs)/` directory

3. **UX.5.3: Implement adaptive tab bar**
   - Hide labels on small screens
   - Show badges for updates
   - Add haptic feedback
   - **Files**: Create `components/navigation/TabBar.tsx`

### Acceptance Criteria:
- [ ] 5 clear navigation options
- [ ] Each tab has obvious purpose
- [ ] Smooth transitions between tabs
- [ ] FAB for primary actions

### Testing:
```
1. Each tab loads correct content
2. Tab icons are self-explanatory
3. Badges show for new content
4. FAB menu contains all add actions
```

---

## UX.6: Add Search as Primary Navigation Element
**Impact**: Critical | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **UX.6.1: Add persistent search bar to home**
   - Pin search bar below header
   - Show recent searches on tap
   - Add filter chips below bar
   - **Files**: Update `app/(tabs)/index.tsx`

2. **UX.6.2: Implement search suggestions**
   - Show trending searches
   - Suggest based on user history
   - Auto-complete restaurant names
   - **Files**: Create `components/search/SearchSuggestions.tsx`

3. **UX.6.3: Create dedicated search screen**
   - Full-screen search experience
   - Tabbed results (Restaurants, Users, Posts)
   - Advanced filters panel
   - **Files**: Create `app/search/index.tsx`

### Acceptance Criteria:
- [ ] Search always visible on home
- [ ] Instant search suggestions
- [ ] Filters easily accessible
- [ ] Results load quickly

### Testing:
```
1. Tap search on home screen
2. See recent and trending searches
3. Type "pizza" and see suggestions
4. Apply filters and verify results
5. Search works across all content types
```

---

## UX.7: Implement Breadcrumbs for Deep Navigation
**Impact**: Medium | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **UX.7.1: Create breadcrumb component**
   - Show navigation path
   - Make each segment tappable
   - Truncate long paths intelligently
   - **Files**: Create `components/navigation/Breadcrumbs.tsx`

2. **UX.7.2: Add navigation context tracking**
   - Track navigation stack
   - Generate breadcrumb data
   - Handle back navigation properly
   - **Files**: Create `contexts/NavigationContext.tsx`

3. **UX.7.3: Implement on deep screens**
   - Add to restaurant detail pages
   - Add to user profile pages
   - Add to board detail pages
   - **Files**: Update all detail screens

### Acceptance Criteria:
- [ ] Shows current location in app
- [ ] Can navigate to any parent level
- [ ] Doesn't take too much space
- [ ] Mobile-friendly implementation

### Testing:
```
1. Navigate to restaurant from board
2. See: Home > Saved > Board > Restaurant
3. Tap "Saved" to go directly there
4. Back button follows breadcrumb path
```

---

## UX.8: Add Quick Actions FAB for Common Tasks
**Impact**: High | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **UX.8.1: Design expandable FAB menu**
   - Main FAB with + icon
   - Expands to show 4 options
   - Smooth animation on expand/collapse
   - **Files**: Create `components/navigation/FABMenu.tsx`

2. **UX.8.2: Implement quick action options**
   - Save Restaurant (camera/search)
   - Create Post (with photo)
   - Create Board
   - Invite Friends
   - **Files**: Update action handlers

3. **UX.8.3: Add contextual intelligence**
   - Show different actions based on screen
   - Prioritize based on user behavior
   - Add labels on long press
   - **Files**: Add context awareness to FAB

### Acceptance Criteria:
- [ ] FAB visible on main screens
- [ ] Expands smoothly to show options
- [ ] Each action works correctly
- [ ] Doesn't obstruct content

### Testing:
```
1. Tap FAB to see menu expand
2. Each option navigates correctly
3. FAB hides when scrolling down
4. Shows when scrolling up
5. Position adjusts for keyboard
```

---

## UX.9: Redesign Home Feed with Personalized Content
**Impact**: Critical | **Estimate**: 3d | **Status**: 🔴

### Subtasks:
1. **UX.9.1: Implement smart feed algorithm**
   - Weight content by user preferences
   - Boost friends' activity
   - Include trending local content
   - **Files**: Create `services/feedAlgorithm.ts`

2. **UX.9.2: Create dynamic feed sections**
   - "Because you saved [Restaurant]"
   - "Popular with your friends"
   - "Trending in [City]"
   - "New in your area"
   - **Files**: Update `app/(tabs)/index.tsx`

3. **UX.9.3: Add feed customization options**
   - Let users hide certain content types
   - Adjust algorithm weights
   - Save preferences
   - **Files**: Create `app/settings/feed-preferences.tsx`

### Acceptance Criteria:
- [ ] Feed feels personally relevant
- [ ] Different content each visit
- [ ] Clear why content is shown
- [ ] Can customize preferences

### Testing:
```
1. New user sees location-based content
2. After saves, see personalized sections
3. Friend activity appears prominently
4. Hidden content types don't appear
5. Feed refreshes with new content
```

---

## UX.10: Add Location-Aware Recommendations
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.10.1: Implement geolocation service**
   - Request location permission
   - Get current GPS coordinates
   - Reverse geocode to neighborhood
   - **Files**: Update `services/locationService.ts`

2. **UX.10.2: Add distance calculations**
   - Calculate distance to restaurants
   - Show walking/driving time
   - Sort by proximity option
   - **Files**: Create `utils/distanceUtils.ts`

3. **UX.10.3: Create "Nearby Now" section**
   - Show restaurants within 1 mile
   - Filter by currently open
   - Update as user moves
   - **Files**: Add section to home screen

### Acceptance Criteria:
- [ ] Accurate current location
- [ ] Distance shown on cards
- [ ] "Nearby" section updates
- [ ] Works without location (uses city)

### Testing:
```
1. Grant location permission
2. See nearby restaurants first
3. Move location and refresh
4. Verify new nearby content
5. Deny location, still works
```

---

## UX.11: Implement Smart Filtering and Sorting
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.11.1: Build filter panel component**
   - Cuisine type multi-select
   - Price range slider
   - Distance radius selector
   - Dietary restrictions
   - **Files**: Create `components/filters/FilterPanel.tsx`

2. **UX.11.2: Add sort options**
   - Relevance (default)
   - Distance (nearest first)
   - Rating (highest first)
   - Newest/Recently added
   - Most saved
   - **Files**: Create `components/filters/SortSelector.tsx`

3. **UX.11.3: Implement filter persistence**
   - Remember last used filters
   - Quick filter presets
   - Save custom filter sets
   - **Files**: Create `services/filterService.ts`

### Acceptance Criteria:
- [ ] Filters apply instantly
- [ ] Multiple filters can combine
- [ ] Clear indication of active filters
- [ ] Can save filter presets

### Testing:
```
1. Apply cuisine + price filters
2. Results update immediately
3. Filter badges show active filters
4. Clear all removes filters
5. Saved preset applies correctly
```

---

## UX.12: Add Social Proof Indicators
**Impact**: Medium | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **UX.12.1: Add friend activity badges**
   - "3 friends saved this"
   - "John was here last week"
   - "Trending with your network"
   - **Files**: Update `components/cards/RestaurantCard.tsx`

2. **UX.12.2: Show real-time popularity**
   - "12 people viewing now"
   - "Busy - 45 min wait"
   - "Happy hour until 7pm"
   - **Files**: Add to restaurant details

3. **UX.12.3: Create social heat map**
   - Color code by popularity
   - Show peak times
   - Display check-in density
   - **Files**: Create `components/HeatMap.tsx`

### Acceptance Criteria:
- [ ] Friend activity visible on cards
- [ ] Real-time data when available
- [ ] Doesn't clutter interface
- [ ] Influences user decisions

### Testing:
```
1. Friend saves restaurant
2. See indicator on that restaurant
3. Multiple friends show count
4. Real-time data updates
5. Can tap to see friend list
```

---

## UX.13: Strengthen Visual Hierarchy
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.13.1: Audit and standardize spacing**
   - Define spacing scale (4, 8, 12, 16, 24, 32, 48)
   - Apply consistently across app
   - Create spacing utility classes
   - **Files**: Update `constants/designTokens.ts`

2. **UX.13.2: Improve typography scale**
   - Define type hierarchy (H1-H6, Body, Caption)
   - Consistent font weights
   - Proper line heights
   - **Files**: Update typography in design tokens

3. **UX.13.3: Enhance interactive elements**
   - Larger touch targets (min 44pt)
   - Clear pressed states
   - Consistent button styles
   - **Files**: Update all interactive components

### Acceptance Criteria:
- [ ] Clear content hierarchy
- [ ] Consistent spacing throughout
- [ ] Typography easy to scan
- [ ] Interactive elements obvious

### Testing:
```
1. Review each screen for hierarchy
2. Measure touch targets (≥44pt)
3. Check spacing consistency
4. Verify pressed states work
5. Test on various screen sizes
```

---

## UX.14: Improve Typography Consistency
**Impact**: Medium | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **UX.14.1: Create typography components**
   - Heading component with variants
   - Body text component
   - Caption component
   - **Files**: Create `components/typography/` directory

2. **UX.14.2: Replace all text elements**
   - Audit current text usage
   - Replace with typography components
   - Remove inline styles
   - **Files**: Update all screens

3. **UX.14.3: Add responsive font scaling**
   - Scale based on device settings
   - Support dynamic type
   - Test with accessibility settings
   - **Files**: Add scaling utilities

### Acceptance Criteria:
- [ ] Consistent fonts throughout
- [ ] Respects system font size
- [ ] No inline text styles
- [ ] Proper font loading

### Testing:
```
1. Check font consistency
2. Change system font size
3. Verify app scales properly
4. Test on tablets
5. Check font loading speed
```

---

## UX.15: Add Micro-interactions and Animations
**Impact**: Low | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.15.1: Add button press animations**
   - Scale down on press
   - Bounce back on release
   - Haptic feedback on tap
   - **Files**: Update button components

2. **UX.15.2: Implement list item animations**
   - Stagger fade-in on load
   - Swipe actions with spring
   - Pull-to-refresh animation
   - **Files**: Update list components

3. **UX.15.3: Add success/error animations**
   - Checkmark animation on save
   - Shake animation on error
   - Loading skeletons
   - **Files**: Create animation components

### Acceptance Criteria:
- [ ] Animations feel natural
- [ ] Don't impact performance
- [ ] Can be disabled in settings
- [ ] Consistent timing (300ms standard)

### Testing:
```
1. Press buttons see scale animation
2. Lists load with stagger effect
3. Save shows success animation
4. Errors shake appropriately
5. Can disable in accessibility
```

---

## UX.16: Implement Dark Mode Support
**Impact**: Medium | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **UX.16.1: Create dark theme palette**
   - Define dark mode colors
   - Ensure proper contrast ratios
   - Test with accessibility tools
   - **Files**: Add to `constants/theme.ts`

2. **UX.16.2: Implement theme switching**
   - Add theme context
   - System preference detection
   - Manual toggle in settings
   - **Files**: Create `contexts/ThemeContext.tsx`

3. **UX.16.3: Update all components**
   - Use theme colors everywhere
   - Test both modes thoroughly
   - Handle images/logos properly
   - **Files**: Update all components

### Acceptance Criteria:
- [ ] Follows system preference
- [ ] Manual toggle works
- [ ] All screens support dark mode
- [ ] Proper contrast maintained

### Testing:
```
1. System dark mode activates app dark mode
2. Manual toggle overrides system
3. All screens render correctly
4. Images/icons visible in both modes
5. Preference persists on restart
```

---

# SECTION 5: FEATURE ENHANCEMENTS

## E.1: Save TikTok/Instagram Posts with Context
**Impact**: High | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **E.1.1: Add link parser for social media**
   - Detect TikTok/Instagram URLs
   - Extract video/post ID
   - Fetch post metadata via API
   - **Files**: Create `services/socialMediaParser.ts`

2. **E.1.2: Create link attachment UI**
   - Add link input field
   - Show preview of social post
   - Allow adding notes
   - **Files**: Update `app/add/save-restaurant.tsx`

3. **E.1.3: Store and display social context**
   - Save link with restaurant
   - Show preview on restaurant card
   - Link to original post
   - **Files**: Update database schema and components

### Acceptance Criteria:
- [ ] Can paste TikTok/Instagram links
- [ ] Preview shows before saving
- [ ] Link saved with restaurant
- [ ] Can view original post

### Testing:
```
1. Copy TikTok restaurant video URL
2. Add to restaurant save
3. See preview of video
4. Save with note
5. Verify displays on restaurant
```

---

## E.2: Add Map View for Restaurant Discovery
**Impact**: Critical | **Estimate**: 3d | **Status**: 🔴

### Subtasks:
1. **E.2.1: Integrate map library**
   - Install react-native-maps
   - Configure for iOS and Android
   - Add API keys
   - **Files**: Configure map library

2. **E.2.2: Create map view screen**
   - Show user location
   - Plot restaurant markers
   - Cluster nearby restaurants
   - **Files**: Create `app/(tabs)/map.tsx`

3. **E.2.3: Add map interactions**
   - Tap marker for preview
   - Swipe up for details
   - Filter markers by criteria
   - Search within map area
   - **Files**: Add interaction handlers

### Acceptance Criteria:
- [ ] Map loads with restaurants
- [ ] Can see current location
- [ ] Markers are tappable
- [ ] Smooth pan and zoom
- [ ] Filters apply to markers

### Testing:
```
1. Open map tab
2. See nearby restaurants
3. Tap marker for preview
4. Apply filter, markers update
5. Search updates visible area
```

---

## E.3: Implement "Similar Restaurants" Feature
**Impact**: Medium | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **E.3.1: Build similarity algorithm**
   - Compare cuisine types
   - Match price ranges
   - Consider user save patterns
   - **Files**: Create `services/similarityService.ts`

2. **E.3.2: Add similar section to details**
   - Show 3-5 similar restaurants
   - Explain why they're similar
   - Allow horizontal scrolling
   - **Files**: Update `app/restaurant/[id].tsx`

3. **E.3.3: Create "More Like This" action**
   - Add button to restaurant cards
   - Navigate to similar list
   - Learn from user choices
   - **Files**: Add to restaurant actions

### Acceptance Criteria:
- [ ] Shows relevant similar options
- [ ] Clear why they're similar
- [ ] Updates based on user behavior
- [ ] At least 3 suggestions always

### Testing:
```
1. View Italian restaurant
2. See similar Italian places
3. Similar price range shown
4. Tap to view similar restaurant
5. Algorithm improves over time
```

---

## E.4: Add Dietary Preference Filters
**Impact**: High | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **E.4.1: Add dietary fields to database**
   - Vegetarian, Vegan, Gluten-free
   - Halal, Kosher options
   - Allergen information
   - **Files**: Update database schema

2. **E.4.2: Create dietary filter UI**
   - Add to main filter panel
   - Quick toggle buttons
   - Save preferences to profile
   - **Files**: Update filter components

3. **E.4.3: Source dietary data**
   - Parse from Google Places
   - Allow user contributions
   - Verify with restaurant websites
   - **Files**: Update data import service

### Acceptance Criteria:
- [ ] Can filter by dietary needs
- [ ] Preferences save to profile
- [ ] Applied by default when set
- [ ] Data is accurate

### Testing:
```
1. Set vegan preference
2. Search shows vegan options
3. Filter persists across sessions
4. Can combine with other filters
5. Clear dietary filter works
```

---

## E.5: Add Group Dining Planning
**Impact**: Medium | **Estimate**: 3d | **Status**: 🔴

### Subtasks:
1. **E.5.1: Create group planning model**
   - Group creation with invites
   - Voting on restaurants
   - Schedule coordination
   - **Files**: Create group planning schema

2. **E.5.2: Build planning interface**
   - Create/join group screen
   - Restaurant voting UI
   - Calendar integration
   - **Files**: Create `app/groups/` directory

3. **E.5.3: Add notifications for groups**
   - Invite notifications
   - Vote reminders
   - Final decision alerts
   - **Files**: Update notification service

### Acceptance Criteria:
- [ ] Can create dining group
- [ ] Members can vote on options
- [ ] Schedule picker works
- [ ] Notifications keep group informed

### Testing:
```
1. Create group with 3 friends
2. Each suggests restaurants
3. Vote on options
4. Pick date/time
5. All receive confirmation
```

---

## E.6: Implement Friend Recommendations
**Impact**: High | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **E.6.1: Create friend feed algorithm**
   - Aggregate friend activity
   - Weight by relationship strength
   - Time-decay old activity
   - **Files**: Create `services/friendFeedService.ts`

2. **E.6.2: Add friends section to home**
   - "Your friends love"
   - Recent friend saves
   - Friend check-ins nearby
   - **Files**: Update home screen

3. **E.6.3: Build friend comparison view**
   - Shared restaurants
   - Different preferences
   - Compatibility score
   - **Files**: Create `app/friends/compare.tsx`

### Acceptance Criteria:
- [ ] See what friends are saving
- [ ] Friend content prioritized
- [ ] Can compare tastes
- [ ] Privacy settings respected

### Testing:
```
1. Friend saves restaurant
2. Appears in your feed
3. Shows "Friend saved this"
4. Can see all friend activity
5. Private saves not shown
```

---

## E.7: Add Restaurant Check-ins
**Impact**: Low | **Estimate**: 1d | **Status**: 🔴

### Subtasks:
1. **E.7.1: Implement check-in functionality**
   - Geofencing for auto-prompt
   - Manual check-in option
   - Photo with check-in
   - **Files**: Create `services/checkInService.ts`

2. **E.7.2: Add check-in UI elements**
   - Check-in button on restaurant
   - Current visitors display
   - Check-in history
   - **Files**: Update restaurant screens

3. **E.7.3: Create check-in rewards**
   - Streak tracking
   - Badges for milestones
   - Leaderboards
   - **Files**: Create gamification system

### Acceptance Criteria:
- [ ] Can check in at restaurant
- [ ] Shows who's currently there
- [ ] Tracks visit history
- [ ] Earns rewards/badges

### Testing:
```
1. Visit restaurant location
2. Get check-in prompt
3. Check in with photo
4. See on profile history
5. Earn "Regular" badge after 3 visits
```

---

## E.8: Create Community Challenges
**Impact**: Low | **Estimate**: 2d | **Status**: 🔴

### Subtasks:
1. **E.8.1: Design challenge system**
   - Monthly themed challenges
   - Point scoring system
   - Leaderboards
   - **Files**: Create challenge schema

2. **E.8.2: Build challenge interface**
   - Active challenges list
   - Progress tracking
   - Submission flow
   - **Files**: Create `app/challenges/` directory

3. **E.8.3: Add challenge notifications**
   - New challenge alerts
   - Progress reminders
   - Winner announcements
   - **Files**: Update notification system

### Acceptance Criteria:
- [ ] Can join challenges
- [ ] Progress tracked automatically
- [ ] Leaderboard updates live
- [ ] Rewards for completion

### Testing:
```
1. Join "Try 5 New Cuisines" challenge
2. Save restaurants of different cuisines
3. See progress update
4. Complete challenge
5. Receive badge/reward
```

---

# TESTING CHECKLIST

## Functional Testing
- [ ] All saves persist correctly
- [ ] Navigation works as expected
- [ ] Data syncs across views
- [ ] Error states handled gracefully
- [ ] Offline mode works

## Performance Testing
- [ ] App loads in < 3 seconds
- [ ] Scrolling at 60fps
- [ ] Images load progressively
- [ ] Memory usage stable
- [ ] Battery usage reasonable

## UX Testing
- [ ] Onboarding takes < 1 minute
- [ ] Core actions take < 3 taps
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Empty states have CTAs

## Accessibility Testing
- [ ] Works with VoiceOver/TalkBack
- [ ] Minimum touch targets 44pt
- [ ] Sufficient color contrast
- [ ] Text scales properly
- [ ] Reduced motion respected

## Device Testing
- [ ] iPhone 12 and newer
- [ ] iPhone SE (small screen)
- [ ] iPad (tablet layout)
- [ ] Android phones
- [ ] Various OS versions

---

# IMPLEMENTATION NOTES

## Dependencies to Add
```json
{
  "expo-fast-image": "^1.0.0",
  "react-native-maps": "^1.0.0",
  "redux-persist": "^6.0.0",
  "@react-native-async-storage/async-storage": "^1.0.0",
  "react-native-reanimated": "^3.0.0"
}
```

## Database Migrations Required
1. Add social_links table for E.1
2. Add dietary_info to restaurants for E.4
3. Add check_ins table for E.7
4. Add groups and group_members for E.5
5. Add challenges tables for E.8

## API Endpoints Needed
1. GET /api/restaurants/similar/:id
2. POST /api/check-ins
3. GET /api/feed/personalized
4. POST /api/groups
5. GET /api/challenges/active

## Performance Budgets
- Initial load: < 3s
- Time to interactive: < 5s
- API response time: < 500ms
- Image load time: < 1s
- Memory usage: < 200MB

---

_Last Updated: January 20, 2025_
_Total Tasks: 35 main tasks, 105 subtasks_
_Estimated Total Effort: ~45 days_