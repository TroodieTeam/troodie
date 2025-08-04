# Task 9.5: Uppercase T in Troodie Brand Name

**Epic**: 9 - UI/UX Improvements and Content Integration  
**Priority**: Low  
**Estimate**: 0.25 days  
**Status**: 🔴 Not Started

## Overview
Update the home screen header to capitalize the T in 'troodie' to make it 'Troodie' for better brand consistency and professional appearance.

## Business Value
- Improves brand consistency and professional appearance
- Creates stronger brand recognition
- Aligns with standard capitalization practices for app names
- Enhances visual hierarchy and readability

## Dependencies
- Home screen must be implemented

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Proper Brand Name Capitalization
  As a user
  I want to see the app name properly capitalized
  So that it looks professional and consistent

Scenario: Home screen shows proper capitalization
  Given I am on the home screen
  Then the header should display "Troodie"
  And not "troodie" with lowercase t

Scenario: Brand consistency across app
  Given I navigate through different screens
  Then all instances of the brand name should be "Troodie"
  And follow consistent capitalization

Scenario: Typography remains consistent
  Given the brand name is updated to "Troodie"
  Then the font, size, and styling should remain the same
  And only the capitalization should change
```

## Technical Implementation

### Home Screen Header Update
```typescript
// app/(tabs)/index.tsx
const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Troodie</Text> {/* Updated from "troodie" */}
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Icon name="search" size={24} color={Colors.light.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <NotificationBadge />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Rest of home screen content */}
    </SafeAreaView>
  );
};
```

### Constants Update
```typescript
// constants/strings.ts
export const Strings = {
  app: {
    name: 'Troodie', // Updated from 'troodie'
    tagline: 'Discover amazing restaurants and build your food network'
  },
  // ... other strings
};
```

### App Configuration Check
```typescript
// app.json or app.config.js
{
  "expo": {
    "name": "Troodie", // Ensure this is also capitalized
    "slug": "troodie",
    "displayName": "Troodie"
  }
}
```

### Search for Other Instances
```bash
# Commands to find other instances that might need updating
grep -r "troodie" --include="*.tsx" --include="*.ts" src/
grep -r "troodie" --include="*.json" ./
```

### Potential Other Locations to Check
```typescript
// Check these files for consistency:
// - app.json (displayName)
// - package.json (name field) 
// - README.md files
// - Welcome/onboarding screens
// - About/settings screens
// - Error messages or help text

// Example onboarding screen update:
// app/onboarding/welcome.tsx
const WelcomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeTitle}>Welcome to Troodie!</Text> {/* Updated */}
      <Text style={styles.welcomeSubtitle}>
        Discover amazing restaurants and build your food network
      </Text>
    </View>
  );
};
```

## Definition of Done
- [ ] Home screen header shows "Troodie" with capital T
- [ ] All instances in the app consistently use "Troodie"
- [ ] App configuration files use proper capitalization
- [ ] Brand consistency is maintained across all screens
- [ ] Typography and styling remain unchanged
- [ ] No broken references or inconsistencies introduced

## Resources
- Home screen component
- App configuration files
- Brand guidelines and style guide
- String constants file

## Notes
- This is a simple text update but important for brand consistency
- Need to search through codebase for all instances of "troodie"
- Consider updating app store listings and metadata if applicable
- Verify change doesn't affect any case-sensitive functionality
- May want to establish brand guidelines to prevent future inconsistencies