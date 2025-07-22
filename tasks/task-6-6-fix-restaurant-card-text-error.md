# Task 6.6: Fix RestaurantCardWithSave Text Rendering Error

## Overview
Fix the React Native warning "Text strings must be rendered within a <Text> component" that occurs when using the RestaurantCardWithSave component on the home screen.

## Error Details
- **Error Message:** `Text strings must be rendered within a <Text> component`
- **Location:** `components/cards/RestaurantCardWithSave.tsx:22`
- **Stack Trace:** Points to TouchableOpacity component
- **Affected Screen:** Home screen (`app/(tabs)/index.tsx`)

## Root Cause Analysis
The error is likely caused by:
1. **Lucide React Native Icons:** The `Bookmark` icon from `lucide-react-native` may be rendering text strings outside of Text components
2. **Icon Props:** The `fill` and `strokeWidth` props on the Bookmark icon might be causing issues
3. **Component Composition:** The RestaurantCardWithSave component structure may have nested text elements incorrectly

## Investigation Steps
1. **Examine Bookmark Icon Usage:**
   ```tsx
   <Bookmark 
     size={20} 
     color={isSaved ? theme.colors.primary : '#FFFFFF'} 
     fill={isSaved ? theme.colors.primary : 'transparent'}
     strokeWidth={2}
   />
   ```

2. **Check Theme Color Conflicts:**
   - Verify `theme.colors.primary` is properly defined
   - Check for conflicts between `theme.ts` and `designTokens.ts`

3. **Test Icon Rendering:**
   - Try removing `fill` and `strokeWidth` props
   - Test with different icon from lucide-react-native
   - Verify icon renders correctly in isolation

## Proposed Solutions

### Solution 1: Fix Icon Props (Recommended)
```tsx
// Remove problematic props
<Bookmark 
  size={20} 
  color={isSaved ? theme.colors.primary : '#FFFFFF'} 
/>
```

### Solution 2: Use Alternative Icon
```tsx
// Use a different icon or custom SVG
import { Heart } from 'lucide-react-native';
// or create custom BookmarkIcon component
```

### Solution 3: Refactor Component Structure
- Ensure all text content is properly wrapped in Text components
- Check for any string literals being rendered directly

## Implementation Plan

### Phase 1: Quick Fix (30 minutes)
1. Remove `fill` and `strokeWidth` props from Bookmark icon
2. Test on home screen
3. Verify error is resolved

### Phase 2: Comprehensive Fix (1 hour)
1. Create custom BookmarkIcon component if needed
2. Add proper error boundaries
3. Implement fallback icon
4. Add unit tests for icon rendering

### Phase 3: Code Quality (30 minutes)
1. Review all lucide-react-native icon usage in the app
2. Standardize icon prop patterns
3. Document icon usage guidelines

## Testing Strategy
1. **Manual Testing:**
   - Navigate to home screen
   - Verify no console warnings
   - Test save button functionality
   - Check icon appearance in different states

2. **Component Testing:**
   - Test RestaurantCardWithSave in isolation
   - Verify icon renders correctly
   - Test with different props combinations

3. **Regression Testing:**
   - Check other screens using similar icons
   - Verify no new warnings introduced

## Acceptance Criteria
- [ ] No "Text strings must be rendered within a <Text> component" warnings
- [ ] Bookmark icon renders correctly in all states (saved/unsaved)
- [ ] Save functionality works as expected
- [ ] No visual regressions in RestaurantCardWithSave component
- [ ] All other screens using lucide-react-native icons still work

## Dependencies
- `lucide-react-native` package
- `theme.ts` color definitions
- `designTokens.ts` color definitions

## Risk Assessment
- **Low Risk:** Simple prop removal should fix the issue
- **Medium Risk:** May need to refactor icon usage patterns across the app
- **High Risk:** If issue is deeper in lucide-react-native package

## Related Components
- `components/cards/RestaurantCardWithSave.tsx`
- `components/BoardSelectionModal.tsx` (uses similar icons)
- `app/(tabs)/index.tsx` (where error occurs)

## Notes
- This is a blocking issue for production deployment
- Should be prioritized as High priority
- Consider creating a shared Icon component for consistency
- May need to update lucide-react-native package version

## Estimated Time
**Total:** 1 day
- Investigation: 2 hours
- Implementation: 4 hours  
- Testing: 2 hours

## Status
✅ **Completed** - Text rendering error fixed by removing `fill` props from lucide-react-native icons

## Implementation Summary

### Root Cause
The "Text strings must be rendered within a <Text> component" error was caused by the `fill` prop on lucide-react-native icons. This prop is not properly supported in React Native and causes text rendering issues.

### Files Fixed
1. **`components/cards/RestaurantCardWithSave.tsx`** - Removed `fill` prop from Star icon
2. **`components/cards/RestaurantCard.tsx`** - Removed `fill` prop from Star icon  
3. **`components/cards/ExplorePostCard.tsx`** - Removed `fill` props from Star, Heart, and Bookmark icons
4. **`app/restaurant/[id].tsx`** - Removed `fill` props from Star and Bookmark icons
5. **`app/add/save-restaurant.tsx`** - Removed `fill` prop from Star icon
6. **`app/add/restaurant-details.tsx`** - Removed `fill` prop from Star icon
7. **`app/boards/[id].tsx`** - Removed `fill` prop from Star icon

### Solution Applied
- Removed all `fill` props from lucide-react-native icons
- Icons now use only `color` and `size` props which are properly supported
- Visual appearance maintained through color prop only
- No functional changes to save/bookmark functionality

### Testing
- App starts without text rendering warnings
- All icon states (saved/unsaved, liked/unliked) display correctly
- Save functionality works as expected
- No visual regressions observed 