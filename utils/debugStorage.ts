import AsyncStorage from '@react-native-async-storage/async-storage'

export const debugStorage = {
  async logAllStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      console.log('=== AsyncStorage Debug ===')
      console.log('Total keys:', keys.length)
      console.log('All keys:', keys)
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key)
        console.log(`\nKey: ${key}`)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            console.log('Value (parsed):', JSON.stringify(parsed, null, 2))
          } catch {
            console.log('Value (raw):', value)
          }
        } else {
          console.log('Value: null/empty')
        }
      }
      console.log('=== End AsyncStorage Debug ===')
    } catch (error) {
      console.error('Error debugging storage:', error)
    }
  },
  
  async getSupabaseSession() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(key => key.includes('supabase'))
      
      console.log('=== Supabase Session Debug ===')
      console.log('Supabase-related keys:', supabaseKeys)
      
      for (const key of supabaseKeys) {
        const value = await AsyncStorage.getItem(key)
        if (value && key.includes('auth-token')) {
          try {
            const parsed = JSON.parse(value)
            console.log('Session data:', {
              hasCurrentSession: !!parsed.currentSession,
              hasAccessToken: !!parsed.currentSession?.access_token,
              expiresAt: parsed.currentSession?.expires_at,
              userId: parsed.currentSession?.user?.id,
              email: parsed.currentSession?.user?.email
            })
          } catch (error) {
            console.error('Error parsing session:', error)
          }
        }
      }
      console.log('=== End Supabase Session Debug ===')
    } catch (error) {
      console.error('Error getting Supabase session:', error)
    }
  },
  
  async clearSupabaseStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(key => key.includes('supabase'))
      
      console.log('Clearing Supabase keys:', supabaseKeys)
      await AsyncStorage.multiRemove(supabaseKeys)
      console.log('Supabase storage cleared')
    } catch (error) {
      console.error('Error clearing Supabase storage:', error)
    }
  }
}