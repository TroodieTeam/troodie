import SettingsModal from '@/components/modals/SettingsModal';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { designTokens } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { profileService, Profile } from '@/services/profileService';
import { achievementService } from '@/services/achievementService';
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
  User
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl
} from 'react-native';

type TabType = 'saves' | 'boards' | 'posts';

export default function ProfileScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { user } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const [activeTab, setActiveTab] = useState<TabType>('saves');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  
  const persona = profile?.persona ? personas[profile.persona] : 
                 (onboardingState.persona ? personas[onboardingState.persona] : null);

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      loadProfile();
      loadAchievements();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      const profileData = await profileService.getProfile(user.id);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      loadAchievements()
    ]);
    setRefreshing(false);
  };

  const handleProfileSave = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    loadAchievements(); // Reload achievements in case new ones were unlocked
  };

  const handleShareProfile = async () => {
    if (profile?.username) {
      await profileService.shareProfile(profile.username);
    }
  };

  // User data with real profile
  const userData = {
    name: profile?.email?.split('@')[0] || 'Troodie User',
    username: profile?.username ? `@${profile.username}` : '@user',
    avatar: profile?.profile_image_url || null,
    bio: profile?.bio || '',
    stats: {
      followers: profile?.followers_count || 0,
      following: profile?.following_count || 0,
      saves: profile?.saves_count || 0,
      posts: profile?.reviews_count || 0
    }
  };

  // Transform achievements for display
  const displayAchievements = achievements.slice(0, 3).map((achievement, index) => ({
    id: index + 1,
    name: achievement.title || achievement.name,
    icon: Award
  }));

  // Mock data for saved restaurants
  const savedRestaurants = userState.isNewUser ? [] : [
    {
      id: 1,
      name: 'The Farm Cart',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      cuisine: 'Farm-to-Table',
      rating: 4.8,
      location: 'Downtown',
      priceRange: '$$$'
    },
    {
      id: 2,
      name: 'Sakura Omakase',
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      cuisine: 'Japanese',
      rating: 4.9,
      location: 'East Village',
      priceRange: '$$$$'
    }
  ];

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
          <Image source={{ uri: userData.avatar }} style={styles.avatar} />
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
        <Text style={styles.name}>{userData.name}</Text>
        <Text style={styles.username}>{userData.username}</Text>
        
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
          <Text style={styles.statValue}>{userData.stats.saves}</Text>
          <Text style={styles.statLabel}>Saves</Text>
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
          style={[styles.tab, activeTab === 'saves' && styles.activeTab]}
          onPress={() => setActiveTab('saves')}
        >
          <Bookmark size={12} color={activeTab === 'saves' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'saves' && styles.activeTabText]}>
            Saves ({userData.stats.saves})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'boards' && styles.activeTab]}
          onPress={() => setActiveTab('boards')}
        >
          <Grid3X3 size={12} color={activeTab === 'boards' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'boards' && styles.activeTabText]}>
            Boards
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <MessageSquare size={12} color={activeTab === 'posts' ? designTokens.colors.textDark : designTokens.colors.textMedium} />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts ({userData.stats.posts})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSavesTab = () => (
    <View style={styles.tabContent}>
      {savedRestaurants.length > 0 ? (
        <View style={styles.savesGrid}>
          {savedRestaurants.map((restaurant) => (
            <View key={restaurant.id} style={styles.saveItem}>
              <Image source={{ uri: restaurant.image }} style={styles.saveImage} />
              <View style={styles.cuisineBadge}>
                <Text style={styles.cuisineBadgeText}>{restaurant.cuisine}</Text>
              </View>
              <View style={styles.saveInfo}>
                <Text style={styles.saveTitle} numberOfLines={1}>{restaurant.name}</Text>
                <Text style={styles.saveLocation}>{restaurant.location}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Bookmark size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyTitle}>No Saves Yet</Text>
          <Text style={styles.emptyDescription}>
            Start building your collection of favorite restaurants
          </Text>
          <TouchableOpacity style={styles.emptyCTA} onPress={() => router.push('/explore')}>
            <Text style={styles.emptyCTAText}>Explore Restaurants</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBoardsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Grid3X3 size={32} color="#DDD" />
        </View>
        <Text style={styles.emptyTitle}>Create Your First Board</Text>
        <Text style={styles.emptyDescription}>
          Organize your saved restaurants into collections
        </Text>
        <TouchableOpacity style={styles.emptyCTA}>
          <Plus size={20} color={designTokens.colors.white} />
          <Text style={styles.emptyCTAText}>Create Board</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPostsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <MessageSquare size={32} color="#DDD" />
        </View>
        <Text style={styles.emptyTitle}>Share Your First Experience</Text>
        <Text style={styles.emptyDescription}>
          Post about your restaurant visits and build your foodie reputation
        </Text>
        <TouchableOpacity style={styles.emptyCTA}>
          <Plus size={20} color={designTokens.colors.white} />
          <Text style={styles.emptyCTAText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
      >
        {renderHeader()}
        {renderProfileInfo()}
        {renderTabs()}
        
        {activeTab === 'saves' && renderSavesTab()}
        {activeTab === 'boards' && renderBoardsTab()}
        {activeTab === 'posts' && renderPostsTab()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

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
});