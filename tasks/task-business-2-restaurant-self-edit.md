# Allow Restaurants to Edit Details (Parking, Specials, etc.)

- Epic: Restaurant Admin
- Priority: Medium
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Enable restaurant admins to edit their restaurant details like parking info, special offers (e.g., "10% off Troodie Thursdays"), amenities, and other attributes.

## Business Value
Restaurant owners know their business best. Allowing them to add accurate, up-to-date information improves user experience and gives businesses tools to attract diners (specials, perks).

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Restaurant self-service editing
  As a restaurant owner
  I want to update my restaurant details
  So that customers have accurate information

  Scenario: Edit parking information
    Given I'm a verified restaurant owner
    When I go to "Edit Restaurant"
    And I update parking to "Free parking lot, Valet available"
    Then the information is saved
    And appears on my public restaurant page

  Scenario: Add Troodie special
    Given I want to offer a discount to Troodie users
    When I add "10% off Troodie Thursdays"
    Then it shows prominently on my restaurant page
    And Troodie users can see it when browsing

  Scenario: Update amenities
    Given I want to add amenities
    When I select "Outdoor seating, Dog friendly, Happy hour"
    Then these tags appear on my restaurant profile
    And users can filter by these amenities

  Scenario: Moderation for major changes
    Given I try to change my restaurant name
    When I submit the change
    Then it goes to moderation queue
    And I see "Change pending review"
```

## Technical Implementation

### Database Schema
```sql
-- Add editable fields to restaurants table
ALTER TABLE restaurants ADD COLUMN parking_info TEXT;
ALTER TABLE restaurants ADD COLUMN special_offers JSONB; -- Array of offers
ALTER TABLE restaurants ADD COLUMN amenities TEXT[]; -- Outdoor seating, WiFi, etc.
ALTER TABLE restaurants ADD COLUMN hours JSONB; -- Business hours
ALTER TABLE restaurants ADD COLUMN dress_code VARCHAR;
ALTER TABLE restaurants ADD COLUMN payment_methods TEXT[];
ALTER TABLE restaurants ADD COLUMN last_edited_by UUID REFERENCES users(id);
ALTER TABLE restaurants ADD COLUMN last_edited_at TIMESTAMP;

-- Create moderation queue for sensitive changes
CREATE TABLE restaurant_edit_queue (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  user_id UUID REFERENCES users(id),
  field_name VARCHAR,
  old_value TEXT,
  new_value TEXT,
  status VARCHAR, -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### Edit Permissions
- Only verified business owners can edit
- Check business_profiles.restaurant_id matches
- Different permission levels:
  - **Auto-approve**: parking, amenities, hours, photos
  - **Needs moderation**: name, address, category

### Edit Screen UI
- Section-based editing form:
  1. Basic Info (name, description) - moderated
  2. Parking & Access (parking, wheelchair accessible)
  3. Amenities (WiFi, outdoor seating, etc.)
  4. Hours of Operation
  5. Special Offers for Troodie Users
  6. Payment Methods
  7. Dress Code

### Special Offers Feature
```typescript
interface SpecialOffer {
  id: string;
  title: string; // "10% off Troodie Thursdays"
  description: string;
  validDays: string[]; // ['thursday']
  startDate: Date;
  endDate: Date;
  requiresCode: boolean;
  code?: string;
  active: boolean;
}
```
- Display special offers prominently on restaurant page
- Badge/banner for active offers
- Track redemptions (future feature)

### Moderation Dashboard (Admin)
- Queue of pending restaurant edits
- Side-by-side old vs new comparison
- Approve/reject with reason
- Auto-notify business owner of decision

### Analytics
Track:
- Fields most commonly edited
- Time from claim to first edit
- Special offer creation rate
- Offer view/engagement rate

## Definition of Done
- [ ] Edit screen implemented for business owners
- [ ] All specified fields editable
- [ ] Moderation queue functional
- [ ] Special offers display on restaurant pages
- [ ] Permissions properly enforced
- [ ] Audit trail for edits (last_edited_by/at)
- [ ] Admin moderation dashboard working
- [ ] Analytics tracking implemented
- [ ] Tested with various business accounts

## Notes
From feedback: "Will restaurants be able to edit details on their restaurant screen like 'free parking lot, valet parking' '10% off Troodie Thursdays'"

This empowers businesses and adds unique value (Troodie-exclusive specials).
