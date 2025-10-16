/**
 * Campaign Presets
 *
 * Predefined campaign templates for quick creation of common campaign types.
 * Includes Troodie-sponsored campaigns and common restaurant campaign patterns.
 */

import type { DeliverableRequirements } from '@/types/deliverableRequirements';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignPreset {
  id: string;
  name: string;
  description: string;
  type: 'troodie_direct' | 'troodie_partnership' | 'community_challenge';

  // Campaign details
  title: string;
  campaign_description: string;
  requirements: string[];

  // Budget/compensation
  compensation_per_creator_cents: number;
  max_creators: number;
  budget_source?: string;

  // Deliverable requirements
  deliverable_requirements: DeliverableRequirements;

  // Flags
  is_subsidized: boolean;
  is_template: boolean;

  // Tags for filtering
  tags: string[];
}

// ============================================================================
// TROODIE ORIGINALS PRESET
// ============================================================================

export const TROODIE_ORIGINALS_PRESET: CampaignPreset = {
  id: 'troodie-originals-local-gems',
  name: 'Troodie Originals: Local Gems',
  description: 'Authentic content showcasing local spots with clear CTAs promoting Troodie Creator Marketplace',
  type: 'troodie_direct',

  // Campaign details
  title: 'Troodie Creators: Local Gems',
  campaign_description: `Create authentic, fun content featuring your favorite local spot! This is an opportunity to showcase a restaurant you genuinely love while helping promote the Troodie Creator Marketplace.

**What We're Looking For:**
- Authentic reviews of local restaurants (coffee shops, brunch spots, dessert bars, etc.)
- Short, engaging vertical video content (15-45 seconds)
- Clear call-to-action mentioning Troodie Creator Marketplace
- High-quality food and atmosphere shots

**Perfect For:**
- Food creators building their portfolio
- Local influencers wanting to support neighborhood spots
- Content creators looking for platform opportunities`,

  requirements: [
    '1 vertical video (15-45 seconds) for Instagram Reels or TikTok',
    'Must feature a local restaurant of your choice',
    'Show what makes the restaurant special (food, atmosphere, experience)',
    'Collaborate/tag @TroodieApp in your post',
    'Save the restaurant to Troodie and leave a review or post',
    'Use hashtag #TroodieCreatorMarketplace',
    'Include CTA at end: "I found this opportunity through the Troodie Creator Marketplace — if you\'re a creator looking to collaborate with restaurants, download Troodie!"',
    'Post must be public on Instagram Reels or TikTok',
    'Submit post link once published'
  ],

  // Budget/compensation
  compensation_per_creator_cents: 5000, // $50 per creator
  max_creators: 5,
  budget_source: 'marketing',

  // Deliverable requirements
  deliverable_requirements: {
    // Basic details (required)
    title: 'Authentic Local Spot Review',
    goal: 'brand_content',
    type: 'reel',
    due_date: 'Post within 2 weeks of acceptance',
    compensation_type: 'cash',
    compensation_value: 5000, // $50
    visit_type: 'other',
    payment_timing: 'after_post',
    revisions_allowed: 1,

    // Creative guidelines (optional)
    creative: {
      tone: ['fun', 'playful', 'trendy'],
      themes: ['food_closeups', 'atmosphere', 'customer_experience'],
      voiceover: 'creator_choice',
      onscreen_text: 'creator_choice',
      cover_image: 'creator_choice'
    },

    // Approval settings (optional)
    approval: {
      pre_approval_required: false,
      handles: ['@TroodieApp'],
      hashtags: ['#TroodieCreatorMarketplace'],
      repost_rights: true,
      extra_notes: 'Be authentic! Choose a restaurant you genuinely love and want to share with your audience.'
    }
  },

  // Flags
  is_subsidized: true,
  is_template: true,

  // Tags
  tags: ['troodie-sponsored', 'local', 'ugc', 'brand-awareness', 'creator-marketplace']
};

// ============================================================================
// ADDITIONAL PRESET TEMPLATES
// ============================================================================

/**
 * Community Challenge Preset
 * For restaurant challenges/competitions
 */
export const COMMUNITY_CHALLENGE_PRESET: CampaignPreset = {
  id: 'community-challenge-template',
  name: 'Community Challenge',
  description: 'Engage local creators with a fun restaurant challenge',
  type: 'community_challenge',

  title: 'Best [Food Item] in [City]',
  campaign_description: 'Create content showcasing our signature dish and compete for the best post!',
  requirements: [
    'Create a vertical video (15-60 seconds)',
    'Feature our signature dish prominently',
    'Visit our location and dine in',
    'Tag our restaurant',
    'Use campaign hashtag'
  ],

  compensation_per_creator_cents: 0, // Free meal
  max_creators: 20,

  deliverable_requirements: {
    title: 'Signature Dish Showcase',
    goal: 'awareness',
    type: 'reel',
    due_date: 'Post within 1 week of visit',
    compensation_type: 'free_meal',
    compensation_value: 3000, // Up to $30 meal value
    visit_type: 'dine_in',
    payment_timing: 'before_content',
    revisions_allowed: 0,

    creative: {
      tone: ['fun', 'trendy'],
      themes: ['food_closeups']
    },

    approval: {
      pre_approval_required: false,
      handles: [],
      hashtags: [],
      repost_rights: true
    }
  },

  is_subsidized: false,
  is_template: true,
  tags: ['challenge', 'community', 'free-meal', 'contest']
};

/**
 * New Menu Launch Preset
 * For promoting new menu items
 */
export const NEW_MENU_LAUNCH_PRESET: CampaignPreset = {
  id: 'new-menu-launch-template',
  name: 'New Menu Launch',
  description: 'Promote a new menu item with creator content',
  type: 'troodie_partnership',

  title: 'New [Menu Item] Launch',
  campaign_description: 'Help us launch our exciting new menu item with authentic content!',
  requirements: [
    'Create content featuring the new menu item',
    'Visit during launch week',
    'Share your honest review',
    'Tag restaurant and use branded hashtag'
  ],

  compensation_per_creator_cents: 2500, // $25 cash + free item
  max_creators: 10,

  deliverable_requirements: {
    title: 'New Menu Item Review',
    goal: 'new_menu',
    type: 'reel',
    due_date: 'Post within 3 days of visit',
    compensation_type: 'cash',
    compensation_value: 2500,
    visit_type: 'dine_in',
    payment_timing: 'after_post',
    revisions_allowed: 1,

    creative: {
      tone: ['fun', 'trendy'],
      themes: ['food_closeups', 'atmosphere'],
      voiceover: 'yes',
      onscreen_text: 'creator_choice',
      cover_image: 'dish_photo'
    },

    approval: {
      pre_approval_required: true,
      handles: [],
      hashtags: [],
      repost_rights: true
    }
  },

  is_subsidized: false,
  is_template: true,
  tags: ['new-menu', 'launch', 'product-promo']
};

/**
 * Event Coverage Preset
 * For special events and promotions
 */
export const EVENT_COVERAGE_PRESET: CampaignPreset = {
  id: 'event-coverage-template',
  name: 'Event Coverage',
  description: 'Cover a special event or promotion at the restaurant',
  type: 'troodie_partnership',

  title: '[Event Name] Coverage',
  campaign_description: 'Join us for [event] and create engaging content capturing the experience!',
  requirements: [
    'Attend the event on specified date',
    'Create multiple pieces of content (stories + post)',
    'Capture atmosphere and highlights',
    'Tag restaurant and event hashtag',
    'Post during or immediately after event'
  ],

  compensation_per_creator_cents: 10000, // $100 for event coverage
  max_creators: 3,

  deliverable_requirements: {
    title: 'Event Highlight Reel',
    goal: 'event',
    type: 'reel',
    due_date: 'Post within 24 hours of event',
    compensation_type: 'cash',
    compensation_value: 10000,
    visit_type: 'event_coverage',
    payment_timing: 'after_post',
    revisions_allowed: 1,

    creative: {
      tone: ['fun', 'elegant'],
      themes: ['atmosphere', 'customer_experience', 'behind_scenes'],
      voiceover: 'creator_choice',
      onscreen_text: 'yes',
      cover_image: 'creator_choice'
    },

    approval: {
      pre_approval_required: true,
      handles: [],
      hashtags: [],
      repost_rights: true,
      extra_notes: 'Must arrive at event start time. Bring filming equipment.'
    }
  },

  is_subsidized: false,
  is_template: true,
  tags: ['event', 'coverage', 'premium', 'time-sensitive']
};

/**
 * Brunch/Breakfast Promo Preset
 */
export const BRUNCH_PROMO_PRESET: CampaignPreset = {
  id: 'brunch-promo-template',
  name: 'Brunch Promotion',
  description: 'Promote brunch menu and weekend traffic',
  type: 'troodie_partnership',

  title: 'Weekend Brunch Spotlight',
  campaign_description: 'Showcase our weekend brunch experience with beautiful content!',
  requirements: [
    'Visit for weekend brunch (Saturday or Sunday)',
    'Feature at least 2 brunch items',
    'Capture ambiance and plating',
    'Create vertical video or carousel',
    'Tag restaurant in post'
  ],

  compensation_per_creator_cents: 0, // Free brunch
  max_creators: 15,

  deliverable_requirements: {
    title: 'Brunch Experience',
    goal: 'foot_traffic',
    type: 'carousel',
    due_date: 'Post same day as visit',
    compensation_type: 'free_meal',
    compensation_value: 4000, // Up to $40 brunch value
    visit_type: 'dine_in',
    payment_timing: 'before_content',
    revisions_allowed: 1,

    creative: {
      tone: ['cozy', 'classy', 'elegant'],
      themes: ['food_closeups', 'atmosphere'],
      onscreen_text: 'creator_choice',
      cover_image: 'dish_photo'
    },

    approval: {
      pre_approval_required: false,
      handles: [],
      hashtags: [],
      repost_rights: true
    }
  },

  is_subsidized: false,
  is_template: true,
  tags: ['brunch', 'weekend', 'free-meal', 'food-photography']
};

// ============================================================================
// PRESET CATALOG
// ============================================================================

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  TROODIE_ORIGINALS_PRESET,
  COMMUNITY_CHALLENGE_PRESET,
  NEW_MENU_LAUNCH_PRESET,
  EVENT_COVERAGE_PRESET,
  BRUNCH_PROMO_PRESET
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): CampaignPreset | undefined {
  return CAMPAIGN_PRESETS.find(preset => preset.id === id);
}

/**
 * Get presets by type
 */
export function getPresetsByType(type: CampaignPreset['type']): CampaignPreset[] {
  return CAMPAIGN_PRESETS.filter(preset => preset.type === type);
}

/**
 * Get presets by tag
 */
export function getPresetsByTag(tag: string): CampaignPreset[] {
  return CAMPAIGN_PRESETS.filter(preset => preset.tags.includes(tag));
}

/**
 * Get Troodie-sponsored presets only
 */
export function getTroodiePresets(): CampaignPreset[] {
  return CAMPAIGN_PRESETS.filter(preset => preset.tags.includes('troodie-sponsored'));
}

/**
 * Get template presets (excludes active campaigns)
 */
export function getTemplatePresets(): CampaignPreset[] {
  return CAMPAIGN_PRESETS.filter(preset => preset.is_template);
}

/**
 * Format compensation for display
 */
export function formatPresetCompensation(preset: CampaignPreset): string {
  const { compensation_type, compensation_value } = preset.deliverable_requirements;

  if (compensation_type === 'free_meal') {
    return `Free meal (up to $${(compensation_value / 100).toFixed(0)})`;
  }

  if (compensation_type === 'cash') {
    return `$${(preset.compensation_per_creator_cents / 100).toFixed(0)} cash`;
  }

  if (compensation_type === 'gift_card') {
    return `$${(compensation_value / 100).toFixed(0)} gift card`;
  }

  return compensation_type.replace('_', ' ');
}

/**
 * Calculate total campaign budget from preset
 */
export function calculatePresetBudget(preset: CampaignPreset): number {
  return preset.compensation_per_creator_cents * preset.max_creators;
}

/**
 * Format total budget for display
 */
export function formatPresetBudget(preset: CampaignPreset): string {
  const total = calculatePresetBudget(preset);
  return `$${(total / 100).toFixed(2)}`;
}
