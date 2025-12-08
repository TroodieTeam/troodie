# TRO-15: Restaurant Editable Details

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 5-7 days (across 3 sprints)
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: Restaurant claiming flow complete
- Reference: TRO-15 Product Requirement

## Overview

Enable claimed restaurant owners to edit their restaurant details including description, parking information, hours, special deals, and about us section. Changes publish instantly and are visible to all users.

**Location in App**: Restaurant Profile > 'Edit Details' (claimed restaurants only)

## Business Value

- **Restaurant Control**: Owners can maintain accurate, up-to-date information
- **User Experience**: Users see richer, more accurate restaurant data
- **Platform Differentiation**: Custom content not available on other platforms
- **Engagement**: Owners actively engaged with their profiles

## Sprint Breakdown

### Sprint 1: Text Fields (2 days)
- Description field
- About Us field
- Basic validation
- Instant publishing

### Sprint 2: Structured Fields (2 days)
- Parking options dropdown
- Special deals with styling
- Hours of operation

### Sprint 3: Image Upload (2-3 days)
- Cover photo upload
- Menu image upload
- Image optimization

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Restaurant Editable Details
  As a restaurant owner
  I want to edit my restaurant details
  So that I can provide accurate information to users

  Scenario: Edit button visibility
    Given I am the claimed owner of a restaurant
    When I view my restaurant profile
    Then I see an "Edit Details" button

  Scenario: Edit button hidden for non-owners
    Given I am viewing a restaurant I don't own
    When I view the restaurant profile
    Then I do not see an "Edit Details" button

  Scenario: Edit description
    Given I tap "Edit Details" on my restaurant
    When I update the description field
    And I tap "Save Changes"
    Then my changes appear immediately
    And other users see the updated description

  Scenario: Update parking options
    Given I am editing my restaurant details
    When I select "Free Lot" from parking dropdown
    And I save changes
    Then the parking field shows "Free Lot"
    And users see parking information on the profile

  Scenario: Add special deal
    Given I am editing my restaurant details
    When I add a "Troodie Thursdays - 15% off" deal
    And I save changes
    Then the deal appears with special styling
    And users see the deal prominently on the profile

  Scenario: Validation errors
    Given I am editing my restaurant details
    When I enter a description over 500 characters
    Then I see "Description must be under 500 characters"
    And the save button is disabled

  Scenario: Activity feed update
    Given I successfully update my restaurant details
    Then an activity entry is created
    And followers see "Restaurant updated details" in their feed
```

## Technical Implementation

### Database Schema Updates

```sql
-- Migration: supabase/migrations/YYYYMMDD_restaurant_editable_fields.sql

-- Add editable fields to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS custom_description TEXT,
ADD COLUMN IF NOT EXISTS about_us TEXT,
ADD COLUMN IF NOT EXISTS parking_type VARCHAR(50) CHECK (parking_type IN (
  'free_lot', 'paid_lot', 'valet', 'street', 'validation', 'none'
)),
ADD COLUMN IF NOT EXISTS parking_notes TEXT,
ADD COLUMN IF NOT EXISTS special_deals JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS custom_hours JSONB,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS menu_images TEXT[],
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id);

-- Index for claimed restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_claimed_by
ON restaurants(claimed_by) WHERE claimed_by IS NOT NULL;

-- Function to update restaurant details
CREATE OR REPLACE FUNCTION update_restaurant_details(
  p_restaurant_id UUID,
  p_updates JSONB
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Verify user owns this restaurant
  IF NOT EXISTS (
    SELECT 1 FROM business_profiles
    WHERE user_id = v_user_id AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this restaurant';
  END IF;

  -- Update restaurant
  UPDATE restaurants
  SET
    custom_description = COALESCE(p_updates->>'description', custom_description),
    about_us = COALESCE(p_updates->>'about_us', about_us),
    parking_type = COALESCE(p_updates->>'parking_type', parking_type),
    parking_notes = COALESCE(p_updates->>'parking_notes', parking_notes),
    special_deals = COALESCE((p_updates->'special_deals')::JSONB, special_deals),
    custom_hours = COALESCE((p_updates->'custom_hours')::JSONB, custom_hours),
    cover_photo_url = COALESCE(p_updates->>'cover_photo_url', cover_photo_url),
    last_edited_at = NOW(),
    last_edited_by = v_user_id
  WHERE id = p_restaurant_id
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'custom_description', custom_description,
    'about_us', about_us,
    'parking_type', parking_type,
    'parking_notes', parking_notes,
    'special_deals', special_deals,
    'last_edited_at', last_edited_at
  ) INTO v_result;

  -- Create activity feed entry
  INSERT INTO activity_feed (
    user_id,
    type,
    entity_type,
    entity_id,
    message
  ) VALUES (
    v_user_id,
    'restaurant_updated',
    'restaurant',
    p_restaurant_id,
    'updated restaurant details'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Restaurant Edit Service

```typescript
// services/restaurantEditService.ts

import { supabase } from '@/lib/supabase';

export interface RestaurantEditableFields {
  description?: string;
  aboutUs?: string;
  parkingType?: 'free_lot' | 'paid_lot' | 'valet' | 'street' | 'validation' | 'none';
  parkingNotes?: string;
  specialDeals?: SpecialDeal[];
  customHours?: WeeklyHours;
  coverPhotoUrl?: string;
}

export interface SpecialDeal {
  id: string;
  title: string;
  description: string;
  validDays?: string[];  // ['monday', 'tuesday', etc.]
  isTroodieDeal?: boolean;
  expiresAt?: string;
}

export interface WeeklyHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

interface DayHours {
  open: string;  // "09:00"
  close: string; // "22:00"
  closed?: boolean;
}

const VALIDATION_RULES = {
  description: { maxLength: 500 },
  aboutUs: { maxLength: 1000 },
  parkingNotes: { maxLength: 200 },
  dealTitle: { maxLength: 100 },
  dealDescription: { maxLength: 300 },
};

export function validateRestaurantFields(
  fields: RestaurantEditableFields
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (fields.description && fields.description.length > VALIDATION_RULES.description.maxLength) {
    errors.description = `Description must be under ${VALIDATION_RULES.description.maxLength} characters`;
  }

  if (fields.aboutUs && fields.aboutUs.length > VALIDATION_RULES.aboutUs.maxLength) {
    errors.aboutUs = `About Us must be under ${VALIDATION_RULES.aboutUs.maxLength} characters`;
  }

  if (fields.specialDeals) {
    fields.specialDeals.forEach((deal, index) => {
      if (deal.title.length > VALIDATION_RULES.dealTitle.maxLength) {
        errors[`deal_${index}_title`] = 'Deal title too long';
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export async function updateRestaurantDetails(
  restaurantId: string,
  updates: RestaurantEditableFields
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Validate
  const validation = validateRestaurantFields(updates);
  if (!validation.valid) {
    return {
      success: false,
      error: Object.values(validation.errors)[0],
    };
  }

  try {
    // Transform to snake_case for database
    const dbUpdates = {
      description: updates.description,
      about_us: updates.aboutUs,
      parking_type: updates.parkingType,
      parking_notes: updates.parkingNotes,
      special_deals: updates.specialDeals,
      custom_hours: updates.customHours,
      cover_photo_url: updates.coverPhotoUrl,
    };

    const { data, error } = await supabase.rpc('update_restaurant_details', {
      p_restaurant_id: restaurantId,
      p_updates: dbUpdates,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Update restaurant error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update restaurant',
    };
  }
}

export async function getRestaurantEditableFields(
  restaurantId: string
): Promise<{ data: RestaurantEditableFields | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        custom_description,
        about_us,
        parking_type,
        parking_notes,
        special_deals,
        custom_hours,
        cover_photo_url,
        menu_images
      `)
      .eq('id', restaurantId)
      .single();

    if (error) throw error;

    return {
      data: {
        description: data.custom_description,
        aboutUs: data.about_us,
        parkingType: data.parking_type,
        parkingNotes: data.parking_notes,
        specialDeals: data.special_deals,
        customHours: data.custom_hours,
        coverPhotoUrl: data.cover_photo_url,
      },
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
```

### Edit Restaurant Screen

```typescript
// app/restaurant/[id]/edit.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import {
  updateRestaurantDetails,
  getRestaurantEditableFields,
  validateRestaurantFields,
  RestaurantEditableFields,
} from '@/services/restaurantEditService';
import { SpecialDealsEditor } from '@/components/restaurant/SpecialDealsEditor';
import { HoursEditor } from '@/components/restaurant/HoursEditor';

const PARKING_OPTIONS = [
  { value: 'free_lot', label: 'Free Parking Lot' },
  { value: 'paid_lot', label: 'Paid Parking Lot' },
  { value: 'valet', label: 'Valet Parking' },
  { value: 'street', label: 'Street Parking' },
  { value: 'validation', label: 'Parking Validation' },
  { value: 'none', label: 'No Parking' },
];

export default function EditRestaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [fields, setFields] = useState<RestaurantEditableFields>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadCurrentFields();
  }, [id]);

  const loadCurrentFields = async () => {
    const { data, error } = await getRestaurantEditableFields(id);
    if (data) setFields(data);
    if (error) Alert.alert('Error', error);
    setLoading(false);
  };

  const handleFieldChange = (field: keyof RestaurantEditableFields, value: any) => {
    setFields(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // Real-time validation
    const validation = validateRestaurantFields({ [field]: value });
    if (!validation.valid) {
      setErrors(prev => ({ ...prev, ...validation.errors }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    const validation = validateRestaurantFields(fields);
    if (!validation.valid) {
      setErrors(validation.errors);
      Alert.alert('Validation Error', Object.values(validation.errors)[0]);
      return;
    }

    setSaving(true);
    const result = await updateRestaurantDetails(id, fields);

    if (result.success) {
      Alert.alert('Success', 'Restaurant details updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to save changes');
    }
    setSaving(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Edit Restaurant"
        leftAction={{ icon: 'x', onPress: () => {
          if (hasChanges) {
            Alert.alert('Discard Changes?', 'You have unsaved changes.', [
              { text: 'Keep Editing', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: () => router.back() }
            ]);
          } else {
            router.back();
          }
        }}}
        rightAction={{
          label: 'Save',
          onPress: handleSave,
          disabled: !hasChanges || saving || Object.keys(errors).length > 0,
        }}
      />

      <ScrollView style={styles.form}>
        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            value={fields.description}
            onChangeText={(text) => handleFieldChange('description', text)}
            multiline
            numberOfLines={4}
            maxLength={500}
            placeholder="Tell customers about your restaurant..."
          />
          <Text style={styles.charCount}>
            {fields.description?.length || 0}/500
          </Text>
          {errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </View>

        {/* About Us */}
        <View style={styles.field}>
          <Text style={styles.label}>About Us</Text>
          <TextInput
            style={styles.textArea}
            value={fields.aboutUs}
            onChangeText={(text) => handleFieldChange('aboutUs', text)}
            multiline
            numberOfLines={6}
            maxLength={1000}
            placeholder="Share your story, history, and what makes you unique..."
          />
        </View>

        {/* Parking */}
        <View style={styles.field}>
          <Text style={styles.label}>Parking</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={fields.parkingType}
              onValueChange={(value) => handleFieldChange('parkingType', value)}
            >
              <Picker.Item label="Select parking option..." value="" />
              {PARKING_OPTIONS.map(opt => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            value={fields.parkingNotes}
            onChangeText={(text) => handleFieldChange('parkingNotes', text)}
            placeholder="Additional parking notes (optional)"
            maxLength={200}
          />
        </View>

        {/* Special Deals */}
        <View style={styles.field}>
          <Text style={styles.label}>Special Deals</Text>
          <SpecialDealsEditor
            deals={fields.specialDeals || []}
            onChange={(deals) => handleFieldChange('specialDeals', deals)}
          />
        </View>

        {/* Hours */}
        <View style={styles.field}>
          <Text style={styles.label}>Hours of Operation</Text>
          <HoursEditor
            hours={fields.customHours}
            onChange={(hours) => handleFieldChange('customHours', hours)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Files to Create

1. **Migration**: `supabase/migrations/YYYYMMDD_restaurant_editable_fields.sql`
2. **Service**: `services/restaurantEditService.ts`
3. **Screen**: `app/restaurant/[id]/edit.tsx`
4. **Components**:
   - `components/restaurant/SpecialDealsEditor.tsx`
   - `components/restaurant/HoursEditor.tsx`
   - `components/restaurant/EditButton.tsx`

## Definition of Done

### Sprint 1
- [ ] Database fields added
- [ ] Description and About Us editable
- [ ] Validation working (500 char limit)
- [ ] Changes publish instantly
- [ ] Edit button only visible to owners

### Sprint 2
- [ ] Parking dropdown implemented
- [ ] Special deals with styling
- [ ] Hours editor component
- [ ] Activity feed entry on update

### Sprint 3
- [ ] Cover photo upload
- [ ] Menu images upload
- [ ] Image optimization
- [ ] All fields persist correctly

## Notes

- Reference: TRO-15 Product Requirement
- Consider rich text editor for deals in future
- Add change history tracking for audit trail
- Future: Allow scheduling of deal start/end times
