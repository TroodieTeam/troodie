/**
 * Creator Upgrade Service
 * Task: CM-1 - Fix Creator Profile Race Condition
 *
 * This service provides atomic creator onboarding that ensures
 * both user upgrade and profile creation happen together.
 * If either fails, neither change is persisted.
 */

import { supabase } from '@/lib/supabase';

export interface CreatorProfileData {
  displayName: string;
  bio?: string;
  location?: string;
  specialties?: string[];
}

export interface UpgradeResult {
  success: boolean;
  profileId?: string;
  error?: string;
}

export interface PortfolioItem {
  imageUrl: string;
  caption?: string;
  displayOrder?: number;
  isFeatured?: boolean;
}

export interface AddPortfolioResult {
  success: boolean;
  itemsAdded?: number;
  error?: string;
}

/**
 * Atomically upgrade a user to creator and create their profile.
 * Uses the database function upgrade_to_creator() to ensure both
 * operations succeed or fail together.
 *
 * @param userId - The user's ID
 * @param profileData - Creator profile information
 * @returns Result with success status and profile ID or error
 */
export async function upgradeToCreator(
  userId: string,
  profileData: CreatorProfileData
): Promise<UpgradeResult> {
  try {
    const { data, error } = await supabase.rpc('upgrade_to_creator', {
      p_user_id: userId,
      p_display_name: profileData.displayName,
      p_bio: profileData.bio || 'Food lover and content creator',
      p_location: profileData.location || 'Charlotte',
      p_specialties: profileData.specialties || ['General'],
    });

    if (error) {
      console.error('[CreatorUpgrade] RPC error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upgrade account',
      };
    }

    // The RPC returns a JSON object with success, profile_id, and optionally error
    if (!data || !data.success) {
      console.error('[CreatorUpgrade] Upgrade failed:', data?.error);
      return {
        success: false,
        error: data?.error || 'Failed to create creator profile',
      };
    }

    return {
      success: true,
      profileId: data.profile_id,
    };
  } catch (error: any) {
    console.error('[CreatorUpgrade] Exception:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Add portfolio items to a creator profile.
 * This should be called after images are uploaded to storage
 * and we have the cloud URLs.
 *
 * @param creatorProfileId - The creator profile ID
 * @param items - Array of portfolio items with cloud URLs
 * @returns Result with success status and count of items added
 */
export async function addPortfolioItems(
  creatorProfileId: string,
  items: PortfolioItem[]
): Promise<AddPortfolioResult> {
  try {
    // Convert to the format expected by the RPC function
    const itemsJson = items.map((item, index) => ({
      image_url: item.imageUrl,
      caption: item.caption || '',
      display_order: item.displayOrder ?? index,
      is_featured: item.isFeatured ?? index === 0,
    }));

    const { data, error } = await supabase.rpc('add_creator_portfolio_items', {
      p_creator_profile_id: creatorProfileId,
      p_items: itemsJson,
    });

    if (error) {
      console.error('[CreatorUpgrade] Portfolio RPC error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add portfolio items',
      };
    }

    if (!data || !data.success) {
      console.error('[CreatorUpgrade] Portfolio add failed:', data?.error);
      return {
        success: false,
        error: data?.error || 'Failed to add portfolio items',
      };
    }

    return {
      success: true,
      itemsAdded: data.items_added,
    };
  } catch (error: any) {
    console.error('[CreatorUpgrade] Portfolio exception:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get a user's creator profile ID.
 * Useful for operations that require the creator_profiles.id
 * instead of the users.id.
 *
 * @param userId - The user's ID
 * @returns The creator profile ID or null if not found
 */
export async function getCreatorProfileId(
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[CreatorUpgrade] Get profile ID error:', error);
    return null;
  }
}

/**
 * Complete the full creator onboarding flow.
 * This is a convenience function that:
 * 1. Upgrades the user to creator (atomic)
 * 2. Adds portfolio items (if provided)
 *
 * @param userId - The user's ID
 * @param profileData - Creator profile information
 * @param portfolioItems - Optional portfolio items (should have cloud URLs)
 * @returns Combined result
 */
export async function completeCreatorOnboarding(
  userId: string,
  profileData: CreatorProfileData,
  portfolioItems?: PortfolioItem[]
): Promise<UpgradeResult> {
  // Step 1: Atomic upgrade
  const upgradeResult = await upgradeToCreator(userId, profileData);

  if (!upgradeResult.success || !upgradeResult.profileId) {
    return upgradeResult;
  }

  // Step 2: Add portfolio items if provided
  if (portfolioItems && portfolioItems.length > 0) {
    const portfolioResult = await addPortfolioItems(
      upgradeResult.profileId,
      portfolioItems
    );

    if (!portfolioResult.success) {
      // Portfolio failed but user is already upgraded
      // Return success but log the issue
      console.warn(
        '[CreatorUpgrade] Portfolio items failed to add:',
        portfolioResult.error
      );
      return {
        ...upgradeResult,
        error: `Account upgraded but portfolio failed: ${portfolioResult.error}`,
      };
    }
  }

  return upgradeResult;
}

// Export as a singleton-style object for consistency with other services
export const creatorUpgradeService = {
  upgradeToCreator,
  addPortfolioItems,
  getCreatorProfileId,
  completeCreatorOnboarding,
};
