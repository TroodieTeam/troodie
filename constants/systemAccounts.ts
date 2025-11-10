/**
 * System account constants for Troodie platform accounts
 * These UUIDs must match the seeded database values
 *
 * Task: TMC-002
 */

export const TROODIE_SYSTEM_ACCOUNT = {
  USER_ID: 'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599',
  EMAIL: 'kouame@troodieapp.com',
  USERNAME: 'troodie_official',
  FULL_NAME: 'Troodie',
} as const;

export const TROODIE_RESTAURANT = {
  ID: '00000000-0000-0000-0000-000000000002',
  NAME: 'Troodie Community',
  SLUG: 'troodie-community',
} as const;

/**
 * Check if a user ID is a Troodie system account
 */
export function isTroodieSystemAccount(userId: string): boolean {
  return userId === TROODIE_SYSTEM_ACCOUNT.USER_ID;
}

/**
 * Check if a restaurant ID is the Troodie official restaurant
 */
export function isTroodieRestaurant(restaurantId: string): boolean {
  return restaurantId === TROODIE_RESTAURANT.ID;
}

/**
 * Check if a campaign is Troodie-managed based on source
 */
export function isTroodieCampaign(campaignSource: string): boolean {
  return campaignSource !== 'restaurant';
}
