import { LucideIcon } from 'lucide-react-native';

// Add Hub Types
export interface AddOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  navigateTo: string;
  beta?: boolean;
}

export interface ProgressCard {
  title: string;
  description: string;
  progress: {
    current: number;
    target: number;
    unit: string;
  };
  reward: string;
  cta: string;
}

// Save Restaurant Types
export interface RestaurantSearchResult {
  id: string;
  name: string;
  address: string;
  cuisine: string[];
  rating?: number;
  photos: string[];
  verified: boolean;
  distance?: number;
  priceRange?: string;
}

export interface RestaurantSaveForm {
  restaurant: RestaurantSearchResult;
  userInput: {
    personalRating: number;
    visitDate: Date;
    photos: string[];
    notes: string;
    tags: string[];
    wouldRecommend: boolean;
    priceRange: '$' | '$$' | '$$$' | '$$$$';
    visitType: 'dine_in' | 'takeout' | 'delivery';
  };
  privacy: 'public' | 'friends' | 'private';
}

export interface BoardSelectionData {
  existingBoards: Board[];
  selectedBoards: string[];
  createNewBoard?: {
    name: string;
    description: string;
    privacy: 'public' | 'private';
  };
}

export interface SocialSharing {
  shareToFeed: boolean;
  caption: string;
  tagFriends: string[];
  shareToStories: boolean;
  crossPlatformShare: {
    instagram: boolean;
    twitter: boolean;
  };
}

export interface TagSuggestion {
  category: 'occasion' | 'mood' | 'food_type' | 'experience';
  suggestions: string[];
  userTags: string[];
}

// Create Board Types
export interface BoardType {
  type: 'free' | 'private' | 'paid';
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export interface BoardCreationForm {
  basicInfo: {
    title: string;
    description: string;
    coverImage?: string;
    category: string;
    location?: string;
  };
  settings: {
    allowComments: boolean;
    allowSaves: boolean;
    collaborators?: string[];
    tags: string[];
  };
  monetization?: {
    price: number;
    exclusiveContent: boolean;
    memberBenefits: string[];
  };
}

export interface Board {
  id: string;
  title: string;
  description: string;
  type: 'free' | 'private' | 'paid';
  coverImage?: string;
  category: string;
  restaurantCount: number;
  memberCount?: number;
  price?: number;
  createdAt: Date;
  isPrivate: boolean;
}

export interface RestaurantSelection {
  availableRestaurants: RestaurantSearchResult[];
  selectedRestaurants: RestaurantSearchResult[];
  searchAndAdd: boolean;
  minimumRequired: number;
  orderingEnabled: boolean;
}

export interface MonetizationSetup {
  pricing: {
    basePrice: number;
    currency: 'USD';
    discounts?: {
      earlyBird: number;
      bulk: number;
    };
  };
  content: {
    exclusivePhotos: boolean;
    insiderTips: boolean;
    personalRecommendations: boolean;
    directContact: boolean;
  };
  revenue: {
    platformFee: number;
    estimatedEarnings: number;
    payoutSchedule: 'weekly' | 'monthly';
  };
}

// Community Types
export interface Community {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  category: string;
  location: string;
  memberCount: number;
  activityLevel: number;
  type: 'public' | 'private' | 'paid';
  price?: number;
  admin: {
    name: string;
    avatar: string;
    verified: boolean;
    bio: string;
  };
  stats: {
    postsToday: number;
    activeMembers: number;
    recentPhotos: string[];
  };
  isPremium?: boolean;
  isJoined?: boolean;
}

export interface CommunityPost {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  createdAt: Date;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: number;
  coverImage: string;
  isPremium: boolean;
}

export interface JoinProcess {
  joinType: 'instant' | 'request' | 'payment';
  requirements?: {
    application: {
      questions: string[];
      responses: string[];
    };
    verification: {
      email: boolean;
      phone: boolean;
      identity: boolean;
    };
  };
  payment?: {
    amount: number;
    currency: 'USD';
    billingCycle: 'one_time' | 'monthly' | 'yearly';
    benefits: string[];
  };
}

// Flow State Management
export interface FlowState {
  currentFlow: 'save' | 'board' | 'community' | 'creator';
  currentStep: number;
  totalSteps: number;
  formData: any;
  canGoBack: boolean;
  canSkipStep: boolean;
  validationErrors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}