# TRO-144: Creator Stats - Extended Profile Fields

## Overview

Add comprehensive profile fields to creator profiles for better discovery and matching. Data is entered manually by creators during onboarding/profile edit, with optional admin verification.

## Jobs To Be Done

- Creators can showcase their full social media presence
- Restaurants can filter/evaluate creators based on detailed stats
- Admins can verify creator information

## New Fields Required

### Location
- [ ] `primary_city` VARCHAR(100) - Creator's primary operating city

### Instagram
- [ ] `instagram_handle` VARCHAR(100) - Instagram username (without @)
- [ ] `instagram_followers` INTEGER - Follower count (already exists)
- [ ] `instagram_engagement_rate` DECIMAL(5,2) - Engagement rate percentage
- [ ] `instagram_last_post_date` DATE - Date of most recent post

### TikTok
- [ ] `tiktok_handle` VARCHAR(100) - TikTok username (without @)
- [ ] `tiktok_followers` INTEGER - Follower count (already exists)
- [ ] `tiktok_engagement_rate` DECIMAL(5,2) - Engagement rate percentage
- [ ] `tiktok_last_post_date` DATE - Date of most recent post

### Persona
- [ ] `persona` VARCHAR(100) - From Troodie onboarding quiz (already exists, verify populated)

### Preferred Compensation
- [ ] `preferred_compensation` TEXT[] - Array of compensation preferences (already exists)
- [ ] Allowed values:
  - `free` - No compensation required
  - `compensated_meals` - Free meals as compensation
  - `pay_under_150` - Pay-per-post under $150
  - `pay_150_500` - Pay-per-post $150-500
  - `pay_over_500` - Pay-per-post $500+

### Past Collaborations
- [ ] `past_restaurant_collabs` TEXT - Free text field for listing past restaurant collaborations

## Acceptance Criteria

### Database Schema

- [ ] Add new columns to `creator_profiles` table:
  ```sql
  ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS
    primary_city VARCHAR(100),
    instagram_handle VARCHAR(100),
    instagram_engagement_rate DECIMAL(5,2),
    instagram_last_post_date DATE,
    tiktok_handle VARCHAR(100),
    tiktok_engagement_rate DECIMAL(5,2),
    tiktok_last_post_date DATE,
    past_restaurant_collabs TEXT;
  ```

- [ ] Update `preferred_compensation` to use standardized values

### Creator Profile Edit Screen

- [ ] Add "Social Stats" section with:
  - Instagram handle input
  - Instagram followers input (number)
  - Instagram engagement rate input (percentage)
  - Instagram last post date picker
  - TikTok handle input
  - TikTok followers input (number)
  - TikTok engagement rate input (percentage)
  - TikTok last post date picker

- [ ] Add "Location" section:
  - Primary city input (text or city picker)

- [ ] Add "Compensation Preferences" section:
  - Multi-select checkboxes/chips:
    - [ ] Free (no comp)
    - [ ] Compensated meals
    - [ ] Pay-per-post: Under $150
    - [ ] Pay-per-post: $150 - $500
    - [ ] Pay-per-post: $500+

- [ ] Add "Experience" section:
  - Past restaurant collabs textarea

### Creator Onboarding Updates

- [ ] Add compensation preference selection to onboarding flow
- [ ] Add social handle inputs to onboarding
- [ ] Make follower counts optional during onboarding

### Display in Browse Creators

- [ ] Show social handles (linked to profiles)
- [ ] Show engagement rates
- [ ] Show "Last active" based on most recent post date
- [ ] Show compensation preferences as tags
- [ ] Show persona tag

### Admin Verification (Optional)

- [ ] Admin can mark social stats as "verified"
- [ ] Add `social_stats_verified` BOOLEAN column
- [ ] Add `social_stats_verified_at` TIMESTAMP column
- [ ] Show verification badge on creator profile

## Files to Create/Modify

1. `supabase/migrations/XXXXXX_creator_stats_fields.sql` - New columns
2. `services/creatorDiscoveryService.ts` - Update queries to include new fields
3. `app/creator/profile/edit.tsx` - Add new form sections
4. `app/onboarding/creator/*.tsx` - Update onboarding screens
5. `app/(tabs)/business/creators/browse.tsx` - Display new fields
6. `app/creator/[id]/index.tsx` - Display new fields on profile view

## Validation Rules

- Instagram/TikTok handles: alphanumeric + underscore, max 30 chars
- Follower counts: positive integers, max 999,999,999
- Engagement rates: 0.00 - 100.00
- Last post dates: must be in the past

## Out of Scope

- API integration with Instagram/TikTok (manual entry only)
- Automatic stats refresh
- Historical stats tracking
- YouTube/Twitter stats (future consideration)
