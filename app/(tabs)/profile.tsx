import { BoardCard } from '@/components/BoardCard';
import { ProfilePostCard } from '@/components/cards/ProfilePostCard';
import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import SettingsModal from '@/components/modals/SettingsModal';
import { designTokens } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { achievementService } from '@/services/achievementService';
import { boardService } from '@/services/boardService';
import { postService } from '@/services/postService';
import { Profile, profileService } from '@/services/profileService';
import { restaurantService } from '@/services/restaurantService';
import { Board, BoardRestaurant } from '@/types/board';
import { RestaurantInfo } from '@/types/core';
import { PersonaType } from '@/types/onboarding';
import { PostWithUser } from '@/types/post';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Award,
  Camera,
  Grid3X3,
  MessageSquare,
  PenLine,
  Plus,
  Settings,
  Share2,
  User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type TabType = 'boards' | 'posts' | 'quicksaves';

export default function ProfileScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { user } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const [activeTab, setActiveTab] = useState<TabType>('quicksaves');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
  
  const persona = profile?.persona ? personas[profile.persona as PersonaType] : 
                 (onboardingState.persona ? personas[onboardingState.persona] : null);

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      loadProfile();
      loadAchievements();
      loadBoards();
      loadPosts();
      loadQuickSaves();
    }
  }, [user?.id]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        // Refresh Quick Saves if it's the active tab
        if (activeTab === 'quicksaves') {
          loadQuickSaves();
        } else if (activeTab === 'posts') {
          loadPosts();
        } else if (activeTab === 'boards') {
          loadBoards();
        }
      }
    }, [user?.id, activeTab])
  );

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      // Loading profile for user
      
      // Test storage access first
      await profileService.testStorageAccess();
      
      const profileData = await profileService.getProfile(user.id);
      // Profile loaded successfully
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    if (!user?.id) return;
    
    try {
      const userAchievements = await achievementService.getUserAchievements(user.id);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadBoards = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingBoards(true);
      const userBoards = await boardService.getUserBoards(user.id);
      setBoards(userBoards);
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoadingBoards(false);
    }
  };

  const loadQuickSaves = async (isRefreshing = false) => {
    if (!user?.id) return;
    
    try {
      if (!isRefreshing) {
        setLoadingQuickSaves(true);
      }
      const saves = await boardService.getQuickSavesRestaurants(user.id);
      
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
    } catch (error) {
      console.error('Error loading quick saves:', error);
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
    if (!user?.id) return;
    
    try {
      setLoadingPosts(true);
      const userPosts = await postService.getUserPosts(user.id, 50);
      // Posts loaded
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoadingPosts(false);
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

  const handleProfileSave = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
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

  const handleLike = (postId: string, liked: boolean) => {
    // Update local state to reflect like change
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1 }
        : post
    ));
  };

  const handleComment = (postId: string) => {
    router.push({
      pathname: '/posts/[id]',
      params: { id: postId }
    });
  };

  const handleSave = (postId: string) => {
    // Update local state to reflect save change
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, saves_count: post.saves_count + 1 }
        : post
    ));
  };

  // User data with real profile
  const userData = {
    name: profile?.name || profile?.email?.split('@')[0] || 'Troodie User',
    username: profile?.username ? `@${profile.username}` : '@user',
    avatar: profile?.avatar_url || profile?.profile_image_url || null,
    bio: profile?.bio || '',
    stats: {
      followers: profile?.followers_count || 0,
      following: profile?.following_count || 0,
      posts: posts.length // Use actual posts count instead of reviews_count
    }
  };

  // Profile data prepared

  // Transform achievements for display
  const displayAchievements = achievements.slice(0, 3).map((achievement, index) => ({
    id: index + 1,
    name: achievement.title || achievement.name,
    icon: Award
  }));

  const renderHeader = () => (
    <View style={styles.header}>
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
          {userData.avatar ? (
            <Image 
              source={{ uri: userData.avatar }} 
              style={styles.avatar}
              onError={() => {}}
              onLoad={() => {}}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={24} color="#999" />
            </View>
          )}
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
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.following}</Text>
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

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editProfileButton} onPress={() => setShowEditModal(true)}>
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
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quicksaves' && styles.activeTab]}
          onPress={() => setActiveTab('quicksaves')}
        >
          <Grid3X3 size={12} color={activeTab === 'quicksaves' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'quicksaves' && styles.activeTabText]}>
            Quick Saves
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'boards' && styles.activeTab]}
          onPress={() => setActiveTab('boards')}
        >
          <Grid3X3 size={12} color={activeTab === 'boards' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'boards' && styles.activeTabText]}>
            Boards ({boards.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <MessageSquare size={12} color={activeTab === 'posts' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts ({posts.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderQuickSavesTab = () => (
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
          <Text style={styles.emptyTitle}>No Quick Saves Yet</Text>
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

    if (posts.length === 0) {
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
          data={posts}
          renderItem={({ item }: { item: PostWithUser }) => {
            console.log('Rendering post:', {
              id: item.id,
              rating: item.rating,
              photos: item.photos,
              caption: item.caption
            });
            
            return (
              <ProfilePostCard
                post={item}
                onPress={() => handlePostPress(item.id)}
                onEdit={() => handleEditPost(item.id)}
              />
            );
          }}
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
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
  },
  activeTab: {
    backgroundColor: designTokens.colors.white,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    ...designTokens.shadows.card,
  },
  tabText: {
    fontSize: 12,
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
    marginBottom: 16,
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
    padding: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
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