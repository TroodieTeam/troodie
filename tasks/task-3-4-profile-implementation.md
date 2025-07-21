# Task 3.4: User Profile Implementation

## Epic: Core Social Features
- **Priority**: High
- **Estimate**: 4 days
- **Status**: 🔴 Not Started
- **Depends on**: Task 1.2 (Email Authentication), Task 3.1 (Achievement System)

## Overview
Implement comprehensive user profile functionality including persona storage, profile data management, achievements for profile completion, edit capabilities, and sharing features.

## Business Value
- Encourages user investment in the platform
- Increases user engagement through profile completion
- Enables social features and connections
- Provides personalized experience based on user persona

## Dependencies
- Email Authentication system
- Achievement system
- Storage system for profile images
- Persona quiz implementation

## Blocks
- Task 3.3: Activity Feed & Interactions
- Task 4.1: Board Creation & Management

## Acceptance Criteria

```gherkin
Feature: User Profile Data Storage
  As a new user
  I want my persona and profile data saved after onboarding
  So that I get a personalized experience

  Scenario: Persona Quiz Completion
    Given I complete the persona quiz
    When I submit my answers
    Then my persona should be stored in Supabase
    And I should see my persona reflected in my profile

Feature: Profile Data Display
  As a user
  I want to see my profile information
  So that I can verify my data is correct

  Scenario: Viewing Profile
    Given I am on the profile screen
    Then I should see:
      * My profile image (or default)
      * My username
      * My bio
      * My persona type
      * My achievements
      * My saved restaurants count
      * My reviews count

Feature: Profile Completion Achievements
  As a new user
  I want to earn achievements for completing my profile
  So that I am motivated to provide complete information

  Scenario: Adding Bio Achievement
    Given I am editing my profile
    When I add a bio
    Then I should earn the "Bio Added" achievement

  Scenario: Username Achievement
    Given I am editing my profile
    When I set a username
    Then I should earn the "Username Set" achievement

  Scenario: Profile Image Achievement
    Given I am editing my profile
    When I upload a profile image
    Then I should earn the "Profile Picture Added" achievement

Feature: Profile Editing
  As a user
  I want to edit my profile information
  So that I can keep it up to date

  Scenario: Opening Edit Modal
    Given I am on my profile screen
    When I tap the edit button
    Then I should see the edit profile modal

  Scenario: Updating Profile Image
    Given I am in the edit profile modal
    When I tap the profile image
    Then I should be able to:
      * Take a new photo
      * Choose from gallery
      * Remove current photo

  Scenario: Updating Profile Info
    Given I am in the edit profile modal
    When I update my:
      * Username
      * Bio
      * Email preferences
    And tap save
    Then my profile should be updated
    And I should see the changes immediately

Feature: Profile Sharing
  As a user
  I want to share my profile
  So that friends can find me on the platform

  Scenario: Share Profile
    Given I am on my profile screen
    When I tap the share button
    Then I should see sharing options
    And the share content should include:
      * My profile link
      * My username
      * App download link
```

## Technical Implementation

### 1. Update User Schema
```sql
ALTER TABLE public.profiles
ADD COLUMN persona TEXT,
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN bio TEXT,
ADD COLUMN profile_image_url TEXT,
ADD COLUMN email_preferences JSONB DEFAULT '{"marketing": true, "social": true}'::jsonb;

-- Add username index
CREATE INDEX profiles_username_idx ON public.profiles (username);
```

### 2. Profile Service Implementation
```typescript
// services/profileService.ts
export class ProfileService {
  async updateProfile(userId: string, data: Partial<Profile>) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async uploadProfileImage(userId: string, imageUri: string) {
    const fileName = `${userId}/profile.jpg`;
    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(fileName, imageUri, {
        upsert: true
      });

    if (error) throw error;
    
    const { publicUrl } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    await this.updateProfile(userId, {
      profile_image_url: publicUrl
    });

    return publicUrl;
  }

  async setUsername(userId: string, username: string) {
    const profile = await this.updateProfile(userId, { username });
    const achievementService = new AchievementService();
    await achievementService.unlockAchievement(userId, 'username_set');
    return profile;
  }

  async setBio(userId: string, bio: string) {
    const profile = await this.updateProfile(userId, { bio });
    const achievementService = new AchievementService();
    await achievementService.unlockAchievement(userId, 'bio_added');
    return profile;
  }

  async setPersona(userId: string, persona: string) {
    return this.updateProfile(userId, { persona });
  }

  async shareProfile(username: string) {
    const shareUrl = `https://troodie.app/u/${username}`;
    return Share.share({
      message: `Check out my food adventures on Troodie!`,
      url: shareUrl
    });
  }
}
```

### 3. Edit Profile Modal Component
```typescript
// components/modals/EditProfileModal.tsx
export const EditProfileModal = ({ 
  visible, 
  onClose,
  onSave 
}: EditProfileModalProps) => {
  const [loading, setLoading] = useState(false);
  const { userState } = useApp();
  const profileService = new ProfileService();

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        await profileService.uploadProfileImage(
          userState.id, 
          result.assets[0].uri
        );
        await achievementService.unlockAchievement(
          userState.id, 
          'profile_image_added'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  // ... rest of the modal implementation
};
```

### 4. Profile Screen Updates
```typescript
// app/(tabs)/profile.tsx
export default function ProfileScreen() {
  const { userState } = useApp();
  const [editVisible, setEditVisible] = useState(false);
  const profileService = new ProfileService();

  const handleShare = async () => {
    if (userState.username) {
      await profileService.shareProfile(userState.username);
    }
  };

  // ... rest of the screen implementation
}
```

## Definition of Done
- [ ] Persona data stored in Supabase after quiz
- [ ] Profile screen displays all user data correctly
- [ ] Edit profile modal implemented and functional
- [ ] Profile image upload working with storage
- [ ] Username uniqueness enforced
- [ ] Share functionality implemented
- [ ] All profile completion achievements working
- [ ] Email preferences saved and respected
- [ ] Loading states and error handling
- [ ] Input validation
- [ ] Profile data cached for offline access
- [ ] Analytics tracking profile actions
- [ ] Unit tests for profile service
- [ ] E2E tests for main flows
- [ ] Documentation updated

## Resources
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [Achievement System Design](../docs/achievement-system.md)

## Notes
- Consider implementing profile verification badges for future
- Plan for profile privacy settings
- Consider adding profile themes or customization options
- Monitor storage usage for profile images
- Plan for profile data export functionality 