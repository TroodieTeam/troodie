import { Database, supabase } from '@/lib/supabase'

type AccountType = 'consumer' | 'creator' | 'business'
type AccountStatus = 'active' | 'suspended' | 'pending_verification'

interface AccountUpgradeData {
  bio?: string
  specialties?: string[]
  socialLinks?: Record<string, string>
  restaurantId?: string
  managementPermissions?: string[]
}

interface AccountUpgradeResult {
  success: boolean
  error?: string
  previousType?: AccountType
  newType?: AccountType
  upgradedAt?: string
}

interface UserAccountInfo {
  id: string
  account_type: AccountType
  account_status: AccountStatus
  account_upgraded_at: string | null
  creator_profile?: Database['public']['Tables']['creator_profiles']['Row']
  business_profile?: (Database['public']['Tables']['business_profiles']['Row'] & {
    restaurant_name?: string
    restaurant_address?: string
  })
}

export const accountService = {
  /**
   * Upgrade user account to creator or business type
   */
  async upgradeAccount(
    userId: string, 
    newAccountType: 'creator' | 'business', 
    profileData: AccountUpgradeData = {}
  ): Promise<AccountUpgradeResult> {
    try {
      const { data, error } = await supabase.rpc('upgrade_user_account', {
        user_id_param: userId,
        new_account_type: newAccountType,
        profile_data: profileData
      })

      if (error) {
        console.error('Error upgrading account:', error)
        return { success: false, error: error.message }
      }

      return data as AccountUpgradeResult
    } catch (error) {
      console.error('Error upgrading account:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Get complete user account information including profiles
   */
  async getUserAccountInfo(userId: string): Promise<UserAccountInfo | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_account_info', {
        user_id_param: userId
      })

      if (error) {
        console.error('Error fetching user account info:', error)
        return null
      }

      return data as UserAccountInfo
    } catch (error) {
      console.error('Error fetching user account info:', error)
      return null
    }
  },

  /**
   * Check if user has permission for specific feature
   */
  hasFeatureAccess(accountType: AccountType, feature: string): boolean {
    const permissions: Record<AccountType, string[]> = {
      consumer: [
        'explore_restaurants',
        'save_restaurants', 
        'create_posts',
        'follow_users',
        'join_communities'
      ],
      creator: [
        // All consumer permissions
        'explore_restaurants',
        'save_restaurants',
        'create_posts', 
        'follow_users',
        'join_communities',
        // Creator-specific permissions
        'view_creator_dashboard',
        'manage_campaigns',
        'view_earnings',
        'creator_analytics',
        'content_monetization'
      ],
      business: [
        // All consumer permissions (for discovery)
        'explore_restaurants',
        'save_restaurants',
        'create_posts',
        'follow_users', 
        'join_communities',
        // Business-specific permissions
        'business_dashboard',
        'manage_restaurant',
        'create_campaigns',
        'business_analytics',
        'manage_applications'
      ]
    }

    return permissions[accountType]?.includes(feature) || false
  },

  /**
   * Get available upgrade options for user
   */
  getAvailableUpgrades(currentAccountType: AccountType): AccountType[] {
    const upgradeMap: Record<AccountType, AccountType[]> = {
      consumer: ['creator', 'business'],
      creator: ['business'], // Creators can become business owners
      business: [] // No upgrades from business (highest tier)
    }

    return upgradeMap[currentAccountType] || []
  },

  /**
   * Update creator profile
   */
  async updateCreatorProfile(
    userId: string, 
    updates: Partial<Database['public']['Tables']['creator_profiles']['Update']>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('creator_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating creator profile:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating creator profile:', error)
      return false
    }
  },

  /**
   * Update business profile
   */
  async updateBusinessProfile(
    userId: string,
    updates: Partial<Database['public']['Tables']['business_profiles']['Update']>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating business profile:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating business profile:', error)
      return false
    }
  },

  /**
   * Get creator profile by user ID
   */
  async getCreatorProfile(userId: string): Promise<Database['public']['Tables']['creator_profiles']['Row'] | null> {
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error fetching creator profile:', error)
        }
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching creator profile:', error)
      return null
    }
  },

  /**
   * Get business profile by user ID
   */
  async getBusinessProfile(userId: string): Promise<(Database['public']['Tables']['business_profiles']['Row'] & {
    restaurant_name?: string
    restaurant_address?: string
  }) | null> {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          restaurants:restaurant_id (
            name,
            address
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error fetching business profile:', error)
        }
        return null
      }

      // Flatten the restaurant data
      const restaurant = data.restaurants as any
      return {
        ...data,
        restaurant_name: restaurant?.name,
        restaurant_address: restaurant?.address
      }
    } catch (error) {
      console.error('Error fetching business profile:', error)
      return null
    }
  },

  /**
   * Check if restaurant is available for claiming
   */
  async isRestaurantAvailableForClaim(restaurantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('is_claimed, owner_id')
        .eq('id', restaurantId)
        .single()

      if (error) {
        console.error('Error checking restaurant availability:', error)
        return false
      }

      return !data.is_claimed && !data.owner_id
    } catch (error) {
      console.error('Error checking restaurant availability:', error)
      return false
    }
  },

  /**
   * Get account type display name
   */
  getAccountTypeDisplayName(accountType: AccountType): string {
    const displayNames: Record<AccountType, string> = {
      consumer: 'Food Explorer',
      creator: 'Content Creator', 
      business: 'Business Owner'
    }
    return displayNames[accountType] || accountType
  },

  /**
   * Get account type description
   */
  getAccountTypeDescription(accountType: AccountType): string {
    const descriptions: Record<AccountType, string> = {
      consumer: 'Discover and save amazing restaurants, share your experiences with friends',
      creator: 'Earn money sharing your food discoveries and partnering with local restaurants',
      business: 'Manage your restaurant, create marketing campaigns, and connect with customers'
    }
    return descriptions[accountType] || ''
  }
}

// Export types for use in other files
export type { AccountType, AccountStatus, AccountUpgradeData, AccountUpgradeResult, UserAccountInfo }