export type CommunityType = 'public' | 'private';

export interface Community {
  id: string;
  name: string;
  description?: string;
  location?: string;
  type: CommunityType;
  is_event_based: boolean;
  event_name?: string;
  event_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  post_count: number;
  is_active: boolean;
  creator_username?: string;
  creator_photo?: string; // This is avatar_url from users table
  actual_member_count?: number;
  actual_post_count?: number;
}

export interface CommunityFormData {
  name: string;
  description: string;
  location: string;
  type: CommunityType;
  is_event_based: boolean;
  event_name?: string;
  event_date?: string;
}