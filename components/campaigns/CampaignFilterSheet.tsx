import { CampaignSearchParams } from '@/services/campaignSearchService';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

interface CampaignFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: Partial<CampaignSearchParams>;
  onApplyFilters: (filters: Partial<CampaignSearchParams>) => void;
  onResetFilters: () => void;
}

const CUISINE_TYPES = [
  'American', 'Italian', 'Mexican', 'Asian', 'Japanese', 'Chinese', 'Thai', 
  'Indian', 'Mediterranean', 'French', 'Seafood', 'Steakhouse', 'Pizza', 
  'Burger', 'Coffee', 'Dessert', 'Vegan', 'Vegetarian'
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'ugc', label: 'UGC Only' }
];

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Recommended' },
  { id: 'budget_desc', label: 'Highest Payout' },
  { id: 'deadline_asc', label: 'Ending Soonest' },
  { id: 'newest', label: 'Newest' },
  { id: 'distance', label: 'Nearest' }
];

export function CampaignFilterSheet({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters
}: CampaignFilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<Partial<CampaignSearchParams>>({});
  const [useMyLocation, setUseMyLocation] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setLocalFilters({ ...filters });
      setUseMyLocation(!!filters.location || !!filters.radiusMiles);
    }
  }, [visible, filters]);

  const handleApply = () => {
    // If using location but no lat/lng, we rely on the hook to fetch it, 
    // OR we fetch it here. Better to fetch here to ensure we have it.
    if (useMyLocation && !localFilters.location) {
      // Let the hook handle fetching location if radius is set
    } else if (!useMyLocation) {
      // Clear location data if toggle is off
      const { location, radiusMiles, ...rest } = localFilters;
      onApplyFilters(rest);
      onClose();
      return;
    }

    onApplyFilters(localFilters);
    onClose();
  };

  const toggleCuisine = (cuisine: string) => {
    const current = localFilters.cuisineTypes || [];
    const updated = current.includes(cuisine)
      ? current.filter(c => c !== cuisine)
      : [...current, cuisine];
    
    setLocalFilters({
      ...localFilters,
      cuisineTypes: updated.length > 0 ? updated : undefined
    });
  };

  const togglePlatform = (platformId: string) => {
    const current = localFilters.platforms || [];
    const updated = current.includes(platformId)
      ? current.filter(p => p !== platformId)
      : [...current, platformId];
    
    setLocalFilters({
      ...localFilters,
      platforms: updated.length > 0 ? updated : undefined
    });
  };

  const handleReset = () => {
    setLocalFilters({});
    setUseMyLocation(false);
    onResetFilters();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Filters</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                
                {/* Sort By */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sort By</Text>
                  <View style={styles.chipContainer}>
                    {SORT_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.chip,
                          (localFilters.sortBy || 'relevance') === option.id && styles.chipActive
                        ]}
                        onPress={() => setLocalFilters({ ...localFilters, sortBy: option.id as any })}
                      >
                        <Text style={[
                          styles.chipText,
                          (localFilters.sortBy || 'relevance') === option.id && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <Switch
                      value={useMyLocation}
                      onValueChange={(val) => {
                        setUseMyLocation(val);
                        if (!val) {
                          setLocalFilters({ ...localFilters, radiusMiles: undefined, location: undefined });
                        } else {
                          // Default radius 10 miles
                          setLocalFilters({ ...localFilters, radiusMiles: 10 });
                        }
                      }}
                      trackColor={{ false: '#E8E8E8', true: '#262626' }}
                    />
                  </View>
                  
                  {useMyLocation && (
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>Radius</Text>
                        <Text style={styles.sliderValue}>{localFilters.radiusMiles || 10} miles</Text>
                      </View>
                      <View style={styles.radiusPresets}>
                        {[5, 10, 25, 50].map(miles => (
                          <TouchableOpacity
                            key={miles}
                            style={[
                              styles.radiusButton,
                              localFilters.radiusMiles === miles && styles.radiusButtonActive
                            ]}
                            onPress={() => setLocalFilters({ ...localFilters, radiusMiles: miles })}
                          >
                            <Text style={[
                              styles.radiusButtonText,
                              localFilters.radiusMiles === miles && styles.radiusButtonTextActive
                            ]}>{miles}mi</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Budget */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Budget (USD)</Text>
                  <View style={styles.budgetInputs}>
                    <View style={styles.budgetInputWrapper}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.budgetInput}
                        placeholder="Min"
                        keyboardType="numeric"
                        value={localFilters.minBudget ? (localFilters.minBudget / 100).toString() : ''}
                        onChangeText={(text) => {
                          const val = parseInt(text) * 100;
                          setLocalFilters({ ...localFilters, minBudget: isNaN(val) ? undefined : val });
                        }}
                      />
                    </View>
                    <Text style={styles.budgetSeparator}>-</Text>
                    <View style={styles.budgetInputWrapper}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.budgetInput}
                        placeholder="Max"
                        keyboardType="numeric"
                        value={localFilters.maxBudget ? (localFilters.maxBudget / 100).toString() : ''}
                        onChangeText={(text) => {
                          const val = parseInt(text) * 100;
                          setLocalFilters({ ...localFilters, maxBudget: isNaN(val) ? undefined : val });
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Platforms */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Platform</Text>
                  <View style={styles.chipContainer}>
                    {PLATFORMS.map(platform => (
                      <TouchableOpacity
                        key={platform.id}
                        style={[
                          styles.chip,
                          localFilters.platforms?.includes(platform.id) && styles.chipActive
                        ]}
                        onPress={() => togglePlatform(platform.id)}
                      >
                        <Text style={[
                          styles.chipText,
                          localFilters.platforms?.includes(platform.id) && styles.chipTextActive
                        ]}>
                          {platform.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Cuisine Types */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cuisine</Text>
                  <View style={styles.chipContainer}>
                    {CUISINE_TYPES.map(cuisine => (
                      <TouchableOpacity
                        key={cuisine}
                        style={[
                          styles.chip,
                          localFilters.cuisineTypes?.includes(cuisine) && styles.chipActive
                        ]}
                        onPress={() => toggleCuisine(cuisine)}
                      >
                        <Text style={[
                          styles.chipText,
                          localFilters.cuisineTypes?.includes(cuisine) && styles.chipTextActive
                        ]}>
                          {cuisine}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <Text style={styles.resetButtonText}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <Text style={styles.applyButtonText}>Show Results</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chipActive: {
    backgroundColor: '#262626',
    borderColor: '#262626',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#666',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  radiusPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  radiusButtonActive: {
    backgroundColor: '#FFF',
    borderColor: '#262626',
    borderWidth: 2,
  },
  radiusButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radiusButtonTextActive: {
    color: '#262626',
    fontWeight: '600',
  },
  budgetInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#000',
  },
  budgetSeparator: {
    fontSize: 20,
    color: '#666',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#262626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

