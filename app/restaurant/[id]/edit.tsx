/**
 * Edit Restaurant Details Screen
 * 
 * Allows restaurant owners to edit their restaurant details including:
 * - Description and About Us
 * - Parking information
 * - Special deals
 * - Hours of operation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
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

export default function EditRestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { businessProfile } = useBusinessProfile();
  const [fields, setFields] = useState<RestaurantEditableFields>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user owns this restaurant
  const isOwner = businessProfile?.restaurant_id === id;

  useEffect(() => {
    if (id && isOwner) {
      loadCurrentFields();
    } else if (!isOwner) {
      Alert.alert('Access Denied', 'You can only edit your own restaurant.');
      router.back();
    }
  }, [id, isOwner]);

  const loadCurrentFields = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await getRestaurantEditableFields(id);
    if (data) setFields(data);
    if (error) Alert.alert('Error', error);
    setLoading(false);
  };

  const handleFieldChange = (field: keyof RestaurantEditableFields, value: any) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // Real-time validation
    const validation = validateRestaurantFields({ [field]: value });
    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, ...validation.errors }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!id) return;

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
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to save changes');
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
        <Text style={{ marginTop: 16, color: DS.colors.textLight }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: DS.colors.backgroundWhite,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}
      >
        <TouchableOpacity onPress={handleBack}>
          <X size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: DS.colors.text }}>Edit Restaurant</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving || Object.keys(errors).length > 0}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor:
              !hasChanges || saving || Object.keys(errors).length > 0
                ? DS.colors.border
                : DS.colors.primary,
          }}
        >
          <Text
            style={{
              color: !hasChanges || saving || Object.keys(errors).length > 0 ? DS.colors.textLight : 'white',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Description */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>
            Description
          </Text>
          <TextInput
            style={[
              {
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: DS.colors.text,
                backgroundColor: DS.colors.backgroundWhite,
                minHeight: 100,
                textAlignVertical: 'top',
              },
              errors.description && { borderColor: '#EF4444' },
            ]}
            value={fields.description}
            onChangeText={(text) => handleFieldChange('description', text)}
            multiline
            numberOfLines={4}
            maxLength={500}
            placeholder="Tell customers about your restaurant..."
            placeholderTextColor={DS.colors.textLight}
          />
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 4, textAlign: 'right' }}>
            {(fields.description?.length || 0)}/500
          </Text>
          {errors.description && (
            <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.description}</Text>
          )}
        </View>

        {/* About Us */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>
            About Us
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: DS.colors.text,
              backgroundColor: DS.colors.backgroundWhite,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
            value={fields.aboutUs}
            onChangeText={(text) => handleFieldChange('aboutUs', text)}
            multiline
            numberOfLines={6}
            maxLength={1000}
            placeholder="Share your story, history, and what makes you unique..."
            placeholderTextColor={DS.colors.textLight}
          />
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 4, textAlign: 'right' }}>
            {(fields.aboutUs?.length || 0)}/1000
          </Text>
        </View>

        {/* Parking */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>
            Parking
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: 12,
              backgroundColor: DS.colors.backgroundWhite,
              marginBottom: 8,
            }}
          >
            {/* Note: Using a simple dropdown-like UI since Picker might not be available */}
            <Text style={{ padding: 12, fontSize: 14, color: DS.colors.text }}>
              {fields.parkingType
                ? PARKING_OPTIONS.find((opt) => opt.value === fields.parkingType)?.label
                : 'Select parking option...'}
            </Text>
          </View>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: DS.colors.text,
              backgroundColor: DS.colors.backgroundWhite,
            }}
            value={fields.parkingNotes}
            onChangeText={(text) => handleFieldChange('parkingNotes', text)}
            placeholder="Additional parking notes (optional)"
            maxLength={200}
            placeholderTextColor={DS.colors.textLight}
          />
        </View>

        {/* Special Deals */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>
            Special Deals
          </Text>
          <SpecialDealsEditor
            deals={fields.specialDeals || []}
            onChange={(deals) => handleFieldChange('specialDeals', deals)}
          />
        </View>

        {/* Hours */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>
            Hours of Operation
          </Text>
          <HoursEditor
            hours={fields.customHours}
            onChange={(hours) => handleFieldChange('customHours', hours)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

