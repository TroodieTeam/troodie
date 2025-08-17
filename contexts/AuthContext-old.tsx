import { supabase } from '@/lib/supabase'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { Session, User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { debugStorage } from '@/utils/debugStorage'
import { sessionPersistence } from '@/utils/sessionPersistence'

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: any | null
  signUpWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  signInWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>
  resendOtp: (email: string, type: 'signup' | 'login') => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Add a ref to track if we're in the middle of OTP verification
  const isVerifyingOtp = useRef(false)
  // Add a timestamp to track recent sign-ins
  const lastSignInTime = useRef<number>(0)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        
        // Debug storage before attempting to get session
        await debugStorage.getSupabaseSession()
        
        // First attempt: Try to get the session normally
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthContext] getSession() error:', error)
        }
        
        console.log('[AuthContext] getSession() result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          expiresAt: session?.expires_at
        })
        
        // If no session found, try multiple recovery methods
        if (!session) {
          
          // Method 1: Try to refresh the session
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshedSession) {
            setSession(refreshedSession)
            setUser(refreshedSession.user)
            await loadUserProfile(refreshedSession.user.id)
            // Save the refreshed session manually to ensure persistence
            await sessionPersistence.saveSession(refreshedSession)
          } else {
            // Method 2: Try to restore from manual storage
            const restoredSession = await sessionPersistence.restoreSession()
            
            if (restoredSession) {
              setSession(restoredSession)
              setUser(restoredSession.user)
              await loadUserProfile(restoredSession.user.id)
            } else {
              setSession(null)
              setUser(null)
            }
          }
        } else {
          // Session found on first attempt
          setSession(session)
          setUser(session.user)
          await loadUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }
    
    // Add a small delay to ensure AsyncStorage is ready
    // This helps with race conditions on app startup
    setTimeout(() => {
      initializeAuth()
    }, 100)

    // Listen for auth changes with a more defensive approach
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] onAuthStateChange:', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at
      })
      
      // CRITICAL: During OTP verification, completely ignore auth state changes
      // We'll handle the session manually in verifyOtp
      if (isVerifyingOtp.current) {
        return
      }
      
      // For SIGNED_OUT events, be very careful
      if (_event === 'SIGNED_OUT') {
        // Check if this is within 10 seconds of sign-in
        const timeSinceSignIn = Date.now() - lastSignInTime.current
        if (timeSinceSignIn < 10000) {
          return
        }
        
        // Double-check with getSession before clearing
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          return
        }
        
        // Only now clear the session
        setSession(null)
        setUser(null)
        setProfile(null)
      } else if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
        // Don't update if we're already signed in with the same user
        if (session?.user?.id === user?.id && _event === 'SIGNED_IN') {
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserProfile(session.user.id)
          await sessionPersistence.saveSession(session)
        }
      } else if (_event === 'INITIAL_SESSION') {
        // Only set if we don't already have a session
        if (!user && session) {
          setSession(session)
          setUser(session.user)
          await loadUserProfile(session.user.id)
          await sessionPersistence.saveSession(session)
        }
      }
      
      // Debug storage after auth change
      if (__DEV__) {
        await debugStorage.getSupabaseSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await userService.getProfile(userId)
      if (!profile) {
        // Create profile if it doesn't exist
        const newProfile = await userService.createProfile({
          id: userId,
          phone: user?.phone || null,
          profile_completion: 0
        })
        setProfile(newProfile)
      } else {
        setProfile(profile)
      }
    } catch (error) {
      console.error('[AuthContext] Error loading profile:', error)
    }
  }

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
    isVerifyingOtp.current = true
    
    try {
      const result = await authService.verifyOtp(email, token)
      
      if (result.success && result.session) {
        
        // Mark the sign-in time
        lastSignInTime.current = Date.now()
        
        // Immediately set the session in state
        setSession(result.session)
        setUser(result.session.user)
        
        // Save the session manually
        await sessionPersistence.saveSession(result.session)
        
        // Load user profile
        await loadUserProfile(result.session.user.id)
        
        // Double-check session is still valid
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        console.log('[AuthContext] Verification complete - current session:', {
          hasSession: !!currentSession,
          userId: currentSession?.user?.id
        })
      } else {
        setError(result.error || 'Verification failed')
      }
      
      return result
    } finally {
      setLoading(false)
      // Keep the flag true for much longer to handle delayed SIGNED_OUT events
      setTimeout(() => {
        isVerifyingOtp.current = false
      }, 10000) // 10 seconds
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
      setProfile(null)
    } finally {
      setLoading(false)
    }
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
    loading,
    isAuthenticated: !!session,
    error,
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