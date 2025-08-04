# Task 8.9: Add "Save a Restaurant" Functionality to Add Tab

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: High
- **Estimate**: 4 days
- **Status**: 🔴 Not Started
- **Dependencies**: Task 1.1 (Supabase Setup), Task 4.1 (Board System)
- **Blocks**: User-generated restaurant database
- **Assignee**: -

## Overview
Enable users to add new restaurants from the "Add" tab by inputting restaurant details. These restaurants are saved to their personal collection and optionally submitted for community-wide visibility after moderation.

## Business Value
- **Content growth**: User-generated restaurant database
- **Engagement**: Users can save places not yet in system
- **Coverage**: Expand beyond Google Places limitations
- **Community**: Users contribute to shared knowledge

## Dependencies
- ✅ Task 1.1: Supabase Backend Setup (Completed)
- Task 4.1: Board Creation & Management
- Address geocoding service
- Image upload functionality

## Blocks
- Complete restaurant coverage
- International expansion
- Niche restaurant discovery
- User satisfaction for missing venues

## Acceptance Criteria

```gherkin
Feature: Add Restaurant from Add Tab
  As a user
  I want to add restaurants not in the database
  So that I can save all my favorite places

  Scenario: Access save restaurant feature
    Given I am on the Add tab
    When I view the options
    Then I see "Save a Restaurant" option
    And it has an appropriate icon and description
    When I tap it
    Then I navigate to the restaurant input form

  Scenario: Fill restaurant details
    Given I am on the restaurant input form
    When I enter restaurant information
    Then I can input:
      | Field         | Required | Type              |
      | Name          | Yes      | Text              |
      | Cuisine       | Yes      | Multi-select      |
      | Address       | Yes      | Address picker    |
      | Description   | No       | Text area         |
      | Website       | No       | URL               |
      | Price Range   | No       | Selection ($/$$/$$$) |
      | Photos        | No       | Image picker      |
    And address field has autocomplete
    And cuisine has common options

  Scenario: Submit new restaurant
    Given I've filled all required fields
    When I tap "Save Restaurant"
    Then the restaurant is created with status "user_submitted"
    And it's automatically saved to my Quick Saves
    And I see success message with options
    And I can "View Restaurant" or "Add Another"

  Scenario: Restaurant moderation
    Given I've submitted a restaurant
    Then it appears in my saves immediately
    And it's marked as "Pending Approval" for others
    When an admin approves it
    Then it becomes publicly discoverable
    And I receive a notification of approval
```

## Technical Implementation

### Add Tab Update

```typescript
// screens/AddContentScreen.tsx
const ADD_OPTIONS = [
  {
    id: 'board',
    title: 'Create a Board',
    description: 'Organize your restaurant saves',
    icon: 'folder-outline',
    screen: 'CreateBoard',
  },
  {
    id: 'restaurant',
    title: 'Save a Restaurant',
    description: 'Add a place not in our database',
    icon: 'restaurant-outline',
    screen: 'AddRestaurant',
  },
  {
    id: 'post',
    title: 'Write a Review',
    description: 'Share your dining experience',
    icon: 'create-outline',
    screen: 'CreatePost',
  },
];

export const AddContentScreen = () => {
  const navigation = useNavigation();
  
  return (
    <Screen>
      <Text style={styles.title}>What would you like to add?</Text>
      
      {ADD_OPTIONS.map(option => (
        <TouchableOpacity
          key={option.id}
          style={styles.option}
          onPress={() => navigation.navigate(option.screen)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={option.icon} size={28} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </Screen>
  );
};
```

### Add Restaurant Screen

```typescript
// screens/AddRestaurantScreen.tsx
interface RestaurantFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  cuisineTypes: string[];
  description?: string;
  website?: string;
  priceRange?: string;
  photos: string[];
  location?: { lat: number; lng: number };
}

export const AddRestaurantScreen = () => {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cuisineTypes: [],
    photos: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  
  const isValid = formData.name && formData.cuisineTypes.length > 0 && formData.address;
  
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    try {
      const suggestions = await AddressService.autocomplete(query);
      setAddressSuggestions(suggestions);
    } catch (error) {
      console.error('Address search failed:', error);
    }
  };
  
  const handleAddressSelect = async (address: AddressSuggestion) => {
    const details = await AddressService.getDetails(address.placeId);
    
    setFormData({
      ...formData,
      address: details.streetAddress,
      city: details.city,
      state: details.state,
      zipCode: details.zipCode,
      location: details.coordinates,
    });
    
    setAddressSuggestions([]);
  };
  
  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      const restaurantId = await RestaurantService.createUserSubmitted({
        ...formData,
        submittedBy: getCurrentUserId(),
      });
      
      // Show success
      Alert.alert(
        'Restaurant Added!',
        'Your restaurant has been saved to your collection.',
        [
          { text: 'View Restaurant', onPress: () => navigateToRestaurant(restaurantId) },
          { text: 'Add Another', onPress: () => resetForm() },
        ]
      );
    } catch (error) {
      Toast.show({ text: 'Failed to add restaurant', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Screen>
      <ScrollView>
        <View style={styles.form}>
          {/* Restaurant Name */}
          <FormField label="Restaurant Name" required>
            <TextInput
              value={formData.name}
              onChangeText={(name) => setFormData({ ...formData, name })}
              placeholder="Enter restaurant name"
              style={styles.input}
            />
          </FormField>
          
          {/* Cuisine Types */}
          <FormField label="Cuisine Type(s)" required>
            <CuisineSelector
              selected={formData.cuisineTypes}
              onChange={(cuisineTypes) => setFormData({ ...formData, cuisineTypes })}
            />
          </FormField>
          
          {/* Address with Autocomplete */}
          <FormField label="Address" required>
            <AddressAutocomplete
              value={formData.address}
              onChangeText={(address) => {
                setFormData({ ...formData, address });
                handleAddressSearch(address);
              }}
              suggestions={addressSuggestions}
              onSelectSuggestion={handleAddressSelect}
            />
          </FormField>
          
          {/* City, State, Zip (auto-filled) */}
          <View style={styles.row}>
            <FormField label="City" style={styles.flex1}>
              <TextInput
                value={formData.city}
                editable={false}
                style={[styles.input, styles.disabled]}
              />
            </FormField>
            
            <FormField label="State" style={styles.flexNone}>
              <TextInput
                value={formData.state}
                editable={false}
                style={[styles.input, styles.disabled, styles.stateInput]}
              />
            </FormField>
            
            <FormField label="ZIP" style={styles.flexNone}>
              <TextInput
                value={formData.zipCode}
                editable={false}
                style={[styles.input, styles.disabled, styles.zipInput]}
              />
            </FormField>
          </View>
          
          {/* Optional Fields */}
          <FormField label="Description" optional>
            <TextInput
              value={formData.description}
              onChangeText={(description) => setFormData({ ...formData, description })}
              placeholder="What makes this place special?"
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </FormField>
          
          <FormField label="Website" optional>
            <TextInput
              value={formData.website}
              onChangeText={(website) => setFormData({ ...formData, website })}
              placeholder="https://restaurant-website.com"
              keyboardType="url"
              autoCapitalize="none"
              style={styles.input}
            />
          </FormField>
          
          <FormField label="Price Range" optional>
            <PriceRangeSelector
              value={formData.priceRange}
              onChange={(priceRange) => setFormData({ ...formData, priceRange })}
            />
          </FormField>
          
          <FormField label="Photos" optional>
            <PhotoPicker
              photos={formData.photos}
              onPhotosChange={(photos) => setFormData({ ...formData, photos })}
              maxPhotos={5}
            />
          </FormField>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Button
          title="Save Restaurant"
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          loading={isSubmitting}
        />
        
        <Text style={styles.note}>
          Your restaurant will be saved to your collection immediately and 
          submitted for community-wide visibility after review.
        </Text>
      </View>
    </Screen>
  );
};
```

### Restaurant Service

```typescript
// services/restaurantService.ts
export class RestaurantService {
  static async createUserSubmitted(data: RestaurantFormData & { submittedBy: string }) {
    // Upload photos first
    const photoUrls = await this.uploadPhotos(data.photos);
    
    // Create restaurant
    const { data: restaurant, error } = await supabase
      .rpc('create_user_restaurant', {
        p_user_id: data.submittedBy,
        p_name: data.name,
        p_address: data.address,
        p_city: data.city,
        p_state: data.state,
        p_zip_code: data.zipCode,
        p_cuisine_types: data.cuisineTypes,
        p_description: data.description,
        p_website: data.website,
        p_price_range: data.priceRange,
        p_photos: photoUrls,
        p_location: data.location ? 
          `POINT(${data.location.lng} ${data.location.lat})` : null,
      });
    
    if (error) throw error;
    
    // Track analytics
    analytics().logEvent('restaurant_created', {
      restaurant_id: restaurant,
      source: 'user_submitted',
    });
    
    return restaurant;
  }
  
  private static async uploadPhotos(localPaths: string[]): Promise<string[]> {
    const uploads = localPaths.map(async (path) => {
      const fileName = `restaurants/${Date.now()}_${Math.random()}.jpg`;
      const { error } = await supabase.storage
        .from('restaurant-photos')
        .upload(fileName, {
          uri: path,
          type: 'image/jpeg',
        });
      
      if (error) throw error;
      return fileName;
    });
    
    return Promise.all(uploads);
  }
}
```

### Database Function

```sql
-- Function to create user-submitted restaurant
CREATE OR REPLACE FUNCTION create_user_restaurant(
  p_user_id UUID,
  p_name VARCHAR,
  p_address TEXT,
  p_city VARCHAR,
  p_state VARCHAR,
  p_zip_code VARCHAR,
  p_cuisine_types TEXT[],
  p_description TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_price_range VARCHAR DEFAULT NULL,
  p_photos TEXT[] DEFAULT '{}',
  p_location GEOMETRY DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_restaurant_id UUID;
  v_default_board_id UUID;
BEGIN
  -- Insert restaurant
  INSERT INTO restaurants (
    name, address, city, state, zip_code, location,
    cuisine_types, description, website, price_range, photos,
    data_source, submitted_by, is_approved
  ) VALUES (
    p_name, p_address, p_city, p_state, p_zip_code, p_location,
    p_cuisine_types, p_description, p_website, p_price_range, p_photos,
    'user', p_user_id, false
  ) RETURNING id INTO v_restaurant_id;
  
  -- Get or create user's default board
  SELECT get_or_create_default_board(p_user_id) INTO v_default_board_id;
  
  -- Auto-save to user's collection
  INSERT INTO restaurant_saves (
    user_id, restaurant_id, board_id
  ) VALUES (
    p_user_id, v_restaurant_id, v_default_board_id
  );
  
  -- Notify admins for moderation
  INSERT INTO admin_notifications (
    type, title, message, data
  ) VALUES (
    'restaurant_moderation',
    'New Restaurant Submission',
    p_name || ' submitted by user',
    jsonb_build_object('restaurant_id', v_restaurant_id)
  );
  
  RETURN v_restaurant_id;
END;
$$ LANGUAGE plpgsql;

-- Add moderation fields
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Index for moderation queries
CREATE INDEX idx_restaurants_moderation 
ON restaurants(is_approved, submitted_by) 
WHERE data_source = 'user';
```

## Definition of Done

- [ ] "Save a Restaurant" option added to Add tab
- [ ] Restaurant input form with all required fields
- [ ] Address autocomplete integrated
- [ ] Cuisine type multi-selector implemented
- [ ] Photo upload functionality (max 5)
- [ ] Form validation with clear requirements
- [ ] Restaurant saved to user's Quick Saves
- [ ] Success feedback with navigation options
- [ ] Moderation queue entry created
- [ ] User can view their submission immediately
- [ ] Pending approval badge shown
- [ ] Admin notification sent
- [ ] Analytics tracking for submissions
- [ ] Error handling for all failure cases
- [ ] Accessibility: Form fully navigable

## Resources
- [Google Places Autocomplete](https://developers.google.com/maps/documentation/places/web-service/autocomplete)
- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [PostGIS Geometry](https://postgis.net/workshops/postgis-intro/geometries.html)

## Notes
- Consider duplicate detection based on name/address
- Add business hours input in future iteration
- Consider OCR for menu upload
- Track approval rates and rejection reasons
- Future: Allow editing of user-submitted restaurants