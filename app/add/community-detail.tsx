import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Users,
  TrendingUp,
  MapPin,
  Crown,
  Calendar,
  Heart,
  MessageCircle,
  Bookmark,
  ChevronRight,
  CheckCircle,
  Lock,
  MoreVertical
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { communityService, Community } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { CreatePostButton } from '@/components/community/CreatePostButton';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
  MenuProvider,
} from 'react-native-popup-menu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CommunityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const communityId = params.communityId as string;
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'events'>('feed');
  const [members, setMembers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load all community data
  const loadCommunityData = async () => {
    if (!communityId) {
      router.back();
      return;
    }

    try {
      setRefreshing(true);
      
      // Load community details
      const communityData = await communityService.getCommunityById(communityId);
      if (!communityData) {
        Alert.alert('Error', 'Community not found');
        router.back();
        return;
      }
      
      setCommunity(communityData);
      
      // Check if user is a member and admin
      if (user) {
        const membership = await communityService.isUserMember(user.id, communityId);
        setIsMember(membership.isMember);
        
        const adminStatus = await communityService.checkAdminStatus(user.id, communityId);
        setIsAdmin(adminStatus);
      }
      
      // Load members
      const membersData = await communityService.getCommunityMembersWithDetails(communityId, 50);
      setMembers(membersData);
      
      // Load posts
      const postsData = await communityService.getCommunityPosts(communityId, 20);
      setPosts(postsData);
      
    } catch (error) {
      console.error('Error fetching community data:', error);
      Alert.alert('Error', 'Failed to load community details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadCommunityData();
  }, [communityId, user]);

  // Handle join/leave community
  const handleJoinLeave = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!community) return;

    try {
      if (isMember) {
        const { success, error } = await communityService.leaveCommunity(user.id, community.id);
        if (success) {
          setIsMember(false);
          Alert.alert('Success', 'You have left the community');
        } else {
          Alert.alert('Error', error || 'Failed to leave community');
        }
      } else {
        const { success, error } = await communityService.joinCommunity(user.id, community.id);
        if (success) {
          setIsMember(true);
          Alert.alert('Success', 'You have joined the community!');
        } else {
          Alert.alert('Error', error || 'Failed to join community');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // Navigate to member profile
  const handleMemberPress = (member: any) => {
    if (member.user?.username) {
      router.push(`/profile/${member.user.username}`);
    }
  };
  
  // Handle edit community
  const handleEditCommunity = () => {
    router.push({
      pathname: '/community/edit',
      params: { communityId }
    });
  };
  
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return null;
  }

  const coverImage = community.is_event_based 
    ? 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
    : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Community</Text>
      {isAdmin ? (
        <Menu>
          <MenuTrigger>
            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical size={24} color="#333" />
            </TouchableOpacity>
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={handleEditCommunity}>
              <Text style={styles.menuOption}>Edit Community</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      ) : (
        <View style={styles.moreButton} />
      )}
    </View>
  );

  const renderCommunityInfo = () => (
    <View>
      <Image source={{ uri: coverImage }} style={styles.coverImage} />
      
      <View style={styles.communityInfo}>
        <View style={styles.communityHeader}>
          <Text style={styles.communityName}>{community.name}</Text>
          {community.type === 'private' && (
            <View style={styles.privateBadge}>
              <Lock size={16} color="#FFFFFF" />
              <Text style={styles.privateText}>Private</Text>
            </View>
          )}
          {community.is_event_based && (
            <View style={styles.eventBadge}>
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.eventText}>Event</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.communityDescription}>{community.description || 'Welcome to our community!'}</Text>
        
        {community.created_by && (
          <View style={styles.adminInfo}>
            <View style={styles.adminAvatar}>
              <Users size={20} color="#666" />
            </View>
            <View>
              <Text style={styles.adminLabel}>Created by community admin</Text>
            </View>
          </View>
        )}
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Users size={20} color="#666" />
            <Text style={styles.statValue}>{community.member_count.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <TrendingUp size={20} color="#666" />
            <Text style={styles.statValue}>{community.post_count}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          
          {community.location && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MapPin size={20} color="#666" />
                <Text style={styles.statValue}>{community.location.split(',')[0]}</Text>
                <Text style={styles.statLabel}>Location</Text>
              </View>
            </>
          )}
        </View>
        
        {community.type === 'public' && (
          <TouchableOpacity 
            style={[
              styles.joinButton,
              isMember && styles.joinButtonSecondary
            ]}
            onPress={handleJoinLeave}
          >
            <Text style={[
              styles.joinButtonText,
              isMember && styles.joinButtonTextSecondary
            ]}>
              {isMember ? 'Leave Community' : 'Join Community'}
            </Text>
          </TouchableOpacity>
        )}
        
        {community.type === 'private' && !isMember && (
          <View style={styles.privateMessage}>
            <Lock size={16} color="#666" />
            <Text style={styles.privateMessageText}>This is a private community. You need an invitation to join.</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
        onPress={() => setActiveTab('feed')}
      >
        <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
          Feed
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'members' && styles.tabActive]}
        onPress={() => setActiveTab('members')}
      >
        <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
          Members
        </Text>
      </TouchableOpacity>
      
      {community.is_event_based && (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
            Event Info
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPost = (post: any) => (
    <TouchableOpacity 
      key={post.id} 
      style={styles.postCard}
      onPress={() => router.push(`/post/${post.id}`)}
    >
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: post.user?.avatar_url || 'https://via.placeholder.com/40' }} 
          style={styles.postAvatar} 
        />
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{post.user?.name || 'Anonymous'}</Text>
          <Text style={styles.postTime}>
            {formatDate(post.created_at)}
          </Text>
        </View>
      </View>
      
      {post.caption && <Text style={styles.postContent}>{post.caption}</Text>}
      
      {post.photos && post.photos.length > 0 && (
        <Image source={{ uri: post.photos[0] }} style={styles.postImage} />
      )}
      
      {post.restaurant && (
        <View style={styles.restaurantTag}>
          <MapPin size={14} color="#666" />
          <Text style={styles.restaurantName}>{post.restaurant.name}</Text>
        </View>
      )}
      
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction}>
          <Heart size={18} color="#666" />
          <Text style={styles.postActionText}>{post.likes || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <MessageCircle size={18} color="#666" />
          <Text style={styles.postActionText}>{post.commentCount || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Bookmark size={18} color="#666" />
          <Text style={styles.postActionText}>Save</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFeed = () => (
    <View style={styles.feedContainer}>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={48} color="#999" />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateMessage}>
            Be the first to share something with the community!
          </Text>
        </View>
      ) : (
        posts.map(renderPost)
      )}
    </View>
  );

  const renderMembers = () => (
    <View style={styles.membersContainer}>
      <Text style={styles.sectionTitle}>
        Members ({members.length})
      </Text>
      
      {members.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={48} color="#999" />
          <Text style={styles.emptyStateTitle}>No members yet</Text>
          <Text style={styles.emptyStateMessage}>
            Be the first to join this community!
          </Text>
        </View>
      ) : (
        members.map((member) => (
          <TouchableOpacity 
            key={member.id} 
            style={styles.memberItem}
            onPress={() => handleMemberPress(member)}
          >
            <Image 
              source={{ uri: member.user?.avatar_url || 'https://via.placeholder.com/48' }} 
              style={styles.memberAvatar} 
            />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.user?.name || 'Anonymous'}</Text>
              <Text style={styles.memberRole}>{member.user?.bio || 'Member'}</Text>
              <Text style={styles.memberJoined}>
                Joined {formatDate(member.joined_at)}
              </Text>
            </View>
            {(member.role === 'admin' || member.role === 'owner') && (
              <View style={styles.adminBadge}>
                <Crown size={16} color="#FFD700" />
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderEvents = () => (
    <View style={styles.eventsContainer}>
      <View style={styles.eventCard}>
        <Calendar size={24} color={theme.colors.primary} />
        <Text style={styles.eventTitle}>Main Conference</Text>
        <Text style={styles.eventDate}>March 15-17, 2025</Text>
        <ChevronRight size={20} color="#999" />
      </View>
    </View>
  );

  return (
    <MenuProvider>
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing}
              onRefresh={loadCommunityData}
              colors={[theme.colors.primary]}
            />
          }
        >
          {renderCommunityInfo()}
          {renderTabs()}
          
          {activeTab === 'feed' && renderFeed()}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'events' && renderEvents()}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
        
        {isMember && activeTab === 'feed' && community && (
          <CreatePostButton 
            communityId={communityId}
            communityName={community.name}
          />
        )}
      </SafeAreaView>
    </MenuProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 20,
    color: '#666',
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: 180,
  },
  communityInfo: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  premiumText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFD700',
  },
  communityDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  adminLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonPremium: {
    backgroundColor: '#FFD700',
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#999',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  feedContainer: {
    padding: 20,
  },
  feedRecommendation: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    marginBottom: 4,
  },
  feedTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    marginBottom: 20,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  postContent: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  membersContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  memberJoined: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  adminBadge: {
    padding: 4,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  eventsContainer: {
    padding: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  eventDate: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  bottomPadding: {
    height: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginTop: 16,
  },
  emptyStateMessage: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  restaurantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  menuOption: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 12,
  },
  joinButtonSecondary: {
    backgroundColor: '#E5E7EB',
  },
  joinButtonTextSecondary: {
    color: theme.colors.text.dark,
  },
  privateMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  privateMessageText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  privateBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privateText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  eventBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
});