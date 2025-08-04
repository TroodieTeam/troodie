# Task 10.4: Move Tags Within Restaurant Card in What's Hot Section

**Epic**: 10 - Enhanced Navigation and User Experience  
**Priority**: Medium  
**Estimate**: 0.75 days  
**Status**: 🔴 Not Started

## Overview
Redesign the 'what's hot right now' section on the home screen to place tags within the restaurant card box instead of outside it for better visual hierarchy and more cohesive design.

## Business Value
- Improves visual design and information hierarchy
- Creates more cohesive and professional card layouts
- Better utilizes card space for important information
- Enhances overall user experience with cleaner design

## Dependencies
- Home screen "what's hot" section must be implemented
- Restaurant card component must exist
- Tag system must be functional

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Tags Within Restaurant Cards
  As a user
  I want to see restaurant tags within the card layout
  So that the design is more cohesive and easier to read

Scenario: Tags appear inside restaurant cards
  Given I am viewing the "what's hot right now" section
  Then restaurant tags should appear within the card boundaries
  And not be positioned outside the card

Scenario: Tags don't interfere with other card elements
  Given I see restaurant cards with tags
  Then tags should be positioned to not overlap important information
  And should complement the existing card layout

Scenario: Card layout accommodates tags properly
  Given restaurant cards contain tags
  Then the card should have appropriate spacing and layout
  And all elements should be clearly readable

Scenario: Visual hierarchy is improved
  Given I view restaurant cards with internal tags
  Then the information hierarchy should be clear and logical
  And tags should enhance rather than clutter the design
```

## Technical Implementation

### Enhanced Restaurant Card Component
```typescript
// components/cards/RestaurantCard.tsx - Updated layout
interface RestaurantCardProps {
  restaurant: Restaurant;
  showTags?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  showTags = true,
  size = 'medium' 
}) => {
  const handlePress = () => {
    router.push(`/restaurant/${restaurant.id}`);
  };

  return (
    <TouchableOpacity style={[styles.card, styles[`${size}Card`]]} onPress={handlePress}>
      {/* Restaurant Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: restaurant.coverImageUrl }}
          style={styles.restaurantImage}
        />
        
        {/* Tags positioned over image with overlay */}
        {showTags && restaurant.tags && restaurant.tags.length > 0 && (
          <View style={styles.tagsOverlay}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsContainer}
            >
              {restaurant.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {restaurant.tags.length > 3 && (
                <View style={styles.moreTagsIndicator}>
                  <Text style={styles.moreTagsText}>+{restaurant.tags.length - 3}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
        
        {/* Save button positioned on image */}
        <TouchableOpacity style={styles.saveButton}>
          <Icon name="bookmark" size={16} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Restaurant Info */}
      <View style={styles.cardContent}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        
        <View style={styles.restaurantDetails}>
          <Text style={styles.category}>{restaurant.category}</Text>
          <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
        </View>
        
        <View style={styles.ratingContainer}>
          <TrafficLightRating rating={restaurant.rating} size="small" />
          <Text style={styles.ratingText}>
            {restaurant.rating} ({restaurant.reviewCount})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
```

### Alternative Layout - Tags in Content Area
```typescript
// Alternative implementation with tags in content area instead of overlay
const RestaurantCardAlternative: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image 
        source={{ uri: restaurant.coverImageUrl }}
        style={styles.restaurantImage}
      />
      
      <View style={styles.cardContent}>
        {/* Restaurant name and basic info */}
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        
        <View style={styles.restaurantMeta}>
          <Text style={styles.category}>{restaurant.category}</Text>
          <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
        </View>
        
        {/* Tags positioned within content area */}
        {restaurant.tags && restaurant.tags.length > 0 && (
          <View style={styles.tagsContentContainer}>
            {restaurant.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.contentTag}>
                <Text style={styles.contentTagText}>{tag}</Text>
              </View>
            ))}
            {restaurant.tags.length > 2 && (
              <Text style={styles.moreTagsText}>+{restaurant.tags.length - 2} more</Text>
            )}
          </View>
        )}
        
        <View style={styles.ratingContainer}>
          <TrafficLightRating rating={restaurant.rating} size="small" />
          <Text style={styles.ratingText}>
            {restaurant.rating} ({restaurant.reviewCount})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
```

### Updated What's Hot Section
```typescript
// app/(tabs)/index.tsx - Updated home screen section
const WhatsHotSection = () => {
  const [trendingRestaurants, setTrendingRestaurants] = useState<Restaurant[]>([]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>What's Hot Right Now</Text>
        <TouchableOpacity onPress={() => router.push('/trending')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {trendingRestaurants.map(restaurant => (
          <RestaurantCard 
            key={restaurant.id} 
            restaurant={restaurant}
            showTags={true}  // Enable tags within cards
            size="medium"
          />
        ))}
      </ScrollView>
    </View>
  );
};
```

### Styling for Tags Within Cards
```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  
  mediumCard: {
    width: 280,
  },
  
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  
  restaurantImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.imagePlaceholder,
  },
  
  // Tags overlay on image
  tagsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  tag: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  
  tagText: {
    color: Colors.light.background,
    fontSize: 11,
    fontWeight: '500',
  },
  
  moreTagsIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  
  moreTagsText: {
    color: Colors.light.background,
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Alternative: Tags in content area
  tagsContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    flexWrap: 'wrap',
  },
  
  contentTag: {
    backgroundColor: Colors.light.tagBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 3,
  },
  
  contentTagText: {
    color: Colors.light.primary,
    fontSize: 11,
    fontWeight: '500',
  },
  
  saveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 6,
  },
  
  cardContent: {
    padding: 12,
  },
  
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  
  restaurantDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  category: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginRight: 8,
  },
  
  priceRange: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  
  ratingText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
});
```

### Color System Updates
```typescript
// constants/Colors.ts - Add tag-specific colors
export const Colors = {
  light: {
    // ... existing colors
    tagBackground: '#F0F0F0',
    tagText: '#666666',
    tagOverlay: 'rgba(0, 0, 0, 0.7)',
    ripple: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    // ... existing colors
    tagBackground: '#2A2A2A',
    tagText: '#CCCCCC',
    tagOverlay: 'rgba(0, 0, 0, 0.8)',
    ripple: 'rgba(255, 255, 255, 0.1)',
  }
};
```

### Responsive Tag Display
```typescript
// utils/tagDisplayUtils.ts
export const getDisplayTags = (tags: string[], maxTags: number = 3): {
  displayTags: string[];
  remainingCount: number;
} => {
  const displayTags = tags.slice(0, maxTags);
  const remainingCount = Math.max(0, tags.length - maxTags);
  
  return { displayTags, remainingCount };
};

export const getTagsForCardSize = (tags: string[], size: 'small' | 'medium' | 'large') => {
  const maxTags = {
    small: 1,
    medium: 2,
    large: 3
  };
  
  return getDisplayTags(tags, maxTags[size]);
};
```

## Definition of Done
- [ ] Tags appear within restaurant card boundaries
- [ ] Tags don't interfere with other card elements
- [ ] Card layout properly accommodates tags
- [ ] Visual hierarchy is improved and clear
- [ ] Tags are readable and well-positioned
- [ ] Performance is maintained with tag rendering
- [ ] Responsive design works for different card sizes
- [ ] Accessibility is maintained for tag elements

## Resources
- Restaurant card component documentation
- Design system and color guidelines
- Tag system implementation
- Home screen layout patterns

## Notes
- Consider two approaches: overlay on image vs. content area placement
- Ensure tags don't make cards feel cluttered
- May want to implement tag interaction (tap to filter)
- Should maintain good contrast for tag readability
- Consider animation for tag appearance/transitions