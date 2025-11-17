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
      throw new Error('Google Places API key not configured');
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
      console.log('response data', data); 

      if (data.status === 'OK') {
        return data.predictions;
      } else if (data.status === 'ZERO_RESULTS') {
        // No results found is not an error - return empty array
        return [];
      } else {
        // Throw error for API issues like REQUEST_DENIED, INVALID_REQUEST, etc.
        const errorMessage = `Google Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`;
        console.error('Google Places autocomplete error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      // Re-throw errors so the caller can handle them
      if (error.message?.includes('Google Places API') || error.message?.includes('API key')) {
        throw error;
      }
      const errorMessage = `Error fetching autocomplete results: ${error.message}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<GooglePlaceDetails | null> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
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
      } else if (data.status === 'NOT_FOUND') {
        // Place not found
        return null;
      } else {
        // Throw error for API issues
        const errorMessage = `Google Places details error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      // Re-throw errors so the caller can handle them
      if (error.message?.includes('Google Places') || error.message?.includes('API key')) {
        throw error;
      }
      const errorMessage = `Error fetching place details: ${error.message}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
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