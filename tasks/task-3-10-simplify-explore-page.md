# Task 3.10: Simplify Explore Page for MVP

## Overview
Simplify the Explore page to focus on restaurant discovery and posts with a clean, uncluttered experience. Remove complex filters and implement a simple tab-based interface.

## Status
✅ **Completed**

## Priority
High

## Estimate
2 days

## Dependencies
- Task 2.2 (Restaurant Search & Discovery) - for restaurant data
- Task 6.2 (Post Creation & Management) - for posts data

## Requirements

### Core Functionality
1. **Two-Tab Interface**
   - "Restaurants" tab - Show restaurant discovery
   - "Posts" tab - Show all posts from the network

2. **Restaurant Tab Features**
   - Display restaurants in a clean card format
   - Search functionality for restaurants
   - Pull-to-refresh
   - Loading states and error handling
   - Navigate to restaurant detail on tap

3. **Posts Tab Features**
   - Display posts from the network
   - Search functionality for posts
   - Pull-to-refresh
   - Loading states and error handling
   - Navigate to post detail on tap

### UI/UX Requirements
1. **Remove Complex Filters**
   - Remove horizontal filter pills (All, Friends, Trending, etc.)
   - Remove filter button in search bar
   - Keep only search functionality

2. **Clean Header**
   - Title: "Explore"
   - Subtitle: "Discover through your network"
   - Search bar with restaurant/post search
   - Simple tab switcher

3. **Tab Design**
   - Use standard tab design (underlined active state)
   - "Restaurants" and "Posts" tabs
   - Smooth tab switching

### Technical Requirements
1. **Base Implementation**
   - Use provided old explore.tsx code as base
   - Adapt for new simplified structure
   - Maintain existing styling and design tokens

2. **Data Integration**
   - Restaurant tab: Use restaurantService.getRestaurantsByCity()
   - Posts tab: Use postService.getExplorePosts()
   - Handle loading, error, and empty states

3. **Navigation**
   - Restaurant tap → /restaurant/[id]
   - Post tap → /posts/[id]

## Implementation Steps

### Step 1: Create Tab Structure
1. Add tab state management
2. Create tab header component
3. Implement tab switching logic

### Step 2: Restaurant Tab Implementation
1. Adapt restaurant loading logic from old code
2. Implement restaurant search functionality
3. Create restaurant card display
4. Add navigation to restaurant detail

### Step 3: Posts Tab Implementation
1. Use existing post loading logic
2. Implement post search functionality
3. Use existing PostCard component
4. Add navigation to post detail

### Step 4: Clean Up UI
1. Remove filter components
2. Simplify header layout
3. Ensure consistent styling
4. Test responsive design

### Step 5: Testing & Polish
1. Test tab switching
2. Test search functionality
3. Test navigation flows
4. Test loading and error states
5. Test pull-to-refresh

## Acceptance Criteria
- [ ] Two-tab interface works smoothly
- [ ] Restaurant tab shows restaurants with search
- [ ] Posts tab shows posts with search
- [ ] No filter pills or complex filtering
- [ ] Clean, uncluttered UI
- [ ] Proper loading and error states
- [ ] Navigation works correctly
- [ ] Pull-to-refresh works on both tabs
- [ ] Search works on both tabs

## Files to Modify
- `app/(tabs)/explore.tsx` - Main explore screen
- `components/cards/ExplorePostCard.tsx` - May need updates
- `types/core.ts` - May need type updates

## Notes
- This task simplifies the explore experience for MVP
- Focus on core discovery functionality
- Can add advanced filters back in future iterations
- Should maintain existing design system and tokens 