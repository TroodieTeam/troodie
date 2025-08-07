import { CreatePostButton } from '@/components/community/CreatePostButton';
import { ReasonModal } from '@/components/community/ReasonModal';
import { PostCard } from '@/components/PostCard';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Community, communityService } from '@/services/communityService';
import { CommunityAdminService } from '@/services/communityAdminService';
import { useCommunityPermissions, getRoleDisplayName, getRoleBadgeColor } from '@/utils/communityPermissions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  Edit,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  Trash2,
  TrendingUp,
  UserMinus,
  Users,
  FileText
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CommunityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const communityId = params.communityId as string;
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'about'>('feed');
  const [members, setMembers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Admin modals
  const [removeMemberModal, setRemoveMemberModal] = useState<{ visible: boolean; member: any }>({ 
    visible: false, 
    member: null 
  });
  const [deletePostModal, setDeletePostModal] = useState<{ visible: boolean; postId: string }>({ 
    visible: false, 
    postId: '' 
  });
  
  // Use permissions hook
  const { role, hasPermission } = useCommunityPermissions(communityId, user?.id);

  const loadCommunityData = async () => {
    if (!communityId) {
      console.error('No communityId provided to community-detail screen');
      Alert.alert('Error', 'Community ID is missing');
      router.back();
      return;
    }

    try {
      setRefreshing(true);
      
      // Get community with membership info if user is logged in
      let communityData;
      if (user) {
        communityData = await communityService.getCommunityWithMembership(communityId, user.id);
        if (communityData) {
          // Check if user is a member based on having a role
          setIsMember(!!communityData.user_role);
        }
      } else {
        communityData = await communityService.getCommunity(communityId);
      }
      
      if (!communityData) {
        Alert.alert('Error', 'Community not found');
        router.back();
        return;
      }
      setCommunity(communityData);
      
      // Get community members
      const membersData = await communityService.getCommunityMembers(communityId);
      setMembers(membersData);
      
      // Load community posts (including cross-posted content)
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

  useEffect(() => {
    loadCommunityData();
  }, [communityId, user]);

  const handleJoinLeave = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!community) return;

    // Optimistic update - immediately update UI
    const previousMemberState = isMember;
    const previousMemberCount = community.member_count;
    
    // Update UI optimistically
    setIsMember(!isMember);
    setCommunity({
      ...community,
      member_count: isMember ? community.member_count - 1 : community.member_count + 1
    });

    try {
      if (previousMemberState) {
        const { success, error } = await communityService.leaveCommunity(user.id, community.id);
        if (success) {
          // Success - UI already updated optimistically
          // No toast for successful leave to avoid interrupting user flow
        } else {
          // Revert optimistic update on failure
          setIsMember(previousMemberState);
          setCommunity({
            ...community,
            member_count: previousMemberCount
          });
          // Only show error if it's not a duplicate action
          if (error && error !== 'Owners cannot leave their own community') {
            Alert.alert('Unable to leave', error);
          } else if (error === 'Owners cannot leave their own community') {
            Alert.alert('Action not allowed', error);
          }
        }
      } else {
        const { success, error } = await communityService.joinCommunity(user.id, community.id);
        if (success) {
          // Success - UI already updated optimistically
          // Show subtle success feedback
        } else {
          // Revert optimistic update on failure
          setIsMember(previousMemberState);
          setCommunity({
            ...community,
            member_count: previousMemberCount
          });
          // Only show error if it's not a duplicate action
          if (error) {
            Alert.alert('Unable to join', error);
          }
        }
      }
      
      // Refresh member list in background
      const membersData = await communityService.getCommunityMembers(community.id);
      setMembers(membersData);
    } catch (error) {
      // Revert optimistic update on network error
      setIsMember(previousMemberState);
      setCommunity({
        ...community,
        member_count: previousMemberCount
      });
      console.error('Error in handleJoinLeave:', error);
      // Don't show error toast for network issues, just revert the UI
    }
  };

  const handleEditCommunity = () => {
    router.push({
      pathname: '/add/community-edit',
      params: { communityId }
    });
  };

  const handleDeleteCommunity = () => {
    Alert.alert(
      'Delete Community',
      'Are you sure you want to delete this community? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { success, error } = await communityService.deleteCommunity(communityId);
              if (success) {
                Alert.alert('Success', 'Community deleted successfully');
                router.replace('/explore');
              } else {
                Alert.alert('Error', error || 'Failed to delete community');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete community');
            }
          }
        }
      ]
    );
  };
  
  const handleViewAuditLogs = () => {
    router.push({
      pathname: '/add/community-audit-logs',
      params: { communityId }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.user_id === memberId);
    if (!member) return;
    
    setRemoveMemberModal({ visible: true, member });
  };
  
  const handleRemoveMemberConfirm = async (reason: string) => {
    if (!removeMemberModal.member) return;
    
    try {
      const { success, error } = await CommunityAdminService.removeMember(
        communityId,
        removeMemberModal.member.user_id,
        reason
      );
      
      if (success) {
        setMembers(members.filter(m => m.user_id !== removeMemberModal.member.user_id));
        Alert.alert('Success', 'Member removed successfully');
      } else {
        Alert.alert('Error', error || 'Failed to remove member');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove member');
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeletePostModal({ visible: true, postId });
  };
  
  const handleDeletePostConfirm = async (reason: string) => {
    if (!deletePostModal.postId) return;
    
    try {
      const { success, error } = await CommunityAdminService.deletePost(
        deletePostModal.postId,
        reason
      );
      
      if (success) {
        setPosts(posts.filter(p => p.id !== deletePostModal.postId));
        Alert.alert('Success', 'Post deleted successfully');
      } else {
        Alert.alert('Error', error || 'Failed to delete post');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!community) return null;

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={22} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{community.name}</Text>
      {(hasPermission('update_settings') || hasPermission('delete_community') || hasPermission('view_audit_logs')) ? (
        <Menu>
          <MenuTrigger>
            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </MenuTrigger>
          <MenuOptions customStyles={menuOptionsStyles}>
            {hasPermission('update_settings') && (
              <MenuOption onSelect={handleEditCommunity}>
                <View style={styles.menuItem}>
                  <Edit size={16} color={theme.colors.text.primary} />
                  <Text style={styles.menuText}>Edit Community</Text>
                </View>
              </MenuOption>
            )}
            {hasPermission('view_audit_logs') && (
              <MenuOption onSelect={handleViewAuditLogs}>
                <View style={styles.menuItem}>
                  <FileText size={16} color={theme.colors.text.primary} />
                  <Text style={styles.menuText}>View Audit Logs</Text>
                </View>
              </MenuOption>
            )}
            {hasPermission('delete_community') && (
              <MenuOption onSelect={handleDeleteCommunity}>
                <View style={styles.menuItem}>
                  <Trash2 size={16} color={theme.colors.error} />
                  <Text style={[styles.menuText, { color: theme.colors.error }]}>Delete Community</Text>
                </View>
              </MenuOption>
            )}
          </MenuOptions>
        </Menu>
      ) : (
        <View style={styles.moreButton} />
      )}
    </View>
  );

  const renderCommunityHeader = () => (
    <View style={styles.communityHeader}>
      <Image 
        source={{ uri: community.cover_image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' }} 
        style={styles.coverImage} 
      />
      
      <View style={styles.communityInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.communityName}>{community.name}</Text>
          <View style={styles.badges}>
            {community.type === 'private' && (
              <View style={styles.badge}>
                <Lock size={12} color={theme.colors.text.tertiary} />
              </View>
            )}
            {community.is_event_based && (
              <View style={styles.badge}>
                <Calendar size={12} color={theme.colors.text.tertiary} />
              </View>
            )}
          </View>
        </View>
        
        {community.description && (
          <Text style={styles.description} numberOfLines={2}>
            {community.description}
          </Text>
        )}
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{community.member_count}</Text>
            <Text style={styles.statLabel}>members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{community.post_count}</Text>
            <Text style={styles.statLabel}>posts</Text>
          </View>
          {community.location && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <MapPin size={12} color={theme.colors.text.tertiary} />
                <Text style={styles.statLocation}>{community.location.split(',')[0]}</Text>
              </View>
            </>
          )}
        </View>
        
        {(!hasPermission('update_settings') || role === 'member') && (
          <TouchableOpacity 
            style={[styles.joinButton, isMember && styles.leaveButton]}
            onPress={handleJoinLeave}
          >
            <Text style={[styles.joinButtonText, isMember && styles.leaveButtonText]}>
              {isMember ? 'Leave' : 'Join Community'}
            </Text>
          </TouchableOpacity>
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
        <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Feed</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'members' && styles.tabActive]}
        onPress={() => setActiveTab('members')}
      >
        <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Members</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'about' && styles.tabActive]}
        onPress={() => setActiveTab('about')}
      >
        <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>About</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPostItem = ({ item }: { item: any }) => (
    <View style={styles.postWrapper}>
      <PostCard 
        post={item}
        onPress={() => router.push(`/posts/${item.id}`)}
        showActions={true}
      />
    </View>
  );

  const renderMemberItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.memberItem}
      onPress={() => {
        if (item.user_id) {
          router.push(`/user/${item.user_id}`);
        }
      }}
    >
      <Image 
        source={{ uri: item.user?.avatar_url || item.user?.profile_image_url || 'https://i.pravatar.cc/100' }} 
        style={styles.memberAvatar} 
      />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>
            {item.user?.name || item.user?.username || 'User'}
          </Text>
          {item.role !== 'member' && (
            <View style={[
              styles.roleBadge,
              { backgroundColor: getRoleBadgeColor(item.role) }
            ]}>
              <Text style={styles.roleBadgeText}>
                {getRoleDisplayName(item.role)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.memberBio} numberOfLines={1}>
          {item.user?.username ? `@${item.user.username}` : ''} {item.user?.bio || `Joined ${formatDate(item.joined_at)}`}
        </Text>
      </View>
      {hasPermission('remove_member') && item.user_id !== user?.id && item.role !== 'owner' && (
        <TouchableOpacity 
          style={styles.removeMember}
          onPress={() => handleRemoveMember(item.user_id)}
        >
          <UserMinus size={16} color={theme.colors.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderAboutTab = () => (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>Description</Text>
        <Text style={styles.aboutText}>{community.description || 'No description provided.'}</Text>
      </View>
      
      {community.location && (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>Location</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={theme.colors.text.tertiary} />
            <Text style={styles.aboutText}>{community.location}</Text>
          </View>
        </View>
      )}
      
      {community.category && (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>Category</Text>
          <Text style={styles.aboutText}>{community.category}</Text>
        </View>
      )}
      
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>Community Stats</Text>
        <View style={styles.aboutStats}>
          <View style={styles.aboutStat}>
            <Users size={20} color={theme.colors.text.secondary} />
            <Text style={styles.aboutStatValue}>{community.member_count}</Text>
            <Text style={styles.aboutStatLabel}>Members</Text>
          </View>
          <View style={styles.aboutStat}>
            <TrendingUp size={20} color={theme.colors.text.secondary} />
            <Text style={styles.aboutStatValue}>{community.post_count}</Text>
            <Text style={styles.aboutStatLabel}>Posts</Text>
          </View>
        </View>
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
              tintColor={theme.colors.primary}
            />
          }
        >
          {renderCommunityHeader()}
          {renderTabs()}
          
          {activeTab === 'feed' && (
            <FlatList
              data={posts}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MessageCircle size={32} color={theme.colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>No posts yet</Text>
                  <Text style={styles.emptyText}>Be the first to share!</Text>
                </View>
              }
            />
          )}
          
          {activeTab === 'members' && (
            <FlatList
              data={members}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={32} color={theme.colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>No members yet</Text>
                  <Text style={styles.emptyText}>Be the first to join!</Text>
                </View>
              }
            />
          )}
          
          {activeTab === 'about' && renderAboutTab()}
        </ScrollView>
        
        {isMember && activeTab === 'feed' && community && (
          <CreatePostButton 
            communityId={communityId}
            communityName={community.name}
          />
        )}
        
        {/* Reason Modals */}
        <ReasonModal
          visible={removeMemberModal.visible}
          onClose={() => setRemoveMemberModal({ visible: false, member: null })}
          onSubmit={handleRemoveMemberConfirm}
          title={`Remove ${removeMemberModal.member?.user?.name || 'member'}`}
          placeholder="Reason for removal (required)"
          submitText="Remove Member"
          requireReason={true}
        />
        
        <ReasonModal
          visible={deletePostModal.visible}
          onClose={() => setDeletePostModal({ visible: false, postId: '' })}
          onSubmit={handleDeletePostConfirm}
          title="Delete Post"
          placeholder="Reason for deletion (optional)"
          submitText="Delete Post"
          requireReason={false}
        />
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
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityHeader: {
    backgroundColor: '#FFFFFF',
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: 120,
  },
  communityInfo: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  communityName: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: theme.colors.text.primary,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
  statLocation: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  leaveButton: {
    backgroundColor: theme.colors.backgroundGray,
  },
  leaveButtonText: {
    color: theme.colors.text.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.tertiary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  postWrapper: {
    marginBottom: 8,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  postInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
  },
  postTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
  postMenu: {
    padding: 4,
  },
  postContent: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postActionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.tertiary,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
  },
  memberBio: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
  removeMember: {
    padding: 8,
  },
  aboutContainer: {
    padding: 16,
  },
  aboutSection: {
    marginBottom: 24,
  },
  aboutTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aboutStats: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
  },
  aboutStat: {
    alignItems: 'center',
  },
  aboutStatValue: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginVertical: 4,
  },
  aboutStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
    marginTop: 4,
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
    color: theme.colors.text.primary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});