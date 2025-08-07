import { BoardCard } from '@/components/BoardCard';
import { PostCard } from '@/components/PostCard';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import FollowButton from '@/components/FollowButton';
import { CommunityTab } from '@/components/profile/CommunityTab';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowState } from '@/hooks/useFollowState';
import { personas } from '@/data/personas';
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
import { getAvatarUrl } from '@/utils/avatarUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Award,
    Bookmark,
    ChevronLeft,
    Grid3X3,
    MessageSquare,
    MoreVertical,
    Share2,
    User,
    Users
} from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import {
    Menu,
    MenuOption,
    MenuOptions,
    MenuProvider,
    MenuTrigger,
} from 'react-native-popup-menu';

type TabType = 'boards' | 'posts' | 'quicksaves' | 'communities';

export default function UserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [quickSaves, setQuickSaves] = useState<Array<BoardRestaurant & { restaurant?: RestaurantInfo }>>([]);
  const [loadingQuickSaves, setLoadingQuickSaves] = useState(true);
  const [refreshingQuickSaves, setRefreshingQuickSaves] = useState(false);
  const [communities, setCommunities] = useState<{ joined: any[], created: any[] }>({ joined: [], created: [] });
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [refreshingCommunities, setRefreshingCommunities] = useState(false);
  const [communityStats, setCommunityStats] = useState({ joined_count: 0, created_count: 0, admin_count: 0, moderator_count: 0 });
  const tabScrollRef = useRef<ScrollView>(null);
  
  const isOwnProfile = currentUser?.id === id;
  
  // Use follow state hook for real-time updates
  const {
    isFollowing,
    followersCount,
    followingCount,
    loading: followLoading,
    toggleFollow,
    refreshCounts
  } = useFollowState({
    userId: id || '',
    initialIsFollowing: false,
    initialFollowersCount: profile?.followers_count || 0,
    initialFollowingCount: profile?.following_count || 0,
    onFollowChange: (following) => {
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          followers_count: following 
            ? (profile.followers_count || 0) + 1 
            : Math.max(0, (profile.followers_count || 0) - 1)
        });
      }
    }
  });
  const persona = profile?.persona ? personas[profile.persona as PersonaType] : null;

  // Load profile data
  useEffect(() => {
    if (id) {
      loadProfile();
      loadAchievements();
      loadBoards();
      loadPosts();
      loadQuickSaves();
      loadCommunities();
      loadCommunityStats();
    }
  }, [id]);

  const loadProfile = async () => {
    if (!id) return;
    
    try {
      const profileData = await profileService.getProfile(id);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    if (!id) return;
    
    try {
      const userAchievements = await achievementService.getUserAchievements(id);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadBoards = async () => {
    if (!id) return;
    
    try {
      setLoadingBoards(true);
      const userBoards = await boardService.getUserBoards(id);
      // Only show public boards for other users
      const filteredBoards = isOwnProfile ? userBoards : userBoards.filter(board => !board.is_private);
      setBoards(filteredBoards);
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoadingBoards(false);
    }
  };

  const loadQuickSaves = async (isRefreshing = false) => {
    if (!id) return;
    
    try {
      if (!isRefreshing) {
        setLoadingQuickSaves(true);
      }
      
      // Your saves are private - only show for own profile
      if (isOwnProfile) {
        const saves = await boardService.getQuickSavesRestaurants(id);
        
        // Load restaurant details for each save
        const savesWithRestaurants = await Promise.all(
          saves.map(async (save) => {
            const restaurant = await restaurantService.getRestaurantById(save.restaurant_id);
            return {
              ...save,
              restaurant: restaurant || undefined
            };
          })
        );
        
        setQuickSaves(savesWithRestaurants.filter(save => save.restaurant));
      } else {
        setQuickSaves([]);
      }
    } catch (error) {
      console.error('Error loading your saves:', error);
    } finally {
      setLoadingQuickSaves(false);
      setRefreshingQuickSaves(false);
    }
  };

  const onRefreshQuickSaves = async () => {
    setRefreshingQuickSaves(true);
    await loadQuickSaves(true);
  };

  const loadPosts = async () => {
    if (!id) return;
    
    try {
      setLoadingPosts(true);
      const userPosts = await postService.getUserPosts(id, 50);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadCommunities = async (isRefreshing = false) => {
    if (!id) return;
    
    try {
      if (!isRefreshing) {
        setLoadingCommunities(true);
      }
      const userCommunities = await communityService.getUserCommunities(id);
      setCommunities(userCommunities);
    } catch (error) {
      console.error('Error loading communities:', error);
      setCommunities({ joined: [], created: [] });
    } finally {
      setLoadingCommunities(false);
      setRefreshingCommunities(false);
    }
  };

  const loadCommunityStats = async () => {
    if (!id) return;
    
    try {
      const stats = await communityService.getUserCommunityStats(id);
      setCommunityStats(stats);
    } catch (error) {
      console.error('Error loading community stats:', error);
    }
  };

  const onRefreshCommunities = async () => {
    setRefreshingCommunities(true);
    await Promise.all([
      loadCommunities(true),
      loadCommunityStats()
    ]);
  };

  const checkFollowStatus = async () => {
    if (!id || !currentUser?.id || id === currentUser.id) return;
    
    try {
      // TODO: Check if current user is following this user
      // const status = await followService.isFollowing(currentUser.id, id);
      // setIsFollowing(status);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      loadAchievements(),
      loadBoards(),
      loadPosts(),
    ]);
    setRefreshing(false);
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    
    try {
      // TODO: Implement share functionality
      Alert.alert('Share Profile', 'Share functionality coming soon!');
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

  const handleReportUser = () => {
    Alert.alert('Report User', 'Report functionality coming soon!');
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => {
          // TODO: Implement block functionality
          Alert.alert('User Blocked', 'This user has been blocked.');
        }}
      ]
    );
  };

  // User data with real profile
  const userData = {
    name: profile?.name || profile?.email?.split('@')[0] || 'Troodie User',
    username: profile?.username ? `@${profile.username}` : '@user',
    avatar: getAvatarUrl(profile),
    bio: profile?.bio || '',
    stats: {
      followers: profile?.followers_count || 0,
      following: profile?.following_count || 0,
      posts: posts.length
    }
  };

  // Transform achievements for display
  const displayAchievements = achievements.slice(0, 3).map((achievement, index) => ({
    id: index + 1,
    name: achievement.title || achievement.name,
    icon: Award
  }));

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{userData.name}</Text>
      {!isOwnProfile && (
        <Menu>
          <MenuTrigger>
            <TouchableOpacity style={styles.headerButton}>
              <MoreVertical size={24} color={designTokens.colors.textDark} />
            </TouchableOpacity>
          </MenuTrigger>
          <MenuOptions customStyles={menuOptionsStyles}>
            <MenuOption onSelect={handleShareProfile}>
              <View style={styles.menuItem}>
                <Share2 size={16} color={designTokens.colors.text} />
                <Text style={styles.menuText}>Share Profile</Text>
              </View>
            </MenuOption>
            <MenuOption onSelect={handleReportUser}>
              <View style={styles.menuItem}>
                <Text style={styles.menuText}>Report User</Text>
              </View>
            </MenuOption>
            <MenuOption onSelect={handleBlockUser}>
              <View style={styles.menuItem}>
                <Text style={[styles.menuText, { color: designTokens.colors.error }]}>Block User</Text>
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>
      )}
    </View>
  );

  const renderProfileInfo = () => (
    <View style={styles.profileInfo}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {userData.avatar ? (
            <Image 
              source={{ uri: userData.avatar }} 
              style={styles.avatar}
              onError={(e) => {
                console.error('Failed to load avatar:', userData.avatar, e.nativeEvent.error);
              }}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={24} color="#999" />
            </View>
          )}
        </View>

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
          ) : null}

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
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{followersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{boards.length}</Text>
          <Text style={styles.statLabel}>Boards</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      {!isOwnProfile && (
        <View style={styles.actionButtons}>
          <FollowButton
            isFollowing={isFollowing}
            isLoading={followLoading}
            onPress={toggleFollow}
            size="large"
            style={styles.followButtonCustom}
          />
          <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
            <Share2 size={10} color={designTokens.colors.textMedium} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
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
        {(!isOwnProfile || quickSaves.length === 0) ? null : (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'quicksaves' && styles.activeTab]}
            onPress={() => setActiveTab('quicksaves')}
          >
            <Bookmark size={14} color={activeTab === 'quicksaves' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
            <Text style={[styles.tabText, activeTab === 'quicksaves' && styles.activeTabText]}>
              Saves ({quickSaves.length})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tab, activeTab === 'boards' && styles.activeTab]}
          onPress={() => setActiveTab('boards')}
        >
          <Grid3X3 size={14} color={activeTab === 'boards' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'boards' && styles.activeTabText]}>
            Boards ({boards.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <MessageSquare size={14} color={activeTab === 'posts' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts ({posts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.activeTab]}
          onPress={() => setActiveTab('communities')}
        >
          <Users size={14} color={activeTab === 'communities' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'communities' && styles.activeTabText]}>
            Communities ({communityStats.joined_count})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderQuickSavesTab = () => {
    if (!isOwnProfile) return null;
    
    return (
      <View style={styles.tabContent}>
        {loadingQuickSaves ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
          </View>
        ) : quickSaves.length > 0 ? (
          <FlatList
            data={quickSaves}
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
                onRefresh={onRefreshQuickSaves}
                tintColor={designTokens.colors.primaryOrange}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Grid3X3 size={32} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>No Saves</Text>
            <Text style={styles.emptyDescription}>
              Your saves are private
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderBoardsTab = () => (
    <View style={styles.tabContent}>
      {loadingBoards ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        </View>
      ) : boards.length > 0 ? (
        <FlatList
          data={boards}
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
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Grid3X3 size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyTitle}>No Boards Yet</Text>
          <Text style={styles.emptyDescription}>
            {userData.name} hasn't created any public boards
          </Text>
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

    if (posts.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={32} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptyDescription}>
              {userData.name} hasn't shared any posts
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <FlatList
          data={posts}
          renderItem={({ item }: { item: PostWithUser }) => (
            <PostCard
              post={item}
              onPress={() => handlePostPress(item.id)}
              onLike={() => {}}
              onComment={() => handlePostPress(item.id)}
              onSave={() => {}}
              showActions={true}
            />
          )}
          keyExtractor={(item: PostWithUser) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={loadingPosts}
              onRefresh={loadPosts}
              tintColor={designTokens.colors.primaryOrange}
            />
          }
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <User size={64} color="#999" />
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <MenuProvider>
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
              userId={id || ''}
              communities={communities}
              stats={communityStats}
              loading={loadingCommunities}
              refreshing={refreshingCommunities}
              onRefresh={onRefreshCommunities}
            />
          )}
        </View>
      </SafeAreaView>
    </MenuProvider>
  );
}

const menuOptionsStyles = {
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 12,
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
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: designTokens.colors.textDark,
  },
  username: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: 12,
  },
  personaBadge: {
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.full,
  },
  personaName: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  bio: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
    marginBottom: 8,
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
    marginBottom: 12,
    paddingVertical: 12,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  followButtonCustom: {
    flex: 1,
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
  avatarPlaceholder: {
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: 8,
  },
  postsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fixedContent: {
    flex: 0,
  },
  tabContentContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.text,
  },
});