import { designTokens } from '@/constants/designTokens';
import { CommunityWithMembership, UserCommunityStats } from '@/services/communityService';
import { useRouter } from 'expo-router';
import { Crown, Settings, Shield, Users } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CommunityTabProps {
  userId: string;
  communities: {
    joined: CommunityWithMembership[];
    created: CommunityWithMembership[];
  };
  stats: UserCommunityStats;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export const CommunityTab: React.FC<CommunityTabProps> = ({
  userId,
  communities,
  stats,
  loading,
  refreshing,
  onRefresh,
}) => {
  const router = useRouter();

  const handleCommunityPress = (communityId: string) => {
    if (!communityId) {
      console.error('Community ID is missing');
      return;
    }
    router.push({
      pathname: '/add/community-detail' as any,
      params: { communityId: communityId }
    });
  };

  const handleCreateCommunity = () => {
    router.push('/add/create-community');
  };

  const renderRoleBadge = (role?: string) => {
    if (!role) return null;

    const getRoleIcon = () => {
      switch (role) {
        case 'owner':
          return <Crown size={12} color="white" />;
        case 'admin':
          return <Shield size={12} color="white" />;
        case 'moderator':
          return <Settings size={12} color="white" />;
        default:
          return null;
      }
    };

    const getRoleColor = () => {
      switch (role) {
        case 'owner':
          return '#FFD700'; // Gold
        case 'admin':
          return '#FF6B6B'; // Red
        case 'moderator':
          return '#4ECDC4'; // Teal
        default:
          return designTokens.colors.textMedium;
      }
    };

    return (
      <View style={[styles.roleBadge, { backgroundColor: getRoleColor() }]}>
        {getRoleIcon()}
        <Text style={styles.roleBadgeText}>{role}</Text>
      </View>
    );
  };

  const renderCommunityCard = ({ item }: { item: CommunityWithMembership }) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => handleCommunityPress(item.id)}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri: item.cover_image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        }}
        style={styles.communityImage}
      />
      <View style={styles.communityInfo}>
        <View style={styles.communityHeader}>
          <Text style={styles.communityName} numberOfLines={1}>
            {item.name}
          </Text>
          {renderRoleBadge(item.user_role)}
        </View>
        {item.description && (
          <Text style={styles.communityDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.communityStats}>
          <View style={styles.statItem}>
            <Users size={14} color={designTokens.colors.textMedium} />
            <Text style={styles.statText}>{item.member_count || 0} members</Text>
          </View>
          {item.location && (
            <Text style={styles.locationText}>{item.location}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = (type: 'joined' | 'created') => (
    <View style={styles.emptyState}>
      <Users size={48} color={designTokens.colors.textLight} />
      <Text style={styles.emptyTitle}>
        {type === 'joined' ? 'No communities joined yet' : 'No communities created yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {type === 'joined'
          ? 'Explore and join communities that match your food interests'
          : 'Create your own community and bring food lovers together'}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/communities')}
      >
        <Text style={styles.emptyButtonText}>
          {type === 'joined' ? 'Explore Communities' : 'Create Community'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
      </View>
    );
  }

  const allCommunities = [...communities.created, ...communities.joined];

  return (
    <FlatList
      data={allCommunities}
      renderItem={renderCommunityCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[designTokens.colors.primaryOrange]}
        />
      }
      ListEmptyComponent={() => renderEmptyState('joined')}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: designTokens.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxl,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.white,
    marginBottom: designTokens.spacing.md,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.textDark,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.primaryOrange,
    marginHorizontal: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    gap: designTokens.spacing.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.textDark,
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  communityCard: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    marginHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  communityImage: {
    width: 100,
    height: 100,
  },
  communityInfo: {
    flex: 1,
    padding: designTokens.spacing.md,
    justifyContent: 'space-between',
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    flex: 1,
    marginRight: designTokens.spacing.sm,
  },
  communityDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: 4,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: designTokens.spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
    textTransform: 'capitalize',
  },
  separator: {
    height: designTokens.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxl,
    paddingHorizontal: designTokens.spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  emptyButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
});