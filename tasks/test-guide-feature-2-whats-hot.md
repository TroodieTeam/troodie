# Test Guide: Location-Aware "What's Hot Right Now" Feature

## Overview
This test guide covers the new location-aware functionality for the "What's Hot Right Now" section, allowing users to see trending restaurants based on their current or selected city.

## Prerequisites
- App installed with location permissions capability
- User account logged in
- Device with GPS capability (for location testing)
- Access to device location settings

## Test Cities Available
```
Charlotte, NC (Default)
New York, NY
Los Angeles, CA
Chicago, IL
Houston, TX
Miami, FL
San Francisco, CA
Seattle, WA
Boston, MA
Atlanta, GA
```

---

## Test Scenarios

### 1. Initial Load - Default City
**Objective:** Verify default city loads on first app launch

**Steps:**
1. Fresh install the app (or clear app data)
2. Complete login/onboarding
3. Navigate to Home tab
4. Look at "What's Hot Right Now" section

**Expected Results:**
- [ ] Section title shows "What's Hot Right Now"
- [ ] Small city pill shows "Charlotte" (default)
- [ ] Pill has location pin icon (orange)
- [ ] Pill has dropdown arrow indicator
- [ ] Trending restaurants load for Charlotte
- [ ] No location permission prompt yet

**Screenshot Points:** Default state with Charlotte selected

---

### 2. City Selector Interaction
**Objective:** Test the city selector UI

**Steps:**
1. On Home tab, locate "What's Hot Right Now"
2. Tap the city pill (e.g., "Charlotte")
3. Observe the modal that opens

**Expected Results:**
- [ ] Modal slides up from bottom
- [ ] Modal title shows "Select City"
- [ ] X button visible in top right
- [ ] "Use Current Location" button visible with pin icon
- [ ] List of 10 cities displayed
- [ ] Current city (Charlotte) is highlighted
- [ ] Each city shows "City, State" format
- [ ] Modal has smooth open animation

**Screenshot Points:** City selector modal open

---

### 3. Manual City Selection
**Objective:** Test manually selecting different cities

**Steps:**
1. Open city selector
2. Tap "New York" from the list
3. Observe the changes

**Expected Results:**
- [ ] New York becomes highlighted
- [ ] Modal closes automatically
- [ ] City pill updates to show "New York"
- [ ] Loading indicator appears briefly
- [ ] Trending restaurants refresh
- [ ] New content is different from Charlotte
- [ ] No location permission triggered

**Repeat for these cities:**
- [ ] Los Angeles
- [ ] Chicago
- [ ] Miami
- [ ] San Francisco

**Screenshot Points:** Each city's trending content

---

### 4. Location Permission - First Time
**Objective:** Test location detection with permission flow

**Steps:**
1. Ensure location permission not yet granted
2. Open city selector
3. Tap "Use Current Location"
4. Observe permission dialog

**Expected Results:**
- [ ] System permission dialog appears
- [ ] Dialog explains need for location
- [ ] Options: "Allow While Using App" / "Don't Allow"
- [ ] If allowed, detecting animation shows
- [ ] City updates to actual location (if supported)
- [ ] If denied, stays on current city
- [ ] Appropriate feedback for denial

**Screenshot Points:** Permission dialog, detecting state

---

### 5. Location Detection - Permission Granted
**Objective:** Test automatic location detection

**Steps:**
1. Ensure location permission is granted
2. Open city selector
3. Tap "Use Current Location"
4. Wait for detection

**Expected Results:**
- [ ] "Detecting..." text appears
- [ ] Location detection completes in < 3 seconds
- [ ] If user is in supported city, it selects that city
- [ ] If user is not in supported city, selects closest/default
- [ ] Modal closes after detection
- [ ] Trending content updates for detected city
- [ ] City pill shows detected location

**Test in different locations (simulator):**
- [ ] Set location to New York coordinates
- [ ] Set location to rural area (should default)
- [ ] Set location to international (should default)

---

### 6. Location Permission - Previously Denied
**Objective:** Test behavior when permission was denied

**Steps:**
1. Ensure location permission is denied in settings
2. Open city selector
3. Tap "Use Current Location"

**Expected Results:**
- [ ] Alert appears explaining permission needed
- [ ] Alert title: "Location Permission"
- [ ] Message explains need for permission
- [ ] Options: "Cancel" / "Grant Permission"
- [ ] "Grant Permission" opens app settings
- [ ] "Cancel" dismisses alert
- [ ] City selection remains unchanged

**Screenshot Points:** Permission denied alert

---

### 7. City Persistence - Session
**Objective:** Verify selected city persists during session

**Steps:**
1. Select "Miami" from city selector
2. Navigate to other tabs (Explore, Profile, etc.)
3. Return to Home tab
4. Check city selection

**Expected Results:**
- [ ] City remains "Miami"
- [ ] Trending content still for Miami
- [ ] No reload/refresh needed
- [ ] Selection persists across navigation

**Additional persistence tests:**
- [ ] Create a post (city persists)
- [ ] View restaurant details (city persists)
- [ ] Pull to refresh (city persists)

---

### 8. City Persistence - App Restart
**Objective:** Test city persistence across app restarts

**Steps:**
1. Select "Boston" from selector
2. Force quit the app
3. Reopen the app
4. Navigate to Home

**Expected Results:**
- [ ] City pill shows "Boston"
- [ ] Trending content is for Boston
- [ ] No location detection triggered
- [ ] Manual selection is remembered

---

### 9. Manual Override vs Auto-Detect
**Objective:** Test override behavior

**Steps:**
1. Manually select "Seattle"
2. Close and reopen selector
3. Tap "Use Current Location" (you're not in Seattle)
4. Observe behavior

**Expected Results:**
- [ ] Location detects actual location
- [ ] Overrides manual Seattle selection
- [ ] Updates to detected city
- [ ] Trending content refreshes
- [ ] Manual override flag is cleared

**Then test reverse:**
1. Use current location first
2. Then manually select different city
3. Verify manual overrides auto-detect

---

### 10. Content Refresh on City Change
**Objective:** Verify content updates properly

**Steps:**
1. Note current trending restaurants
2. Change city from Charlotte to New York
3. Compare restaurant lists

**Expected Results:**
- [ ] Loading indicator during refresh
- [ ] Different restaurants appear
- [ ] Restaurant cards show NYC locations
- [ ] Cuisine types may differ
- [ ] Price ranges may differ
- [ ] No error if few results

**Test rapid city changes:**
- [ ] Change cities 5 times quickly
- [ ] Each change loads correct content
- [ ] No crashes or freezes
- [ ] Previous requests cancel properly

---

### 11. Empty State Handling
**Objective:** Test when city has no trending data

**Steps:**
1. Select different cities
2. Find one with no trending data (if any)
3. Observe empty state

**Expected Results:**
- [ ] Appropriate empty message
- [ ] Suggestion to try different city
- [ ] City selector remains functional
- [ ] Can switch to city with data
- [ ] No error messages shown

---

### 12. Error Handling
**Objective:** Test error scenarios

**Steps for each scenario:**

**No Internet:**
1. Enable airplane mode
2. Try to change city
- [ ] Error message appears
- [ ] Current city remains selected
- [ ] Can retry when connected

**Server Error:**
1. If API returns error
- [ ] Graceful error message
- [ ] Fallback to cached data if available
- [ ] Retry option provided

**GPS Failure:**
1. Disable location services
2. Try "Use Current Location"
- [ ] Appropriate error message
- [ ] Suggests enabling location
- [ ] Manual selection still works

---

### 13. Pull to Refresh
**Objective:** Test refresh with location context

**Steps:**
1. Select "Miami"
2. Pull down to refresh Home screen
3. Observe behavior

**Expected Results:**
- [ ] Refresh animation appears
- [ ] City selection remains "Miami"
- [ ] Content refreshes for Miami
- [ ] No city reset to default
- [ ] Updated timestamp if shown

---

### 14. Cross-Feature Integration
**Objective:** Ensure location doesn't affect other features

**Steps:**
1. Set city to "Los Angeles"
2. Test these features:

**Search:**
- [ ] Search works independently
- [ ] Can search any location
- [ ] Results not limited to LA

**Restaurant Details:**
- [ ] Can view any restaurant
- [ ] Not limited to selected city

**Create Post:**
- [ ] Can tag any restaurant
- [ ] Not limited to selected city

**Profile:**
- [ ] Saves show all cities
- [ ] History shows all cities

---

### 15. Visual Consistency
**Objective:** Verify UI consistency across cities

**For each city, verify:**
- [ ] City name fits in pill (no truncation)
- [ ] Consistent pill styling
- [ ] Location icon color consistent
- [ ] Dropdown arrow aligned
- [ ] Text legible on all backgrounds
- [ ] Smooth transitions between cities

**Different screen sizes:**
- [ ] Test on small screen (iPhone SE)
- [ ] Test on large screen (iPad)
- [ ] City pill scales appropriately
- [ ] Modal height appropriate

---

### 16. Performance Testing
**Objective:** Ensure smooth performance

**Metrics to measure:**
- City selector open time: _____ms
- City change to content refresh: _____ms
- Location detection time: _____ms
- Content load time per city: _____ms

**Stress tests:**
- [ ] Change cities 20 times rapidly
- [ ] Open/close selector 20 times
- [ ] App remains responsive
- [ ] No memory leaks
- [ ] No crashes

---

### 17. Accessibility Testing
**Objective:** Verify accessibility support

**Steps:**
1. Enable VoiceOver/TalkBack
2. Navigate to city selector
3. Test city selection

**Expected Results:**
- [ ] City pill announced as button
- [ ] Current city announced
- [ ] Modal navigation works
- [ ] Each city option readable
- [ ] Selected state announced
- [ ] Use Current Location accessible

**Visual accessibility:**
- [ ] Works with large text
- [ ] Works with bold text
- [ ] Sufficient color contrast
- [ ] Works with color filters

---

### 18. Location Spoofing (Developer Testing)
**Objective:** Test with simulated locations

**Using Xcode/Android Studio:**
1. Set location to each test city
2. Use "Current Location" feature
3. Verify correct city selected

**Test coordinates:**
- Charlotte: 35.2271° N, 80.8431° W
- New York: 40.7128° N, 74.0060° W
- Los Angeles: 34.0522° N, 118.2437° W
- Chicago: 41.8781° N, 87.6298° W
- Miami: 25.7617° N, 80.1918° W

---

### 19. Offline Cache
**Objective:** Test offline behavior

**Steps:**
1. Select "Boston" while online
2. View trending content
3. Enable airplane mode
4. Force quit and reopen app

**Expected Results:**
- [ ] City selection persists
- [ ] Cached content shows if available
- [ ] Offline indicator if appropriate
- [ ] Can still change cities (using cache)
- [ ] Refreshes when online again

---

### 20. Analytics Validation
**Objective:** Verify analytics events fire

**Events to verify (if accessible):**
- [ ] City selector opened
- [ ] City manually selected
- [ ] Location auto-detected
- [ ] Location permission granted/denied
- [ ] City change completed
- [ ] Error encountered

---

## Edge Cases

### Unusual Scenarios
- [ ] Device location disabled system-wide
- [ ] User traveling between cities
- [ ] VPN affecting location
- [ ] Multiple rapid location changes
- [ ] App backgrounded during detection
- [ ] Low GPS signal quality

### Boundary Testing
- [ ] User exactly between two cities
- [ ] User in unsupported country
- [ ] User on city border
- [ ] User in ocean/invalid location

---

## Performance Benchmarks

Expected performance targets:
- City selector open: < 300ms
- City change execution: < 500ms
- Content refresh: < 2000ms
- Location detection: < 3000ms
- Cache retrieval: < 100ms

---

## Bug Report Template

```
Feature: Location-Aware What's Hot
Device: [Model]
OS: [Version]
Current Location: [City or Coordinates]
Selected City: [City]

Steps to Reproduce:
1. 
2. 

Expected City: 
Actual City: 
Content Correct: [ ] Yes [ ] No
Screenshot: [Attach]
```

---

## Regression Testing

After implementation, verify these still work:
- [ ] Other home screen sections
- [ ] Navigation between tabs
- [ ] Restaurant search (all cities)
- [ ] User profile functionality
- [ ] Post creation flow
- [ ] Notification system

---

## Sign-off Checklist

### Core Functionality
- [ ] City selector opens properly
- [ ] All 10 cities selectable
- [ ] Location detection works
- [ ] Content updates per city
- [ ] Persistence works correctly

### User Experience
- [ ] Smooth animations
- [ ] Clear city indication
- [ ] Intuitive interaction
- [ ] Proper error messages
- [ ] No confusing states

### Technical Requirements
- [ ] No crashes
- [ ] Performance acceptable
- [ ] Memory usage stable
- [ ] Battery impact minimal
- [ ] Network calls optimized

### Edge Cases
- [ ] Permission flows handled
- [ ] Offline scenarios work
- [ ] Error recovery smooth
- [ ] All cities have content

**Tested by:** ________________
**Date:** ________________
**Version:** ________________
**Platform:** [ ] iOS [ ] Android
**Status:** [ ] PASS [ ] FAIL [ ] PARTIAL

**Critical Issues Found:**
_________________________________

**Minor Issues Found:**
_________________________________

**Recommendations:**
_________________________________

**Overall Assessment:**
_________________________________