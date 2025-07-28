/**
 * Power Users & Critics Criteria Definition
 * This file defines the criteria for identifying power users and food critics
 * in the Troodie platform for social features.
 */

export const POWER_USER_CRITERIA = {
  minFollowers: 10000,
  minReviews: 50,
  minWeeklyActivity: 3, // posts per week
  minMonthsActive: 3,
  requiresVerification: true,
  
  // Engagement thresholds
  minAveragePostLikes: 100,
  minAveragePostSaves: 25,
  
  // Quality metrics
  minRatingAccuracy: 0.8, // 80% alignment with community consensus
  minPhotoQualityScore: 0.75, // Based on photo engagement
};

export const FOOD_CRITIC_CRITERIA = {
  // Professional critics
  professionalAffiliations: [
    'Food & Wine Magazine',
    'Eater',
    'The Infatuation',
    'Michelin Guide',
    'James Beard Foundation',
    'Local newspaper food sections',
    'Recognized food publications',
  ],
  
  // Influencer thresholds
  minFollowersForBlogger: 25000,
  
  // Industry professionals
  acceptedProfessions: [
    'Executive Chef',
    'Head Chef',
    'Sommelier',
    'Restaurant Critic',
    'Food Writer',
    'Culinary Instructor',
  ],
  
  // Verification requirements
  requiresManualVerification: true,
  requiresCredentials: true,
};

/**
 * Function to check if a user qualifies as a power user
 */
export function isPowerUser(user: {
  followers_count: number;
  reviews_count: number;
  is_verified: boolean;
  account_age_months?: number;
  average_post_likes?: number;
  average_post_saves?: number;
}): boolean {
  return (
    user.followers_count >= POWER_USER_CRITERIA.minFollowers &&
    user.reviews_count >= POWER_USER_CRITERIA.minReviews &&
    user.is_verified === POWER_USER_CRITERIA.requiresVerification &&
    (user.account_age_months || 0) >= POWER_USER_CRITERIA.minMonthsActive &&
    (user.average_post_likes || 0) >= POWER_USER_CRITERIA.minAveragePostLikes &&
    (user.average_post_saves || 0) >= POWER_USER_CRITERIA.minAveragePostSaves
  );
}

/**
 * Badge configurations for different user types
 */
export const USER_BADGES = {
  verified: {
    icon: 'check-circle',
    color: '#FFAD27', // Troodie orange
    description: 'Verified user',
  },
  powerUser: {
    icon: 'star',
    color: '#8B5CF6', // Purple
    description: 'Power user with high engagement',
  },
  critic: {
    icon: 'award',
    color: '#EC4899', // Pink
    description: 'Professional food critic',
  },
  chef: {
    icon: 'chef-hat',
    color: '#10B981', // Green
    description: 'Industry professional',
  },
};