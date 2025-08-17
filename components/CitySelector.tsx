import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { ChevronDown, MapPin, X } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { locationService } from '@/services/locationService';

interface CitySelectorProps {
  currentCity: string;
  onCityChange: (city: string) => void;
  compact?: boolean;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  currentCity,
  onCityChange,
  compact = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleCitySelect = async (city: string) => {
    await locationService.setCurrentCity(city, true);
    onCityChange(city);
    setShowModal(false);
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    
    const hasPermission = await locationService.hasLocationPermission();
    
    if (!hasPermission) {
      Alert.alert(
        'Location Permission',
        'We need location permission to detect your city automatically.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const granted = await locationService.requestPermission();
              if (granted) {
                const detectedCity = await locationService.detectCurrentCity();
                onCityChange(detectedCity);
                setShowModal(false);
              }
            },
          },
        ]
      );
    } else {
      const detectedCity = await locationService.detectCurrentCity();
      onCityChange(detectedCity);
      setShowModal(false);
    }
    
    setDetectingLocation(false);
  };

  const renderCityItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.cityItem,
        item.city === currentCity && styles.cityItemSelected,
      ]}
      onPress={() => handleCitySelect(item.city)}
    >
      <Text
        style={[
          styles.cityName,
          item.city === currentCity && styles.cityNameSelected,
        ]}
      >
        {item.city}
      </Text>
      <Text style={styles.cityState}>{item.state}</Text>
    </TouchableOpacity>
  );

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactSelector}
          onPress={() => setShowModal(true)}
        >
          <MapPin size={14} color={designTokens.colors.primaryOrange} />
          <Text style={styles.compactText}>{currentCity}</Text>
          <ChevronDown size={12} color={designTokens.colors.textMedium} />
        </TouchableOpacity>

        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowModal(false)}
            />
            
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select City</Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={designTokens.colors.textDark} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.detectLocationButton}
                onPress={handleDetectLocation}
                disabled={detectingLocation}
              >
                <MapPin size={20} color={designTokens.colors.primaryOrange} />
                <Text style={styles.detectLocationText}>
                  {detectingLocation ? 'Detecting...' : 'Use Current Location'}
                </Text>
              </TouchableOpacity>

              <FlatList
                data={locationService.availableCities}
                renderItem={renderCityItem}
                keyExtractor={(item) => item.city}
                contentContainerStyle={styles.cityList}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.selectorContent}>
          <MapPin size={20} color={designTokens.colors.primaryOrange} />
          <View>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.cityText}>
              {locationService.formatCityDisplay(currentCity)}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={designTokens.colors.textMedium} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: designTokens.spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
  },
  cityText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: designTokens.colors.backgroundLight,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: designTokens.borderRadius.full,
  },
  compactText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: designTokens.colors.white,
    borderTopLeftRadius: designTokens.borderRadius.xl,
    borderTopRightRadius: designTokens.borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  closeButton: {
    padding: designTokens.spacing.xs,
  },
  detectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.backgroundLight,
    marginHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  detectLocationText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  cityList: {
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.lg,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  cityItemSelected: {
    backgroundColor: `${designTokens.colors.primaryOrange}10`,
    marginHorizontal: -designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
  },
  cityName: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  cityNameSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  cityState: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
  },
});