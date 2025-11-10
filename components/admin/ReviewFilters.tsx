import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ReviewFiltersProps {
  filters: {
    type: 'all' | 'restaurant_claim' | 'creator_application';
    status: string;
    priority: string;
    dateRange: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function ReviewFilters({ filters, onFilterChange }: ReviewFiltersProps) {
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'restaurant_claim', label: 'Restaurants' },
    { value: 'creator_application', label: 'Creators' }
  ];

  return (
    <View style={styles.container}>
      {typeOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterButton,
            filters.type === option.value && styles.filterButtonActive
          ]}
          onPress={() => onFilterChange({ ...filters, type: option.value })}
        >
          <Text style={[
            styles.filterButtonText,
            filters.type === option.value && styles.filterButtonTextActive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#FFAD27',
    borderColor: '#FFAD27',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});