import { LucideIcon } from 'lucide-react-native';

// User related types
export interface UserInfo {
  id: number;
  name: string;
  username: string;
  avatar: string;
  persona?: string;
  verified?: boolean;
  followers?: number;
}

export interface UserState {
  id: string;
  email: string;
  friendsCount: number;
  isNewUser: boolean;
  achievements?: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked_at?: string;
}

// Restaurant related types
export interface RestaurantInfo {
  id: number;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  location: string;
  priceRange: string;
  address?: string;
}

// Home Screen types
export interface WelcomeBanner {
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}

export interface NetworkSuggestion {
  action: string;
  description: string;
  icon: any;
  cta: string;
  benefit: string;
  onClick: () => void;
}

export interface TrendingContent {
  restaurant: RestaurantInfo;
  stats: {
    saves: number;
    visits: number;
    photos: number;
  };
  highlights: string[];
  type: 'trending_spot' | 'local_favorite' | 'featured';
}

// Explore Screen types
export interface ExplorePost {
  id: number;
  restaurant: RestaurantInfo;
  user: UserInfo & {
    persona: string;
    verified: boolean;
    followers: number;
  };
  socialProof: {
    friendsVisited: string[];
    friendsPhotos: string[];
    totalFriendVisits: number;
    mutualFriends: number;
  };
  photos: string[];
  engagement: {
    likes: number;
    saves: number;
    comments: number;
  };
  trending: boolean;
  caption: string;
  time: string;
}

export type ExploreFilter = 'All' | 'Friends' | 'Trending' | 'Nearby' | 'New' | 'Top Rated';

// Activity Screen types
export interface SuggestedActivity {
  title: string;
  description: string;
  icon: LucideIcon;
  action: string;
  benefit: string;
  color: string;
  onClick: () => void;
}

export interface TrendingActivity {
  type: 'trending_save' | 'new_opening' | 'local_favorite';
  restaurant: string;
  image: string;
  stats: string;
  description: string;
}

export interface ActivityItem {
  id: number;
  type: 'like' | 'comment' | 'save' | 'follow';
  user: UserInfo;
  action: string;
  target?: string;
  time: string;
  restaurant?: RestaurantInfo;
}

// Profile Screen types
export interface ProfileCompletion {
  percentage: number;
  suggestions: CompletionSuggestion[];
}

export interface CompletionSuggestion {
  id: number;
  action: string;
  description: string;
  icon: LucideIcon;
  completed: boolean;
  points: number;
  onClick: () => void;
}

export interface CreatorStats {
  totalEarnings: number;
  activeCampaigns: number;
  rating: number;
}

export interface EmptyStateCard {
  title: string;
  description: string;
  icon: LucideIcon;
  action: {
    text: string;
    onClick: () => void;
  };
  tip?: string;
}

export interface Board {
  id: number;
  title: string;
  count: number;
  isPrivate: boolean;
  previewImage: string;
  description?: string;
  createdAt: Date;
}

export interface Post {
  id: number;
  image: string;
  caption: string;
  restaurant: RestaurantInfo;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: Date;
}

// Navigation types
export type Screen = 'home' | 'explore' | 'add' | 'activity' | 'profile';

export interface NavItem {
  screen: Screen;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: boolean;
  special?: boolean;
}

export interface AppState {
  currentScreen: Screen;
  screenHistory: Screen[];
  screenData?: any;
  user: UserState;
}