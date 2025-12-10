import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import type { CreatorFilters } from '@/services/creatorDiscoveryService';

interface CreatorFiltersSheetProps {
  visible: boolean;
  filters: CreatorFilters;
  onApply: (filters: CreatorFilters) => void;
  onClose: () => void;
  followerOptions: Array<{ label: string; value?: number }>;
  engagementOptions: Array<{ label: string; value?: number }>;
}

export function CreatorFiltersSheet({
  visible,
  filters,
  onApply,
  onClose,
  followerOptions,
  engagementOptions,
}: CreatorFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<CreatorFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
    onApply({});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Creators</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={DS.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* City Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="City name (e.g., Charlotte)"
                value={localFilters.city}
                onChangeText={(text) => setLocalFilters({ ...localFilters, city: text || undefined })}
                placeholderTextColor={DS.colors.textLight}
              />
            </View>

            {/* Followers Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Followers</Text>
              {followerOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.option}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      minFollowers: option.value,
                    })
                  }
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {localFilters.minFollowers === option.value && (
                      <Check size={20} color={DS.colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Engagement Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Engagement Rate</Text>
              {engagementOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.option}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      minEngagement: option.value,
                    })
                  }
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {localFilters.minEngagement === option.value && (
                      <Check size={20} color={DS.colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.colors.backgroundWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.text,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: DS.colors.text,
    backgroundColor: DS.colors.background,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 15,
    color: DS.colors.text,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DS.colors.border,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.text,
  },
  applyButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: DS.colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});

