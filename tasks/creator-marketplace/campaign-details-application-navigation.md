# Campaign Details Application Navigation - Engineering Task

## Overview
Currently, application cards in the Campaign Details screen are not clickable. This task implements navigation from application cards to the application detail screen, and from creator avatars/usernames to creator profile screens.

---

## 🎯 Goal
Enable business owners to:
1. Click an application card to view full application details
2. Click creator avatar or username to view creator profile
3. Maintain existing Accept/Reject button functionality

---

## 📍 Current State

### Limitations
- **No Card Navigation**: Application cards are static `View` components with no click handlers
- **No Creator Profile Access**: Cannot navigate to creator profiles from application cards
- **Limited Context**: Business owners must use separate screens to see full application details

### Affected Files
- `app/(tabs)/business/campaigns/[id].tsx` - Campaign details screen with applications tab
- `app/(tabs)/business/applications/[id].tsx` - Application detail screen (already exists)
- `app/creator/[id]/index.tsx` - Creator profile screen (already exists)

---

## 🚀 Implementation Requirements

### 1. Application Card Navigation

#### Make Card Clickable
- [ ] Convert application card `View` to `TouchableOpacity`
- [ ] Add `onPress` handler to navigate to `/business/applications/${application.id}`
- [ ] Add `activeOpacity={0.7}` for visual feedback
- [ ] Ensure card maintains existing styling

#### Event Handling
- [ ] Prevent Accept/Reject buttons from triggering card navigation
  - Use `e.stopPropagation()` on button `onPress` handlers
- [ ] Ensure buttons still work correctly when card is clickable

### 2. Creator Profile Navigation

#### Avatar Click
- [ ] Wrap avatar `Image` in `TouchableOpacity`
- [ ] Navigate to `/creator/${application.creator_profiles.id}` on press
- [ ] Prevent card navigation when avatar is clicked
  - Use `e.stopPropagation()` on avatar `onPress`
- [ ] Add `activeOpacity={0.7}` for visual feedback

#### Username Click
- [ ] Wrap username `Text` in `TouchableOpacity`
- [ ] Navigate to `/creator/${application.creator_profiles.id}` on press
- [ ] Prevent card navigation when username is clicked
  - Use `e.stopPropagation()` on username `onPress`
- [ ] Add `activeOpacity={0.7}` for visual feedback
- [ ] Consider visual indication that username is clickable (e.g., underline on press)

### 3. UI/UX Considerations

#### Visual Feedback
- [ ] Card should show press state when tapped
- [ ] Avatar and username should show press state
- [ ] Accept/Reject buttons should maintain existing behavior
- [ ] No visual changes when buttons are pressed (they shouldn't trigger card navigation)

#### Navigation Flow
- [ ] Card click → Application detail screen
- [ ] Avatar/username click → Creator profile screen
- [ ] Accept/Reject buttons → Update status (no navigation)
- [ ] Back navigation should return to campaign details

---

## 🔧 Technical Implementation Details

### Code Structure
```typescript
// Application card should be:
<TouchableOpacity
  onPress={() => router.push(`/business/applications/${application.id}`)}
  activeOpacity={0.7}
>
  <View style={cardStyles}>
    {/* Avatar with navigation */}
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        router.push(`/creator/${application.creator_profiles.id}`);
      }}
      activeOpacity={0.7}
    >
      <Image source={{ uri: avatarUrl }} />
    </TouchableOpacity>
    
    {/* Username with navigation */}
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        router.push(`/creator/${application.creator_profiles.id}`);
      }}
      activeOpacity={0.7}
    >
      <Text>{displayName}</Text>
    </TouchableOpacity>
    
    {/* Accept/Reject buttons with stopPropagation */}
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        handleApplicationAction(application.id, 'accepted');
      }}
    >
      <Text>Accept</Text>
    </TouchableOpacity>
  </View>
</TouchableOpacity>
```

### Routes
- **Application Detail**: `/business/applications/[id]` (already exists)
- **Creator Profile**: `/creator/[id]` (already exists)

---

## 📋 Implementation Checklist

### Phase 1: Card Navigation (Week 1)
- [ ] Convert application card `View` to `TouchableOpacity`
- [ ] Add navigation to application detail screen
- [ ] Test card click navigation
- [ ] Verify Accept/Reject buttons still work
- [ ] Add `stopPropagation` to button handlers

### Phase 2: Creator Profile Navigation (Week 1)
- [ ] Make avatar clickable
- [ ] Make username clickable
- [ ] Add navigation to creator profile
- [ ] Add `stopPropagation` to prevent card navigation
- [ ] Test both avatar and username clicks

### Phase 3: Testing & Polish (Week 1)
- [ ] Test all navigation flows
- [ ] Verify no unintended navigation triggers
- [ ] Test on different screen sizes
- [ ] Verify visual feedback works correctly
- [ ] Test edge cases (missing avatar, long usernames)

---

## 🎨 UI/UX Considerations

### User Flow
1. Business owner views campaign details
2. Clicks on "Applications" tab
3. Sees list of application cards
4. **New**: Can click card to see full application details
5. **New**: Can click avatar/username to see creator profile
6. Can still Accept/Reject applications directly from card

### Visual Design
- **Card**: Should show press state (slight opacity change)
- **Avatar**: Should show press state when tapped
- **Username**: Should show press state when tapped
- **Buttons**: No visual change (they don't navigate)

### Accessibility
- [ ] Ensure touch targets are large enough (minimum 44x44 points)
- [ ] Add accessibility labels for navigation actions
- [ ] Test with screen readers

---

## 🐛 Edge Cases & Considerations

### Edge Cases
- [ ] Missing creator profile ID
- [ ] Missing application ID
- [ ] Creator profile doesn't exist
- [ ] Application detail screen fails to load
- [ ] Network errors during navigation
- [ ] Rapid clicking (prevent double navigation)

### Data Validation
- [ ] Verify `application.id` exists before navigation
- [ ] Verify `application.creator_profiles.id` exists before navigation
- [ ] Handle missing avatar URLs gracefully
- [ ] Handle missing display names gracefully

---

## 📊 Success Metrics

### User Experience
- [ ] Business owners can navigate to application details from cards
- [ ] Business owners can navigate to creator profiles from cards
- [ ] Accept/Reject buttons work without triggering navigation
- [ ] Navigation feels responsive and intuitive

### Technical
- [ ] No navigation errors
- [ ] No unintended navigation triggers
- [ ] Proper event propagation handling
- [ ] All routes resolve correctly

---

## 🔗 Related Files

### Primary Files
- `app/(tabs)/business/campaigns/[id].tsx` - Main implementation file
- `app/(tabs)/business/applications/[id].tsx` - Application detail screen (destination)
- `app/creator/[id]/index.tsx` - Creator profile screen (destination)

### Related Features
- Campaign management
- Application review workflow
- Creator discovery

---

## 📝 Notes

- Application detail screen already exists at `/business/applications/[id]`
- Creator profile screen already exists at `/creator/[id]`
- This is primarily a UI enhancement to improve navigation
- Should maintain backward compatibility with existing functionality
- Consider adding analytics to track navigation patterns

---

## 🚦 Priority: **Medium**

This feature improves business owner workflow by providing quick access to application details and creator profiles without requiring separate navigation paths.

---

## 📅 Estimated Timeline

**Total**: 1 week
- **Phase 1**: 2-3 days (Card navigation)
- **Phase 2**: 2-3 days (Creator profile navigation)
- **Phase 3**: 1 day (Testing & polish)

---

## ✅ Acceptance Criteria

- [ ] Clicking application card navigates to application detail screen
- [ ] Clicking creator avatar navigates to creator profile screen
- [ ] Clicking creator username navigates to creator profile screen
- [ ] Accept/Reject buttons work without triggering card navigation
- [ ] Visual feedback is appropriate for all interactive elements
- [ ] All navigation routes resolve correctly
- [ ] No unintended navigation triggers
- [ ] Edge cases are handled gracefully
- [ ] Code follows existing patterns and conventions




