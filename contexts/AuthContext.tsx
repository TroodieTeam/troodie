import { supabase } from '@/lib/supabase'
import { accountService, AccountType, UserAccountInfo } from '@/services/accountService'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { Session, User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: any | null
  accountInfo: UserAccountInfo | null
  signUpWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  signInWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string; session?: Session | null }>
  resendOtp: (email: string, type: 'signup' | 'login') => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  skipAuth: () => void
  error: string | null
  refreshAuth: () => Promise<void>
  // Account type methods
  accountType: AccountType
  hasFeatureAccess: (feature: string) => boolean
  upgradeAccount: (newType: 'creator' | 'business', profileData?: any) => Promise<{ success: boolean; error?: string }>
  refreshAccountInfo: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [accountInfo, setAccountInfo] = useState<UserAccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading profile for user:', userId)
      // Loading profile for user
      const profile = await userService.getProfile(userId)
      if (!profile) {
        console.log('[AuthContext] No profile found, creating new profile')
        // No profile found, creating new profile
        const newProfile = await userService.createProfile({
          id: userId,
          phone: null,
          profile_completion: 0,
          account_type: 'consumer' // Default account type
        })
        setProfile(newProfile)
      } else {
        console.log('[AuthContext] Profile loaded successfully:', profile.email)
        // Profile loaded successfully
        setProfile(profile)
      }
      
      // Load account info
      await loadAccountInfo(userId)
    } catch (error) {
      console.error('[AuthContext] Error loading profile:', error)
    }
  }

  const loadAccountInfo = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading account info for user:', userId)
      const accountInfo = await accountService.getUserAccountInfo(userId)
      console.log('[AuthContext] Account info loaded:', accountInfo)
      setAccountInfo(accountInfo)
    } catch (error) {
      console.error('[AuthContext] Error loading account info:', error)
      setAccountInfo(null)
    }
  }

  const refreshAuth = async () => {
    try {
      // Refreshing auth state
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Session found during refresh
        setSession(session)
        setUser(session.user)
        await loadUserProfile(session.user.id)
      } else {
        // No session found during refresh
        setSession(null)
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing auth:', error)
    }
  }

  useEffect(() => {
    // Initial auth check
    const initAuth = async () => {
      try {
        await refreshAuth()
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Simple listener - only handle TOKEN_REFRESHED and user-initiated SIGNED_OUT
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth event received
      
      if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed
        setSession(session)
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear all state
        setSession(null)
        setUser(null)
        setProfile(null)
        setAccountInfo(null)
        setIsAnonymous(false)
        setLoading(false)
      }
      // Don't handle SIGNED_IN here - we'll manage that manually
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUpWithEmail = async (email: string) => {
    setError(null)
    const result = await authService.signUpWithEmail(email)
    if (!result.success && result.error) {
      setError(result.error)
    }
    return result
  }

  const signInWithEmail = async (email: string) => {
    setError(null)
    const result = await authService.signInWithEmail(email)
    if (!result.success && result.error) {
      setError(result.error)
    }
    return result
  }

  const verifyOtp = async (email: string, token: string) => {
    console.log('[AuthContext] verifyOtp called with email:', email, 'token:', token)
    setError(null)
    setLoading(true)
    
    try {
      // Verifying OTP
      const result = await authService.verifyOtp(email, token)
      console.log('[AuthContext] verifyOtp result:', result.success, result.session ? 'session exists' : 'no session')
      
      // No special handling needed - password auth returns a real session
      
      if (result.success && result.session) {
        // OTP verified successfully
        console.log('[AuthContext] OTP verified successfully, setting session and user')
        
        // Directly set our state - don't rely on auth state changes
        setSession(result.session)
        setUser(result.session.user)
        
        // Load profile
        console.log('[AuthContext] Loading user profile...')
        await loadUserProfile(result.session.user.id)
        console.log('[AuthContext] Profile loading completed')
        
        return { ...result, session: result.session }
      } else {
        // OTP verification failed
        console.log('[AuthContext] OTP verification failed:', result.error)
        setError(result.error || 'Verification failed')
        return result
      }
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async (email: string, type: 'signup' | 'login' = 'login') => {
    setError(null)
    const result = await authService.resendOtp(email, type)
    if (!result.success && result.error) {
      setError(result.error)
    }
    return result
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // State will be cleared by the SIGNED_OUT event listener
    } finally {
      setLoading(false)
    }
  }

  const skipAuth = () => {
    // Set anonymous mode
    setIsAnonymous(true)
    setLoading(false)
  }

  // Account type methods
  const upgradeAccount = async (newType: 'creator' | 'business', profileData: any = {}) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    setLoading(true)
    try {
      const result = await accountService.upgradeAccount(user.id, newType, profileData)
      
      if (result.success) {
        // Refresh account info and profile
        await refreshAccountInfo()
        await loadUserProfile(user.id)
      }
      
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshAccountInfo = async () => {
    if (!user) return
    await loadAccountInfo(user.id)
  }

  const hasFeatureAccess = (feature: string): boolean => {
    const currentAccountType = accountInfo?.account_type || profile?.account_type || 'consumer'
    return accountService.hasFeatureAccess(currentAccountType, feature)
  }

  // Computed values
  const accountType: AccountType = accountInfo?.account_type || profile?.account_type || 'consumer'

  const value = {
    user,
    session,
    profile,
    accountInfo,
    signUpWithEmail,
    signInWithEmail,
    verifyOtp,
    resendOtp,
    signOut,
    skipAuth,
    loading,
    isAuthenticated: !!session,
    isAnonymous,
    error,
    refreshAuth,
    // Account type methods
    accountType,
    hasFeatureAccess,
    upgradeAccount,
    refreshAccountInfo,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}