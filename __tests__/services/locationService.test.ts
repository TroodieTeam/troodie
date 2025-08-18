import { locationService } from '@/services/locationService';
import { restaurantService } from '@/services/restaurantService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-location');
jest.mock('@/services/restaurantService');

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should load saved city preference and available cities', async () => {
      const mockCities = ['Charlotte', 'New York', 'Los Angeles'];
      
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'last_selected_city') return Promise.resolve('New York');
        if (key === 'manual_city_override') return Promise.resolve('true');
        return Promise.resolve(null);
      });
      
      (restaurantService.getAvailableCities as jest.Mock).mockResolvedValue(mockCities);

      await locationService.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('last_selected_city');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('manual_city_override');
      expect(restaurantService.getAvailableCities).toHaveBeenCalled();
      expect(locationService.getCurrentCity()).toBe('New York');
    });

    it('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (restaurantService.getAvailableCities as jest.Mock).mockRejectedValue(new Error('API error'));

      await locationService.initialize();

      // Should still have default cities available
      expect(locationService.availableCities.length).toBeGreaterThan(0);
    });
  });

  describe('detectCurrentCity', () => {
    it('should use manual override if set', async () => {
      await locationService.setCurrentCity('Los Angeles', true);
      
      const result = await locationService.detectCurrentCity();
      
      expect(result).toBe('Los Angeles');
    });

    it('should detect city from location when no override', async () => {
      await locationService.setCurrentCity('Charlotte', false);
      
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 35.2271, longitude: -80.8431 },
      });
      
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        { city: 'Charlotte', district: null },
      ]);

      const result = await locationService.detectCurrentCity();
      
      expect(result).toBe('Charlotte');
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      expect(Location.reverseGeocodeAsync).toHaveBeenCalled();
    });

    it('should fallback to Charlotte when detection fails', async () => {
      await locationService.setCurrentCity(null as any, false);
      
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await locationService.detectCurrentCity();
      
      expect(result).toBe('Charlotte');
    });
  });

  describe('isCityAvailable', () => {
    it('should check if city is in available cities list', async () => {
      const mockCities = ['Charlotte', 'New York', 'Los Angeles'];
      (restaurantService.getAvailableCities as jest.Mock).mockResolvedValue(mockCities);
      
      await locationService.initialize();
      
      expect(locationService.isCityAvailable('Charlotte')).toBe(true);
      expect(locationService.isCityAvailable('New York')).toBe(true);
      expect(locationService.isCityAvailable('Miami')).toBe(false);
    });
  });

  describe('formatCityDisplay', () => {
    it('should format city with state when available', () => {
      const formatted = locationService.formatCityDisplay('Charlotte');
      expect(formatted).toBe('Charlotte, NC');
    });

    it('should return city name when state not available', () => {
      const formatted = locationService.formatCityDisplay('Unknown City');
      expect(formatted).toBe('Unknown City');
    });
  });

  describe('setCurrentCity', () => {
    it('should save city to AsyncStorage', async () => {
      await locationService.setCurrentCity('New York', true);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('last_selected_city', 'New York');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('manual_city_override', 'true');
      expect(locationService.getCurrentCity()).toBe('New York');
    });
  });

  describe('clearOverride', () => {
    it('should clear manual override and detect city', async () => {
      await locationService.setCurrentCity('Los Angeles', true);
      
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 35.2271, longitude: -80.8431 },
      });
      
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        { city: 'Charlotte', district: null },
      ]);
      
      const result = await locationService.clearOverride();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('manual_city_override', 'false');
      expect(result).toBe('Charlotte');
    });
  });
});