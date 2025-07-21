import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface FeedItem {
  id: string
  user_id: string
  restaurant_id: string
  personal_rating: number | null
  visit_date: string | null
  photos: string[] | null
  notes: string | null
  tags: string[] | null
  would_recommend: boolean | null
  price_range: string | null
  visit_type: 'dine_in' | 'takeout' | 'delivery' | null
  privacy: 'public' | 'friends' | 'private'
  created_at: string
  restaurant?: any
  user?: any
}

export function useRealtimeFeed(userId: string | null, friendIds: string[] = []) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let channel: RealtimeChannel

    const fetchInitialFeed = async () => {
      try {
        setLoading(true)
        
        // Fetch initial feed items
        const { data, error } = await supabase
          .from('restaurant_saves')
          .select(`
            *,
            restaurant:restaurants(*),
            user:users(*)
          `)
          .or(`privacy.eq.public,and(privacy.eq.friends,user_id.in.(${friendIds.join(',')}))`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setFeedItems(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    const setupRealtimeSubscription = () => {
      // Subscribe to new saves from friends
      channel = supabase
        .channel('feed-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'restaurant_saves',
            filter: friendIds.length > 0 ? `user_id=in.(${friendIds.join(',')})` : undefined
          },
          async (payload) => {
            // Fetch complete data for the new save
            const { data } = await supabase
              .from('restaurant_saves')
              .select(`
                *,
                restaurant:restaurants(*),
                user:users(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (data && (data.privacy === 'public' || (data.privacy === 'friends' && friendIds.includes(data.user_id)))) {
              setFeedItems(prev => [data, ...prev])
            }
          }
        )
        .subscribe()
    }

    fetchInitialFeed()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, friendIds.join(',')])

  return { feedItems, loading, error }
}