import { RestaurantCard } from '@/components/cards/RestaurantCard';
import SettingsModal from '@/components/modals/SettingsModal';
import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { personas } from '@/data/personas';
import { Board, CompletionSuggestion } from '@/types/core';
import { useRouter } from 'expo-router';
import {
    Award,
    Bookmark,
    Camera,
    CheckCircle,
    Edit3,
    FileText,
    Grid3X3,
    Plus,
    Settings,
    Share2
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type TabType = 'saves' | 'boards' | 'posts';

export default function ProfileScreen() {
  const router = useRouter();
  const { userState } = useApp();
  const { state: onboardingState } = useOnboarding();
  const [activeTab, setActiveTab] = useState<TabType>('saves');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const persona = onboardingState.persona && personas[onboardingState.persona];

  // Mock user data
  const userData = {
    name: 'Jordan Davis',
    username: '@jordan_eats',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: '',
    stats: {
      followers: userState.friendsCount,
      following: 12,
      saves: userState.isNewUser ? 0 : 24,
      posts: userState.isNewUser ? 0 : 3
    }
  };

  // Profile completion suggestions
  const completionSuggestions: CompletionSuggestion[] = [
    {
      id: 1,
      action: 'Add Profile Photo',
      description: 'Help others recognize you',
      icon: Camera,
      completed: false,
      points: 20,
      onClick: () => {}
    },
    {
      id: 2,
      action: 'Write Bio',
      description: 'Tell others about yourself',
      icon: Edit3,
      completed: false,
      points: 15,
      onClick: () => {}
    },
    {
      id: 3,
      action: 'Save 5 Restaurants',
      description: `${userData.stats.saves}/5 completed`,
      icon: Bookmark,
      completed: userData.stats.saves >= 5,
      points: 25,
      onClick: () => router.push('/explore')
    },
    {
      id: 4,
      action: 'Follow 10 Troodies',
      description: `${userData.stats.following}/10 completed`,
      icon: Award,
      completed: userData.stats.following >= 10,
      points: 20,
      onClick: () => router.push('/explore')
    },
  ];

  const completedPoints = completionSuggestions
    .filter(s => s.completed)
    .reduce((sum, s) => sum + s.points, 0);
  const totalPoints = completionSuggestions
    .reduce((sum, s) => sum + s.points, 0);
  const completionPercentage = Math.round((completedPoints / totalPoints) * 100);

  // Mock data for saved restaurants
  const savedRestaurants = userState.isNewUser ? [] : [
    {
      id: 1,
      name: 'The Italian Place',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      cuisine: 'Italian',
      rating: 4.8,
      location: 'West Village',
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

  // Mock data for boards
  const boards: Board[] = userState.isNewUser ? [] : [
    {
      id: 1,
      title: 'Date Night Spots',
      count: 8,
      isPrivate: false,
      previewImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
      description: 'Romantic restaurants for special occasions',
      createdAt: new Date()
    }
  ];

  // Mock data for posts
  // const posts: Post[] = [];

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={() => setShowSettingsModal(true)}
      >
        <Settings size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );

  const renderProfileInfo = () => (
    <View style={styles.profileInfo}>
      <TouchableOpacity style={styles.avatarContainer}>
        <Image source={{ uri: userData.avatar }} style={styles.avatar} />
        <View style={styles.editAvatarButton}>
          <Camera size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <Text style={styles.name}>{userData.name}</Text>
      <Text style={styles.username}>{userData.username}</Text>
      
      {persona && (
        <View style={styles.personaBadge}>
          <Text style={styles.personaEmoji}>{persona.emoji}</Text>
          <Text style={styles.personaName}>{persona.name}</Text>
        </View>
      )}

      {userData.bio ? (
        <Text style={styles.bio}>{userData.bio}</Text>
      ) : (
        <TouchableOpacity style={styles.addBioButton}>
          <Text style={styles.addBioText}>Add bio</Text>
        </TouchableOpacity>
      )}

      <View style={styles.stats}>
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.saves}</Text>
          <Text style={styles.statLabel}>Saves</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{userData.stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Share2 size={20} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileCompletion = () => (
    userState.isNewUser && (
      <View style={styles.completionSection}>
        <View style={styles.completionHeader}>
          <Text style={styles.completionTitle}>Complete Your Profile</Text>
          <Text style={styles.completionPercentage}>{completionPercentage}%</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
        </View>

        <View style={styles.completionSuggestions}>
          {completionSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[
                styles.suggestionItem,
                suggestion.completed && styles.suggestionCompleted
              ]}
              onPress={suggestion.onClick}
              disabled={suggestion.completed}
            >
              <View style={[
                styles.suggestionIcon,
                suggestion.completed && styles.suggestionIconCompleted
              ]}>
                {suggestion.completed ? (
                  <CheckCircle size={20} color="#2ECC71" />
                ) : (
                  <suggestion.icon size={20} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.suggestionContent}>
                <Text style={[
                  styles.suggestionAction,
                  suggestion.completed && styles.suggestionActionCompleted
                ]}>
                  {suggestion.action}
                </Text>
                <Text style={styles.suggestionDescription}>
                  {suggestion.description}
                </Text>
              </View>
              <Text style={[
                styles.suggestionPoints,
                suggestion.completed && styles.suggestionPointsCompleted
              ]}>
                +{suggestion.points}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'saves' && styles.activeTab]}
        onPress={() => setActiveTab('saves')}
      >
        <Bookmark size={20} color={activeTab === 'saves' ? theme.colors.primary : '#999'} />
        <Text style={[styles.tabText, activeTab === 'saves' && styles.activeTabText]}>
          Saves
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'boards' && styles.activeTab]}
        onPress={() => setActiveTab('boards')}
      >
        <Grid3X3 size={20} color={activeTab === 'boards' ? theme.colors.primary : '#999'} />
        <Text style={[styles.tabText, activeTab === 'boards' && styles.activeTabText]}>
          Boards
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
        onPress={() => setActiveTab('posts')}
      >
        <FileText size={20} color={activeTab === 'posts' ? theme.colors.primary : '#999'} />
        <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
          Posts
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSavesTab = () => (
    <View style={styles.tabContent}>
      {savedRestaurants.length > 0 ? (
        <View style={styles.savesGrid}>
          {savedRestaurants.map((restaurant) => (
            <View key={restaurant.id} style={styles.saveItem}>
              <RestaurantCard restaurant={restaurant} compact />
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
      {boards.length > 0 ? (
        <View style={styles.boardsList}>
          {boards.map((board) => (
            <TouchableOpacity key={board.id} style={styles.boardItem}>
              <Image source={{ uri: board.previewImage }} style={styles.boardImage} />
              <View style={styles.boardInfo}>
                <Text style={styles.boardTitle}>{board.title}</Text>
                <Text style={styles.boardDescription}>{board.description}</Text>
                <Text style={styles.boardCount}>{board.count} restaurants</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Grid3X3 size={32} color="#DDD" />
          </View>
          <Text style={styles.emptyTitle}>Create Your First Board</Text>
          <Text style={styles.emptyDescription}>
            Organize your saved restaurants into collections
          </Text>
          <TouchableOpacity style={styles.emptyCTA}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.emptyCTAText}>Create Board</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPostsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <FileText size={32} color="#DDD" />
        </View>
        <Text style={styles.emptyTitle}>Share Your First Experience</Text>
        <Text style={styles.emptyDescription}>
          Post about your restaurant visits and build your foodie reputation
        </Text>
        <TouchableOpacity style={styles.emptyCTA}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.emptyCTAText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderProfileInfo()}
        {renderProfileCompletion()}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 12,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  personaEmoji: {
    fontSize: 16,
  },
  personaName: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  addBioButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  addBioText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
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
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editProfileButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#F0F0F0',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  completionPercentage: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  completionSuggestions: {
    gap: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  suggestionCompleted: {
    opacity: 0.7,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionIconCompleted: {
    backgroundColor: '#2ECC71' + '20',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionAction: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  suggestionActionCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  suggestionDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  suggestionPoints: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: theme.colors.primary,
  },
  suggestionPointsCompleted: {
    color: '#2ECC71',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#999',
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  tabContent: {
    minHeight: 300,
  },
  savesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  saveItem: {
    width: '47%',
  },
  boardsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  boardItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  boardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  boardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  boardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  boardDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  boardCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
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
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCTA: {
    backgroundColor: theme.colors.primary,
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
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 100,
  },
});