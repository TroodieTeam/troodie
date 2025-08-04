# Task 8.4: Add Share Functionality

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: Medium
- **Estimate**: 3 days
- **Status**: 🔴 Not Started
- **Dependencies**: Deep linking setup
- **Blocks**: Viral growth features
- **Assignee**: -

## Overview
Implement sharing for boards, posts, and profiles, allowing users to share via system share sheets with rich previews and deep linking support.

## Business Value
- **Viral growth**: Enable organic user acquisition
- **Increased engagement**: Users share favorite content
- **Network effects**: Bring friends into the app
- **Content discovery**: Shared links drive app installs

## Dependencies
- Deep linking configuration
- URL shortener service (optional)
- Open Graph meta tags setup

## Blocks
- Social marketing campaigns
- User referral programs
- Content virality

## Acceptance Criteria

```gherkin
Feature: Share Boards, Posts, and Profiles
  As a user
  I want to share content from the app
  So that I can show others interesting discoveries

  Scenario: Share a board
    Given I am viewing a board
    When I tap the share button
    Then the system share sheet opens
    And the share content includes the board title and description
    And a link is generated that opens the board in the app
    And recipients see a rich preview with board image

  Scenario: Share a post
    Given I am viewing a post
    When I tap the share button
    Then the system share sheet opens
    And the share includes the restaurant name and user's caption
    And the link opens directly to the post
    And the preview shows the post image

  Scenario: Share a profile
    Given I am viewing a user profile
    When I tap the share button
    Then I can share their profile
    And the share includes their name and bio snippet
    And the link opens their profile
    And analytics track the share event

  Scenario: Open shared link
    Given I receive a shared Troodie link
    When I tap the link
    Then if I have the app, it opens to the specific content
    And if I don't have the app, I'm directed to the app store
    And after installing, the app opens to the shared content
```

## Technical Implementation

### Share Service Implementation

```typescript
// services/shareService.ts
import Share from 'react-native-share';
import { Linking } from 'react-native';
import analytics from '@react-native-firebase/analytics';

interface ShareContent {
  type: 'board' | 'post' | 'profile';
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

export class ShareService {
  static async share(content: ShareContent): Promise<void> {
    try {
      // Generate deep link
      const deepLink = this.generateDeepLink(content);
      const shortUrl = await this.shortenUrl(deepLink);
      
      // Build share message
      const message = this.buildShareMessage(content);
      
      // Track share initiation
      await analytics().logShare({
        content_type: content.type,
        item_id: content.id,
        method: 'system_share_sheet'
      });
      
      // Open share sheet
      const shareOptions = {
        title: content.title,
        message: `${message}\n\n${shortUrl}`,
        url: shortUrl, // iOS
        social: Share.Social.WHATSAPP, // Optional: specific platform
      };
      
      const result = await Share.open(shareOptions);
      
      // Track successful share
      if (result) {
        await this.trackShareComplete(content, result);
      }
    } catch (error) {
      if (error.error !== 'User did not share') {
        console.error('Share error:', error);
      }
    }
  }
  
  private static generateDeepLink(content: ShareContent): string {
    const baseUrl = 'https://troodie.app';
    const paths = {
      board: `/boards/${content.id}`,
      post: `/posts/${content.id}`,
      profile: `/users/${content.id}`
    };
    
    return `${baseUrl}${paths[content.type]}`;
  }
  
  private static async shortenUrl(url: string): Promise<string> {
    // Implement URL shortening service integration
    // For now, return original URL
    return url;
  }
  
  private static buildShareMessage(content: ShareContent): string {
    const messages = {
      board: `Check out this restaurant collection: "${content.title}"`,
      post: `${content.title} on Troodie`,
      profile: `Follow ${content.title} on Troodie for great restaurant recommendations`
    };
    
    return messages[content.type];
  }
}
```

### Deep Linking Configuration

```typescript
// navigation/linking.ts
export const linking = {
  prefixes: ['troodie://', 'https://troodie.app', 'https://www.troodie.app'],
  config: {
    screens: {
      BoardDetail: {
        path: 'boards/:id',
        parse: {
          id: (id: string) => id,
        },
      },
      PostDetail: {
        path: 'posts/:id',
        parse: {
          id: (id: string) => id,
        },
      },
      Profile: {
        path: 'users/:id',
        parse: {
          id: (id: string) => id,
        },
      },
    },
  },
  async getInitialURL() {
    // Handle app opened from dead state via deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    
    // Handle deferred deep linking (post-install)
    const deferredUrl = await getDeferredDeepLink();
    return deferredUrl;
  },
};
```

### Share Button Component

```typescript
// components/ShareButton.tsx
interface ShareButtonProps {
  content: ShareContent;
  style?: ViewStyle;
  iconSize?: number;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  content, 
  style,
  iconSize = 24 
}) => {
  const [isSharing, setIsSharing] = useState(false);
  
  const handleShare = async () => {
    setIsSharing(true);
    try {
      await HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light);
      await ShareService.share(content);
    } finally {
      setIsSharing(false);
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={handleShare} 
      disabled={isSharing}
      style={[styles.button, style]}
      accessibilityLabel="Share"
      accessibilityRole="button"
    >
      {isSharing ? (
        <ActivityIndicator size="small" />
      ) : (
        <Ionicons name="share-outline" size={iconSize} color={colors.text} />
      )}
    </TouchableOpacity>
  );
};
```

### Analytics Tracking

```typescript
// utils/shareAnalytics.ts
export const shareAnalytics = {
  trackShareInitiated: (contentType: string, contentId: string) => {
    analytics().logEvent('share_initiated', {
      content_type: contentType,
      content_id: contentId,
      timestamp: Date.now(),
    });
  },
  
  trackShareCompleted: (contentType: string, contentId: string, platform?: string) => {
    analytics().logEvent('share_completed', {
      content_type: contentType,
      content_id: contentId,
      platform: platform || 'unknown',
      timestamp: Date.now(),
    });
  },
  
  trackShareLinkOpened: (contentType: string, contentId: string, source: string) => {
    analytics().logEvent('share_link_opened', {
      content_type: contentType,
      content_id: contentId,
      source, // 'deep_link', 'deferred_deep_link', 'web_redirect'
      timestamp: Date.now(),
    });
  },
};
```

### Database Schema Updates

```sql
-- Track share analytics
CREATE TABLE IF NOT EXISTS share_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content_type VARCHAR NOT NULL CHECK (content_type IN ('board', 'post', 'profile')),
  content_id UUID NOT NULL,
  platform VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add share count to content tables
ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX idx_share_analytics_content ON share_analytics(content_type, content_id);
CREATE INDEX idx_share_analytics_user ON share_analytics(user_id);
```

## Definition of Done

- [ ] Share buttons added to boards, posts, and profiles
- [ ] System share sheet opens with appropriate content
- [ ] Deep links generated for each content type
- [ ] Deep links open app to correct content
- [ ] Deferred deep linking works post-install
- [ ] Share analytics tracked and stored
- [ ] Share counts displayed on content
- [ ] Rich previews configured for shared links
- [ ] URL shortener integrated (optional)
- [ ] Error handling for share failures
- [ ] Accessibility labels on share buttons
- [ ] Cross-platform share functionality tested
- [ ] App store redirect for non-users

## Resources
- [React Native Share](https://github.com/react-native-share/react-native-share)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Branch.io Deferred Deep Linking](https://docs.branch.io/apps/ios/#configure-associated-domains)
- [Open Graph Protocol](https://ogp.me/)

## Notes
- Consider implementing custom share targets (Instagram Stories, etc.)
- Add share suggestions based on user's most used apps
- Track viral coefficient (shares leading to new users)
- A/B test share message formats
- Consider implementing referral rewards for shares that convert