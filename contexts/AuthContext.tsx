import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { userService } from '@/services/userService'

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: any | null
  signInWithPhone: (phone: string) => Promise<void>
  verifyOtp: (phone: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
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
  }

  const signInWithPhone = async (phone: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      })
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (phone: string, token: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })
      if (error) throw error
      
      // Profile will be loaded via the auth state change listener
    } finally {
      setLoading(false)
    }
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
    signInWithPhone,
    verifyOtp,
    signOut,
    loading,
    isAuthenticated: !!session,
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