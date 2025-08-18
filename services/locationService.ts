import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restaurantService } from './restaurantService';

const STORAGE_KEYS = {
  LAST_CITY: 'last_selected_city',
  LOCATION_PERMISSION: 'location_permission_status',
  MANUAL_OVERRIDE: 'manual_city_override',
};

export interface CityLocation {
  city: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

class LocationService {
  private currentCity: string | null = null;
  private manualOverride: boolean = false;
  private _availableCities: { city: string; state?: string; country?: string }[] = [];
  private citiesLoaded: boolean = false;

  /**
   * Default cities for fallback
   */
  private readonly defaultCities = [
    { city: 'Charlotte', state: 'NC', country: 'USA' },
    { city: 'New York', state: 'NY', country: 'USA' },
    { city: 'Los Angeles', state: 'CA', country: 'USA' },
    { city: 'Chicago', state: 'IL', country: 'USA' },
    { city: 'Houston', state: 'TX', country: 'USA' },
    { city: 'Miami', state: 'FL', country: 'USA' },
    { city: 'San Francisco', state: 'CA', country: 'USA' },
    { city: 'Seattle', state: 'WA', country: 'USA' },
    { city: 'Boston', state: 'MA', country: 'USA' },
    { city: 'Atlanta', state: 'GA', country: 'USA' },
  ];

  /**
   * Get available cities (fetches from database if not loaded)
   */
  get availableCities() {
    if (!this.citiesLoaded) {
      // Return default cities if not loaded yet
      return this.defaultCities;
    }
    return this._availableCities.length > 0 ? this._availableCities : this.defaultCities;
  }

  /**
   * Initialize location service
   */
  async initialize() {
    // Load saved city preference
    const savedCity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CITY);
    const override = await AsyncStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDE);
    
    if (savedCity) {
      this.currentCity = savedCity;
    }
    
    this.manualOverride = override === 'true';
    
    // Load available cities from database
    await this.loadAvailableCities();
  }

  /**
   * Load available cities from the database
   */
  private async loadAvailableCities() {
    try {
      const cities = await restaurantService.getAvailableCities();
      
      // Map database cities to our format
      this._availableCities = cities.map(city => {
        // Try to match with default cities to get state info
        const defaultCity = this.defaultCities.find(dc => dc.city === city);
        if (defaultCity) {
          return defaultCity;
        }
        // Otherwise just use the city name
        return { city, country: 'USA' };
      });
      
      // Ensure Charlotte is always available (as it's our default)
      if (!this._availableCities.some(c => c.city === 'Charlotte')) {
        const charlotte = this.defaultCities.find(c => c.city === 'Charlotte');
        if (charlotte) {
          this._availableCities.unshift(charlotte);
        }
      }
      
      this.citiesLoaded = true;
    } catch (error) {
      console.error('Error loading available cities:', error);
      // Fall back to default cities
      this._availableCities = this.defaultCities;
      this.citiesLoaded = true;
    }
  }

  /**
   * Refresh available cities from the database
   */
  async refreshAvailableCities() {
    await this.loadAvailableCities();
  }

  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, status);
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get city from coordinates using reverse geocoding
   */
  async getCityFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
    try {
      const [result] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result) {
        return result.city || result.district || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Detect current city based on location
   */
  async detectCurrentCity(): Promise<string> {
    // If manual override is set, use the saved city
    if (this.manualOverride && this.currentCity) {
      return this.currentCity;
    }

    try {
      const location = await this.getCurrentLocation();
      
      if (location) {
        const city = await this.getCityFromCoordinates(
          location.coords.latitude,
          location.coords.longitude
        );
        
        if (city) {
          // Find the closest matching city from available cities
          const matchedCity = this.findClosestCity(city);
          await this.setCurrentCity(matchedCity, false);
          return matchedCity;
        }
      }
    } catch (error) {
      console.error('Error detecting city:', error);
    }

    // Fallback to last saved city or default
    return this.currentCity || 'Charlotte';
  }

  /**
   * Find the closest matching city from available cities
   */
  private findClosestCity(detectedCity: string): string {
    const normalized = detectedCity.toLowerCase();
    
    // Ensure we have cities loaded
    const cities = this.citiesLoaded ? this._availableCities : this.defaultCities;
    
    const match = cities.find(
      city => city.city.toLowerCase() === normalized
    );
    
    if (match) {
      return match.city;
    }
    
    // If no exact match, return the default
    return 'Charlotte';
  }

  /**
   * Set current city manually
   */
  async setCurrentCity(city: string, isManualOverride: boolean = true) {
    this.currentCity = city;
    this.manualOverride = isManualOverride;
    
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_CITY, city);
    await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDE, isManualOverride.toString());
  }

  /**
   * Get current city
   */
  getCurrentCity(): string {
    return this.currentCity || 'Charlotte';
  }

  /**
   * Clear manual override and detect city again
   */
  async clearOverride() {
    this.manualOverride = false;
    await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDE, 'false');
    return this.detectCurrentCity();
  }

  /**
   * Format city display name
   */
  formatCityDisplay(city: string): string {
    const cities = this.citiesLoaded ? this._availableCities : this.defaultCities;
    const cityData = cities.find(c => c.city === city);
    if (cityData && cityData.state) {
      return `${cityData.city}, ${cityData.state}`;
    }
    return city;
  }

  /**
   * Check if a city has restaurants in the database
   */
  isCityAvailable(city: string): boolean {
    const cities = this.citiesLoaded ? this._availableCities : this.defaultCities;
    return cities.some(c => c.city === city);
  }
}

export const locationService = new LocationService();