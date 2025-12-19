export interface CampaignFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  requirements: string[];
  deliverables: Deliverable[];
}

export interface Deliverable {
  id: string;
  type: string;
  description: string;
  quantity: number;
}

export interface StripeAccountStatus {
  checking: boolean;
  hasAccount: boolean;
  onboardingCompleted: boolean;
  onboardingLink: string | null;
  accountId?: string;
}

export interface RestaurantData {
  id: string;
  name: string;
}

export type LoadingState = 'loading' | 'loaded' | 'error' | 'no_profile' | 'no_restaurant';

// Detailed types for Campaign View
export interface CampaignDetail {
  id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  payment_status?: string;
  payment_intent_id?: string;
  budget_cents: number;
  spent_amount_cents: number;
  start_date: string;
  end_date: string;
  max_creators: number;
  selected_creators_count: number;
  total_deliverables: number;
  delivered_content_count: number;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    cover_photo_url: string;
  };
}

export interface CampaignApplication {
  id: string;
  creator_profiles: {
    id: string;
    display_name: string;
    avatar_url: string;
    followers_count: number;
    specialties: string[];
  };
  status: string;
  proposed_rate_cents: number;
  proposed_deliverables: string;
  cover_letter: string;
  applied_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

export interface PortfolioContent {
  id: string;
  creator_profiles: {
    display_name: string;
    avatar_url: string;
  };
  thumbnail_url: string;
  content_type: string;
  caption: string;
  views: number;
  likes: number;
  posted_at: string;
}

export interface CampaignDeliverable {
  id: string;
  campaign_application_id: string;
  creator_id: string;
  platform: string;
  platform_post_url: string;
  caption: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'auto_approved' | 'draft' | 'revision_requested' | 'disputed';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  restaurant_feedback?: string;
  auto_approved: boolean;
  thumbnail_url?: string;
  content_type?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  engagement_rate?: number;
  creator_profiles: {
    display_name: string;
    avatar_url: string;
  };
  campaign_applications?: {
    id: string;
    status: string;
    rating?: number;
  };
}
