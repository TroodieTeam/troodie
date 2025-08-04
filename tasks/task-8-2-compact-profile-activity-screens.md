# Task 8.2: Compact and Consistent Profile & Activity Screens

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: Medium
- **Estimate**: 2 days
- **Status**: 🔴 Not Started
- **Dependencies**: Task 3.4 (User Profile Implementation)
- **Blocks**: Improved mobile experience
- **Assignee**: -

## Overview
Redesign the profile and activity screens to be more compact and visually consistent across different device resolutions, ensuring optimal use of screen real estate and consistent spacing.

## Business Value
- **Better mobile experience**: Optimized for small screens
- **Increased usability**: More content visible without scrolling
- **Professional appearance**: Consistent design across devices
- **Reduced bounce rate**: Better first impressions

## Dependencies
- ✅ Task 3.4: User Profile Implementation (Completed)
- ✅ Task 3.7: Empty Activity State Experience (Completed)

## Blocks
- Enhanced user satisfaction
- Improved app store ratings
- Better screenshot opportunities for marketing

## Acceptance Criteria

```gherkin
Feature: Compact and Consistent Profile & Activity Screens
  As a user
  I want a consistent and compact interface
  So that I can easily view content on any device

  Scenario: Viewing profile screen on small device
    Given I am on a device with screen width < 375px
    When I view my profile screen
    Then all UI elements fit within the viewport width
    And spacing between elements is consistent
    And text does not overflow or get cut off
    And images maintain proper aspect ratios

  Scenario: Viewing activity screen on different devices
    Given I am viewing the activity screen
    When I switch between different device sizes
    Then the layout adapts responsively
    And spacing ratios remain consistent
    And no elements overlap
    And touch targets remain accessible (min 44px)

  Scenario: Consistent visual hierarchy
    Given I am navigating between profile and activity screens
    Then header heights are identical
    And font sizes follow the same scale
    And padding/margins use consistent spacing units
    And color usage is consistent
```

## Technical Implementation

### Design System Updates

```typescript
// constants/designTokens.ts
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const breakpoints = {
  small: 375,
  medium: 414,
  large: 768,
};

export const responsive = {
  spacing: (size: keyof typeof spacing) => ({
    small: spacing[size] * 0.875,
    medium: spacing[size],
    large: spacing[size] * 1.125,
  }),
};
```

### Profile Screen Refactor

```typescript
// screens/ProfileScreen.tsx
const ProfileScreen = () => {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < breakpoints.small;
  
  return (
    <ScrollView style={styles.container}>
      <CompactProfileHeader 
        spacing={isSmallDevice ? spacing.xs : spacing.sm}
      />
      <ProfileStats 
        compact={isSmallDevice}
        columns={isSmallDevice ? 3 : 4}
      />
      <ProfileContent 
        contentPadding={responsive.spacing('md')[deviceSize]}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
});
```

### Activity Screen Updates

```typescript
// screens/ActivityScreen.tsx
const ActivityScreen = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <FlatList
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: insets.bottom + spacing.md,
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <CompactActivityItem 
          {...item}
          imageSize={isSmallDevice ? 40 : 48}
        />
      )}
    />
  );
};
```

### Responsive Components

```typescript
// components/ResponsiveGrid.tsx
export const ResponsiveGrid = ({ children, minItemWidth = 100 }) => {
  const { width } = useWindowDimensions();
  const columns = Math.floor(width / minItemWidth);
  
  return (
    <View style={styles.grid}>
      {React.Children.map(children, (child, index) => (
        <View style={[styles.gridItem, { width: `${100/columns}%` }]}>
          {child}
        </View>
      ))}
    </View>
  );
};
```

## Definition of Done

- [ ] Design tokens implemented for consistent spacing
- [ ] Responsive breakpoints defined and applied
- [ ] Profile screen adapts to 3 device sizes (small/medium/large)
- [ ] Activity screen uses compact list items on small devices
- [ ] All text is readable without horizontal scrolling
- [ ] Touch targets meet 44px minimum size
- [ ] Images scale proportionally without distortion
- [ ] Consistent header heights across screens
- [ ] Loading states maintain layout stability
- [ ] Performance: <16ms render time for list items
- [ ] Accessibility: Dynamic font scaling supported
- [ ] Visual regression tests pass
- [ ] Tested on iPhone SE, iPhone 14, iPad

## Resources
- [React Native Responsive Design](https://reactnative.dev/docs/flexbox)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design - Layout](https://material.io/design/layout/understanding-layout.html)

## Notes
- Consider using react-native-super-grid for complex layouts
- Test with system font size adjustments
- Monitor performance on low-end devices
- Future: Add landscape orientation support
- Consider memoization for expensive calculations