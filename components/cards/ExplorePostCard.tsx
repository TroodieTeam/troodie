import { applyShadow, designTokens } from '@/constants/designTokens';
import { ExplorePost } from '@/types/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, CheckCircle, Heart, MapPin, MessageCircle, Star, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ExplorePostCardProps {
  post: ExplorePost;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onSave?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // Full width with padding

export function ExplorePostCard({ 
  post, 
  onPress, 
  onLike, 
  onComment, 
  onSave 
}: ExplorePostCardProps) {
  const imageHeight = Math.random() > 0.5 ? 200 : 260; // Variable height for masonry effect

  return (
    <TouchableOpacity 
      style={[styles.container, { width: CARD_WIDTH }]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: post.photos[0] }} 
          style={[styles.image, { height: imageHeight }]} 
        />
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          style={styles.imageOverlay}
        />
        
        {/* Top badges */}
        <View style={styles.topBadges}>
          <View style={styles.leftBadges}>
            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineBadgeText}>{post.restaurant.cuisine}</Text>
            </View>
            {post.trending && (
              <View style={styles.trendingBadge}>
                <TrendingUp size={8} color={designTokens.colors.white} />
                <Text style={styles.trendingText}>Hot</Text>
              </View>
            )}
          </View>
          
          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <Star size={10} color={designTokens.colors.primaryOrange} />
            <Text style={styles.ratingText}>{post.restaurant.rating}</Text>
          </View>
        </View>
        
        {/* Bottom overlay content */}
        <View style={styles.imageBottomContent}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {post.restaurant.name}
          </Text>
          <View style={styles.locationContainer}>
            <MapPin size={8} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText}>{post.restaurant.location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Enhanced user info */}
        <View style={styles.userInfo}>
          <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {post.user.name}
              </Text>
              <CheckCircle size={10} color={designTokens.colors.primaryOrange} />
            </View>
            <View style={styles.userMetaRow}>
              <View style={styles.personaBadge}>
                <Text style={styles.personaText}>{post.user.persona}</Text>
              </View>
              <Text style={styles.followerCount}>2.4K followers</Text>
            </View>
          </View>
          <Text style={styles.timeStamp}>2h ago</Text>
        </View>

        <Text style={styles.caption} numberOfLines={2}>
          {post.caption}
        </Text>

        {/* Enhanced social proof */}
        {post.socialProof.totalFriendVisits > 0 && (
          <View style={styles.socialProof}>
            <View style={styles.friendAvatars}>
              {post.socialProof.friendsVisited.slice(0, 2).map((friend, index) => (
                <Image 
                  key={index}
                  source={{ uri: `https://i.pravatar.cc/150?img=${index + 1}` }} 
                  style={[styles.friendAvatar, { marginLeft: index > 0 ? -6 : 0 }]}
                />
              ))}
            </View>
            <View style={styles.socialProofText}>
              <Text style={styles.friendNames}>Sarah Chen, Mike Rodriguez</Text>
              <Text style={styles.friendVisits}>
                {post.socialProof.totalFriendVisits} friend visits • 3 mutual friends
              </Text>
            </View>
          </View>
        )}

        {/* Photo grid */}
        {post.photos.length > 1 && (
          <View style={styles.photoGrid}>
            {post.photos.slice(1, 4).map((photo, index) => (
              <Image 
                key={index}
                source={{ uri: photo }} 
                style={styles.gridPhoto}
              />
            ))}
          </View>
        )}

        {/* Actions and save button */}
        <View style={styles.actionsContainer}>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={onLike}>
              <Heart 
                size={12} 
                color={post.engagement.likes > 0 ? '#FF4444' : '#666'} 
              />
              <Text style={styles.actionCount}>{post.engagement.likes}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.action} onPress={onComment}>
              <MessageCircle size={12} color="#666" />
              <Text style={styles.actionCount}>{post.engagement.comments}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.action} onPress={onSave}>
              <Bookmark 
                size={12} 
                color={post.engagement.saves > 0 ? designTokens.colors.primaryOrange : '#666'}
              />
              <Text style={styles.actionCount}>{post.engagement.saves}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...applyShadow('card'),
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    backgroundColor: designTokens.colors.backgroundLight,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  topBadges: {
    position: 'absolute',
    top: designTokens.spacing.sm,
    left: designTokens.spacing.sm,
    right: designTokens.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  leftBadges: {
    gap: designTokens.spacing.xs,
  },
  cuisineBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.sm,
  },
  cuisineBadgeText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  trendingBadge: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendingText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  imageBottomContent: {
    position: 'absolute',
    bottom: designTokens.spacing.sm,
    left: designTokens.spacing.sm,
    right: designTokens.spacing.sm,
    zIndex: 2,
  },
  restaurantName: {
    ...designTokens.typography.detailText,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.white,
    marginBottom: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    ...designTokens.typography.smallText,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: designTokens.spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: designTokens.spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginRight: 4,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  personaBadge: {
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: designTokens.borderRadius.sm,
  },
  personaText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.primaryOrange,
  },
  followerCount: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  timeStamp: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  caption: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    lineHeight: 18,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
    marginBottom: designTokens.spacing.sm,
  },
  friendAvatars: {
    flexDirection: 'row',
    marginRight: designTokens.spacing.sm,
  },
  friendAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.white,
  },
  socialProofText: {
    flex: 1,
  },
  friendNames: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: '#1976D2',
    marginBottom: 1,
  },
  friendVisits: {
    ...designTokens.typography.smallText,
    color: '#1565C0',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: designTokens.spacing.sm,
  },
  gridPhoto: {
    width: (CARD_WIDTH - 32) / 3 - 4,
    height: 48,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  actions: {
    flexDirection: 'row',
    gap: designTokens.spacing.lg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  saveButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.full,
  },
  saveButtonText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
});