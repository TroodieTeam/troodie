import { supabase } from '@/lib/supabase';
import { isPowerUser } from '@/constants/powerUsersCriteria';

export interface FriendVisit {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    is_verified: boolean;
    followers_count: number;
  };
  post?: {
    id: string;
    rating: number;
    caption: string;
    photos: string[];
    created_at: string;
  };
  save?: {
    id: string;
    personal_rating: number;
    notes: string;
    photos: string[];
    created_at: string;
  };
  isFriend: boolean;
}

export interface PowerUserReview {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    is_verified: boolean;
    followers_count: number;
    is_creator?: boolean;
  };
  post: {
    id: string;
    rating: number;
    caption: string;
    photos: string[];
    created_at: string;
  };
  isPowerUser: boolean;
  isCritic: boolean;
}

export interface RecentActivity {
  id: string;
  user: {
    id: string;
    name: string;
    avatar_url: string;
  };
  action: 'checked_in' | 'saved' | 'reviewed' | 'liked';
  details?: string; // e.g., "to 'Weekend Spots'"
  created_at: string;
}

export const socialActivityService = {
  async getFriendsWhoVisited(restaurantId: string, userId: string): Promise<FriendVisit[]> {
    try {
      // First get the user's friends
      const { data: friendships, error: friendsError } = await supabase
        .from('user_relationships')
        .select('following_id')
        .eq('follower_id', userId);

      if (friendsError || !friendships || friendships.length === 0) {
        return [];
      }

      const friendIds = friendships.map(f => f.following_id);

      // Get friends who have posts about this restaurant
      const { data: friendPosts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          rating,
          caption,
          photos,
          created_at,
          user_id
        `)
        .eq('restaurant_id', restaurantId)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) {
        console.error('Error fetching friend posts:', postsError);
        return [];
      }

      // Get friends who have saved this restaurant
      const { data: friendSaves, error: savesError } = await supabase
        .from('restaurant_saves')
        .select(`
          id,
          personal_rating,
          notes,
          photos,
          created_at,
          user_id
        `)
        .eq('restaurant_id', restaurantId)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (savesError) {
        console.error('Error fetching friend saves:', savesError);
      }

      // Collect all user IDs from posts and saves
      const allUserIds = new Set<string>();
      if (friendPosts) {
        friendPosts.forEach(post => allUserIds.add(post.user_id));
      }
      if (friendSaves) {
        friendSaves.forEach(save => allUserIds.add(save.user_id));
      }

      // Fetch user data for all friends
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, is_verified, followers_count')
        .in('id', Array.from(allUserIds));

      if (usersError || !users) {
        console.error('Error fetching user data:', usersError);
        return [];
      }

      // Create a map of users for easy lookup
      const userMap = new Map(users.map(u => [u.id, u]));

      // Combine and format the results
      const visits: FriendVisit[] = [];

      // Add posts
      if (friendPosts) {
        friendPosts.forEach((post: any) => {
          const user = userMap.get(post.user_id);
          if (user) {
            visits.push({
              id: `post-${post.id}`,
              user: user,
              post: {
                id: post.id,
                rating: post.rating,
                caption: post.caption,
                photos: post.photos || [],
                created_at: post.created_at,
              },
              isFriend: true,
            });
          }
        });
      }

      // Add saves that don't have posts
      if (friendSaves) {
        friendSaves.forEach((save: any) => {
          const user = userMap.get(save.user_id);
          if (user) {
            const hasPost = visits.some(v => v.user.id === save.user_id);
            if (!hasPost) {
              visits.push({
                id: `save-${save.id}`,
                user: user,
                save: {
                  id: save.id,
                  personal_rating: save.personal_rating,
                  notes: save.notes,
                  photos: save.photos || [],
                  created_at: save.created_at,
                },
                isFriend: true,
              });
            }
          }
        });
      }

      // Sort by most recent activity
      return visits.sort((a, b) => {
        const dateA = new Date(a.post?.created_at || a.save?.created_at || 0);
        const dateB = new Date(b.post?.created_at || b.save?.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

    } catch (error) {
      console.error('Error in getFriendsWhoVisited:', error);
      return [];
    }
  },

  async getPowerUsersAndCritics(restaurantId: string): Promise<PowerUserReview[]> {
    try {
      // Get posts from users with high follower counts
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          rating,
          caption,
          photos,
          created_at,
          user_id
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching power user posts:', error);
        return [];
      }

      if (!posts || posts.length === 0) {
        return [];
      }

      // Get user IDs from posts
      const userIds = [...new Set(posts.map(p => p.user_id))];
      
      // Fetch users with high follower counts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, is_verified, is_creator, followers_count')
        .in('id', userIds)
        .gte('followers_count', 10000);

      if (usersError || !users) {
        console.error('Error fetching users:', usersError);
        return [];
      }

      // Create a map of users for easy lookup
      const userMap = new Map(users.map(u => [u.id, u]));

      // Filter and format results
      return posts
        .filter((post: any) => userMap.has(post.user_id))
        .map((post: any) => {
          const user = userMap.get(post.user_id)!;
          const qualifiesAsPowerUser = isPowerUser({
            followers_count: user.followers_count,
            reviews_count: 50, // We'd need to fetch this separately
            is_verified: user.is_verified,
          });

          return {
            id: post.id,
            user: user,
            post: {
              id: post.id,
              rating: post.rating,
              caption: post.caption,
              photos: post.photos || [],
              created_at: post.created_at,
            },
            isPowerUser: qualifiesAsPowerUser,
            isCritic: user.is_creator || false, // Using is_creator as a proxy for now
          };
        });

    } catch (error) {
      console.error('Error in getPowerUsersAndCritics:', error);
      return [];
    }
  },

  async getRecentActivity(restaurantId: string, limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent posts (reviews)
      const { data: recentPosts } = await supabase
        .from('posts')
        .select(`
          id,
          created_at,
          rating,
          user_id
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Collect all user IDs
      const userIds = new Set<string>();
      if (recentPosts) {
        recentPosts.forEach(post => userIds.add(post.user_id));
      }

      // Get recent saves
      const { data: recentSaves } = await supabase
        .from('restaurant_saves')
        .select(`
          id,
          created_at,
          user_id
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentSaves) {
        recentSaves.forEach(save => userIds.add(save.user_id));
      }

      // Get recent visits/check-ins (using restaurant_visits table if it exists)
      const { data: recentVisits } = await supabase
        .from('restaurant_visits')
        .select(`
          id,
          created_at,
          visit_type,
          user_id
        `)
        .eq('restaurant_id', restaurantId)
        .eq('visit_type', 'check_in')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentVisits) {
        recentVisits.forEach(visit => userIds.add(visit.user_id));
      }

      // Fetch all user data at once
      const { data: users } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', Array.from(userIds));

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Process posts
      if (recentPosts) {
        recentPosts.forEach((post: any) => {
          const user = userMap.get(post.user_id);
          if (user) {
            activities.push({
              id: `review-${post.id}`,
              user: user,
              action: 'reviewed',
              details: `gave a ${post.rating}-star review`,
              created_at: post.created_at,
            });
          }
        });
      }

      // Process saves
      if (recentSaves) {
        recentSaves.forEach((save: any) => {
          const user = userMap.get(save.user_id);
          if (user) {
            activities.push({
              id: `save-${save.id}`,
              user: user,
              action: 'saved',
              details: 'to their collection',
              created_at: save.created_at,
            });
          }
        });
      }

      // Process visits
      if (recentVisits) {
        recentVisits.forEach((visit: any) => {
          const user = userMap.get(visit.user_id);
          if (user) {
            activities.push({
              id: `checkin-${visit.id}`,
              user: user,
              action: 'checked_in',
              created_at: visit.created_at,
            });
          }
        });
      }

      // Sort all activities by date and return the most recent
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      return [];
    }
  },

  // Helper function to format time ago
  formatTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }
  },

  // Subscribe to real-time updates for recent activity
  subscribeToRecentActivity(
    restaurantId: string,
    onUpdate: (activity: RecentActivity) => void
  ) {
    const channel = supabase
      .channel(`restaurant-activity-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          // Fetch user details for the new post
          const { data: user } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (user) {
            onUpdate({
              id: `review-${payload.new.id}`,
              user,
              action: 'reviewed',
              details: `gave a ${payload.new.rating}-star review`,
              created_at: payload.new.created_at,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'restaurant_saves',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          // Fetch user details for the new save
          const { data: user } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (user) {
            onUpdate({
              id: `save-${payload.new.id}`,
              user,
              action: 'saved',
              details: 'to their collection',
              created_at: payload.new.created_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};