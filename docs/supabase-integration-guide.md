# Supabase Integration Guide for Troodie React Native App

This guide provides step-by-step instructions to connect your Troodie React Native app to Supabase.

## Prerequisites

- Expo/React Native app (already set up)
- Supabase account
- Node.js and npm installed

## Step 1: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Organization: Your org or create new
   - Project name: "troodie-production" (or "troodie-dev" for development)
   - Database Password: Generate a strong password and save it
   - Region: Choose closest to your users
   - Pricing Plan: Start with Free tier

4. Wait for project to be created (~2 minutes)

## Step 2: Install Supabase Client

```bash
# Navigate to your project directory
cd /Users/kouamendri/Projects/troodie

# Install Supabase client and dependencies
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install react-native-url-polyfill
```

## Step 3: Configure Supabase Client

Create a new file for Supabase configuration:

```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

## Step 4: Set Up Environment Variables

1. Install expo-constants for environment variables:
```bash
npx expo install expo-constants
```

2. Create app.config.js in your project root:
```javascript
// app.config.js
export default {
  expo: {
    // ... existing expo config
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
}
```

3. Create .env file in project root:
```
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
```

4. Update lib/supabase.ts to use environment variables:
```typescript
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || ''
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || ''
```

## Step 5: Set Up Database Schema

1. Go to your Supabase dashboard > SQL Editor
2. Create a new query and paste the schema from backend-design.md
3. Execute the schema creation SQL

## Step 6: Configure Authentication

### Enable Phone Authentication

1. Go to Authentication > Providers in Supabase dashboard
2. Enable Phone provider
3. Configure Twilio (for production):
   - Sign up for Twilio account
   - Get Account SID, Auth Token, and Message Service SID
   - Add to Supabase Phone provider settings

### Update Auth Context

Create or update your authentication context:

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  signInWithPhone: (phone: string) => Promise<void>
  verifyOtp: (phone: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    })
    if (error) throw error
  }

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      signInWithPhone,
      verifyOtp,
      signOut,
      loading,
    }}>
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
```

## Step 7: Update App Entry Point

Wrap your app with the Auth Provider:

```typescript
// app/_layout.tsx
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Your existing layout */}
    </AuthProvider>
  )
}
```

## Step 8: Implement Data Services

Create service files for different features:

### User Service
```typescript
// services/userService.ts
import { supabase } from '@/lib/supabase'

export const userService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateOnboarding(userId: string, quizAnswers: any, favoriteSpots: any) {
    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: userId,
        quiz_answers: quizAnswers,
        favorite_spots: favoriteSpots,
        completed_at: new Date().toISOString()
      })
    
    if (error) throw error
  }
}
```

### Restaurant Service
```typescript
// services/restaurantService.ts
import { supabase } from '@/lib/supabase'

export const restaurantService = {
  async searchRestaurants(query: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .textSearch('name', query)
      .limit(20)
    
    if (error) throw error
    return data
  },

  async saveRestaurant(saveData: any) {
    const { data, error } = await supabase
      .from('restaurant_saves')
      .insert(saveData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserSaves(userId: string) {
    const { data, error } = await supabase
      .from('restaurant_saves')
      .select(`
        *,
        restaurant:restaurants(*),
        boards:save_boards(board:boards(*))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}
```

### Board Service
```typescript
// services/boardService.ts
import { supabase } from '@/lib/supabase'

export const boardService = {
  async createBoard(boardData: any) {
    const { data, error } = await supabase
      .from('boards')
      .insert(boardData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserBoards(userId: string) {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async addRestaurantToBoard(boardId: string, restaurantId: string) {
    const { error } = await supabase
      .from('board_restaurants')
      .insert({
        board_id: boardId,
        restaurant_id: restaurantId
      })
    
    if (error) throw error
  }
}
```

## Step 9: Set Up Real-time Subscriptions

Create hooks for real-time features:

```typescript
// hooks/useRealtimeFeed.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeFeed(userId: string) {
  const [feedItems, setFeedItems] = useState([])

  useEffect(() => {
    // Get initial feed
    fetchFeed()

    // Subscribe to new saves from friends
    const subscription = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'restaurant_saves',
        },
        (payload) => {
          // Add new save to feed
          setFeedItems(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const fetchFeed = async () => {
    // Fetch personalized feed using Edge Function
    const { data, error } = await supabase.functions.invoke('generate-feed', {
      body: { userId, page: 1 }
    })
    
    if (!error && data) {
      setFeedItems(data.feed)
    }
  }

  return feedItems
}
```

## Step 10: Implement Storage for Images

```typescript
// services/storageService.ts
import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'

export const storageService = {
  async uploadAvatar(userId: string, uri: string) {
    const ext = uri.split('.').pop()
    const fileName = `${userId}/avatar.${ext}`
    
    const formData = new FormData()
    formData.append('file', {
      uri,
      name: fileName,
      type: `image/${ext}`
    } as any)

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, formData, {
        upsert: true
      })

    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    return publicUrl
  },

  async uploadRestaurantPhoto(uri: string) {
    const fileName = `${Date.now()}.jpg`
    
    const formData = new FormData()
    formData.append('file', {
      uri,
      name: fileName,
      type: 'image/jpeg'
    } as any)

    const { data, error } = await supabase.storage
      .from('restaurant-photos')
      .upload(fileName, formData)

    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-photos')
      .getPublicUrl(fileName)
    
    return publicUrl
  }
}
```

## Step 11: Update Your Screens

Update your screens to use Supabase services:

```typescript
// app/onboarding/verify.tsx
import { useAuth } from '@/contexts/AuthContext'

export default function VerifyScreen() {
  const { verifyOtp } = useAuth()
  
  const handleVerifyOTP = async () => {
    try {
      await verifyOtp(phone, otp)
      // Navigate to next screen
    } catch (error) {
      console.error('Verification error:', error)
    }
  }
  
  // ... rest of component
}
```

## Step 12: Configure Push Notifications

1. Install Expo Notifications:
```bash
npx expo install expo-notifications expo-device
```

2. Set up push notification service:
```typescript
// services/notificationService.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { supabase } from '@/lib/supabase'

export const notificationService = {
  async registerForPushNotifications(userId: string) {
    if (!Device.isDevice) return
    
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return
    
    const token = await Notifications.getExpoPushTokenAsync()
    
    // Save token to database
    await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token.data,
        platform: Device.osName
      })
  }
}
```

## Step 13: Testing

1. Create test data in Supabase dashboard
2. Test authentication flow
3. Test data fetching and real-time updates
4. Test image uploads

## Step 14: Production Checklist

- [ ] Enable Row Level Security on all tables
- [ ] Set up proper RLS policies
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review and optimize queries
- [ ] Enable SSL enforcement
- [ ] Set up custom domain (optional)
- [ ] Configure rate limiting

## Troubleshooting

### Common Issues

1. **Auth session not persisting**
   - Ensure AsyncStorage is properly configured
   - Check if session refresh is working

2. **Real-time not working**
   - Verify table has replication enabled
   - Check RLS policies allow SELECT

3. **Image upload fails**
   - Check storage bucket policies
   - Ensure file size is within limits

4. **Slow queries**
   - Add appropriate indexes
   - Use query explain to optimize

## Next Steps

1. Implement error handling and retry logic
2. Add offline support with local caching
3. Set up analytics tracking
4. Implement deep linking
5. Add social login providers

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Troodie Backend Design](/docs/backend-design.md)