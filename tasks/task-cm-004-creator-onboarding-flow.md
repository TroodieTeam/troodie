# Creator Onboarding Flow (MVP)

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 2 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: CM-001

## Overview
Design and implement a simplified creator onboarding flow for MVP that transforms regular users into creators. Focus on essential information gathering and basic portfolio showcase to get creators started quickly while maintaining quality.

## MVP Simplification Summary
This task was significantly simplified from the original design to accelerate MVP delivery. Key decisions and rationale:

### What Was Removed:
1. **Social Media Connection** 
   - Original: Connect Instagram/TikTok/YouTube to verify followers and import content
   - Decision: Removed entirely
   - Rationale: Adds friction, privacy concerns, and technical complexity. Creator quality can be validated through portfolio and campaign performance instead.

2. **Rate Setting**
   - Original: Creators set their base rates and pricing preferences
   - Decision: Removed from onboarding
   - Rationale: Restaurants create campaigns with fixed budgets. Creators apply to campaigns, making rate negotiation part of the application process, not onboarding.

3. **Verification Process**
   - Original: 24-hour manual review with quality scoring
   - Decision: Instant activation for all creators
   - Rationale: Build supply quickly for marketplace launch. Quality control can happen through campaign application reviews.

4. **Complex Portfolio Import**
   - Original: Auto-import from social media with engagement metrics
   - Decision: Simple photo upload from camera roll
   - Rationale: Reduces technical complexity while still showcasing creator work.

### What Was Kept:
- Basic profile information (name, bio, specialties, location)
- Portfolio showcase (3-5 photos with captions)
- Terms agreement
- Immediate access to Creator Tools after completion

### What Was Added (V1 Implementation):
1. **Qualification Check Screen**
   - Shows users their existing platform activity (saves, boards, friends)
   - Builds confidence by showing they're already qualified
   - Reduces imposter syndrome and encourages conversion
   - Rationale: Users with 40+ saves and active engagement are ideal creators

2. **Creator Focus Selection**
   - Users select their content specialties (Local Favorites, Date Night, etc.)
   - Helps match creators with relevant restaurant campaigns
   - Improves campaign targeting and creator-restaurant fit

### Result:
Reduced from 7-step complex flow to 3-step simple flow, cutting implementation time from 3 days to 2 days while maintaining core functionality. V1 implementation adds qualification validation to boost user confidence.

## Business Value
- Quick creator acquisition for marketplace launch
- Low friction onboarding to maximize conversion
- Essential data collection for restaurant matching
- Sets foundation for future enhancements
- Enables creators to start applying to campaigns immediately

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Onboarding Flow (MVP)
  As a regular Troodie user
  I want to become a creator
  So that I can apply to restaurant campaigns

  Scenario: Starting creator onboarding
    Given I am a logged-in consumer
    When I tap "Become a Creator" in the More tab
    Then I see a welcome screen explaining how campaigns work
    And I can start the simple onboarding process
    And I see there are only 3 quick steps

  Scenario: Qualification check
    Given I am in the onboarding flow
    When I reach the qualification screen
    Then I see my existing activity (saves, boards, friends)
    And I see a "qualified" message if I have 40+ saves
    And I can select my creator focus areas (Local Favorites, Date Night, etc.)
    And I feel confident about becoming a creator

  Scenario: Portfolio upload
    Given I am creating my profile
    When I add portfolio examples
    Then I can upload 3-5 photos of food content
    And I can add captions describing each photo
    And I can mention the restaurant names

  Scenario: Instant activation
    Given I complete the basic onboarding
    When I agree to creator guidelines
    Then my account type immediately becomes "creator"
    And I can start browsing and applying to campaigns
    And Creator Tools appear in the More tab
```

## Technical Implementation

### Simplified Onboarding State (MVP)
```typescript
interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  creatorData: Partial<CreatorProfileData>;
  portfolioImages: PortfolioImage[];
  isComplete: boolean;
}

interface CreatorProfileData {
  displayName: string;
  bio: string;
  specialties: string[];
  location: string;
  agreedToTerms: boolean;
}

interface PortfolioImage {
  id: string;
  uri: string;
  caption: string;
  restaurantName?: string;
}

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome',
    component: WelcomeScreen
  },
  {
    id: 'profile',
    title: 'Your Profile',
    component: ProfileScreen
  },
  {
    id: 'portfolio',
    title: 'Your Work',
    component: PortfolioScreen
  }
];
```

### Welcome Screen (Simplified)
```typescript
const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Become a Creator</Text>
          <Text style={styles.subtitle}>
            Apply to restaurant campaigns and earn money
          </Text>
        </View>

        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How it works</Text>
          
          <StepCard
            number="1"
            title="Browse Campaigns"
            description="Restaurants post campaigns looking for creators"
          />
          <StepCard
            number="2"
            title="Apply to Campaigns"
            description="Submit your application with your proposed content"
          />
          <StepCard
            number="3"
            title="Create Content"
            description="Visit the restaurant and create amazing content"
          />
          <StepCard
            number="4"
            title="Get Paid"
            description="Receive payment after content is approved"
          />
        </View>

        <View style={styles.quickSetup}>
          <Text style={styles.setupTitle}>Quick 3-step setup</Text>
          <Text style={styles.setupDescription}>
            Tell us about yourself and share some of your work
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => navigation.navigate('ProfileSetup')}
        >
          <Text style={styles.startButtonText}>Get Started</Text>
          <ChevronRight size={20} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Creator Guidelines
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};
```

### Profile Setup Screen (MVP)
```typescript
const ProfileSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorProfileData>({
    displayName: user?.name || '',
    bio: '',
    specialties: [],
    location: '',
    agreedToTerms: false
  });

  const specialtyOptions = [
    { id: 'brunch', label: 'Brunch', icon: '🥐' },
    { id: 'fine_dining', label: 'Fine Dining', icon: '🍽️' },
    { id: 'casual', label: 'Casual Dining', icon: '🍔' },
    { id: 'street_food', label: 'Street Food', icon: '🌮' },
    { id: 'desserts', label: 'Desserts', icon: '🍰' },
    { id: 'coffee', label: 'Coffee & Cafes', icon: '☕' },
    { id: 'bars', label: 'Bars & Drinks', icon: '🍹' },
    { id: 'vegan', label: 'Vegan/Vegetarian', icon: '🥗' }
  ];

  const toggleSpecialty = (specialtyId: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialtyId)
        ? prev.specialties.filter(s => s !== specialtyId)
        : [...prev.specialties, specialtyId]
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressHeader currentStep={2} totalSteps={3} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          This helps restaurants find the right creators
        </Text>

        <View style={styles.formSection}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={profile.displayName}
            onChangeText={(text) => setProfile(prev => ({ ...prev, displayName: text }))}
            placeholder="How you want to be known"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.bio}
            onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
            placeholder="Tell restaurants about your food passion and experience"
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.charCount}>{profile.bio.length}/200</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>What type of food do you love?</Text>
          <Text style={styles.sublabel}>Select all that apply</Text>
          <View style={styles.specialtyGrid}>
            {specialtyOptions.map(specialty => (
              <TouchableOpacity
                key={specialty.id}
                style={[
                  styles.specialtyChip,
                  profile.specialties.includes(specialty.id) && styles.specialtyChipSelected
                ]}
                onPress={() => toggleSpecialty(specialty.id)}
              >
                <Text style={styles.specialtyIcon}>{specialty.icon}</Text>
                <Text style={[
                  styles.specialtyLabel,
                  profile.specialties.includes(specialty.id) && styles.specialtyLabelSelected
                ]}>
                  {specialty.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Your Location</Text>
          <TextInput
            style={styles.input}
            value={profile.location}
            onChangeText={(text) => setProfile(prev => ({ ...prev, location: text }))}
            placeholder="City or neighborhood"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!profile.displayName || !profile.bio || profile.specialties.length === 0) && styles.continueButtonDisabled
          ]}
          disabled={!profile.displayName || !profile.bio || profile.specialties.length === 0}
          onPress={() => navigation.navigate('Portfolio', { profile })}
        >
          <Text style={styles.continueButtonText}>
            Continue to Portfolio
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
```

### Portfolio Upload Screen (Simple MVP)
```typescript
const PortfolioScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = route.params;
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        id: Date.now().toString() + Math.random(),
        uri: asset.uri,
        caption: '',
        restaurantName: ''
      }));
      setPortfolioImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const updateImageCaption = (imageId: string, caption: string) => {
    setPortfolioImages(prev => 
      prev.map(img => img.id === imageId ? { ...img, caption } : img)
    );
  };

  const removeImage = (imageId: string) => {
    setPortfolioImages(prev => prev.filter(img => img.id !== imageId));
  };

  const completeOnboarding = async () => {
    try {
      // Save creator profile
      await creatorService.createProfile({
        ...profile,
        portfolioImages
      });

      // Update user account type
      await authService.upgradeToCreator();

      // Navigate to success screen or directly to creator dashboard
      navigation.navigate('OnboardingComplete');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressHeader currentStep={3} totalSteps={3} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Show your work</Text>
        <Text style={styles.subtitle}>
          Upload 3-5 photos of food content you've created
        </Text>

        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Camera size={24} color="#007AFF" />
          <Text style={styles.uploadText}>Add Photos ({portfolioImages.length}/5)</Text>
        </TouchableOpacity>

        {portfolioImages.map((image, index) => (
          <View key={image.id} style={styles.portfolioItem}>
            <Image source={{ uri: image.uri }} style={styles.portfolioImage} />
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              value={image.caption}
              onChangeText={(text) => updateImageCaption(image.id, text)}
              maxLength={100}
            />
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeImage(image.id)}
            >
              <X size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.termsSection}>
          <CheckBox
            value={profile.agreedToTerms}
            onValueChange={(value) => setProfile(prev => ({ ...prev, agreedToTerms: value }))}
          />
          <Text style={styles.termsText}>
            I agree to the Creator Guidelines and Terms
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.completeButton,
            (portfolioImages.length < 3 || !profile.agreedToTerms) && styles.completeButtonDisabled
          ]}
          disabled={portfolioImages.length < 3 || !profile.agreedToTerms}
          onPress={completeOnboarding}
        >
          <Text style={styles.completeButtonText}>
            Complete Setup
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
```

### Simple Creator Service (MVP)
```typescript
class CreatorService {
  async createProfile(data: {
    displayName: string;
    bio: string;
    specialties: string[];
    location: string;
    portfolioImages: PortfolioImage[];
  }): Promise<void> {
    const { user } = await supabase.auth.getUser();
    
    // Create creator profile
    const { error: profileError } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: user.id,
        display_name: data.displayName,
        bio: data.bio,
        specialties: data.specialties,
        location: data.location,
        account_status: 'active' // Instant approval for MVP
      });

    if (profileError) throw profileError;

    // Upload portfolio images
    for (const image of data.portfolioImages) {
      const fileName = `${user.id}/${Date.now()}_${Math.random()}.jpg`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, image.uri);

      if (!uploadError) {
        // Save portfolio item record
        await supabase.from('portfolio_items').insert({
          creator_id: user.id,
          image_url: uploadData.path,
          caption: image.caption,
          restaurant_name: image.restaurantName
        });
      }
    }
  }
}
```

## Definition of Done
- [ ] Welcome screen explains campaign marketplace clearly
- [ ] Profile setup captures name, bio, specialties, location
- [ ] Portfolio upload allows 3-5 image uploads from camera roll
- [ ] Images can have captions added
- [ ] Terms agreement checkbox works
- [ ] Account type changes to "creator" immediately after completion
- [ ] Creator tools appear in More tab after onboarding
- [ ] Progress indicator shows 3 steps clearly
- [ ] All form validation works correctly
- [ ] Error handling for upload failures
- [ ] Responsive design across all device sizes
- [ ] Data saves correctly to database

## Notes
- Entry point from More tab "Become a Creator" option
- MVP focuses on quick onboarding without verification delays
- No social media connection required for MVP (can be added later)
- No rate setting needed - restaurants set campaign budgets
- Instant approval for all creators in MVP phase
- Can add verification and quality checks in future iterations
- Related: CM-001 Account Type System, CM-003 More Tab Navigation

## MVP Rationale
- **Removed social media connection**: Reduces friction and complexity. Many creators may not want to connect accounts initially. Can validate creator quality through their campaign applications instead.
- **Removed rate setting**: Campaigns are restaurant-initiated with set budgets. Creators apply with their proposals, making rate negotiation part of the application process.
- **Instant activation**: Gets creators into the marketplace quickly to build supply. Can add verification later as quality control measure.
- **Simple portfolio**: Just photos with captions is enough to show work quality. Advanced metrics can come later.