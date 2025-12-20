import * as Linking from 'expo-linking';

/**
 * Creates a return URL for Stripe Payment Sheet
 * Must match urlScheme in StripeProvider and include a path component
 */
export function createStripeReturnURL(): string {
  try {
    // Use the same method as StripeProvider in _layout.tsx
    // For Expo dev: Linking.createURL('/--/') returns exp://.../--/
    // For production: Linking.createURL('') returns troodie://
    // We need to add a path component for Stripe
    const baseURL = Linking.createURL('');
    if (baseURL && baseURL.includes('://')) {
      // If it already has a path, use it; otherwise add one
      if (baseURL.split('://')[1] && baseURL.split('://')[1].length > 0) {
        return baseURL;
      } else {
        // Add path component for Stripe redirect
        return `${baseURL}payment-return`;
      }
    } else {
      // Fallback: construct manually
      return 'troodie://payment-return';
    }
  } catch (error) {
    console.error('[Stripe Helpers] Error creating returnURL:', error);
    // Fallback to app scheme with path
    return 'troodie://payment-return';
  }
}

