/**
 * Campaign type definitions for Troodie-Managed Campaigns
 * Task: TMC-001
 */

export enum CampaignSource {
  RESTAURANT = 'restaurant',
  TROODIE_DIRECT = 'troodie_direct',
  TROODIE_PARTNERSHIP = 'troodie_partnership',
  COMMUNITY_CHALLENGE = 'community_challenge',
}

export enum ManagementType {
  DIRECT = 'direct',
  PARTNERSHIP = 'partnership',
  CHALLENGE = 'challenge',
}

export enum BudgetSource {
  MARKETING = 'marketing',
  GROWTH = 'growth',
  PRODUCT = 'product',
  PARTNERSHIPS = 'partnerships',
  CONTENT = 'content',
  RETENTION = 'retention',
}

export interface PlatformManagedCampaign {
  id: string;
  campaign_id: string;
  management_type: ManagementType;
  partner_restaurant_id?: string;
  partnership_agreement_signed: boolean;
  partnership_start_date?: string;
  partnership_end_date?: string;
  budget_source: BudgetSource;
  cost_center?: string;
  approved_budget_cents: number;
  actual_spend_cents: number;
  internal_notes?: string;
  campaign_manager_user_id?: string;
  target_creators?: number;
  target_content_pieces?: number;
  target_reach?: number;
  actual_creators: number;
  actual_content_pieces: number;
  actual_reach: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  requirements?: string;
  content_guidelines?: string;
  campaign_source: CampaignSource;
  is_subsidized: boolean;
  subsidy_amount_cents: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  budget_total: number;
  max_applications?: number;
  proposed_rate_cents: number;
  applications_count?: number;
  created_at: string;
  updated_at: string;
  platform_campaign?: PlatformManagedCampaign; // joined data
  restaurant?: {
    id: string;
    name: string;
    city: string;
    state: string;
    profile_image_url?: string;
    is_platform_managed?: boolean;
    managed_by?: string;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city: string;
  state: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  website?: string;
  cuisine_type?: string[];
  price_range?: string;
  profile_image_url?: string;
  is_platform_managed: boolean;
  managed_by?: string;
  created_at: string;
  updated_at: string;
}
