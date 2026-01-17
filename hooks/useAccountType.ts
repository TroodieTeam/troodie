import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook for convenient access to account type functionality
 */
export const useAccountType = () => {
  const {
    accountType,
    accountInfo,
    hasFeatureAccess,
    upgradeAccount,
    refreshAccountInfo
  } = useAuth()

  console.log('accountInfo', accountInfo)

  return {
    // Current account type
    accountType,

    // Account info with profiles
    accountInfo,

    // Feature access checking
    hasFeatureAccess,

    // Account upgrade functionality
    upgradeAccount,
    refreshAccountInfo,

    // Convenience getters
    isConsumer: accountType === 'consumer',
    isCreator: accountType === 'creator',
    // Business access logic: Business account OR manages at least one restaurant
    isBusiness: accountType === 'business' || (accountInfo?.managed_restaurants?.length ?? 0) > 0,

    // Creator profile helpers
    creatorProfile: accountInfo?.creator_profile,
    isCreatorVerified: accountInfo?.creator_profile?.verification_status === 'verified',

    // Business profile helpers
    businessProfile: accountInfo?.business_profile,
    managedRestaurants: accountInfo?.managed_restaurants || [],
    isBusinessVerified: accountInfo?.business_profile?.verification_status === 'verified',
    // Use proper restaurant name (from profile or first managed restaurant)
    restaurantName: accountInfo?.business_profile?.restaurant_name || accountInfo?.managed_restaurants?.[0]?.restaurant_name,

    // Permission helpers for common features
    canViewCreatorDashboard: hasFeatureAccess('view_creator_dashboard'),
    canManageCampaigns: hasFeatureAccess('manage_campaigns'),
    canViewEarnings: hasFeatureAccess('view_earnings'),
    canAccessBusinessDashboard: hasFeatureAccess('business_dashboard'),
    canManageRestaurant: hasFeatureAccess('manage_restaurant'),
    canCreateCampaigns: hasFeatureAccess('create_campaigns'),
  }
}

/**
 * Hook for permission-based component rendering
 */
export const usePermissions = () => {
  const { hasFeatureAccess } = useAuth()

  return {
    hasFeatureAccess,

    // Component wrapper for conditional rendering
    WithPermission: ({
      feature,
      children,
      fallback = null
    }: {
      feature: string
      children: React.ReactNode
      fallback?: React.ReactNode
    }) => {
      return hasFeatureAccess(feature) ? children : fallback
    }
  }
}