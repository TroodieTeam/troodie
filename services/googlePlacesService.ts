import Constants from 'expo-constants';

export interface GooglePlaceResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text: string[];
  };
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
  types?: string[];
}

class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey || '';
  }

  async autocomplete(input: string, sessionToken?: string): Promise<GooglePlaceResult[]> {
    if (!this.apiKey) {
      console.error('Google Places API key not configured');
      return [];
    }

    const params = new URLSearchParams({
      input,
      key: this.apiKey,
      types: 'restaurant|cafe|bar',
      // Removed location restrictions - now searches globally
      sessiontoken: sessionToken || '',
    });

    try {
      const response = await fetch(`${this.baseUrl}/autocomplete/json?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions;
      } else {
        console.error('Google Places autocomplete error:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching autocomplete results:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<GooglePlaceDetails | null> {
    if (!this.apiKey) {
      console.error('Google Places API key not configured');
      return null;
    }

    const params = new URLSearchParams({
      place_id: placeId,
      key: this.apiKey,
      fields: 'place_id,name,formatted_address,geometry,formatted_phone_number,website,opening_hours,price_level,rating,user_ratings_total,photos,types',
      sessiontoken: sessionToken || '',
    });

    try {
      const response = await fetch(`${this.baseUrl}/details/json?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.result;
      } else {
        console.error('Google Places details error:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    if (!this.apiKey || !photoReference) {
      return '';
    }

    return `${this.baseUrl}/photo?photo_reference=${photoReference}&maxwidth=${maxWidth}&key=${this.apiKey}`;
  }

  // Convert Google price level (0-4) to our format ($-$$$$)
  convertPriceLevel(priceLevel?: number): string {
    if (!priceLevel) return '$$';
    const dollarSigns = ['$', '$$', '$$$', '$$$$', '$$$$$'];
    return dollarSigns[priceLevel] || '$$';
  }

  // Extract cuisine types from Google place types
  extractCuisineTypes(types?: string[]): string[] {
    if (!types) return ['Restaurant'];

    const cuisineMap: Record<string, string> = {
      'italian_restaurant': 'Italian',
      'chinese_restaurant': 'Chinese',
      'japanese_restaurant': 'Japanese',
      'mexican_restaurant': 'Mexican',
      'indian_restaurant': 'Indian',
      'thai_restaurant': 'Thai',
      'french_restaurant': 'French',
      'american_restaurant': 'American',
      'pizza_restaurant': 'Pizza',
      'seafood_restaurant': 'Seafood',
      'steak_house': 'Steakhouse',
      'sushi_restaurant': 'Sushi',
      'vegetarian_restaurant': 'Vegetarian',
      'cafe': 'Cafe',
      'bar': 'Bar',
      'bakery': 'Bakery',
      'restaurant': 'Restaurant',
    };

    const cuisines = types
      .map(type => cuisineMap[type])
      .filter(Boolean);

    return cuisines.length > 0 ? cuisines : ['Restaurant'];
  }
}

export const googlePlacesService = new GooglePlacesService();