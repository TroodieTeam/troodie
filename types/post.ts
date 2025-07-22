import { Database } from '@/lib/supabase';
import { RestaurantInfo, UserInfo } from './core';

export type Post = Database['public']['Tables']['posts']['Row'];
export type PostInsert = Database['public']['Tables']['posts']['Insert'];
export type PostUpdate = Database['public']['Tables']['posts']['Update'];

export type PostLike = Database['public']['Tables']['post_likes']['Row'];
export type PostLikeInsert = Database['public']['Tables']['post_likes']['Insert'];

export type PostComment = Database['public']['Tables']['post_comments']['Row'];
export type PostCommentInsert = Database['public']['Tables']['post_comments']['Insert'];
export type PostCommentUpdate = Database['public']['Tables']['post_comments']['Update'];

export type PostSave = Database['public']['Tables']['post_saves']['Row'];
export type PostSaveInsert = Database['public']['Tables']['post_saves']['Insert'];

export interface PostWithUser extends Post {
  user: UserInfo;
  restaurant: RestaurantInfo;
  is_liked_by_user?: boolean;
  is_saved_by_user?: boolean;
}

export interface PostCreationData {
  caption?: string;
  photos?: string[];
  restaurantId: string;
  rating?: number;
  visitDate?: Date;
  priceRange?: string;
  visitType?: 'dine_in' | 'takeout' | 'delivery';
  tags?: string[];
  privacy?: 'public' | 'friends' | 'private';
  locationLat?: number;
  locationLng?: number;
}

export interface ExploreFilters {
  filter?: 'All' | 'Friends' | 'Trending' | 'Nearby' | 'New' | 'Top Rated';
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  cuisine?: string[];
  priceRange?: string[];
  limit?: number;
  offset?: number;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

export interface CommentWithUser extends PostComment {
  user: UserInfo;
  replies?: CommentWithUser[];
}

export interface PostStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  averageRating: number;
}

export interface TrendingPost extends PostWithUser {
  trending_score: number;
  engagement_rate: number;
}

export interface PostAnalytics {
  views: number;
  uniqueViews: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  shares: number;
  saves: number;
  comments: number;
  likes: number;
}

export interface PostSearchFilters {
  query?: string;
  restaurantId?: string;
  userId?: string;
  rating?: number;
  visitType?: 'dine_in' | 'takeout' | 'delivery';
  priceRange?: string;
  tags?: string[];
  privacy?: 'public' | 'friends' | 'private';
  dateFrom?: Date;
  dateTo?: Date;
  trending?: boolean;
  limit?: number;
  offset?: number;
} 