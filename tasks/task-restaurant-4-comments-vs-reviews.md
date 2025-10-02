# Implement Comments vs Full Reviews System

- Epic: Restaurant Management
- Priority: Medium
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Add structured review buttons/prompts instead of just open-ended text. Allow quick reactions/comments vs full detailed reviews.

## Business Value
Lowers barrier to leaving feedback. Not everyone wants to write a long review. Quick buttons increase engagement and provide structured data for recommendations.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Quick comment buttons
  As a user
  I want to quickly react to a restaurant
  So that I can share feedback without writing a review

  Scenario: Quick reactions after visit
    Given I just marked a restaurant as visited
    When I see the review prompt
    Then I can tap quick buttons like:
      - "Must try the [dish name]"
      - "Great for dates"
      - "Perfect vibes"
      - "Would come back"
    And my reactions are saved

  Scenario: Add quick comment
    Given I want to leave a brief note
    When I tap "Add comment"
    Then I can write a short note (50-200 chars)
    And it's saved as a comment, not full review

Feature: Full review option
  As a user
  I want to write detailed reviews
  So that I can share my full experience

  Scenario: Write full review
    Given I want to provide detailed feedback
    When I tap "Write Review"
    Then I see a full review form with:
      - Star rating
      - Photo upload
      - Dish recommendations
      - Long-form text field
      - Tags (ambiance, service, value)
    And I can submit a comprehensive review
```

## Technical Implementation

### Database Schema
```sql
-- Quick comments table
CREATE TABLE restaurant_comments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  comment TEXT, -- Short form (50-200 chars)
  comment_type VARCHAR, -- quick_reaction, note, dish_rec
  created_at TIMESTAMP
);

-- Review tags
CREATE TABLE review_tags (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES reviews(id),
  tag VARCHAR, -- great_for_dates, good_vibes, good_value, etc.
  created_at TIMESTAMP
);

-- Enhance reviews table
ALTER TABLE reviews ADD COLUMN review_type VARCHAR; -- quick, full
ALTER TABLE reviews ADD COLUMN recommended_dishes TEXT[];
```

### Quick Reaction Buttons
Predefined reactions:
- 🔥 "Must try the ___"
- 💕 "Great for dates"
- ✨ "Perfect vibes"
- 🔄 "Would come back"
- 👥 "Good for groups"
- 💰 "Great value"
- 🍽️ "Outstanding service"

UI:
```tsx
<View style={styles.quickReactions}>
  {reactions.map(reaction => (
    <TouchableOpacity
      key={reaction.id}
      style={styles.reactionButton}
      onPress={() => handleQuickReaction(reaction)}
    >
      <Text style={styles.emoji}>{reaction.emoji}</Text>
      <Text style={styles.label}>{reaction.label}</Text>
    </TouchableOpacity>
  ))}
</View>
```

### Review Flow Decision
After marking as visited:
1. Show quick reactions first (low friction)
2. "Add a quick note" option (50-200 chars)
3. "Write full review" link at bottom

### Full Review Form
- Star rating (required)
- Photo upload (optional, up to 5 photos)
- Dish recommendations (searchable/autocomplete)
- Review text (500+ chars for "full" review)
- Tag selection (checkboxes)
  - Ambiance: cozy, trendy, romantic, casual
  - Service: fast, attentive, friendly
  - Value: affordable, worth it, overpriced
  - Noise level: quiet, moderate, loud

### Display Logic
Restaurant detail page sections:
1. **Quick Takes** - aggregated reactions with counts
2. **Comments** - short notes from users
3. **Full Reviews** - detailed reviews with photos

### Analytics
Track:
- Quick reaction usage rate
- Comment vs full review ratio
- Most used reactions per cuisine type
- Time to complete quick vs full review
- Engagement with each review type

## Definition of Done
- [ ] Quick reaction buttons implemented
- [ ] Comment system working
- [ ] Full review form enhanced
- [ ] All data persisting correctly
- [ ] Restaurant page displays both types
- [ ] Aggregated quick takes shown
- [ ] Tag system functional
- [ ] Photo upload working
- [ ] Analytics tracking implemented
- [ ] UI polished and intuitive

## Notes
From feedback: "Comments on restaurants vs. full reviews. Buttons to add to reviews / click vs. just open ended text space"

This creates a spectrum of engagement levels: reaction → comment → full review.
