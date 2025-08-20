import AsyncStorage from '@react-native-async-storage/async-storage'

export const debugStorage = {
  async logAllStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            console.log(`${key}:`, parsed)
          } catch {
            console.log(`${key}:`, value)
          }
        } else {
          console.log(`${key}: null`)
        }
      }
    } catch (error) {
      console.error('Error debugging storage:', error)
    }
  },
  
  async getSupabaseSession() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(key => key.includes('supabase'))
      
      for (const key of supabaseKeys) {
        const value = await AsyncStorage.getItem(key)
        if (value && key.includes('auth-token')) {
          try {
            const parsed = JSON.parse(value)
            console.log('Supabase session:', {
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
    } catch (error) {
      console.error('Error getting Supabase session:', error)
    }
  },
  
  async clearSupabaseStorage() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(key => key.includes('supabase'))
      
      await AsyncStorage.multiRemove(supabaseKeys)
    } catch (error) {
      console.error('Error clearing Supabase storage:', error)
    }
  }
}