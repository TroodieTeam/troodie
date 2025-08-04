/**
 * Utility functions for handling avatar URLs
 */

const SUPABASE_URL = 'https://cacrjcekanesymdzpjtt.supabase.co';

/**
 * Ensures an avatar URL is properly formatted
 * @param url The avatar URL to format
 * @returns The properly formatted URL or null
 */
export function formatAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Log for debugging
    return url;
  }
  
  // If it's a relative path from storage, construct the full URL
  if (url.startsWith('/storage/v1/object/public/avatars/')) {
    const fullUrl = `${SUPABASE_URL}${url}`;
    return fullUrl;
  }
  
  // If it's just the file path, construct the full storage URL
  if (url.includes('/') && !url.includes('supabase')) {
    const fullUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
    return fullUrl;
  }
  
  // Return as is if we can't determine the format
  return url;
}

/**
 * Gets the avatar URL from a user profile, checking both avatar_url and profile_image_url
 * @param profile The user profile object
 * @returns The formatted avatar URL or null
 */
export function getAvatarUrl(profile: { avatar_url?: string | null; profile_image_url?: string | null } | null): string | null {
  if (!profile) return null;
  
  // Prefer avatar_url over profile_image_url
  const url = profile.avatar_url || profile.profile_image_url;
  return formatAvatarUrl(url);
}