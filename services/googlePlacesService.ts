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
      const error = 'Google Places API key not configured';
      console.error(error);
      throw new Error(error);
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions || [];
      } else if (data.status === 'ZERO_RESULTS') {
        return [];
      } else if (data.status === 'REQUEST_DENIED') {
        console.error(data.error_message);
        throw new Error('Google Places API request denied. Check your API key and quota.');
      } else if (data.status === 'INVALID_REQUEST') {
        console.error(data.error_message);
        throw new Error('Invalid request to Google Places API');
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error(data.error_message);
        throw new Error('Google Places API quota exceeded');
      } else {
        console.error(data.error_message);
        throw new Error(`Google Places API error: ${data.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching autocomplete results';
      console.error('Error in autocomplete:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<GooglePlaceDetails | null> {
    if (!this.apiKey) {
      const error = 'Google Places API key not configured';
      console.error(error);
      throw new Error(error);
    }

    const params = new URLSearchParams({
      place_id: placeId,
      key: this.apiKey,
      fields: 'place_id,name,formatted_address,geometry,formatted_phone_number,website,opening_hours,price_level,rating,user_ratings_total,photos,types',
      sessiontoken: sessionToken || '',
    });

    try {
      const response = await fetch(`${this.baseUrl}/details/json?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK') {
        if (!data.result) {
          throw new Error('No place details returned from API');
        }
        return data.result;
      } else if (data.status === 'NOT_FOUND') {
        throw new Error('Place not found');
      } else if (data.status === 'REQUEST_DENIED') {
        throw new Error('Google Places API request denied. Check your API key and quota.');
      } else if (data.status === 'INVALID_REQUEST') {
        throw new Error('Invalid request to Google Places API');
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google Places API quota exceeded');
      } else {
        throw new Error(`Google Places API error: ${data.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching place details';
      console.error('Error fetching place details:', errorMessage);
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