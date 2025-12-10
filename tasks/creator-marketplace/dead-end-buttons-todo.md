# Dead-End Buttons & Missing Screens Todo List

## Overview
This document tracks all buttons, CTAs, and navigation elements that currently don't lead anywhere or have missing functionality in the Troodie app.

---

## 🏠 Home Screen (`app/(tabs)/index.tsx`)

### 1. Notifications Button
- **Location**: Line 108 in header
- **Issue**: `<Bell>` icon has no `onPress` handler
- **Action**: Create `/notifications` screen & navigation
- **Priority**: Medium

### 2. Network Building Actions
- **Location**: Lines 82, 98 in `networkSuggestions`
- **Issue**: 
  - "Send Invites" button → `onClick: () => {}`
  - "Add Restaurant" button → `onClick: () => {}`
- **Action**: Create invite friends flow & add restaurant shortcut
- **Priority**: High

### 3. "See all" Button
- **Location**: Line 200 in Your Saves section
- **Issue**: No `onPress` handler
- **Action**: Navigate to full saves/collection screen
- **Priority**: Medium

### 4. Category Cards
- **Location**: `renderPersonalizedSection()`
- **Issue**: "Explore" buttons in category cards have no navigation
- **Action**: Create filtered explore views by category
- **Priority**: Medium

### 5. Quick Action Button
- **Location**: Line 273, floating "Add Place" button
- **Issue**: No `onPress` handler
- **Action**: Navigate to `/add/save-restaurant`
- **Priority**: High

### 6. Restaurant Cards
- **Location**: Line 249 in trending section
- **Issue**: `RestaurantCard` components have `onPress={() => {}}`
- **Action**: Create restaurant detail screen
- **Priority**: High

---

## 🔍 Explore Screen (`app/(tabs)/explore.tsx`)

### 7. Post Interactions
- **Location**: Lines 235-238
- **Issue**: All `ExplorePostCard` interactions are empty:
  - `onPress={() => {}}`
  - `onLike={() => {}}`
  - `onComment={() => {}}`
  - `onSave={() => {}}`
- **Action**: Create post detail, like functionality, comment system, save to collection
- **Priority**: High

---

## ❤️ Activity Screen (`app/(tabs)/activity.tsx`)

### 8. "Share Your Experience" Action
- **Location**: Line 53 in suggested activities
- **Issue**: "Add Post" button → `onClick: () => {}`
- **Action**: Create post creation screen
- **Priority**: High

### 9. Trending Card Interactions
- **Location**: Lines 179, 185
- **Issue**: 
  - Trending cards have no `onPress` handlers
  - "Save" buttons have no functionality
- **Action**: Navigate to restaurant detail & implement save functionality
- **Priority**: High

### 10. Follow Back Buttons
- **Location**: Line 207 in activity feed
- **Issue**: Follow buttons have no `onPress` handlers
- **Action**: Implement follow/unfollow functionality
- **Priority**: Medium

---

## 👤 Profile Screen (`app/(tabs)/profile.tsx`)

### 11. Profile Completion Actions
- **Location**: Lines 63, 72 in completion suggestions
- **Issue**: 
  - "Add Profile Photo" → `onClick: () => {}`
  - "Write Bio" → `onClick: () => {}`
- **Action**: Create profile editing screens/modals
- **Priority**: High

### 12. Board Creation
- **Location**: Lines 355, 371 in empty states
- **Issue**: "Create Board" buttons have no `onPress` handlers
- **Action**: Navigate to `/add/create-board`
- **Priority**: Medium

### 13. Post Creation
- **Location**: Line 371 in posts tab
- **Issue**: "Create Post" button has no `onPress` handler
- **Action**: Create post creation screen
- **Priority**: High

### 14. Board Items
- **Location**: Line 329 in boards tab
- **Issue**: Board cards have no `onPress` handlers
- **Action**: Create board detail screens
- **Priority**: Medium

---

## ➕ Add Screen (`app/(tabs)/add.tsx`)

### 15. Missing Quick Action Screens
- **Location**: Lines 104, 108
- **Issue**: 
  - "Search Places" → `/add/search-places` (screen doesn't exist)
  - "Find Friends" → `/add/find-friends` (screen doesn't exist)
- **Action**: Create these two screens
- **Priority**: High

---

## 🏪 Add Flow Missing Screens

### 16. Missing Add Flow Screens
- **Location**: Referenced in `app/add/_layout.tsx` but don't exist
- **Missing Screens**:
  - `/add/board-type`
  - `/add/board-restaurants`
  - `/add/board-monetization`
  - `/add/join-community`
  - `/add/search-places` ⚠️ (also referenced in Add screen)
  - `/add/find-friends` ⚠️ (also referenced in Add screen)
- **Action**: Create all missing add flow screens
- **Priority**: Medium-Low

---

## 🎯 Communities Flow

### 17. Community Add Button
- **Location**: Line 143 in `communities.tsx`
- **Issue**: "+" button in header has no `onPress` handler
- **Action**: Create new community creation flow
- **Priority**: Low

---

## 📝 Missing Core Functionality

### 18. Restaurant Detail Screen
- **Issue**: Referenced throughout app but doesn't exist
- **Action**: Create comprehensive restaurant detail screen
- **Priority**: High

### 19. User Profile Detail Screen
- **Issue**: Referenced in activity feed but doesn't exist
- **Action**: Create other users' profile view screen
- **Priority**: Medium

### 20. Post Detail Screen
- **Issue**: Referenced in explore but doesn't exist
- **Action**: Create detailed post view with comments
- **Priority**: High

### 21. Edit Profile Screen
- **Issue**: Referenced in profile but doesn't exist
- **Action**: Create profile editing interface
- **Priority**: High

### 22. Notifications Screen
- **Issue**: Bell icon exists but no destination
- **Action**: Create notifications/activity feed
- **Priority**: Medium

### 23. Full Saves/Collection Screen
- **Issue**: "See all" reference but no screen
- **Action**: Create comprehensive saves management
- **Priority**: Medium

---

## 🚀 Priority Implementation Order

### **High Priority** (Core User Flow)
1. **Restaurant Detail Screen** - Central to app functionality
2. **Post Creation Screen** - Key social feature
3. **Search Places Screen** - Core add flow functionality
4. **Find Friends Screen** - Social network building
5. **Restaurant Save Functionality** - Core collection feature
6. **Edit Profile Screen** - Basic user management

### **Medium Priority** (Enhancement)
7. **Notifications Screen** - User engagement
8. **Full Saves Screen** - Collection management
9. **Board Detail Screens** - Advanced organization
10. **User Profile Detail Screen** - Social discovery
11. **Post Detail Screen** - Enhanced social interaction

### **Low Priority** (Advanced Features)
12. **Missing Board Flow Screens** - Advanced board creation
13. **Community Creation** - Advanced social features
14. **Category Filtering** - Enhanced discovery
15. **Advanced Social Features** - Follow/unfollow, etc.

---

## 📋 Implementation Checklist

### Immediate Actions (Week 1)
- [ ] Create Restaurant Detail Screen
- [ ] Implement basic save functionality
- [ ] Create Post Creation Screen
- [ ] Add Search Places screen

### Short Term (Week 2-3)
- [ ] Create Find Friends screen
- [ ] Implement Edit Profile functionality
- [ ] Add Notifications screen
- [ ] Create Full Saves screen

### Medium Term (Month 1)
- [ ] Board Detail screens
- [ ] User Profile Detail screen
- [ ] Post Detail with comments
- [ ] Advanced social features

### Long Term (Month 2+)
- [ ] Complete Add flow screens
- [ ] Community creation
- [ ] Advanced filtering
- [ ] Gamification features

---

## 📝 Notes

- All empty `onClick: () => {}` and `onPress={() => {}}` handlers should be replaced with proper navigation or functionality
- Consider creating placeholder screens with "Coming Soon" messages for low-priority items
- Test all navigation flows after implementing each screen
- Ensure consistent design patterns across all new screens 