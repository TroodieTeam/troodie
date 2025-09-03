// ===== SHARED RESTAURANT UTILITIES =====

export const APPROVED_CUISINE_TYPES = [
  "American", "Southern", "International", "Fast Casual", "Fine Dining",
  "Cafes/Brunch", "Bars/Breweries", "Japanese", "Sushi", "Mexican",
  "Tex-Mex", "Asian", "Street Food", "Brewery", "Bakery", "Coffee",
  "Spanish", "Tapas", "BBQ", "Steakhouse", "Contemporary", "Rooftop",
  "Vegan", "Vegetarian", "Mediterranean", "Italian", "French", "Indian",
  "Thai", "Chinese", "Vietnamese"
];

// ===== TYPE DEFINITIONS =====
export interface RestaurantInput {
  restaurantName: string;
  address: string;
  placeId?: string;
}

export interface ProcessedRestaurant {
  google_place_id?: string | null;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  location: string | null;
  cuisine_types: string[];
  price_range: string;
  phone: string | null;
  website: string | null;
  hours: Record<string, any>;
  photos: string[];
  cover_photo_url: string | null;
  google_rating: number | null;
  google_reviews_count: number;
  troodie_rating: number | null;
  troodie_reviews_count: number;
  features: string[];
  dietary_options: string[];
  is_verified: boolean;
  is_claimed: boolean;
  owner_id: string | null;
  data_source: string;
  created_at: string;
  updated_at: string;
  last_google_sync: string | null;
  red_ratings_count: number;
  yellow_ratings_count: number;
  green_ratings_count: number;
  total_ratings_count: number;
  overall_rating: string;
}

// ===== DATA STANDARDIZATION FUNCTIONS =====
export function normalizeCuisineString(value: any): string {
  if (!value) return '';
  let v = value.toString().trim();
  // Common typo fixes
  v = v.replace(/\bsreet\b/gi, 'street');
  v = v.replace(/\bst\.?\s?food\b/gi, 'street food');
  // Collapse multiple spaces
  v = v.replace(/\s{2,}/g, ' ');
  return v;
}

export function standardizeCuisine(rawCuisines: any): string[] {
  if (!rawCuisines || rawCuisines.length === 0) return ["International"];
  
  const standardized: string[] = [];
  const lowerCaseApproved = APPROVED_CUISINE_TYPES.map(c => c.toLowerCase());
  
  for (const rawCuisine of rawCuisines) {
    const cleaned = normalizeCuisineString(rawCuisine);
    const lowerRaw = cleaned.toLowerCase();
    let matched = false;
    
    for (const approved of lowerCaseApproved) {
      if (lowerRaw.includes(approved) || approved.includes(lowerRaw)) {
        standardized.push(APPROVED_CUISINE_TYPES[lowerCaseApproved.indexOf(approved)]);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      if (lowerRaw.includes("street food")) {
        standardized.push("Street Food");
      } else if (lowerRaw.includes("american") || lowerRaw.includes("southern") || lowerRaw.includes("comfort")) {
        standardized.push("American");
      } else if (lowerRaw.includes("mexican") || lowerRaw.includes("tex-mex")) {
        standardized.push("Mexican");
      } else if (lowerRaw.includes("sushi") || lowerRaw.includes("japanese")) {
        standardized.push("Japanese");
      } else if (lowerRaw.includes("asian") || lowerRaw.includes("chinese") || lowerRaw.includes("thai") || lowerRaw.includes("vietnamese")) {
        standardized.push("Asian");
      } else if (lowerRaw.includes("pizza") || lowerRaw.includes("italian")) {
        standardized.push("Italian");
      } else if (lowerRaw.includes("cafe") || lowerRaw.includes("brunch")) {
        standardized.push("Cafes/Brunch");
      } else if (lowerRaw.includes("bar") || lowerRaw.includes("brewery") || lowerRaw.includes("pub")) {
        standardized.push("Bars/Breweries");
      } else if (lowerRaw.includes("fine dining") || lowerRaw.includes("upscale")) {
        standardized.push("Fine Dining");
      } else if (lowerRaw.includes("fast casual") || lowerRaw.includes("sandwich") || lowerRaw.includes("burger")) {
        standardized.push("Fast Casual");
      } else {
        standardized.push("International");
      }
    }
  }
  
  return [...new Set(standardized)];
}

export function standardizePriceRange(rawPrice: any): string {
  if (!rawPrice) return '$$';
  
  if (typeof rawPrice === 'number') {
    if (rawPrice <= 1) return '$';
    if (rawPrice <= 2) return '$$';
    if (rawPrice <= 3) return '$$$';
    return '$$$$';
  }
  
  const price = rawPrice.toString().trim();
  if (price.includes('$')) {
    if (price.length === 1) return '$';
    if (price.length === 2) return '$$';
    if (price.length === 3) return '$$$';
    if (price.length >= 4) return '$$$$';
  }
  
  const lowerPrice = price.toLowerCase();
  if (lowerPrice.includes("cheap") || lowerPrice.includes("inexpensive") || lowerPrice.includes("budget")) return '$';
  if (lowerPrice.includes("moderate") || lowerPrice.includes("mid-range")) return '$$';
  if (lowerPrice.includes("expensive") || lowerPrice.includes("upscale") || lowerPrice.includes("fine dining")) return '$$$';
  if (lowerPrice.includes("very expensive") || lowerPrice.includes("luxury")) return '$$$$';
  
  return '$$';
}

export function convertOpeningHours(hoursData: any): Record<string, any> {
  if (!hoursData) return {};
  
  // Handle Google Places weekday_text format
  if (hoursData.weekday_text && Array.isArray(hoursData.weekday_text)) {
    const daysMap: Record<string, string> = {};
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    hoursData.weekday_text.forEach((dayText: string, index: number) => {
      const day = dayNames[index];
      const parts = dayText.split(': ');
      if (parts.length > 1) {
        daysMap[day] = parts[1];
      }
    });
    return daysMap;
  }
  
  // Handle other formats
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const formattedHours: Record<string, string> = {};
  
  for (const day of days) {
    const dayHours = hoursData[day] || hoursData[day.charAt(0).toUpperCase() + day.slice(1)];
    if (dayHours && typeof dayHours === 'string') {
      formattedHours[day.charAt(0).toUpperCase() + day.slice(1)] = dayHours;
    }
  }
  
  return Object.keys(formattedHours).length > 0 ? formattedHours : hoursData;
}

export function normalizeFeatures(featuresData: any): string[] {
  if (!featuresData) return [];
  
  if (typeof featuresData === 'string') {
    return featuresData.split(',').map(f => f.trim()).filter(Boolean);
  }
  
  if (Array.isArray(featuresData)) {
    return featuresData
      .map(f => typeof f === 'string' ? f : f.name || f.title || f)
      .filter(Boolean)
      .slice(0, 25); // Limit to prevent bloat
  }
  
  return [];
}

// ===== VALIDATION =====
export function validateRestaurantInput(input: RestaurantInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input.restaurantName || input.restaurantName.trim().length < 2) {
    errors.push("Restaurant name is required and must be at least 2 characters");
  }
  
  if (!input.address || input.address.trim().length < 5) {
    errors.push("Address is required and must be at least 5 characters");
  }
  
  if (input.placeId && !input.placeId.startsWith('ChIJ')) {
    errors.push("Invalid Google Place ID format");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ===== TRAFFIC LIGHT RATING CONVERSION =====
export function convertStarToTrafficLight(starRating: number): string | null {
  if (!starRating || starRating < 1 || starRating > 5) return null;
  
  // Convert 1-5 star ratings to traffic light system
  if (starRating >= 4.5) return 'green'; // 4.5-5.0: Highly recommended
  if (starRating >= 3.5) return 'yellow'; // 3.5-4.4: Good but mixed
  return 'red'; // 1.0-3.4: Not recommended
}

export function calculateRatingConfidence(reviewCount: number): number {
  if (reviewCount < 10) return 0.3; // Low confidence
  if (reviewCount < 50) return 0.6; // Medium confidence  
  if (reviewCount < 100) return 0.8; // Good confidence
  return 1.0; // High confidence
}

export function convertGoogleRatingToTrafficLight(googleRating: number | null, reviewCount: number) {
  // Default neutral state
  const defaultResult = {
    red_ratings_count: 0,
    yellow_ratings_count: 0,
    green_ratings_count: 0,
    total_ratings_count: 0,
    overall_rating: 'neutral'
  };
  
  if (!googleRating || reviewCount < 5) {
    return defaultResult;
  }
  
  const trafficLightRating = convertStarToTrafficLight(googleRating);
  if (!trafficLightRating) {
    return defaultResult;
  }
  
  // Convert to simulated traffic light counts based on confidence
  const confidence = calculateRatingConfidence(reviewCount);
  const simulatedCount = Math.max(1, Math.floor(confidence * 10)); // 1-10 simulated ratings
  
  const result = {
    red_ratings_count: 0,
    yellow_ratings_count: 0,
    green_ratings_count: 0,
    total_ratings_count: simulatedCount,
    overall_rating: trafficLightRating
  };
  
  // Assign counts based on the rating
  if (trafficLightRating === 'green') {
    result.green_ratings_count = simulatedCount;
  } else if (trafficLightRating === 'yellow') {
    result.yellow_ratings_count = simulatedCount;
  } else {
    result.red_ratings_count = simulatedCount;
  }
  
  return result;
}

// ===== ADDRESS PARSING =====
export function parseCityStateZip(address: string): { city: string; state: string; zip: string | null; country: string } {
  if (!address || typeof address !== 'string') {
    return { city: '', state: '', zip: null, country: '' };
  }
  
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  let country = '';
  
  // Detect and remove country if present at the end
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    if (/^USA$|^United States$/i.test(last)) {
      country = last;
      parts.pop();
    }
  }
  
  // Find the segment that contains state and/or zip (usually last now)
  let state = '';
  let zip: string | null = null;
  let city = '';
  
  // Iterate from the end to find a segment with state code or zip code
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i];
    const stateMatch = seg.match(/\b([A-Z]{2})\b/);
    const zipMatch = seg.match(/\b\d{5}(?:-\d{4})?\b/);
    
    if (stateMatch || zipMatch) {
      state = stateMatch ? stateMatch[1] : '';
      zip = zipMatch ? zipMatch[0] : null;
      
      // City is the token immediately before this segment if available
      if (i - 1 >= 0) {
        const candidate = parts[i - 1];
        // If candidate looks like it contains street info, extract trailing city-like words
        if (/\d/.test(candidate) || candidate.length > 40) {
          const tailMatch = candidate.match(/([A-Za-z][A-Za-z\-']*(?:\s+[A-Za-z][A-Za-z\-']*)*)$/);
          city = tailMatch ? tailMatch[1] : candidate;
        } else {
          city = candidate;
        }
      }
      break;
    }
  }
  
  // Fallback: if city still empty and we have at least 2 parts, assume second token is city
  if (!city && parts.length >= 2) {
    city = parts[1];
  }
  
  return { city: city || '', state: state || '', zip: zip || null, country };
}

export function extractCity(address: string): string {
  const { city } = parseCityStateZip(address);
  return city || '';
}

export function extractState(address: string): string {
  const { state } = parseCityStateZip(address);
  return state || '';
}

export function extractZipCode(address: string): string | null {
  const { zip } = parseCityStateZip(address);
  return zip;
}

export function formatLocation(locationData: any): string | null {
  if (!locationData) return null;
  
  if (typeof locationData === 'string') {
    const coords = locationData.split(',');
    if (coords.length === 2) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return `POINT(${lng} ${lat})`;
      }
    }
  }
  
  if (locationData.lat && locationData.lng) {
    return `POINT(${locationData.lng} ${locationData.lat})`;
  }
  
  return null;
}

export function normalizePhone(phone: any): string | null {
  if (!phone) return null;
  // Clean phone number but preserve formatting
  return phone.toString().replace(/[^\d+\-\(\)\s\.]/g, '');
}

export function normalizePhotos(photos: any): string[] {
  if (!photos) return [];
  
  if (Array.isArray(photos)) {
    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
    return photos.map((p: any) => {
      if (typeof p === 'string') return p;
      if (p.photo_reference) {
        // Convert Google Photos reference to URL if API key is available; otherwise skip
        if (googleKey) {
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${googleKey}`;
        }
        return null;
      }
      return p.url || p.src;
    }).filter(Boolean).slice(0, 10);
  }
  
  return [];
}

export function getCoverPhoto(photos: any): string | null {
  const photoArray = normalizePhotos(photos);
  return photoArray.length > 0 ? photoArray[0] : null;
}
