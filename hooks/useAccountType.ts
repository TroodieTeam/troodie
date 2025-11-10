import { useAuth } from '@/contexts/AuthContext'
import { AccountType } from '@/services/accountService'

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
    isBusiness: accountType === 'business',
    
    // Creator profile helpers
    creatorProfile: accountInfo?.creator_profile,
    isCreatorVerified: accountInfo?.creator_profile?.verification_status === 'verified',
    
    // Business profile helpers
    businessProfile: accountInfo?.business_profile,
    isBusinessVerified: accountInfo?.business_profile?.verification_status === 'verified',
    restaurantName: accountInfo?.business_profile?.restaurant_name,
    
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