import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, MapPin, Hash } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { FeaturedCommunity, TrendingCommunity, RecommendedCommunity } from '@/lib/supabase';

type CommunityCardProps = {
  community: FeaturedCommunity | TrendingCommunity | RecommendedCommunity;
  onPress: () => void;
  variant?: 'compact' | 'featured' | 'recommended';
  recommendationReason?: string;
};

export function CommunityCard({ 
  community, 
  onPress, 
  variant = 'compact',
  recommendationReason
}: CommunityCardProps) {
  const isRecommended = 'recommendation_reason' in community;
  const isFeatured = 'is_featured' in community && community.is_featured;

  const renderCompact = () => (
    <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
      <Image 
        source={{ 
          uri: community.cover_image_url || 'https://images.unsplash.com/photo-1606924735276-fbb5b325e933?w=400' 
        }} 
        style={styles.compactImage} 
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.compactGradient}
      />
      <View style={styles.compactContent}>
        <Text style={styles.compactName} numberOfLines={1}>{community.name}</Text>
        <View style={styles.compactStats}>
          <Users size={12} color="white" />
          <Text style={styles.compactStatText}>{community.member_count}</Text>
        </View>
      </View>
      {isFeatured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFeatured = () => (
    <TouchableOpacity style={styles.featuredContainer} onPress={onPress} activeOpacity={0.7}>
      <Image 
        source={{ 
          uri: community.cover_image_url || 'https://images.unsplash.com/photo-1606924735276-fbb5b325e933?w=800' 
        }} 
        style={styles.featuredImage} 
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.featuredGradient}
      />
      <View style={styles.featuredContent}>
        {community.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{community.category}</Text>
          </View>
        )}
        <Text style={styles.featuredName}>{community.name}</Text>
        {community.description && (
          <Text style={styles.featuredDescription} numberOfLines={2}>
            {community.description}
          </Text>
        )}
        <View style={styles.featuredStats}>
          <View style={styles.statItem}>
            <Users size={14} color="white" />
            <Text style={styles.statText}>{community.member_count} members</Text>
          </View>
          {community.location && (
            <View style={styles.statItem}>
              <MapPin size={14} color="white" />
              <Text style={styles.statText}>{community.location}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRecommended = () => (
    <TouchableOpacity style={styles.recommendedContainer} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.recommendedImageContainer}>
        <Image 
          source={{ 
            uri: community.cover_image_url || 'https://images.unsplash.com/photo-1606924735276-fbb5b325e933?w=400' 
          }} 
          style={styles.recommendedImage} 
        />
        <View style={styles.recommendedOverlay}>
          <View style={styles.memberCountBadge}>
            <Users size={12} color="white" />
            <Text style={styles.memberCountText}>{community.member_count}</Text>
          </View>
        </View>
      </View>
      <View style={styles.recommendedContent}>
        <Text style={styles.recommendedName} numberOfLines={1}>{community.name}</Text>
        {(isRecommended ? recommendationReason || community.recommendation_reason : community.location) && (
          <Text style={styles.recommendedReason} numberOfLines={1}>
            {isRecommended ? recommendationReason || community.recommendation_reason : community.location}
          </Text>
        )}
        {community.tags && community.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {community.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Hash size={10} color={designTokens.colors.textMedium} />
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  switch (variant) {
    case 'featured':
      return renderFeatured();
    case 'recommended':
      return renderRecommended();
    default:
      return renderCompact();
  }
}

const styles = StyleSheet.create({
  // Compact variant styles
  compactContainer: {
    width: 120,
    height: 120,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: designTokens.colors.backgroundGray,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  compactContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  compactName: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
    marginBottom: 2,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatText: {
    ...designTokens.typography.captionText,
    color: 'white',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.sm,
  },
  featuredBadgeText: {
    ...designTokens.typography.captionText,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },

  // Featured variant styles
  featuredContainer: {
    width: '100%',
    height: 200,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: designTokens.colors.backgroundGray,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.sm,
    marginBottom: 8,
  },
  categoryText: {
    ...designTokens.typography.captionText,
    color: 'white',
  },
  featuredName: {
    ...designTokens.typography.sectionTitle,
    color: 'white',
    marginBottom: 4,
  },
  featuredDescription: {
    ...designTokens.typography.detailText,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...designTokens.typography.smallText,
    color: 'white',
  },

  // Recommended variant styles
  recommendedContainer: {
    backgroundColor: 'white',
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedImageContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 8,
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.sm,
  },
  memberCountText: {
    ...designTokens.typography.captionText,
    color: 'white',
  },
  recommendedContent: {
    padding: 12,
  },
  recommendedName: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  recommendedReason: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.primaryOrange,
    marginBottom: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: designTokens.borderRadius.sm,
  },
  tagText: {
    ...designTokens.typography.captionText,
    color: designTokens.colors.textMedium,
  },
});