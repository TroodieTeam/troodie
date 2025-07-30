export type BoardType = 'free' | 'private' | 'paid';
export type BoardMemberRole = 'owner' | 'admin' | 'member';

export interface Board {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: BoardType;
  cover_image_url?: string;
  category?: string;
  location?: string;
  is_private: boolean;
  allow_comments: boolean;
  allow_saves: boolean;
  price?: number;
  restaurant_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface BoardRestaurant {
  id: string;
  board_id: string;
  restaurant_id: string;
  added_by?: string;
  added_at: string;
  notes?: string;
  rating?: number;
  visit_date?: string;
  position: number;
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardMemberRole;
  joined_at: string;
}

export interface BoardCreationForm {
  title: string;
  description?: string;
  type: BoardType;
  cover_image_url?: string;
  category?: string;
  location?: string;
  is_private: boolean;
  allow_comments: boolean;
  allow_saves: boolean;
  price?: number;
}

export interface BoardWithRestaurants extends Board {
  restaurants?: BoardRestaurant[];
}

export interface BoardWithMembers extends Board {
  members?: BoardMember[];
}