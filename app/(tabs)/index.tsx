import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { theme } from '@/constants/theme';
import { designTokens, applyShadow } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { NetworkSuggestion, TrendingContent } from '@/types/core';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Bookmark,
  Coffee,
  MapPin,
  Plus,
  Search,
  Share2,
  Users,
  Utensils
} from 'lucide-react-native';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { state: onboardingState } = useOnboarding();
  
  const persona = onboardingState.persona && personas[onboardingState.persona];

  // Mock data for trending restaurants
  const trendingRestaurants: TrendingContent[] = [
    {
      restaurant: {
        id: 1,
        name: 'Mediterranean Bliss',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        cuisine: 'Mediterranean',
        rating: 4.8,
        location: 'SoHo',
        priceRange: '$$',
      },
      stats: {
        saves: 247,
        visits: 892,
        photos: 156
      },
      highlights: ['Great for dates', 'Amazing views'],
      type: 'trending_spot'
    },
    {
      restaurant: {
        id: 2,
        name: 'Corner Coffee Co',
        image: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
        cuisine: 'Coffee & Brunch',
        rating: 4.6,
        location: 'East Village',
        priceRange: '$',
      },
      stats: {
        saves: 189,
        visits: 567,
        photos: 89
      },
      highlights: ['Perfect for work', 'Great wifi'],
      type: 'local_favorite'
    },
  ];

  const networkSuggestions: NetworkSuggestion[] = [
    {
      action: 'Invite Friends',
      description: 'Connect with friends to see their favorite spots',
      icon: Users,
      cta: 'Send Invites',
      benefit: 'Get personalized recommendations',
      onClick: () => {}
    },
    {
      action: 'Follow Local Troodies',
      description: 'Discover through local food enthusiasts',
      icon: MapPin,
      cta: 'Find Troodies',
      benefit: 'Get insider tips',
      onClick: () => router.push('/explore')
    },
    {
      action: 'Share Your First Save',
      description: 'Save a restaurant and share your experience',
      icon: Share2,
      cta: 'Add Restaurant',
      benefit: 'Build your food map',
      onClick: () => {}
    },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.brandName}>troodie</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/explore')}>
            <Search size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Bell size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.tagline}>Social Commerce Platform</Text>
    </View>
  );

  const renderWelcomeBanner = () => (
    <LinearGradient
      colors={designTokens.gradients.welcomeBanner}
      style={styles.welcomeBanner}
    >
      <Text style={styles.welcomeTitle}>Welcome to troodie!</Text>
      <Text style={styles.welcomeDescription}>
        Discover amazing restaurants and build your food network
      </Text>
      <TouchableOpacity 
        style={styles.welcomeCTA} 
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.welcomeCTAText}>Get Started</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderNetworkBuilding = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Build Your Network</Text>
      <View style={styles.networkCards}>
        {networkSuggestions.map((suggestion, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.networkCard}
            onPress={suggestion.onClick}
          >
            <View style={styles.networkCardIcon}>
              <suggestion.icon size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.networkCardContent}>
              <Text style={styles.networkCardTitle}>{suggestion.action}</Text>
              <Text style={styles.networkCardDescription}>{suggestion.description}</Text>
              <Text style={styles.networkCardBenefit}>{suggestion.benefit}</Text>
            </View>
            <TouchableOpacity style={styles.networkCardCTA} onPress={suggestion.onClick}>
              <Text style={styles.networkCardCTAText}>{suggestion.cta}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPersonalizedSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Perfect For You</Text>
        {persona && (
          <View style={styles.personaBadge}>
            <Text style={styles.personaEmoji}>{persona.emoji}</Text>
            <Text style={styles.personaName}>{persona.name}</Text>
          </View>
        )}
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <TouchableOpacity style={styles.categoryCard}>
          <View style={[styles.categoryIcon, { backgroundColor: '#FFE5B4' }]}>
            <Coffee size={24} color="#8B4513" />
          </View>
          <Text style={styles.categoryName}>Quick Lunch Spots</Text>
          <Text style={styles.categoryDescription}>Perfect for your busy schedule</Text>
          <Text style={styles.categoryCount}>12 restaurants</Text>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Explore</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity style={styles.categoryCard}>
          <View style={[styles.categoryIcon, { backgroundColor: '#E5D4FF' }]}>
            <Utensils size={24} color="#6B46C1" />
          </View>
          <Text style={styles.categoryName}>Date Night Ready</Text>
          <Text style={styles.categoryDescription}>Romantic spots for special occasions</Text>
          <Text style={styles.categoryCount}>8 restaurants</Text>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Explore</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderYourSaves = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Saves</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      
      {userState.isNewUser ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Bookmark size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyStateTitle}>Start Building Your Collection</Text>
          <Text style={styles.emptyStateDescription}>
            Save restaurants you love or want to try
          </Text>
          <TouchableOpacity style={styles.emptyStateCTA} onPress={() => router.push('/explore')}>
            <Text style={styles.emptyStateCTAText}>Discover Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.placeholderText}>Saved restaurants will appear here</Text>
      )}
    </View>
  );

  const renderTrending = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>What&apos;s Hot Right Now</Text>
        <TouchableOpacity style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </TouchableOpacity>
      </View>
      
      {trendingRestaurants.map((item, index) => (
        <View key={index} style={styles.trendingCard}>
          <RestaurantCard 
            restaurant={item.restaurant}
            stats={item.stats}
            onPress={() => {}}
          />
          <View style={styles.trendingHighlights}>
            {item.highlights.map((highlight, idx) => (
              <View key={idx} style={styles.highlightBadge}>
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickActionButton}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.quickActionText}>Add Place</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        
        {userState.isNewUser && renderWelcomeBanner()}
        
        {userState.friendsCount < 5 && renderNetworkBuilding()}
        
        {renderPersonalizedSection()}
        
        {renderYourSaves()}
        
        {renderTrending()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {renderQuickActions()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    ...designTokens.typography.brandHeading,
    color: designTokens.colors.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.lg,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.xs,
  },
  welcomeBanner: {
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
    padding: designTokens.spacing.xxl,
    borderRadius: designTokens.borderRadius.lg,
    alignItems: 'center',
  },
  welcomeTitle: {
    ...designTokens.typography.welcomeTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  welcomeDescription: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  welcomeCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xxl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.xxl,
  },
  welcomeCTAText: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.white,
  },
  section: {
    marginBottom: designTokens.spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },
  sectionTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  seeAll: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  networkCards: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.md,
  },
  networkCard: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...applyShadow('card'),
  },
  networkCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designTokens.colors.primaryOrange + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.lg,
  },
  networkCardContent: {
    flex: 1,
  },
  networkCardTitle: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  networkCardDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.xs,
  },
  networkCardBenefit: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  networkCardCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.xl,
  },
  networkCardCTAText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.xl,
    gap: designTokens.spacing.sm,
  },
  personaEmoji: {
    fontSize: 16,
  },
  personaName: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  horizontalScroll: {
    paddingLeft: designTokens.spacing.lg,
  },
  categoryCard: {
    width: 200,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.lg,
    marginRight: designTokens.spacing.md,
    ...applyShadow('card'),
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: designTokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  categoryName: {
    ...designTokens.typography.bodyMedium,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  categoryDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
  categoryCount: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
    marginBottom: designTokens.spacing.md,
  },
  categoryButton: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    alignItems: 'center',
  },
  categoryButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
    paddingHorizontal: designTokens.spacing.xxl,
    marginHorizontal: designTokens.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.lg,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyStateTitle: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  emptyStateDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyStateCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xxl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.xxl,
  },
  emptyStateCTAText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  placeholderText: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textLight,
    textAlign: 'center',
    paddingVertical: designTokens.spacing.xxxl,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  liveText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#FF4444',
  },
  trendingCard: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },
  trendingHighlights: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  highlightBadge: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
  },
  highlightText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  quickActions: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.xxl,
    gap: designTokens.spacing.sm,
    ...applyShadow('button'),
  },
  quickActionText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  bottomPadding: {
    height: 100,
  },
});
