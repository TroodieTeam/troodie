# PRD-012: Creator Profiles & Metrics

## Problem Statement
Need comprehensive creator profiles with engagement metrics and content samples to enable restaurants to evaluate and select creators for campaigns.

## Priority
**Critical** - MVP Pre-launch (By 9/16)

## Current State
- Basic user profiles exist
- No creator-specific features
- No portfolio showcase
- No engagement metrics
- No collaboration preferences

## Assumptions
1. Creators have existing social media presence
2. Restaurants need data to evaluate creators
3. Metrics drive creator selection decisions
4. Portfolio quality matters more than quantity
5. Self-reported data initially, verified later

## Questions for Founder
1. Which metrics are most important to restaurants?
2. How to verify follower counts without API access?
3. Should we show historical performance data?
4. Privacy settings for creator metrics?
5. Minimum requirements to become a creator?
6. How to handle creator quality control?

## Proposed Solution
1. Enhanced profile for creators with portfolio section
2. Key metrics dashboard
3. Content samples showcase
4. Collaboration preferences
5. Availability calendar
6. Verified badge system

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Creator Profile Management
  As a creator
  I want a professional profile
  So that restaurants choose me for campaigns

  Background:
    Given I am a registered user
    And I want to become a creator

  Scenario: Setting up creator profile
    Given I access "Become a Creator" option
    When I complete the creator onboarding
    Then I can add:
      | Field | Type | Required |
      | Display Name | Text | Yes |
      | Bio | Text | Yes |
      | Location | Text | Yes |
      | Specialties | Multi-select | Yes |
      | Portfolio | Images | Yes (3-5) |
      | Social Handles | Text | Optional |
      | Rates | Currency | Optional |
    And my account type changes to "creator"
    And Creator Hub appears in navigation

  Scenario: Portfolio management
    Given I am a creator
    When I manage my portfolio
    Then I can upload up to 10 images
    And each image can have:
      | Field | Type |
      | Caption | Text |
      | Restaurant | Tag |
      | Date | Date |
    And I can reorder images
    And I can set featured images

  Scenario: Metrics display
    Given I have creator metrics
    When someone views my profile
    Then they see:
      | Metric | Display |
      | Total Followers | Aggregated count |
      | Engagement Rate | Percentage |
      | Content Created | Count |
      | Restaurants Featured | Count |
      | Average Rating | Stars |
      | Response Time | Hours/Days |
    And metrics update daily

  Scenario: Collaboration preferences
    Given I am setting preferences
    When I configure collaboration settings
    Then I can specify:
      | Preference | Options |
      | Collaboration Type | Free meal, Paid, Both |
      | Availability | Calendar selection |
      | Minimum Budget | Currency amount |
      | Content Types | Photo, Video, Reel, Story |
      | Turnaround Time | Days |
      | Preferred Cuisines | Multi-select |

  Scenario: Restaurant viewing creator
    Given I am a restaurant owner
    When I view a creator profile
    Then I see:
      - Professional headshot/avatar
      - Verification badge (if applicable)
      - Location and specialties
      - Portfolio samples
      - Engagement metrics
      - Past campaign performance
      - Contact/invite button
    And I can filter creators by:
      - Location
      - Followers
      - Engagement rate
      - Specialty
      - Price range

  Scenario: Creator discovery
    Given I am browsing creators
    When I use the creator marketplace
    Then I can:
      - Search by name or specialty
      - Filter by multiple criteria
      - Sort by relevance/followers/rating
      - View in grid or list format
      - Save creators to lists
```

## Technical Implementation

### Data Model
```typescript
interface CreatorProfile {
  user_id: string;
  display_name: string;
  bio: string;
  location: string;
  specialties: string[];

  // Metrics
  metrics: {
    total_followers: number;
    engagement_rate: number;
    content_count: number;
    restaurants_featured: number;
    average_rating: number;
    response_time_hours: number;
  };

  // Portfolio
  portfolio_items: PortfolioItem[];

  // Preferences
  collaboration_preferences: {
    types: ('free_meal' | 'paid' | 'commission')[];
    minimum_budget?: number;
    availability: AvailabilityCalendar;
    content_types: string[];
    turnaround_days: number;
    preferred_cuisines: string[];
  };

  // Verification
  verified_status: 'none' | 'pending' | 'verified';
  verified_at?: Date;

  // Performance
  campaign_history: CampaignSummary[];
  rating: number;
  review_count: number;
}

interface PortfolioItem {
  id: string;
  image_url: string;
  thumbnail_url: string;
  caption?: string;
  restaurant_id?: string;
  restaurant_name?: string;
  created_at: Date;
  engagement_metrics?: {
    likes: number;
    comments: number;
    shares: number;
  };
  is_featured: boolean;
  order_position: number;
}
```

### UI Components
1. **Creator Profile Header**
   - Avatar with verification badge
   - Name and location
   - Quick stats bar
   - CTA buttons

2. **Portfolio Grid**
   - Responsive image grid
   - Hover effects with metrics
   - Lightbox for full view
   - Caption overlays

3. **Metrics Dashboard**
   - Visual charts for trends
   - Comparative metrics
   - Performance indicators

4. **Preference Settings**
   - Toggle switches
   - Range sliders
   - Multi-select chips
   - Calendar widget

## Success Metrics
- Creator profile completion rate >80%
- Average portfolio items: 5-7
- Restaurant view-to-contact rate >10%
- Creator satisfaction score >4.0
- Profile update frequency: weekly

## Testing Requirements
1. Profile creation flow
2. Image upload and optimization
3. Metrics calculation accuracy
4. Search and filter performance
5. Mobile responsiveness
6. Load time optimization

## Dependencies
- Image upload service
- Metrics calculation engine
- Search infrastructure
- Verification system
- Analytics tracking

## Edge Cases
- Creators with no social media
- Invalid metrics data
- Large portfolio uploads
- Incomplete profiles
- Disputed metrics

## Migration Strategy
- Auto-upgrade eligible users
- Grandfather existing content
- Gradual rollout by region
- Incentivize profile completion

## Future Enhancements
- Social media integration
- Video portfolios
- Live metrics updates
- AI-powered matching
- Performance predictions
- Certified creator program

## Privacy Considerations
- Opt-in for metric sharing
- Control over visible data
- GDPR compliance
- Data retention policies
- Third-party data usage

## Notes
- Critical for marketplace launch
- Quality over quantity for portfolios
- Consider watermarking images
- Build trust through transparency
- Focus on local creators initially

---
*PRD Version: 1.0*
*Created: 2025-01-13*
*Target Completion: 9/16 (Pre-launch)*