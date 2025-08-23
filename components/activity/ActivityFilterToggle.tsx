import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { designTokens, compactDesign } from '@/constants/designTokens';

interface ActivityFilterToggleProps {
  filter: 'all' | 'friends';
  onFilterChange: (filter: 'all' | 'friends') => void;
  showFilter?: boolean;
}

export const ActivityFilterToggle: React.FC<ActivityFilterToggleProps> = ({
  filter,
  onFilterChange,
  showFilter = true,
}) => {
  if (!showFilter) return null;

  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => onFilterChange('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
          All Troodie
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'friends' && styles.filterButtonActive]}
        onPress={() => onFilterChange('friends')}
      >
        <Text style={[styles.filterText, filter === 'friends' && styles.filterTextActive]}>
          Friends
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: compactDesign.content.gap,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundGray,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
});