/**
 * Deliverable Requirements Form Component
 *
 * Progressive form for specifying campaign deliverable requirements.
 * Features:
 * - 3-tiered structure: Basic (required), Creative (optional), Approval (optional)
 * - Collapsible sections with expand/collapse
 * - Progress indicator showing completion
 * - Real-time validation
 * - Smart defaults
 * - Tooltip help text
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  DeliverableRequirements,
  DeliverableGoal,
  DeliverableType,
  CompensationType,
  VisitType,
  PaymentTiming,
  ToneOption,
  ThemeOption,
  PreferenceOption,
  CoverImageOption
} from '@/types/deliverableRequirements';
import {
  countCompletedFields,
  validateBasicRequirements,
  DEFAULT_DELIVERABLE_REQUIREMENTS
} from '@/types/deliverableRequirements';

// ============================================================================
// TYPES
// ============================================================================

interface DeliverableRequirementsFormProps {
  value: Partial<DeliverableRequirements>;
  onChange: (requirements: Partial<DeliverableRequirements>) => void;
  showValidation?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DeliverableRequirementsForm({
  value,
  onChange,
  showValidation = false
}: DeliverableRequirementsFormProps) {
  const [creativeSectionExpanded, setCreativeSectionExpanded] = useState(false);
  const [approvalSectionExpanded, setApprovalSectionExpanded] = useState(false);

  // Initialize with defaults
  useEffect(() => {
    if (!value.goal && DEFAULT_DELIVERABLE_REQUIREMENTS.goal) {
      onChange({ ...DEFAULT_DELIVERABLE_REQUIREMENTS, ...value });
    }
  }, []);

  // Calculate progress
  const progress = countCompletedFields(value);
  const progressPercentage = Math.round((progress.required / progress.total) * 100);
  const isBasicComplete = validateBasicRequirements(value);

  // Update handlers
  const updateField = <K extends keyof DeliverableRequirements>(
    field: K,
    fieldValue: DeliverableRequirements[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const updateCreativeField = <K extends keyof NonNullable<DeliverableRequirements['creative']>>(
    field: K,
    fieldValue: NonNullable<DeliverableRequirements['creative']>[K]
  ) => {
    onChange({
      ...value,
      creative: { ...value.creative, [field]: fieldValue }
    });
  };

  const updateApprovalField = <K extends keyof NonNullable<DeliverableRequirements['approval']>>(
    field: K,
    fieldValue: NonNullable<DeliverableRequirements['approval']>[K]
  ) => {
    onChange({
      ...value,
      approval: { ...value.approval, [field]: fieldValue }
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Form Progress</Text>
          <Text style={styles.progressText}>
            {progress.required} of {progress.total} required fields complete
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      {/* Section 1: Basic Details (Required) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>Required</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>
          Essential information about the deliverable (takes less than 2 minutes)
        </Text>

        {/* Title */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Opportunity Title *</Text>
            <TouchableOpacity style={styles.infoIcon}>
              <Ionicons name="information-circle-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, showValidation && !value.title && styles.inputError]}
            placeholder='e.g., "Fall Brunch Promo"'
            value={value.title || ''}
            onChangeText={(text) => updateField('title', text)}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Goal */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Campaign Goal *</Text>
          </View>
          <View style={styles.optionGrid}>
            {GOAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  value.goal === option.value && styles.optionButtonSelected
                ]}
                onPress={() => updateField('goal', option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    value.goal === option.value && styles.optionButtonTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Type */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Deliverable Type *</Text>
          </View>
          <View style={styles.optionGrid}>
            {TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  value.type === option.value && styles.optionButtonSelected
                ]}
                onPress={() => updateField('type', option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={value.type === option.value ? '#FFAD27' : '#6B7280'}
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionButtonText,
                    value.type === option.value && styles.optionButtonTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Due Date or Timeframe *</Text>
          </View>
          <TextInput
            style={[styles.input, showValidation && !value.due_date && styles.inputError]}
            placeholder='e.g., "Post within 2 weeks of visit" or "10/31/2025"'
            value={value.due_date || ''}
            onChangeText={(text) => updateField('due_date', text)}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Compensation Type */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Compensation Type *</Text>
          </View>
          <View style={styles.optionGrid}>
            {COMPENSATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  value.compensation_type === option.value && styles.optionButtonSelected
                ]}
                onPress={() => updateField('compensation_type', option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    value.compensation_type === option.value && styles.optionButtonTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compensation Value */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>
              {value.compensation_type === 'discount' ? 'Discount Percentage *' : 'Monetary Value *'}
            </Text>
          </View>
          <View style={styles.inputWithPrefix}>
            {value.compensation_type !== 'discount' && (
              <Text style={styles.inputPrefix}>$</Text>
            )}
            <TextInput
              style={[
                styles.input,
                styles.inputWithPrefixInput,
                showValidation && !value.compensation_value && styles.inputError
              ]}
              placeholder={value.compensation_type === 'discount' ? '10' : '50.00'}
              value={
                value.compensation_value
                  ? value.compensation_type === 'discount'
                    ? String(value.compensation_value)
                    : String(value.compensation_value / 100)
                  : ''
              }
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!isNaN(num)) {
                  updateField(
                    'compensation_value',
                    value.compensation_type === 'discount' ? num : Math.round(num * 100)
                  );
                }
              }}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
            {value.compensation_type === 'discount' && (
              <Text style={styles.inputSuffix}>%</Text>
            )}
          </View>
        </View>

        {/* Visit Type */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Visit Details *</Text>
          </View>
          <View style={styles.optionGrid}>
            {VISIT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  value.visit_type === option.value && styles.optionButtonSelected
                ]}
                onPress={() => updateField('visit_type', option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    value.visit_type === option.value && styles.optionButtonTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Timing */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Payment Timing *</Text>
          </View>
          <View style={styles.optionGrid}>
            {PAYMENT_TIMING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  value.payment_timing === option.value && styles.optionButtonSelected
                ]}
                onPress={() => updateField('payment_timing', option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    value.payment_timing === option.value && styles.optionButtonTextSelected
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Revisions Allowed */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Number of Revisions Allowed *</Text>
          </View>
          <View style={styles.revisionSelector}>
            {[0, 1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.revisionButton,
                  value.revisions_allowed === num && styles.revisionButtonSelected
                ]}
                onPress={() => updateField('revisions_allowed', num)}
              >
                <Text
                  style={[
                    styles.revisionButtonText,
                    value.revisions_allowed === num && styles.revisionButtonTextSelected
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Section 2: Creative Guidelines (Optional) */}
      <TouchableOpacity
        style={styles.section}
        onPress={() => setCreativeSectionExpanded(!creativeSectionExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Creative Guidelines</Text>
            <Ionicons
              name={creativeSectionExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#6B7280"
            />
          </View>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>Optional</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>
          Control brand tone, themes, and content preferences
        </Text>

        {creativeSectionExpanded && (
          <View style={styles.expandedSection}>
            {/* Tone & Vibe */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Tone & Vibe</Text>
              <Text style={styles.fieldHelper}>Select all that apply</Text>
              <View style={styles.checkboxGrid}>
                {TONE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.checkboxItem}
                    onPress={() => {
                      const current = value.creative?.tone || [];
                      const updated = current.includes(option.value)
                        ? current.filter((t) => t !== option.value)
                        : [...current, option.value];
                      updateCreativeField('tone', updated);
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        value.creative?.tone?.includes(option.value) && styles.checkboxChecked
                      ]}
                    >
                      {value.creative?.tone?.includes(option.value) && (
                        <Ionicons name="checkmark" size={16} color="#FFAD27" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Content Themes */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Content Themes</Text>
              <Text style={styles.fieldHelper}>Select all that apply</Text>
              <View style={styles.checkboxGrid}>
                {THEME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.checkboxItem}
                    onPress={() => {
                      const current = value.creative?.themes || [];
                      const updated = current.includes(option.value)
                        ? current.filter((t) => t !== option.value)
                        : [...current, option.value];
                      updateCreativeField('themes', updated);
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        value.creative?.themes?.includes(option.value) && styles.checkboxChecked
                      ]}
                    >
                      {value.creative?.themes?.includes(option.value) && (
                        <Ionicons name="checkmark" size={16} color="#FFAD27" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Music/Audio Preferences */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Music/Audio Preferences</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Upbeat, trendy music"
                value={value.creative?.music_preferences || ''}
                onChangeText={(text) => updateCreativeField('music_preferences', text)}
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            {/* Voiceover Preference */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Voiceover Preference</Text>
              <View style={styles.optionGrid}>
                {PREFERENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      value.creative?.voiceover === option.value && styles.optionButtonSelected
                    ]}
                    onPress={() => updateCreativeField('voiceover', option.value)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        value.creative?.voiceover === option.value && styles.optionButtonTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* On-screen Text Preference */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>On-screen Text Preference</Text>
              <View style={styles.optionGrid}>
                {PREFERENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      value.creative?.onscreen_text === option.value && styles.optionButtonSelected
                    ]}
                    onPress={() => updateCreativeField('onscreen_text', option.value)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        value.creative?.onscreen_text === option.value &&
                          styles.optionButtonTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cover Image Preference */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Cover Image Preference</Text>
              <View style={styles.optionGrid}>
                {COVER_IMAGE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      value.creative?.cover_image === option.value && styles.optionButtonSelected
                    ]}
                    onPress={() => updateCreativeField('cover_image', option.value)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        value.creative?.cover_image === option.value &&
                          styles.optionButtonTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Section 3: Approval & Attribution (Optional) */}
      <TouchableOpacity
        style={styles.section}
        onPress={() => setApprovalSectionExpanded(!approvalSectionExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Approval & Attribution</Text>
            <Ionicons
              name={approvalSectionExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#6B7280"
            />
          </View>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>Optional</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>
          Review process, tagging, and content usage rights
        </Text>

        {approvalSectionExpanded && (
          <View style={styles.expandedSection}>
            {/* Pre-approval Required */}
            <View style={styles.fieldContainer}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.fieldLabel}>Require Pre-Approval Before Posting</Text>
                  <Text style={styles.fieldHelper}>
                    Creator must get approval before publishing
                  </Text>
                </View>
                <Switch
                  value={value.approval?.pre_approval_required || false}
                  onValueChange={(enabled) => updateApprovalField('pre_approval_required', enabled)}
                  trackColor={{ false: '#E5E7EB', true: '#FFE5CC' }}
                  thumbColor={value.approval?.pre_approval_required ? '#FFAD27' : '#9CA3AF'}
                />
              </View>
            </View>

            {/* Handles */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Social Media Handles to Tag</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., @RestaurantName"
                value={value.approval?.handles?.join(', ') || ''}
                onChangeText={(text) => {
                  const handles = text.split(',').map((h) => h.trim()).filter((h) => h.length > 0);
                  updateApprovalField('handles', handles);
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Hashtags */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Required Hashtags</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., #RestaurantCity"
                value={value.approval?.hashtags?.join(', ') || ''}
                onChangeText={(text) => {
                  const hashtags = text.split(',').map((h) => h.trim()).filter((h) => h.length > 0);
                  updateApprovalField('hashtags', hashtags);
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Repost Rights */}
            <View style={styles.fieldContainer}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.fieldLabel}>Content Repost Rights</Text>
                  <Text style={styles.fieldHelper}>
                    Can restaurant repost content on their page?
                  </Text>
                </View>
                <Switch
                  value={value.approval?.repost_rights ?? true}
                  onValueChange={(enabled) => updateApprovalField('repost_rights', enabled)}
                  trackColor={{ false: '#E5E7EB', true: '#FFE5CC' }}
                  thumbColor={value.approval?.repost_rights ? '#FFAD27' : '#9CA3AF'}
                />
              </View>
            </View>

            {/* Extra Notes */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional requirements or notes..."
                value={value.approval?.extra_notes || ''}
                onChangeText={(text) => updateApprovalField('extra_notes', text)}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Validation Message */}
      {showValidation && !isBasicComplete && (
        <View style={styles.validationMessage}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.validationText}>
            Please complete all required fields in Basic Details
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// OPTIONS DATA
// ============================================================================

const GOAL_OPTIONS: Array<{ value: DeliverableGoal; label: string }> = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'foot_traffic', label: 'Foot Traffic' },
  { value: 'new_menu', label: 'New Menu Item' },
  { value: 'event', label: 'Event Coverage' },
  { value: 'brand_content', label: 'Brand Content' }
];

const TYPE_OPTIONS: Array<{ value: DeliverableType; label: string; icon: string }> = [
  { value: 'reel', label: 'Reel', icon: 'videocam' },
  { value: 'tiktok', label: 'TikTok', icon: 'musical-notes' },
  { value: 'story', label: 'Story', icon: 'hourglass' },
  { value: 'static_post', label: 'Static Post', icon: 'image' },
  { value: 'carousel', label: 'Carousel', icon: 'albums' }
];

const COMPENSATION_OPTIONS: Array<{ value: CompensationType; label: string }> = [
  { value: 'free_meal', label: 'Free Meal' },
  { value: 'cash', label: 'Cash' },
  { value: 'gift_card', label: 'Gift Card' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'discount', label: 'Discount' },
  { value: 'other', label: 'Other' }
];

const VISIT_OPTIONS: Array<{ value: VisitType; label: string }> = [
  { value: 'dine_in', label: 'Dine-In' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'event_coverage', label: 'Event Coverage' },
  { value: 'other', label: 'Other' }
];

const PAYMENT_TIMING_OPTIONS: Array<{ value: PaymentTiming; label: string }> = [
  { value: 'before_content', label: 'Before Content' },
  { value: 'after_content', label: 'After Content' },
  { value: 'before_post', label: 'Before Post' },
  { value: 'after_post', label: 'After Post' }
];

const TONE_OPTIONS: Array<{ value: ToneOption; label: string }> = [
  { value: 'fun', label: 'Fun' },
  { value: 'classy', label: 'Classy' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'trendy', label: 'Trendy' },
  { value: 'family_friendly', label: 'Family-Friendly' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'playful', label: 'Playful' }
];

const THEME_OPTIONS: Array<{ value: ThemeOption; label: string }> = [
  { value: 'food_closeups', label: 'Food Close-ups' },
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'chef_highlight', label: 'Chef Highlight' },
  { value: 'atmosphere', label: 'Atmosphere' },
  { value: 'customer_experience', label: 'Customer Experience' }
];

const PREFERENCE_OPTIONS: Array<{ value: PreferenceOption; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'creator_choice', label: "Creator's Choice" }
];

const COVER_IMAGE_OPTIONS: Array<{ value: CoverImageOption; label: string }> = [
  { value: 'logo', label: 'Logo' },
  { value: 'creator_choice', label: "Creator's Choice" },
  { value: 'dish_photo', label: 'Dish Photo' },
  { value: 'venue_exterior', label: 'Venue Exterior' },
  { value: 'creator_in_image', label: 'Creator in Image' }
];

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  progressContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  progressText: {
    fontSize: 13,
    color: '#6B7280'
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFAD27',
    borderRadius: 4
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16
  },
  sectionHeader: {
    marginBottom: 8
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626'
  },
  optionalBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7'
  },
  expandedSection: {
    marginTop: 8
  },
  fieldContainer: {
    marginBottom: 20
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  fieldHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8
  },
  infoIcon: {
    marginLeft: 6
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FFFFFF'
  },
  inputError: {
    borderColor: '#EF4444'
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF'
  },
  inputPrefix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4
  },
  inputSuffix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4
  },
  inputWithPrefixInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  optionButtonSelected: {
    borderColor: '#FFAD27',
    backgroundColor: '#FFFAF2'
  },
  optionIcon: {
    marginRight: 6
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280'
  },
  optionButtonTextSelected: {
    color: '#FFAD27'
  },
  revisionSelector: {
    flexDirection: 'row',
    gap: 12
  },
  revisionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  revisionButtonSelected: {
    borderColor: '#FFAD27',
    backgroundColor: '#FFFAF2'
  },
  revisionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280'
  },
  revisionButtonTextSelected: {
    color: '#FFAD27'
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
    borderColor: '#FFAD27',
    backgroundColor: '#FFFAF2'
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#1F2937'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  switchLabel: {
    flex: 1,
    marginRight: 12
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20
  },
  validationText: {
    fontSize: 13,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1
  }
});
