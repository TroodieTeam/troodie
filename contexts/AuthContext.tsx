import { supabase } from '@/lib/supabase'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { Session, User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: any | null
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const loadUserProfile = async (userId: string) => {
    try {
      // Loading profile for user
      const profile = await userService.getProfile(userId)
      if (!profile) {
        // No profile found, creating new profile
        const newProfile = await userService.createProfile({
          id: userId,
          phone: null,
          profile_completion: 0
        })
        setProfile(newProfile)
      } else {
        // Profile loaded successfully
        setProfile(profile)
      }
    } catch (error) {
      console.error('[AuthContext] Error loading profile:', error)
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
      
      // Only handle specific events we care about
      if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed
        setSession(session)
        setUser(session.user)
      }
      // Don't handle SIGNED_IN or SIGNED_OUT here - we'll manage those manually
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
      // Verifying OTP
      const result = await authService.verifyOtp(email, token)
      
      // No special handling needed - password auth returns a real session
      
      if (result.success && result.session) {
        // OTP verified successfully
        
        // Directly set our state - don't rely on auth state changes
        setSession(result.session)
        setUser(result.session.user)
        
        // Load profile
        await loadUserProfile(result.session.user.id)
        
        return { ...result, session: result.session }
      } else {
        // OTP verification failed
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
      
      // Clear our state
      setSession(null)
      setUser(null)
      setProfile(null)
      setIsAnonymous(false)
    } finally {
      setLoading(false)
    }
  }

  const skipAuth = () => {
    // Set anonymous mode
    setIsAnonymous(true)
    setLoading(false)
  }

  const value = {
    user,
    session,
    profile,
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