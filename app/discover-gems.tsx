import { designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { LocalGem, LocalGemsService } from '@/services/localGemsService';
import { useRouter } from 'expo-router';
import { Award, ChevronRight, Star } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function DiscoverGemsScreen() {
  const router = useRouter();
  const [gems, setGems] = useState<LocalGem[]>([]);
  const [unreviewedGems, setUnreviewedGems] = useState<LocalGem[]>([]);
  const [loading, setLoading] = useState(true);

  const navigateToRestaurant = (id: string) => {
    router.push({
      pathname: '/restaurant/[id]',
      params: { id }
    });
  };

  useEffect(() => {
    loadGems();
  }, []);

  const loadGems = async () => {
    const gemsService = new LocalGemsService();
    const [localGems, noReviewGems] = await Promise.all([
      gemsService.getLocalGems(),
      gemsService.getUnreviewedGems()
    ]);
    setGems(localGems);
    setUnreviewedGems(noReviewGems);
    setLoading(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Local Gems</Text>
        <Text style={styles.subtitle}>
          Discover Charlotte's hidden treasures and be among the first to review them
        </Text>
      </View>
    </View>
  );

  const renderUnreviewedSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Award size={20} color={designTokens.colors.primaryOrange} />
        <Text style={styles.sectionTitle}>Be the First to Review</Text>
      </View>
      <Text style={styles.sectionDescription}>
        Earn Early Reviewer badges by being the first to share your experience
      </Text>
      <FlatList
        data={unreviewedGems}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.unreviewedList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.unreviewedCard}
            onPress={() => navigateToRestaurant(item.id)}
          >
            <Image source={{ uri: item.image }} style={styles.unreviewedImage} />
            <View style={styles.unreviewedContent}>
              <Text style={styles.unreviewedName}>{item.name}</Text>
              <Text style={styles.unreviewedCuisine}>{item.cuisine}</Text>
              <View style={styles.unreviewedBadge}>
                <Text style={styles.unreviewedBadgeText}>Be First to Review</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderGem = ({ item }: { item: LocalGem }) => (
    <TouchableOpacity 
      style={styles.gemCard}
      onPress={() => navigateToRestaurant(item.id)}
    >
      <Image source={{ uri: item.image }} style={styles.gemImage} />
      <View style={styles.gemContent}>
        <View style={styles.gemHeader}>
          <Text style={styles.gemName}>{item.name}</Text>
          {item.isNewlyAdded && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>
        <Text style={styles.gemCuisine}>{item.cuisine}</Text>
        <View style={styles.gemStats}>
          <View style={styles.rating}>
            <Star size={16} color={designTokens.colors.primaryOrange} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.reviewCount}>{item.reviewCount} reviews</Text>
        </View>
        {item.popularDishes && item.popularDishes.length > 0 && (
          <Text style={styles.popularDishes}>
            Popular: {item.popularDishes.join(', ')}
          </Text>
        )}
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => navigateToRestaurant(item.id)}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
          <ChevronRight size={16} color={designTokens.colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={gems}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {unreviewedGems.length > 0 && renderUnreviewedSection()}
          </>
        }
        renderItem={renderGem}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    padding: designTokens.spacing.xl,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerContent: {
    gap: designTokens.spacing.sm,
  },
  title: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
  },
  subtitle: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  section: {
    padding: designTokens.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },
  sectionTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  sectionDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
  },
  unreviewedList: {
    paddingVertical: designTokens.spacing.md,
  },
  unreviewedCard: {
    width: 280,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    marginRight: designTokens.spacing.lg,
    overflow: 'hidden',
  },
  unreviewedImage: {
    width: '100%',
    height: 160,
  },
  unreviewedContent: {
    padding: designTokens.spacing.lg,
  },
  unreviewedName: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  unreviewedCuisine: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
  unreviewedBadge: {
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    alignSelf: 'flex-start',
  },
  unreviewedBadgeText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  gemCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    marginHorizontal: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.lg,
    overflow: 'hidden',
  },
  gemImage: {
    width: '100%',
    height: 200,
  },
  gemContent: {
    padding: designTokens.spacing.xl,
  },
  gemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  gemName: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
  },
  newBadge: {
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  newBadgeText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  gemCuisine: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.md,
  },
  gemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  ratingText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  reviewCount: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  popularDishes: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
  },
  viewButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
  },
  viewButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
}); 