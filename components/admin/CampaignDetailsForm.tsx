import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { designTokens } from '@/constants/designTokens';
import { ChevronDown, Plus, X } from 'lucide-react-native';

interface CampaignDetailsFormProps {
  value: {
    title: string;
    description: string;
    requirements: string[];
    maxCreators: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  onChange: (value: any) => void;
}

export default function CampaignDetailsForm({ value, onChange }: CampaignDetailsFormProps) {
  const [newRequirement, setNewRequirement] = useState('');

  const addRequirement = () => {
    if (newRequirement.trim()) {
      onChange({
        ...value,
        requirements: [...value.requirements, newRequirement.trim()],
      });
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    onChange({
      ...value,
      requirements: value.requirements.filter((_, i) => i !== index),
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Title */}
      <View style={styles.section}>
        <Text style={styles.label}>Campaign Title</Text>
        <TextInput
          style={styles.input}
          value={value.title}
          onChangeText={(title) => onChange({ ...value, title })}
          placeholder="e.g., Charlotte Food Week Creator Challenge"
          placeholderTextColor={designTokens.colors.textLight}
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={value.description}
          onChangeText={(description) => onChange({ ...value, description })}
          placeholder="Describe what creators need to do..."
          placeholderTextColor={designTokens.colors.textLight}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          This will be visible to creators applying to your campaign
        </Text>
      </View>

      {/* Requirements */}
      <View style={styles.section}>
        <Text style={styles.label}>Requirements</Text>
        <View style={styles.requirementsList}>
          {value.requirements.map((req, index) => (
            <View key={index} style={styles.requirementItem}>
              <View style={styles.requirementNumber}>
                <Text style={styles.requirementNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.requirementText}>{req}</Text>
              <TouchableOpacity
                onPress={() => removeRequirement(index)}
                style={styles.removeButton}
              >
                <X size={16} color={designTokens.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Add Requirement Input */}
        <View style={styles.addRequirementContainer}>
          <TextInput
            style={[styles.input, styles.addRequirementInput]}
            value={newRequirement}
            onChangeText={setNewRequirement}
            placeholder="Add a requirement..."
            placeholderTextColor={designTokens.colors.textLight}
            onSubmitEditing={addRequirement}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              !newRequirement.trim() && styles.addButtonDisabled,
            ]}
            onPress={addRequirement}
            disabled={!newRequirement.trim()}
          >
            <Plus size={20} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Max Creators */}
      <View style={styles.section}>
        <Text style={styles.label}>Maximum Creators</Text>
        <TextInput
          style={styles.input}
          value={value.maxCreators.toString()}
          onChangeText={(text) => {
            const num = parseInt(text) || 0;
            onChange({ ...value, maxCreators: num });
          }}
          placeholder="e.g., 10"
          placeholderTextColor={designTokens.colors.textLight}
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>
          How many creators can participate in this campaign
        </Text>
      </View>

      {/* Campaign Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Campaign Duration</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateButtonText}>
                {value.startDate
                  ? value.startDate.toLocaleDateString()
                  : 'Select date'}
              </Text>
              <ChevronDown size={16} color={designTokens.colors.primaryOrange} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>End Date</Text>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateButtonText}>
                {value.endDate
                  ? value.endDate.toLocaleDateString()
                  : 'Select date'}
              </Text>
              <ChevronDown size={16} color={designTokens.colors.primaryOrange} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 14,
    color: designTokens.colors.textDark,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    marginTop: 6,
  },
  requirementsList: {
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 12,
    marginBottom: 8,
  },
  requirementNumber: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  requirementNumberText: {
    fontSize: 11,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: designTokens.colors.textDark,
  },
  removeButton: {
    padding: 4,
  },
  addRequirementContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addRequirementInput: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: designTokens.colors.textMedium,
    marginBottom: 6,
  },
  dateButton: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
  },
});
