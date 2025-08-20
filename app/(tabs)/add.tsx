import { AddRestaurantModal } from '@/components/AddRestaurantModal';
import { designTokens } from '@/constants/designTokens';
import { strings } from '@/constants/strings';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGate } from '@/components/AuthGate';
import { AddOption, ProgressCard } from '@/types/add-flow';
import { useRouter } from 'expo-router';
import {
    Camera,
    FolderPlus,
    MapPin,
    UserPlus,
    Users2
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function AddScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);

  // Core discovery actions - shown prominently
  const discoveryActions = [
    {
      id: 'add-restaurant',
      title: strings.discoveryActions.addRestaurant.title,
      description: strings.discoveryActions.addRestaurant.description,
      icon: MapPin,
      color: designTokens.colors.primaryOrange,
      onPress: () => setShowAddRestaurantModal(true), // Show modal instead of navigation
      isPrimary: true
    },
    {
      id: 'find-friends',
      title: strings.discoveryActions.findFriends.title,
      description: strings.discoveryActions.findFriends.description,
      icon: UserPlus,
      color: '#10B981',
      onPress: () => router.push('/find-friends'),
      isPrimary: true
    }
  ];

  // Regular add options
  const addOptions: AddOption[] = [
    {
      id: 'post',
      title: strings.createContent.createPost.title,
      description: strings.createContent.createPost.description,
      icon: Camera,
      color: '#3B82F6',
      navigateTo: '/add/create-post'
    },
    {
      id: 'board',
      title: strings.createContent.createBoard.title,
      description: strings.createContent.createBoard.description,
      icon: FolderPlus,
      color: '#7C3AED',
      navigateTo: '/add/create-board'
    },
    {
      id: 'community',
      title: strings.createContent.createCommunity.title,
      description: strings.createContent.createCommunity.description,
      icon: Users2,
      color: '#EC4899',
      navigateTo: '/add/create-community' // Changed from /add/communities
    }
  ];

  const progressCard: ProgressCard = {
    title: 'Keep creating!',
    description: 'You\'ve created 1 board this week. Create one more to unlock achievements.',
    progress: {
      current: 1,
      target: 2,
      unit: 'boards'
    },
    reward: '+50 points',
    cta: 'Create Another Board'
  };

  const handleRestaurantAdded = (restaurant: any) => {
    // Could navigate to the restaurant page or show a success message
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Discover & Create</Text>
      <Text style={styles.subtitle}>Grow your food network</Text>
    </View>
  );

  const renderDiscoveryActions = () => (
    <View style={styles.discoverySection}>
      <Text style={styles.sectionTitle}>Core Actions</Text>
      <View style={styles.discoveryActions}>
        {discoveryActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.discoveryCard, { borderColor: action.color + '33' }]}
            onPress={action.onPress}
            activeOpacity={0.8}
            accessibilityLabel={action.title}
            accessibilityHint={action.description}
          >
            <View style={[styles.discoveryIcon, { backgroundColor: action.color }]}>
              <action.icon size={24} color={designTokens.colors.white} />
            </View>
            <Text style={styles.discoveryTitle}>{action.title}</Text>
            <Text style={styles.discoveryDescription}>{action.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCreateContent = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Create Content</Text>
      <View style={styles.createOptions}>
        {addOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              option.beta && styles.optionCardBeta
            ]}
            onPress={() => router.push(option.navigateTo as any)}
            activeOpacity={0.8}
            accessibilityLabel={option.title}
            accessibilityHint={option.description}
          >
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                <option.icon size={18} color={designTokens.colors.white} />
              </View>
              
              <View style={styles.optionTextContent}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.beta && (
                    <View style={styles.betaBadge}>
                      <Text style={styles.betaText}>Beta</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              
              <View style={styles.optionIndicator} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProgressGamification = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressContent}>
        <Text style={styles.progressTitle}>{progressCard.title}</Text>
        <Text style={styles.progressDescription}>{progressCard.description}</Text>
        <TouchableOpacity style={styles.progressCTA} onPress={() => router.push('/add/create-board' as any)}>
          <Text style={styles.progressCTAText}>{progressCard.cta}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show AuthGate for non-authenticated users
  if (!isAuthenticated) {
    return (
      <AuthGate 
        screenName="create & discover"
        customTitle="Start Creating & Discovering"
        customMessage="Share your food experiences, create boards to organize your favorite spots, and discover new restaurants recommended by the community."
      >
        {/* This will never render since AuthGate handles non-authenticated users */}
        <View />
      </AuthGate>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderDiscoveryActions()}
        {renderCreateContent()}
        {renderProgressGamification()}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        visible={showAddRestaurantModal}
        onClose={() => setShowAddRestaurantModal(false)}
        onRestaurantAdded={handleRestaurantAdded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  header: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    alignItems: 'center',
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  discoverySection: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
  },
  sectionTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  discoveryActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  discoveryCard: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designTokens.colors.primaryOrange + '33',
    ...designTokens.shadows.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  discoveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  discoveryTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.textDark,
    marginBottom: 4,
    fontSize: 14,
  },
  discoveryDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    fontSize: 11,
  },
  section: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
  },
  createOptions: {
    gap: designTokens.spacing.sm,
  },
  optionCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.card,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: designTokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContent: {
    flex: 1,
  },
  optionTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
    fontSize: 13,
  },
  optionDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    fontSize: 11,
  },
  optionIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.borderLight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  betaBadge: {
    marginLeft: 8,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  optionCardBeta: {
    borderColor: designTokens.colors.primaryOrange + '33',
  },
  progressCard: {
    marginHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.primaryOrange + '0D',
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    ...designTokens.shadows.card,
  },
  progressContent: {
    alignItems: 'center',
  },
  progressTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  progressDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  progressCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
  },
  progressCTAText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  bottomPadding: {
    height: 100,
  },
});