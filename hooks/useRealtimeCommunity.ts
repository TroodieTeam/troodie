import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface CommunityPost {
  id: string
  community_id: string
  user_id: string
  content: string
  images: string[] | null
  created_at: string
  updated_at: string
  user?: any
}

export function useRealtimeCommunity(communityId: string | null) {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!communityId) {
      setLoading(false)
      return
    }

    let channel: RealtimeChannel

    const fetchCommunityPosts = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('community_posts')
          .select(`
            *,
            user:users(*)
          `)
          .eq('community_id', communityId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setPosts(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`community-${communityId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_posts',
            filter: `community_id=eq.${communityId}`
          },
          async (payload) => {
            // Fetch complete data for the new post
            const { data } = await supabase
              .from('community_posts')
              .select(`
                *,
                user:users(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setPosts(prev => [data, ...prev])
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'community_posts',
            filter: `community_id=eq.${communityId}`
          },
          (payload) => {
            setPosts(prev => 
              prev.map(post => 
                post.id === payload.new.id 
                  ? { ...post, ...payload.new }
                  : post
              )
            )
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'community_posts',
            filter: `community_id=eq.${communityId}`
          },
          (payload) => {
            setPosts(prev => prev.filter(post => post.id !== payload.old.id))
          }
        )
        .subscribe()
    }

    fetchCommunityPosts()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [communityId])

  const createPost = async (content: string, images?: string[]) => {
    if (!communityId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('community_posts')
      .insert({
        community_id: communityId,
        user_id: user.id,
        content,
        images: images || []
      })

    if (error) {
      console.error('Error creating post:', error)
      throw error
    }
  }

  return {
    posts,
    loading,
    error,
    createPost
  }
}