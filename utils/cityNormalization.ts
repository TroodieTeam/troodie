/**
 * City normalization utilities to ensure consistent city data
 */

/**
 * Normalize a city name to ensure consistent formatting
 * - Handles case sensitivity
 * - Removes invalid patterns (building, floor, etc.)
 * - Applies proper title case
 */
export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;
  
  // Trim whitespace
  let normalized = city.trim();
  
  // Check for invalid city patterns (building/floor indicators)
  const invalidPatterns = /^(Bldg|Building|Suite|Apt|Unit|Floor|Fl)\s/i;
  if (invalidPatterns.test(normalized)) {
    return null; // Invalid city name
  }
  
  // Convert to title case for consistency
  normalized = normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return normalized;
}

/**
 * Check if a city name is valid
 */
export function isValidCity(city: string | null | undefined): boolean {
  if (!city) return false;
  
  // Check for invalid patterns
  const invalidPatterns = /^(Bldg|Building|Suite|Apt|Unit|Floor|Fl|[0-9]+)$/i;
  if (invalidPatterns.test(city.trim())) {
    return false;
  }
  
  // City should have at least 2 characters
  return city.trim().length >= 2;
}

/**
 * Compare two city names for equality (case-insensitive)
 */
export function citiesMatch(city1: string | null, city2: string | null): boolean {
  if (!city1 || !city2) return false;
  
  const normalized1 = normalizeCity(city1);
  const normalized2 = normalizeCity(city2);
  
  return normalized1 === normalized2;
}

/**
 * Get a SQL-safe city filter that handles case sensitivity
 * For use with Supabase queries
 */
export function getCityFilter(city: string): string {
  return normalizeCity(city) || city;
}

/**
 * Clean up city data from database
 * Removes duplicates and normalizes formatting
 */
export function deduplicateCities(cities: string[]): string[] {
  const normalized = new Map<string, string>();
  
  cities.forEach(city => {
    const normalizedCity = normalizeCity(city);
    if (normalizedCity && isValidCity(normalizedCity)) {
      // Keep the first occurrence with proper casing
      if (!normalized.has(normalizedCity.toLowerCase())) {
        normalized.set(normalizedCity.toLowerCase(), normalizedCity);
      }
    }
  });
  
  return Array.from(normalized.values()).sort();
}