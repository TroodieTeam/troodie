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
      const profile = await userService.getProfile(userId)
      if (!profile) {
        const newProfile = await userService.createProfile({
          id: userId,
          phone: null,
          profile_completion: 0,
          account_type: 'consumer' // Default account type
        })
        setProfile(newProfile)
      } else {
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
      const accountInfo = await accountService.getUserAccountInfo(userId)
      setAccountInfo(accountInfo)
    } catch (error) {
      console.error('[AuthContext] Error loading account info:', error)
      setAccountInfo(null)
    }
  }

  const refreshAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setSession(session)
        setUser(session.user)
        await loadUserProfile(session.user.id)
      } else {
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
      if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session)
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
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
    setError(null)
    setLoading(true)
    
    try {
      const result = await authService.verifyOtp(email, token)
      
      if (result.success && result.session) {
        setSession(result.session)
        setUser(result.session.user)
        await loadUserProfile(result.session.user.id)
        return { ...result, session: result.session }
      } else {
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
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (!currentSession) {
        setSession(null)
        setUser(null)
        setProfile(null)
        setAccountInfo(null)
        setIsAnonymous(false)
        return
      }
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[AuthContext] signOut error:', error)
        setSession(null)
        setUser(null)
        setProfile(null)
        setAccountInfo(null)
        setIsAnonymous(false)
        return
      }
      // State will be cleared by the SIGNED_OUT event listener
      // Add a fallback timeout in case the event doesn't fire
      setTimeout(async () => {
        const { data: { session: fallbackSession } } = await supabase.auth.getSession()
        if (!fallbackSession && session) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setAccountInfo(null)
          setIsAnonymous(false)
        }
      }, 1000)
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