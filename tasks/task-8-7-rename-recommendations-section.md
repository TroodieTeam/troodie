# Task 8.7: Rename and Clarify "Recommended for You" Section

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: Low
- **Estimate**: 0.5 days
- **Status**: 🔴 Not Started
- **Dependencies**: None
- **Blocks**: None
- **Assignee**: -

## Overview
Rename the "Recommended for You" section to "What's Hot in Your City" (or similar), and add a description to clarify how recommendations are generated, improving user understanding and trust.

## Business Value
- **Clarity**: Users understand what they're seeing
- **Trust**: Transparency about recommendation logic
- **Engagement**: Better title may increase interaction
- **Local focus**: Emphasizes community aspect

## Dependencies
- None - This is a simple UI text change

## Blocks
- None - Independent task

## Acceptance Criteria

```gherkin
Feature: Rename and Clarify Recommendations Section
  As a user
  I want to understand what recommendations show me
  So that I can trust and engage with the content

  Scenario: View renamed recommendations section
    Given I am on the home screen
    When I see the recommendations section
    Then the title reads "What's Hot in Your City"
    And I see a subtitle explaining the recommendations
    And an info icon is present for more details

  Scenario: View recommendation explanation
    Given I see the recommendations section
    When I tap the info icon
    Then a tooltip or modal appears
    And it explains "Trending restaurants based on recent saves, reviews, and community activity in your area"
    And I can dismiss the explanation

  Scenario: Consistent naming across app
    Given the section has been renamed
    When I see references to recommendations elsewhere
    Then they use the same "What's Hot" terminology
    And the naming is consistent in navigation and settings
```

## Technical Implementation

### String Constants Update

```typescript
// constants/strings.ts
export const strings = {
  recommendations: {
    title: "What's Hot in Your City",
    subtitle: "Trending spots this week",
    infoTooltip: "Trending restaurants based on recent saves, reviews, and community activity in your area",
    emptyTitle: "No Trending Spots Yet",
    emptyDescription: "Check back soon to see what's popular in your area",
    settingsLabel: "What's Hot Preferences",
  },
  // Migrate old strings
  deprecated: {
    recommendedForYou: "Recommended for You", // Keep for migration
  }
};
```

### Home Screen Update

```typescript
// screens/HomeScreen.tsx
const RecommendationsSection = () => {
  const [showInfo, setShowInfo] = useState(false);
  const { recommendations, loading } = useRecommendations();
  
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{strings.recommendations.title}</Text>
          <TouchableOpacity 
            onPress={() => setShowInfo(true)}
            accessibilityLabel="Learn how recommendations work"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="info-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>{strings.recommendations.subtitle}</Text>
      </View>
      
      {loading ? (
        <RecommendationsSkeleton />
      ) : recommendations.length > 0 ? (
        <HorizontalRestaurantList restaurants={recommendations} />
      ) : (
        <EmptyState
          title={strings.recommendations.emptyTitle}
          description={strings.recommendations.emptyDescription}
          compact
        />
      )}
      
      <InfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        title="How We Find What's Hot"
        content={strings.recommendations.infoTooltip}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
```

### Info Modal Component

```typescript
// components/InfoModal.tsx
interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  onClose,
  title,
  content
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.content}>{content}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
```

### Analytics Update

```typescript
// analytics/events.ts
export const trackRecommendationEvents = {
  viewedInfo: () => {
    analytics().logEvent('recommendations_info_viewed', {
      section_name: 'whats_hot_in_your_city',
      timestamp: Date.now(),
    });
  },
  
  interactedWithSection: (action: string) => {
    analytics().logEvent('recommendations_interaction', {
      section_name: 'whats_hot_in_your_city',
      action,
      timestamp: Date.now(),
    });
  },
};
```

### Migration for Existing References

```typescript
// utils/stringMigration.ts
export const migrateStrings = (text: string): string => {
  // Replace old terminology with new
  const migrations = {
    'Recommended for You': "What's Hot in Your City",
    'Recommendations': "What's Hot",
    'recommendation preferences': "What's Hot preferences",
  };
  
  let migratedText = text;
  Object.entries(migrations).forEach(([old, new]) => {
    migratedText = migratedText.replace(new RegExp(old, 'gi'), new);
  });
  
  return migratedText;
};
```

## Definition of Done

- [ ] Section title changed to "What's Hot in Your City"
- [ ] Subtitle added showing "Trending spots this week"
- [ ] Info icon added next to title
- [ ] Info modal/tooltip implemented
- [ ] Explanation text clearly describes algorithm
- [ ] All references to old name updated app-wide
- [ ] Navigation items updated with new terminology
- [ ] Settings labels updated
- [ ] Analytics events updated with new naming
- [ ] Empty state uses new terminology
- [ ] Accessibility labels updated
- [ ] Copy reviewed by product team
- [ ] A/B test tracking implemented (optional)

## Resources
- [UX Writing Best Practices](https://www.uxwritinghub.com/post/ux-writing-best-practices)
- [Information Architecture](https://www.nngroup.com/articles/information-architecture/)

## Notes
- Consider A/B testing different titles
- "What's Hot" alternatives: "Trending Now", "Popular This Week", "Community Favorites"
- Keep explanation concise and jargon-free
- Update app store descriptions if mentioned
- Consider adding location name dynamically: "What's Hot in Charlotte"