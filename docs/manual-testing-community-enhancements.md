# Manual Testing Guide: Community Detail Screen Enhancements

## Overview
This document provides step-by-step instructions for manually testing the enhanced community detail screen features implemented in task 4.4.

## Prerequisites
- Troodie app running locally
- Test user account created and logged in
- At least one community created (public or private)
- Expo development server running

## Test Scenarios

### 1. View Real Community Members

**Steps:**
1. Navigate to the Explore tab
2. Select the Communities section
3. Tap on any community card to open details
4. Tap on the "Members" tab

**Expected Results:**
- [ ] Member count displays correctly (not mock data)
- [ ] Each member shows their real profile picture (or placeholder if none)
- [ ] Member names are displayed
- [ ] Member bio or "Member" text is shown
- [ ] Join date is displayed (e.g., "Joined 2 days ago")
- [ ] Admin/Owner members show a golden crown badge
- [ ] Member list scrolls smoothly

### 2. Navigate to Member Profiles

**Steps:**
1. While on the Members tab
2. Tap on any member in the list

**Expected Results:**
- [ ] App navigates to the member's profile screen
- [ ] Profile shows correct user information
- [ ] Back button returns to community detail screen
- [ ] Navigation is smooth without crashes

### 3. View Real Community Posts

**Steps:**
1. Navigate to a community detail screen
2. Ensure you're on the "Feed" tab (default)

**Expected Results:**
- [ ] Posts from actual community members are displayed
- [ ] Each post shows the author's profile picture
- [ ] Author name and post timestamp are visible
- [ ] Post caption/content is displayed
- [ ] Restaurant name shown if tagged
- [ ] Like and comment counts are accurate
- [ ] Posts are ordered by most recent first

### 4. Create Post in Community

**Steps:**
1. Join a community if not already a member
2. On the community detail screen (Feed tab)
3. Look for the floating "Create Post" button (bottom right)
4. Tap the Create Post button

**Expected Results:**
- [ ] Create Post button only appears for community members
- [ ] Tapping button navigates to create post screen
- [ ] Header shows "Post to [Community Name]"
- [ ] Community context banner shows below header
- [ ] Creating a post adds it to the community feed
- [ ] New post appears at the top of the feed after creation

### 5. Leave Community

**Steps:**
1. Join a public community if not already a member
2. On the community detail screen
3. Tap the "Leave Community" button
4. Confirm the action when prompted

**Expected Results:**
- [ ] Confirmation dialog appears before leaving
- [ ] After leaving, button changes to "Join Community"
- [ ] Member count decreases by 1
- [ ] Create Post button disappears
- [ ] User can rejoin the community

### 6. Admin Edit Community

**Steps:**
1. Navigate to a community where you are an admin/owner
2. Look for the three-dot menu icon in the header
3. Tap the menu icon
4. Select "Edit Community"

**Expected Results:**
- [ ] Menu icon only appears for admin/owner users
- [ ] Menu opens with "Edit Community" option
- [ ] Tapping option navigates to edit screen
- [ ] Edit screen shows current community details
- [ ] Can update name, description, and location
- [ ] Character counters work correctly
- [ ] Save button updates the community
- [ ] Changes reflect immediately on detail screen

### 7. Pull to Refresh

**Steps:**
1. On any community detail screen
2. Pull down on the screen to trigger refresh

**Expected Results:**
- [ ] Refresh indicator appears
- [ ] All data reloads (members, posts, community info)
- [ ] Any new members or posts appear
- [ ] Loading completes smoothly

### 8. Empty States

**Test 8a: No Posts**
1. Find or create a community with no posts
2. View the Feed tab

**Expected Results:**
- [ ] Empty state icon displayed
- [ ] "No posts yet" message shown
- [ ] Encouraging message to create first post

**Test 8b: No Members**
1. Create a new community (you'll be the only member)
2. View the Members tab

**Expected Results:**
- [ ] Shows you as the only member
- [ ] Correct member count (1)

### 9. Private Community Behavior

**Steps:**
1. Find a private community you're not a member of
2. View the community detail screen

**Expected Results:**
- [ ] Private badge shown on community
- [ ] No Join button available
- [ ] Message indicating invitation required
- [ ] Cannot see members or posts

### 10. Performance Testing

**Steps:**
1. Join a community with many members (50+)
2. Switch between tabs rapidly
3. Scroll through long lists

**Expected Results:**
- [ ] Smooth scrolling without lag
- [ ] Tab switching is responsive
- [ ] Images load progressively
- [ ] No app crashes or freezes

## Error Scenarios

### Network Errors
1. Turn off internet connection
2. Try to load community details

**Expected:**
- [ ] Error message displayed
- [ ] Option to retry
- [ ] App doesn't crash

### Permission Errors
1. Try to edit a community you don't own
2. Attempt to access private community content

**Expected:**
- [ ] Appropriate error messages
- [ ] No unauthorized access
- [ ] Graceful handling

## Regression Testing

### Existing Features
- [ ] Community creation still works
- [ ] Joining communities functions properly
- [ ] Community search/discovery unchanged
- [ ] Navigation between screens smooth
- [ ] Other app features unaffected

## Known Issues
- Event-based community features show event tab but functionality not implemented
- Very long community names may truncate in some views
- Pagination not implemented for very large member lists

## Test Data Setup

To properly test all features, ensure you have:
1. At least 2 test user accounts
2. 1 public community where you're admin
3. 1 public community where you're a member
4. 1 private community
5. Several test posts in communities
6. Mix of members with and without profile pictures

## Reporting Issues

When reporting bugs, include:
- Device type and OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Any error messages
- Community ID if specific to one community