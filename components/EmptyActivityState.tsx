import { designTokens } from '@/constants/designTokens';
import { Bell, Bookmark } from 'lucide-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ActionCard } from './ActionCard';

interface EmptyActivityStateProps {
  onExploreRestaurants: () => void;
  onConnectWithUsers?: () => void;
  onSaveRestaurant?: () => void;
  onDiscoverGems?: () => void;
  onShareExperience?: () => void;
}

export const EmptyActivityState: React.FC<EmptyActivityStateProps> = ({
  onExploreRestaurants,
  onConnectWithUsers,
  onSaveRestaurant,
  onDiscoverGems,
  onShareExperience,
}) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <Bell size={32} color={designTokens.colors.primaryOrange} />
        </View>
        <Text style={styles.title}>Your Activity Will Appear Here</Text>
        <Text style={styles.description}>
          When you start saving restaurants and connecting with other Troodies,
          you'll see likes, comments, and follows here.
        </Text>
      </View>

      {/* Action Cards */}
      <View style={styles.actionCards}>
        <ActionCard
          icon={Bookmark}
          title="Save Your First Restaurant"
          description="Start building your collection and get recommendations"
          benefit="💡 Get personalized suggestions"
          buttonText="Explore Restaurants"
          onPress={onSaveRestaurant || onExploreRestaurants}
          colorScheme="blue"
        />

        {/* {onDiscoverGems && (
          <ActionCard
            icon={Sparkles}
            title="Discover Local Gems"
            description="Be among the first to review Charlotte's hidden gems"
            benefit="💡 Earn Early Reviewer badges"
            buttonText="Find Gems"
            onPress={onDiscoverGems}
            colorScheme="green"
          />
        )}

        {onShareExperience && (
          <ActionCard
            icon={Camera}
            title="Share Your Experience"
            description="Post photos and reviews to help others discover"
            benefit="💡 Build your reputation"
            buttonText="Add Post"
            onPress={onShareExperience}
            colorScheme="purple"
          />
        )} */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
    paddingHorizontal: designTokens.spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 352,
  },
  actionCards: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xxxl,
  },
});