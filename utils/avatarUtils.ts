/**
 * Utility functions for handling avatar URLs
 */

import { DEFAULT_IMAGES } from '@/constants/images';

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

/**
 * Gets the avatar URL with a fallback to default image
 * @param url The avatar URL
 * @param name Optional name for generating initials
 * @returns The formatted avatar URL or default avatar
 */
export function getAvatarUrlWithFallback(url: string | null | undefined, name?: string): string {
  const formattedUrl = formatAvatarUrl(url);
  if (formattedUrl) return formattedUrl;
  
  // Generate avatar with initials if name is provided
  if (name) {
    return generateInitialsAvatar(name);
  }
  
  return DEFAULT_IMAGES.avatar;
}

/**
 * Generates an avatar URL with user initials
 * @param name The user's name or username
 * @returns URL for an avatar with initials
 */
export function generateInitialsAvatar(name: string): string {
  if (!name) return DEFAULT_IMAGES.avatar;
  
  // Get initials from name
  const parts = name.trim().split(' ');
  let initials = '';
  
  if (parts.length >= 2) {
    // First letter of first and last name
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1) {
    // First two letters of single name
    initials = parts[0].substring(0, 2).toUpperCase();
  }
  
  if (!initials) {
    initials = 'T'; // Default to T for Troodie
  }
  
  // Use ui-avatars.com service for generating avatar with initials
  // Using Troodie's orange color (#FFA500)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=150&background=FFA500&color=fff&bold=true&rounded=true`;
}