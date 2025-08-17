import { BoardCard } from '@/components/BoardCard';
import { PostCard } from '@/components/PostCard';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import SettingsModal from '@/components/modals/SettingsModal';
import { CommunityTab } from '@/components/profile/CommunityTab';
import { designTokens, compactDesign } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { useSmoothDataFetch, useSmoothMultiDataFetch } from '@/hooks/useSmoothDataFetch';
import { supabase } from '@/lib/supabase';
import { achievementService } from '@/services/achievementService';
import { boardService } from '@/services/boardService';
import { communityService } from '@/services/communityService';
import { postService } from '@/services/postService';
import { Profile, profileService } from '@/services/profileService';
import { restaurantService } from '@/services/restaurantService';
import { Board, BoardRestaurant } from '@/types/board';
import { RestaurantInfo } from '@/types/core';
import { PersonaType } from '@/types/onboarding';
import { PostWithUser } from '@/types/post';
import { getAvatarUrl, getAvatarUrlWithFallback } from '@/utils/avatarUtils';
import { useRouter } from 'expo-router';
import {
  Award,
  Bookmark,
  Camera,
  Grid3X3,
  MessageSquare,
  PenLine,
  Plus,
  Settings,
  Share2,
  User,
  Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type TabType = 'boards' | 'posts' | 'quicksaves' | 'communities';

export default function ProfileScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { user } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const [activeTab, setActiveTab] = useState<TabType>('quicksaves');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  // Data fetching functions
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return null;
    try {
      return await profileService.getProfile(user.id);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, [user?.id]);

  const fetchAchievements = useCallback(async () => {
    if (!user?.id) return [];
    try {
      return await achievementService.getUserAchievements(user.id);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }
  }, [user?.id]);

  const fetchBoards = useCallback(async () => {
    if (!user?.id) return [];
    try {
      return await boardService.getUserBoards(user.id);
    } catch (error) {
      console.error('Error fetching boards:', error);
      return [];
    }
  }, [user?.id]);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) return [];
    try {
      return await postService.getUserPosts(user.id);
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  }, [user?.id]);

  const fetchQuickSaves = useCallback(async () => {
    if (!user?.id) return [];
    try {
      const quickSaves = await boardService.getQuickSavesRestaurants(user.id, 50);
      
      if (!quickSaves || quickSaves.length === 0) {
        return [];
      }
      
      // Batch fetch restaurant details for better performance
      const restaurantIds = quickSaves.map(save => save.restaurant_id);
      const uniqueRestaurantIds = [...new Set(restaurantIds)];
      
      // Fetch all restaurants in parallel with error handling for individual failures
      const restaurants = await Promise.allSettled(
        uniqueRestaurantIds.map(id => restaurantService.getRestaurantById(id))
      );
      
      // Create a map for quick lookup, only including successful fetches
      const restaurantMap = new Map();
      restaurants.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          restaurantMap.set(uniqueRestaurantIds[index], result.value);
        }
      });
      
      // Map restaurants to saves
      const savesWithRestaurants = quickSaves.map(save => ({
        ...save,
        restaurant: restaurantMap.get(save.restaurant_id) || undefined
      }));
      
      return savesWithRestaurants.filter(save => save.restaurant);
    } catch (error) {
      console.error('Error fetching your saves:', error);
      return [];
    }
  }, [user?.id]);

  const fetchCommunities = useCallback(async () => {
    if (!user?.id) return { joined: [], created: [] };
    try {
      return await communityService.getUserCommunities(user.id);
    } catch (error) {
      console.error('Error fetching communities:', error);
      return { joined: [], created: [] };
    }
  }, [user?.id]);

  const fetchCommunityStats = useCallback(async () => {
    if (!user?.id) return { joined_count: 0, created_count: 0, admin_count: 0, moderator_count: 0 };
    try {
      return await communityService.getUserCommunityStats(user.id);
    } catch (error) {
      console.error('Error fetching community stats:', error);
      return { joined_count: 0, created_count: 0, admin_count: 0, moderator_count: 0 };
    }
  }, [user?.id]);

  // Use smooth data fetching
  const { data: profile, loading: loadingProfile } = useSmoothDataFetch(
    fetchProfile, 
    [user?.id], 
    { minLoadingTime: 300, fetchOnFocus: true }
  );

  const { data: achievements } = useSmoothDataFetch(
    fetchAchievements, 
    [user?.id], 
    { minLoadingTime: 300, fetchOnFocus: true }
  );

  const { 
    data: boards, 
    loading: loadingBoards,
    refresh: refreshBoards 
  } = useSmoothDataFetch(
    fetchBoards, 
    [user?.id], 
    { 
      minLoadingTime: 300, 
      fetchOnFocus: true,
      cacheDuration: 60000 
    }
  );

  const { 
    data: posts, 
    loading: loadingPosts,
    refresh: refreshPosts 
  } = useSmoothDataFetch(
    fetchPosts, 
    [user?.id], 
    { 
      minLoadingTime: 300, 
      fetchOnFocus: true,
      cacheDuration: 60000 
    }
  );

  const { 
    data: quickSaves, 
    loading: loadingQuickSaves,
    refreshing: refreshingQuickSaves,
    refresh: refreshQuickSaves 
  } = useSmoothDataFetch(
    fetchQuickSaves, 
    [user?.id], 
    { 
      minLoadingTime: 300, 
      fetchOnFocus: true,
      cacheDuration: 30000 
    }
  );

  const { 
    data: communities, 
    loading: loadingCommunities,
    refreshing: refreshingCommunities,
    refresh: refreshCommunities 
  } = useSmoothDataFetch(
    fetchCommunities, 
    [user?.id], 
    { 
      minLoadingTime: 300, 
      fetchOnFocus: true,
      cacheDuration: 60000 
    }
  );

  const { 
    data: communityStats, 
    loading: loadingCommunityStats,
    refresh: refreshCommunityStats 
  } = useSmoothDataFetch(
    fetchCommunityStats, 
    [user?.id], 
    { 
      minLoadingTime: 300, 
      fetchOnFocus: true,
      cacheDuration: 60000 
    }
  );

  // Ensure data is always an array to prevent null errors
  const safeAchievements = achievements || [];
  const safeBoards = boards || [];
  const safePosts = posts || [];
  const safeQuickSaves = quickSaves || [];
  const safeCommunities = communities || { joined: [], created: [] };
  const safeCommunityStats = communityStats || { joined_count: 0, created_count: 0, admin_count: 0, moderator_count: 0 };

  const persona = profile?.persona ? personas[profile.persona as PersonaType] : 
                 (onboardingState.persona ? personas[onboardingState.persona] : null);

  // Subscribe to real-time updates for following/followers count
  useEffect(() => {
    if (!user?.id) return;

    // Set initial counts
    if (profile) {
      setFollowingCount(profile.following_count || 0);
      setFollowersCount(profile.followers_count || 0);
    }

    // Subscribe to user stats updates
    const channel = supabase
      .channel(`user-stats-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new;
          setFollowersCount(newData.followers_count || 0);
          setFollowingCount(newData.following_count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile]);

  // Refresh data when tab changes
  useEffect(() => {
    if (user?.id && !loadingProfile) {
      // Only refresh if not already loading
      if (activeTab === 'quicksaves' && !loadingQuickSaves) {
        refreshQuickSaves();
      } else if (activeTab === 'posts' && !loadingPosts) {
        refreshPosts();
      } else if (activeTab === 'boards' && !loadingBoards) {
        refreshBoards();
      } else if (activeTab === 'communities' && !loadingCommunities) {
        refreshCommunities();
        refreshCommunityStats();
      }
    }
  }, [activeTab, user?.id, loadingProfile]);

  const handleProfileSave = (updatedProfile: Profile) => {
    // Profile will be automatically refreshed by the hook
    setShowEditModal(false);
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    
    try {
      // TODO: Implement share functionality
      // Share profile
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handlePostPress = (postId: string) => {
    router.push({
      pathname: '/posts/[id]',
      params: { id: postId }
    });
  };

  const handleEditPost = (postId: string) => {
    router.push({
      pathname: '/posts/edit/[id]',
      params: { id: postId }
    });
  };

  const handleLike = useCallback((postId: string, liked: boolean) => {
    // Like actions are handled by the PostCard component
  }, []);

  const handleComment = useCallback((postId: string) => {
    router.push({
      pathname: '/posts/[id]',
      params: { id: postId }
    });
  }, [router]);

  const handleSave = useCallback((postId: string) => {
    // Save actions are handled by the PostCard component
  }, []);

  // User data with real profile
  const userData = {
    name: profile?.name || profile?.email?.split('@')[0] || 'Troodie User',
    username: profile?.username ? `@${profile.username}` : '@user',
    avatar: getAvatarUrl(profile),
    bio: profile?.bio || '',
    stats: {
      followers: followersCount,
      following: followingCount,
      posts: safePosts.length // Use actual posts count instead of reviews_count
    }
  };

  // Profile data prepared

  // Transform safeAchievements for display
  const displayAchievements = safeAchievements.slice(0, 3).map((achievement, index) => ({
    id: index + 1,
    name: achievement.title || achievement.name,
    icon: Award
  }));

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={() => router.push('/find-friends')}
      >
        <Users size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      <View style={styles.headerSpacer} />
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={() => setShowSettingsModal(true)}
      >
        <Settings size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>
    </View>
  );

  const renderProfileInfo = () => (
    <View style={styles.profileInfo}>
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => setShowEditModal(true)}>
          <Image 
            source={{ uri: getAvatarUrlWithFallback(userData.avatar) }} 
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.editAvatarButton}>
            <Camera size={10} color={designTokens.colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.profileDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{userData.username}</Text>
            {persona && (
              <View style={styles.personaBadge}>
                <Text style={styles.personaName}>{persona.name}</Text>
              </View>
            )}
          </View>
          
          {userData.bio ? (
            <Text style={styles.bio} numberOfLines={2}>{userData.bio}</Text>
          ) : (
            <TouchableOpacity onPress={() => setShowEditModal(true)}>
              <Text style={styles.bioPlaceholder}>Add a bio...</Text>
            </TouchableOpacity>
          )}

          {/* Achievement Badges */}
          {displayAchievements.length > 0 && (
            <View style={styles.achievementsContainer}>
              {displayAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementBadge}>
                  <Award size={8} color="#B45309" />
                  <Text style={styles.achievementText}>{achievement.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.stats}>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/user/${user?.id}/followers`)}>
          <Text style={styles.statValue}>{userData.stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/user/${user?.id}/following`)}>
          <Text style={styles.statValue}>{userData.stats.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{safeBoards.length}</Text>
          <Text style={styles.statLabel}>Boards</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editProfileButton} onPress={() => setShowEditModal(true)} testID="edit-profile-button">
          <PenLine size={10} color={designTokens.colors.primaryOrange} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
          <Share2 size={10} color={designTokens.colors.textMedium} />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quicksaves' && styles.activeTab]}
          onPress={() => setActiveTab('quicksaves')}
        >
          <Bookmark size={14} color={activeTab === 'quicksaves' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'quicksaves' && styles.activeTabText]}>
            Saves ({safeQuickSaves.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'boards' && styles.activeTab]}
          onPress={() => setActiveTab('boards')}
        >
          <Grid3X3 size={14} color={activeTab === 'boards' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'boards' && styles.activeTabText]}>
            Boards ({safeBoards.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <MessageSquare size={14} color={activeTab === 'posts' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts ({safePosts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.activeTab]}
          onPress={() => setActiveTab('communities')}
        >
          <Users size={14} color={activeTab === 'communities' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'communities' && styles.activeTabText]}>
            Communities ({safeCommunityStats.joined_count})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );


  const renderQuickSavesTab = () => (
    <View style={styles.tabContent}>
      {loadingQuickSaves ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        </View>
      ) : safeQuickSaves.length > 0 ? (
        <FlatList
          data={safeQuickSaves}
          renderItem={({ item }: { item: BoardRestaurant & { restaurant?: RestaurantInfo } }) => {
            if (!item.restaurant) return null;
            
            return (
              <View style={styles.quickSaveItem}>
                <RestaurantCard 
                  restaurant={item.restaurant} 
                  onPress={() => router.push(`/restaurant/${item.restaurant_id}`)}
                />
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.quickSavesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshingQuickSaves}
              onRefresh={() => refreshQuickSaves()}
              tintColor={designTokens.colors.primaryOrange}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Grid3X3 size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyTitle}>No Saves Yet</Text>
          <Text style={styles.emptyDescription}>
            Tap the save button on any restaurant to add it here
          </Text>
          <TouchableOpacity 
            style={styles.emptyCTA}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.emptyCTAText}>Explore Restaurants</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBoardsTab = () => (
    <View style={styles.tabContent}>
      {loadingBoards ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        </View>
      ) : safeBoards.length > 0 ? (
        <FlatList
          data={safeBoards}
          renderItem={({ item }: { item: Board }) => (
            <BoardCard 
              key={item.id} 
              board={item} 
              onPress={() => router.push(`/boards/${item.id}`)}
            />
          )}
          keyExtractor={(item: Board) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.boardsList}
          ListFooterComponent={() => (
            <TouchableOpacity 
              style={styles.addBoardButton} 
              onPress={() => router.push('/add/create-board')}
            >
              <Plus size={20} color={designTokens.colors.primaryOrange} />
              <Text style={styles.addBoardText}>Create New Board</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Grid3X3 size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyTitle}>Create Your First Board</Text>
          <Text style={styles.emptyDescription}>
            Organize your saved restaurants into collections
          </Text>
          <TouchableOpacity 
            style={styles.emptyCTA}
            onPress={() => router.push('/add/create-board')}
          >
            <Plus size={20} color={designTokens.colors.white} />
            <Text style={styles.emptyCTAText}>Create Board</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPostsTab = () => {
    if (loadingPosts) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        </View>
      );
    }

    if (safePosts.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={32} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>Share Your First Experience</Text>
            <Text style={styles.emptyDescription}>
              Post about your restaurant visits and build your foodie reputation
            </Text>
            <TouchableOpacity 
              style={styles.emptyCTA}
              onPress={() => router.push('/add/create-post')}
            >
              <Plus size={20} color={designTokens.colors.white} />
              <Text style={styles.emptyCTAText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <FlatList
          data={safePosts}
          renderItem={({ item }: { item: PostWithUser }) => {
            
            return (
              <PostCard
                post={item}
                onPress={() => handlePostPress(item.id)}
                onLike={handleLike}
                onComment={handleComment}
                onSave={handleSave}
                showActions={true}
              />
            );
          }}
          keyExtractor={(item: PostWithUser) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={loadingPosts}
              onRefresh={refreshPosts}
              tintColor={designTokens.colors.primaryOrange}
            />
          }
        />
      </View>
    );
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header and Profile Info - Fixed Content */}
      <View style={styles.fixedContent}>
        {renderHeader()}
        {renderProfileInfo()}
        {renderTabs()}
      </View>

      {/* Tab Content - Scrollable */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'quicksaves' && renderQuickSavesTab()}
        {activeTab === 'boards' && renderBoardsTab()}
        {activeTab === 'posts' && renderPostsTab()}
        {activeTab === 'communities' && (
          <CommunityTab
            userId={user?.id || ''}
            communities={safeCommunities}
            stats={safeCommunityStats}
            loading={loadingCommunities}
            refreshing={refreshingCommunities}
            onRefresh={() => {
              refreshCommunities();
              refreshCommunityStats();
            }}
          />
        )}
      </View>

      <SettingsModal 
        visible={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
      
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleProfileSave}
        currentProfile={profile}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.header.paddingHorizontal,
    paddingVertical: compactDesign.header.paddingVertical,
  },
  headerButton: {
    width: compactDesign.button.height,
    height: compactDesign.button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  profileInfo: {
    paddingHorizontal: compactDesign.content.padding,
    paddingBottom: compactDesign.content.paddingCompact,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: compactDesign.content.gap,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: designTokens.colors.primaryOrange + '33',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: designTokens.colors.primaryOrange,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designTokens.colors.white,
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Poppins_700Bold',
    color: designTokens.colors.textDark,
  },
  username: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: compactDesign.content.gap,
  },
  personaBadge: {
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.full,
  },
  personaName: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  bio: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textDark,
    marginBottom: compactDesign.card.gap,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  achievementText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#B45309',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: compactDesign.content.gap,
    paddingVertical: compactDesign.content.gap,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: designTokens.colors.textDark,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  creatorCard: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#C084FC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    ...designTokens.shadows.card,
  },
  creatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorTitleText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#7C3AED',
  },
  creatorButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
  },
  creatorButtonText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  creatorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  creatorStatItem: {
    alignItems: 'center',
  },
  creatorStatValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#7C3AED',
  },
  creatorStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#A855F7',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editProfileButton: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  editProfileText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  shareButton: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  shareButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  tabsContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: 2,
    gap: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: designTokens.borderRadius.sm - 2,
    gap: 6,
    minWidth: 90,
  },
  activeTab: {
    backgroundColor: designTokens.colors.white,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    ...designTokens.shadows.card,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
  },
  activeTabText: {
    color: designTokens.colors.textDark,
  },
  tabContent: {
    minHeight: 300,
  },
  savesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  saveItem: {
    width: '47%',
    position: 'relative',
  },
  saveImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  cuisineBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cuisineBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  saveInfo: {
    paddingHorizontal: 4,
  },
  saveTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  saveLocation: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCTAText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  bottomPadding: {
    height: 100,
  },
  avatarPlaceholder: {
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioPlaceholder: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardsList: {
    paddingHorizontal: 20,
  },
  quickSavesList: {
    paddingHorizontal: 20,
  },
  quickSaveItem: {
    // RestaurantCard now handles its own margin
  },
  addBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    borderStyle: 'dashed',
  },
  addBoardText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: 8,
  },
  postContainer: {
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: designTokens.colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: compactDesign.card.gap,
    gap: 4,
  },
  actionText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  postsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fixedContent: {
    flex: 0, // Do not take up space in the main scrollable area
  },
  tabContentContainer: {
    flex: 1, // Take up available space for the scrollable content
  },
});