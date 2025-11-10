# Manual Testing Guide: External Content Posts & Redesigned Create Post Screen

## Overview
This guide covers testing for:
1. The redesigned compact Twitter-style create post screen
2. External content post functionality (TikTok, Instagram, articles, etc.)
3. Enhanced post display with external content preview

## Prerequisites
- Troodie app running locally
- Test user account created and logged in
- Expo development server running

## Test Scenarios

### 1. Compact Create Post Screen

**Steps:**
1. Navigate to any screen with a create post action
2. Tap the create post button

**Expected Results:**
- [ ] Compact composer appears with user avatar on the left
- [ ] Clean, minimal interface similar to Twitter's composer
- [ ] Caption input is auto-focused
- [ ] Attachment bar is visible at the bottom
- [ ] Character count shows 0/500

### 2. Content Type Toggle

**Steps:**
1. On the create post screen, before typing anything
2. Look for the content type toggle buttons

**Expected Results:**
- [ ] "Original" and "External" toggle buttons are visible
- [ ] "Original" is selected by default
- [ ] Clicking "External" switches the mode
- [ ] Toggle disappears once content is added

### 3. Restaurant Selection (Required)

**Steps:**
1. Look at the attachment bar
2. Notice the location icon (first icon)
3. Try to publish without selecting a restaurant

**Expected Results:**
- [ ] Location icon shows in red color
- [ ] Red dot indicator shows it's required
- [ ] Post button is disabled until restaurant is selected
- [ ] Tapping icon opens restaurant search modal

### 4. Create Original Content Post

**Steps:**
1. Select "Original" content type
2. Type a caption
3. Select a restaurant (required)
4. Add photos using the image icon
5. Add a rating using the star icon
6. Tap "Post" to publish

**Expected Results:**
- [ ] Photos appear as thumbnails below caption
- [ ] Can add up to 10 photos
- [ ] Photo count badge shows on icon
- [ ] Rating sheet shows traffic light system (green/yellow/red)
- [ ] Selected rating appears as preview
- [ ] Post publishes successfully

### 5. Create External Content Post

**Steps:**
1. Select "External" content type
2. Type a caption
3. Paste a URL (TikTok, Instagram, YouTube, or article)
4. Select a restaurant
5. Tap "Post" to publish

**Expected Results:**
- [ ] URL input field appears when "External" is selected
- [ ] Pasting URL shows preview with:
  - Thumbnail image
  - Title
  - Source platform icon
  - Author (if available)
- [ ] Can remove external content with X button
- [ ] Photos attachment is hidden for external posts
- [ ] Post publishes with external content

### 6. View External Content in Feed

**Steps:**
1. Create an external content post
2. Navigate to feed/activity
3. Find the post you created

**Expected Results:**
- [ ] Post shows "External Content" badge with link icon
- [ ] External content preview card is displayed
- [ ] Preview shows source platform icon and name
- [ ] Tapping preview opens the original URL
- [ ] Regular post actions (like, comment, save) work

### 7. Additional Details

**Steps:**
1. On create post screen, tap the ellipsis (...) icon
2. Bottom sheet opens with additional options

**Expected Results:**
- [ ] Visit Type selector (Dine In, Takeout, Delivery)
- [ ] Price Range selector ($, $$, $$$, $$$$)
- [ ] Privacy selector (Public, Friends, Private)
- [ ] Selections persist when sheet is closed
- [ ] Options apply to the post when published

### 8. Community Posting

**Steps:**
1. Navigate to a community you're a member of
2. Tap the Create Post button
3. Create a post

**Expected Results:**
- [ ] Header shows "Post to [Community Name]"
- [ ] Community context banner appears below header
- [ ] Post is created in the community
- [ ] Post appears in community feed

### 9. Attachment Bar Functionality

**Steps:**
1. Test each icon in the attachment bar

**Expected Results:**
- [ ] Location icon - Opens restaurant search (required)
- [ ] Images icon - Opens photo picker (original content only)
- [ ] Star icon - Opens rating sheet (original content only)
- [ ] Ellipsis icon - Opens additional details
- [ ] Icons show active state with orange color when used
- [ ] Character count updates as you type

### 10. URL Validation

**Steps:**
1. Select External content type
2. Try different URL formats

**Test URLs:**
- https://www.tiktok.com/@username/video/123
- https://www.instagram.com/p/ABC123/
- https://www.youtube.com/watch?v=xyz
- https://medium.com/article-title
- https://invalidurl

**Expected Results:**
- [ ] Valid URLs show appropriate preview
- [ ] Platform is correctly detected
- [ ] Invalid URLs show generic preview
- [ ] Source icon matches the platform

## Edge Cases

### Empty States
- [ ] Cannot post without caption or content
- [ ] Cannot post without selecting restaurant
- [ ] Empty external URL field shows placeholder

### Character Limits
- [ ] Caption limited to 500 characters
- [ ] Character count turns red when approaching limit
- [ ] Cannot type beyond 500 characters

### Photo Limits
- [ ] Cannot add more than 10 photos
- [ ] Photo button disabled at limit
- [ ] Can remove photos to add new ones

## Performance Testing

### Load Times
- [ ] Create post screen opens instantly
- [ ] Photo selection is responsive
- [ ] URL preview loads quickly
- [ ] Post creation completes in < 2 seconds

### Memory Usage
- [ ] App remains responsive with 10 photos
- [ ] No crashes when switching content types
- [ ] Smooth scrolling in restaurant search

## Accessibility Testing

### Screen Reader
- [ ] All buttons have proper labels
- [ ] Content type toggle is announced
- [ ] Character count is accessible
- [ ] Modal sheets are announced

### Keyboard Navigation
- [ ] Can navigate with keyboard (web)
- [ ] Tab order is logical
- [ ] Enter key submits forms where appropriate

## Cross-Platform Testing

### iOS
- [ ] All features work on iPhone
- [ ] Keyboard doesn't cover input
- [ ] Modals display correctly

### Android
- [ ] All features work on Android
- [ ] Back button behavior is correct
- [ ] Permissions work for photos

### Web
- [ ] Desktop layout is responsive
- [ ] Mouse interactions work
- [ ] Keyboard shortcuts functional

## Known Issues
- Link metadata is currently mocked (not fetching real data)
- Some external platform icons may not display
- Traffic light rating system uses placeholder logic

## Reporting Bugs

When reporting issues, include:
1. Device type and OS version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots/videos if applicable
5. Any error messages
6. Network logs if relevant