import { BoardCard } from '@/components/BoardCard';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import SettingsModal from '@/components/modals/SettingsModal';
import { PostCard } from '@/components/PostCard';
import { designTokens } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { achievementService } from '@/services/achievementService';
import { boardService } from '@/services/boardService';
import { postService } from '@/services/postService';
import { Profile, profileService } from '@/services/profileService';
import { Board } from '@/types/board';
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
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type TabType = 'boards' | 'posts';

export default function ProfileScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { user } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const [activeTab, setActiveTab] = useState<TabType>('boards');
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
  
  const persona = profile?.persona ? personas[profile.persona as PersonaType] : 
                 (onboardingState.persona ? personas[onboardingState.persona] : null);

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      loadProfile();
      loadAchievements();
      loadBoards();
      loadPosts();
    }
  }, [user?.id]);

  // Refresh posts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadPosts(); // Refresh posts when screen is focused
      }
    }, [user?.id])
  );

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading profile for user:', user.id);
      
      // Test storage access first
      await profileService.testStorageAccess();
      
      const profileData = await profileService.getProfile(user.id);
      console.log('Profile loaded:', profileData);
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

  const loadPosts = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingPosts(true);
      const userPosts = await postService.getUserPosts(user.id, 50);
      console.log('Loaded posts:', userPosts.length);
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
      console.log('Share profile:', profile);
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

  // Debug logging
  console.log('Profile data:', profile);
  console.log('User data:', userData);
  console.log('Avatar URL:', userData.avatar);

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
      <TouchableOpacity style={styles.avatarContainer} onPress={() => setShowEditModal(true)}>
        {userData.avatar ? (
          <Image 
            source={{ uri: userData.avatar }} 
            style={styles.avatar}
            onError={(error) => console.log('Avatar image error:', error)}
            onLoad={() => console.log('Avatar image loaded successfully')}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <User size={32} color="#999" />
          </View>
        )}
        <View style={styles.editAvatarButton}>
          <Camera size={12} color={designTokens.colors.white} />
        </View>
      </TouchableOpacity>

      <View style={styles.userDetails}>
        <Text style={styles.name}>{userData.username}</Text>
        
        {persona && (
          <View style={styles.personaBadge}>
            <Text style={styles.personaName}>{persona.name}</Text>
          </View>
        )}
      </View>

      {userData.bio ? (
        <Text style={styles.bio}>{userData.bio}</Text>
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
          <PenLine size={12} color={designTokens.colors.primaryOrange} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
          <Share2 size={12} color={designTokens.colors.textMedium} />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <View style={styles.tabs}>
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
      <FlatList
        data={posts}
        renderItem={({ item }: { item: PostWithUser }) => (
          <View style={styles.postContainer}>
            <PostCard
              post={item}
              onPress={() => handlePostPress(item.id)}
              onLike={handleLike}
              onComment={handleComment}
              onSave={handleSave}
              showActions={true}
            />
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditPost(item.id)}
              >
                <PenLine size={16} color={designTokens.colors.primaryOrange} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item: PostWithUser) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.postsList}
      />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: designTokens.colors.primaryOrange + '33',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: designTokens.colors.primaryOrange,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designTokens.colors.white,
  },
  userDetails: {
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: designTokens.colors.textDark,
    marginBottom: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.full,
  },
  personaName: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  achievementText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#B45309',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
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
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  editProfileText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  shareButton: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  tabsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
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
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardsList: {
    paddingHorizontal: 20,
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
    paddingBottom: 20,
  },
  fixedContent: {
    flex: 0, // Do not take up space in the main scrollable area
  },
  tabContentContainer: {
    flex: 1, // Take up available space for the scrollable content
  },
});