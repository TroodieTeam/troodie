/**
 * Deliverable Requirements Type Definitions
 *
 * Defines the structure for campaign deliverable requirements, including
 * basic details, creative guidelines, and approval settings.
 *
 * Used in campaigns.deliverable_requirements JSONB column.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type DeliverableGoal =
  | 'awareness'        // Brand awareness / reach
  | 'foot_traffic'     // Drive customers to location
  | 'new_menu'         // Promote new menu item
  | 'event'            // Event coverage
  | 'brand_content';   // Generate branded content

export type DeliverableType =
  | 'reel'            // Instagram Reel
  | 'tiktok'          // TikTok video
  | 'story'           // Instagram Story
  | 'static_post'     // Static image post
  | 'carousel';       // Multi-image carousel

export type CompensationType =
  | 'free_meal'       // Complimentary meal/experience
  | 'cash'            // Cash payment
  | 'gift_card'       // Gift card
  | 'store_credit'    // Store credit
  | 'discount'        // Discount code
  | 'other';          // Other compensation

export type VisitType =
  | 'dine_in'         // In-person dining
  | 'pickup'          // Pickup/takeout
  | 'event_coverage'  // Event attendance
  | 'other';          // Other visit type

export type PaymentTiming =
  | 'before_content'  // Pay before content is created
  | 'after_content'   // Pay after content is created
  | 'before_post'     // Pay before content is posted
  | 'after_post';     // Pay after content is posted

export type ToneOption =
  | 'fun'
  | 'classy'
  | 'cozy'
  | 'trendy'
  | 'family_friendly'
  | 'elegant'
  | 'playful';

export type ThemeOption =
  | 'food_closeups'      // Close-up shots of food
  | 'behind_scenes'      // Behind-the-scenes content
  | 'chef_highlight'     // Chef/staff highlight
  | 'atmosphere'         // Ambiance/atmosphere
  | 'customer_experience'; // Customer experience

export type PreferenceOption = 'yes' | 'no' | 'creator_choice';

export type CoverImageOption =
  | 'logo'             // Restaurant logo
  | 'creator_choice'   // Creator decides
  | 'dish_photo'       // Photo of dish
  | 'venue_exterior'   // Exterior of venue
  | 'creator_in_image'; // Creator must be in image

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Creative Guidelines (Optional)
 * Provides brand control for restaurants
 */
export interface CreativeGuidelines {
  // Tone & vibe
  tone?: ToneOption[];

  // Content themes to focus on
  themes?: ThemeOption[];

  // Music/audio preferences
  music_preferences?: string;

  // Voiceover preference
  voiceover?: PreferenceOption;

  // On-screen text preference
  onscreen_text?: PreferenceOption;

  // Cover image preference
  cover_image?: CoverImageOption;

  // Brand assets (URLs to logos, fonts, color palettes)
  brand_assets_urls?: string[];
}

/**
 * Approval & Attribution Settings (Optional)
 * Controls review process and content usage
 */
export interface ApprovalSettings {
  // Require pre-approval before posting
  pre_approval_required: boolean;

  // Social media handles to tag
  handles: string[];

  // Hashtags to include
  hashtags: string[];

  // Can restaurant repost the content?
  repost_rights: boolean;

  // Additional notes/requirements
  extra_notes?: string;
}

/**
 * Complete Deliverable Requirements
 * Stored in campaigns.deliverable_requirements as JSONB
 */
export interface DeliverableRequirements {
  // ====================================
  // BASIC DETAILS (Required)
  // ====================================

  // Opportunity title (e.g., "Fall Brunch Promo")
  title: string;

  // Campaign goal
  goal: DeliverableGoal;

  // Type of deliverable
  type: DeliverableType;

  // Due date or timeframe
  due_date: string; // ISO 8601 date string or description like "Post within 2 weeks"

  // Compensation type
  compensation_type: CompensationType;

  // Monetary value (in cents if applicable)
  compensation_value: number;

  // Visit details
  visit_type: VisitType;

  // When payment occurs
  payment_timing: PaymentTiming;

  // Number of revisions allowed
  revisions_allowed: number;

  // ====================================
  // CREATIVE GUIDELINES (Optional)
  // ====================================

  creative?: CreativeGuidelines;

  // ====================================
  // APPROVAL & ATTRIBUTION (Optional)
  // ====================================

  approval?: ApprovalSettings;
}

// ============================================================================
// DELIVERABLE SUBMISSION TYPES
// ============================================================================

export type DeliverablePlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'twitter'
  | 'other';

export type DeliverableStatus =
  | 'pending'        // Awaiting review
  | 'approved'       // Approved by restaurant
  | 'rejected'       // Rejected by restaurant
  | 'needs_revision' // Needs changes
  | 'under_review';  // Currently being reviewed

/**
 * Engagement metrics (self-reported by creator initially)
 */
export interface EngagementMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  impressions?: number;
}

/**
 * Deliverable Submission
 * Represents a creator's submission for campaign deliverable
 */
export interface DeliverableSubmission {
  // Identification
  id?: string;
  creator_campaign_id: string;
  campaign_id: string;
  creator_id: string;

  // Submission details
  deliverable_index: number;      // Which deliverable (1, 2, 3...)
  platform: DeliverablePlatform;
  post_url: string;
  screenshot_url?: string;
  caption?: string;
  notes_to_restaurant?: string;

  // Engagement
  engagement_metrics?: EngagementMetrics;

  // Review status
  status?: DeliverableStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  restaurant_feedback?: string;
  auto_approved?: boolean;
  revision_number?: number;

  // Timestamps
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Review Action
 * Actions a restaurant can take on a deliverable
 */
export interface ReviewAction {
  deliverable_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  feedback?: string;
  reviewer_id: string;
}

/**
 * Pending Deliverable Summary
 * Used in restaurant dashboard to show deliverables needing review
 */
export interface PendingDeliverableSummary extends DeliverableSubmission {
  // Time calculations
  auto_approval_deadline: string;
  time_remaining: string; // Interval as string
  hours_remaining: number;

  // Campaign details
  campaign_title: string;
  restaurant_id: string;

  // Creator details
  creator_name: string;
  creator_username: string;
  creator_avatar?: string;
  creator_email: string;
}

/**
 * Deliverable Statistics
 * Aggregated stats for analytics
 */
export interface DeliverableStatistics {
  campaign_id: string;
  campaign_title: string;
  restaurant_id: string;
  total_creators: number;
  total_deliverables: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  revision_count: number;
  auto_approved_count: number;
  avg_review_hours: number;
  last_submission_at?: string;
  last_review_at?: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that basic requirements are complete
 */
export function validateBasicRequirements(requirements: Partial<DeliverableRequirements>): boolean {
  const requiredFields: (keyof DeliverableRequirements)[] = [
    'title',
    'goal',
    'type',
    'due_date',
    'compensation_type',
    'compensation_value',
    'visit_type',
    'payment_timing',
    'revisions_allowed'
  ];

  return requiredFields.every(field => {
    const value = requirements[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Counts completed fields in deliverable requirements
 */
export function countCompletedFields(requirements: Partial<DeliverableRequirements>): {
  required: number;
  total: number;
  optional: number;
} {
  const requiredFields = 9;
  const optionalFields = 13; // Creative (7) + Approval (6)

  let completedRequired = 0;
  let completedOptional = 0;

  // Check required fields
  if (requirements.title) completedRequired++;
  if (requirements.goal) completedRequired++;
  if (requirements.type) completedRequired++;
  if (requirements.due_date) completedRequired++;
  if (requirements.compensation_type) completedRequired++;
  if (requirements.compensation_value !== undefined) completedRequired++;
  if (requirements.visit_type) completedRequired++;
  if (requirements.payment_timing) completedRequired++;
  if (requirements.revisions_allowed !== undefined) completedRequired++;

  // Check optional creative fields
  if (requirements.creative?.tone?.length) completedOptional++;
  if (requirements.creative?.themes?.length) completedOptional++;
  if (requirements.creative?.music_preferences) completedOptional++;
  if (requirements.creative?.voiceover) completedOptional++;
  if (requirements.creative?.onscreen_text) completedOptional++;
  if (requirements.creative?.cover_image) completedOptional++;
  if (requirements.creative?.brand_assets_urls?.length) completedOptional++;

  // Check optional approval fields
  if (requirements.approval?.pre_approval_required !== undefined) completedOptional++;
  if (requirements.approval?.handles?.length) completedOptional++;
  if (requirements.approval?.hashtags?.length) completedOptional++;
  if (requirements.approval?.repost_rights !== undefined) completedOptional++;
  if (requirements.approval?.extra_notes) completedOptional++;

  return {
    required: completedRequired,
    total: requiredFields,
    optional: completedOptional
  };
}

/**
 * Gets user-friendly label for deliverable goal
 */
export function getGoalLabel(goal: DeliverableGoal): string {
  const labels: Record<DeliverableGoal, string> = {
    awareness: 'Brand Awareness',
    foot_traffic: 'Drive Foot Traffic',
    new_menu: 'New Menu Item',
    event: 'Event Coverage',
    brand_content: 'Generate Brand Content'
  };
  return labels[goal];
}

/**
 * Gets user-friendly label for deliverable type
 */
export function getTypeLabel(type: DeliverableType): string {
  const labels: Record<DeliverableType, string> = {
    reel: 'Instagram Reel',
    tiktok: 'TikTok Video',
    story: 'Instagram Story',
    static_post: 'Static Image Post',
    carousel: 'Carousel Post'
  };
  return labels[type];
}

/**
 * Gets user-friendly label for compensation type
 */
export function getCompensationLabel(type: CompensationType): string {
  const labels: Record<CompensationType, string> = {
    free_meal: 'Free Meal/Experience',
    cash: 'Cash Payment',
    gift_card: 'Gift Card',
    store_credit: 'Store Credit',
    discount: 'Discount Code',
    other: 'Other'
  };
  return labels[type];
}

/**
 * Formats compensation value for display
 */
export function formatCompensationValue(value: number, type: CompensationType): string {
  if (type === 'free_meal') {
    return `Up to $${(value / 100).toFixed(2)}`;
  } else if (type === 'cash' || type === 'gift_card' || type === 'store_credit') {
    return `$${(value / 100).toFixed(2)}`;
  } else if (type === 'discount') {
    return `${value}% off`;
  }
  return String(value);
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default deliverable requirements (for form initialization)
 */
export const DEFAULT_DELIVERABLE_REQUIREMENTS: Partial<DeliverableRequirements> = {
  goal: 'awareness',
  type: 'reel',
  compensation_type: 'free_meal',
  visit_type: 'dine_in',
  payment_timing: 'after_post',
  revisions_allowed: 2,
  approval: {
    pre_approval_required: false,
    handles: [],
    hashtags: [],
    repost_rights: true
  }
};
