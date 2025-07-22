import AsyncStorage from '@react-native-async-storage/async-storage'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'supabase.auth.token'

export const sessionPersistence = {
  /**
   * Manually save a session to AsyncStorage
   * This is a backup method in case automatic persistence fails
   */
  async saveSession(session: Session | null) {
    try {
      if (session) {
        const sessionData = {
          currentSession: session,
          expiresAt: session.expires_at,
        }
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
        console.log('[SessionPersistence] Session saved manually')
      } else {
        await AsyncStorage.removeItem(SESSION_KEY)
        console.log('[SessionPersistence] Session cleared')
      }
    } catch (error) {
      console.error('[SessionPersistence] Error saving session:', error)
    }
  },

  /**
   * Manually restore a session from AsyncStorage
   * This can be used as a fallback if getSession() returns null
   */
  async restoreSession() {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY)
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        const session = parsed.currentSession as Session
        
        // Check if session is expired
        const expiresAt = new Date(session.expires_at || 0).getTime()
        const now = new Date().getTime()
        
        if (expiresAt > now) {
          console.log('[SessionPersistence] Valid session found in storage')
          // Set the session manually
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
          return session
        } else {
          console.log('[SessionPersistence] Session expired, attempting refresh')
          // Try to refresh the expired session
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession({
            refresh_token: session.refresh_token,
          })
          return refreshedSession
        }
      }
      return null
    } catch (error) {
      console.error('[SessionPersistence] Error restoring session:', error)
      return null
    }
  },

  /**
   * Force refresh the current session
   */
  async forceRefreshSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.refresh_token) {
        const { data: { session: newSession } } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token,
        })
        return newSession
      }
      return null
    } catch (error) {
      console.error('[SessionPersistence] Error refreshing session:', error)
      return null
    }
  },
}