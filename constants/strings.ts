/**
 * String constants for the application
 * Centralized location for all UI text to ensure consistency
 */

export const strings = {
  recommendations: {
    title: "Your Network",
    subtitle: "What your friends are loving",
    infoTooltip: "Restaurants and dishes your network is saving, visiting, and recommending based on their recent activity",
    emptyTitle: "No Activity Yet",
    emptyDescription: "Follow friends to see what they're discovering and loving",
    settingsLabel: "Your Network Preferences",
    modalTitle: "How Your Network Works",
    modalDescription: "Your Network shows you restaurants and dishes that people you follow are saving, visiting, and recommending. The more friends you follow, the more personalized recommendations you'll see."
  },
  trending: {
    title: "What's Hot in Your City",
    subtitle: "Trending spots this week",
    infoTooltip: "Trending restaurants based on recent saves, reviews, and community activity in your area",
    emptyTitle: "No Trending Spots Yet",
    emptyDescription: "Check back soon to see what's popular in your area",
    settingsLabel: "What's Hot Preferences",
    modalTitle: "How We Find What's Hot",
    modalDescription: "We analyze recent saves, reviews, posts, and community activity to identify restaurants that are gaining popularity in your area. The algorithm considers engagement patterns, visit frequency, and social signals to surface the hottest spots."
  },
  // Keep old strings for migration compatibility
  deprecated: {
    recommendedForYou: "Recommended for You",
    recommendations: "Recommendations"
  }
};

// Helper function for string migration
export const migrateStrings = (text: string): string => {
  const migrations = {
    'Recommended for You': strings.recommendations.title,
    'Recommendations': "Your Network",
    'recommendation preferences': strings.recommendations.settingsLabel,
    'Trending in Charlotte': strings.trending.title
  };
  
  let migratedText = text;
  Object.entries(migrations).forEach(([old, newText]) => {
    migratedText = migratedText.replace(new RegExp(old, 'gi'), newText);
  });
  
  return migratedText;
};