import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Community, communityService } from '@/services/communityService';
import { userService } from '@/services/userService';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  Lock,
  MapPin,
  Search,
  TrendingUp,
  Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function CommunitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { updateNetworkProgress } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch communities data
  const fetchCommunities = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all public communities and user's private communities
      const allCommunities = await communityService.getCommunities(user?.id);
      
      // Filter based on search query
      const filtered = searchQuery 
        ? allCommunities.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.location?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allCommunities;
      
      setCommunities(filtered);
      
      // Fetch user's joined communities if logged in
      if (user) {
        const joined = await communityService.getUserCommunities(user.id);
        setUserCommunities(joined);
      } else {
        setUserCommunities([]);
      }
    } catch (err) {
      console.error('Error fetching communities:', err);
      setError('Failed to load communities. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCommunities();
  }, [fetchCommunities]);

  // Check if user is member of a community
  const isUserMember = useCallback((communityId: string) => {
    return userCommunities.some(c => c.id === communityId);
  }, [userCommunities]);
  // Handle join community
  const handleJoinCommunity = async (community: Community) => {
    if (!user) {
      router.push('/onboarding/login' as any);
      return;
    }

    try {
      const { success, error } = await communityService.joinCommunity(user.id, community.id);
      
      if (success) {
        // Update network progress
        try {
          await userService.updateNetworkProgress(user.id, 'community');
          updateNetworkProgress('community');
        } catch (error) {
          console.error('Error updating network progress:', error);
        }
        
        Alert.alert('Success', `You've joined ${community.name}!`);
        // Refresh communities to update membership status
        fetchCommunities();
      } else {
        Alert.alert('Error', error || 'Failed to join community');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCommunities();
    }, [fetchCommunities])
  );

  const handleCommunityPress = (community: Community) => {
    router.push({
      pathname: '/add/community-detail',
      params: { communityId: community.id }
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Communities</Text>
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => {
          if (user) {
            router.push('/add/create-community' as any);
          } else {
            router.push('/login' as any);
          }
        }}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Search size={20} color="#999" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search communities..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
        onPress={() => setActiveTab('discover')}
      >
        <Search size={20} color={activeTab === 'discover' ? theme.colors.primary : '#999'} />
        <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
          Discover
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'joined' && styles.tabActive]}
        onPress={() => setActiveTab('joined')}
      >
        <Users size={20} color={activeTab === 'joined' ? theme.colors.primary : '#999'} />
        <Text style={[styles.tabText, activeTab === 'joined' && styles.tabTextActive]}>
          Joined ({userCommunities.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCommunityCard = (community: Community) => {
    const isMember = isUserMember(community.id);
    const coverImage = community.is_event_based 
      ? 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
      : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';
    
    return (
      <TouchableOpacity
        key={community.id}
        style={styles.communityCard}
        onPress={() => handleCommunityPress(community)}
      >
        <Image source={{ uri: coverImage }} style={styles.communityImage} />
      
      {community.type === 'private' && (
        <View style={styles.privateBadge}>
          <Lock size={14} color="#FFFFFF" />
          <Text style={styles.privateText}>Private</Text>
        </View>
      )}
      
      {community.is_event_based && (
        <View style={styles.eventBadge}>
          <Calendar size={12} color="#FFFFFF" />
          <Text style={styles.eventText}>Event</Text>
        </View>
      )}
      
      <View style={styles.communityContent}>
        <Text style={styles.communityName}>{community.name}</Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {community.description}
        </Text>
        
        <View style={styles.communityStats}>
          <View style={styles.stat}>
            <Users size={14} color="#666" />
            <Text style={styles.statText}>{community.member_count.toLocaleString()} members</Text>
          </View>
          
          {community.post_count > 0 && (
            <View style={styles.stat}>
              <TrendingUp size={14} color="#666" />
              <Text style={styles.statText}>{community.post_count} posts</Text>
            </View>
          )}
        </View>
        
        <View style={styles.communityFooter}>
          <View style={styles.locationTag}>
            <MapPin size={12} color="#666" />
            <Text style={styles.locationText}>{community.location}</Text>
          </View>
          
        </View>
        
        {!isMember && community.type === 'public' && (
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => handleJoinCommunity(community)}
          >
            <Text style={styles.joinButtonText}>Join Community</Text>
          </TouchableOpacity>
        )}
        
        {isMember && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Member</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    );
  };

  const renderFeaturedSection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading communities...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCommunities}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (communities.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Users size={48} color="#DDD" />
          <Text style={styles.emptyTitle}>No Communities Found</Text>
          <Text style={styles.emptyDescription}>
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : 'Be the first to create a community!'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discover Communities</Text>
        {communities.map(renderCommunityCard)}
      </View>
    );
  };

  const renderJoinedSection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your communities...</Text>
        </View>
      );
    }

    if (userCommunities.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Users size={48} color="#DDD" />
          <Text style={styles.emptyTitle}>No Communities Yet</Text>
          <Text style={styles.emptyDescription}>
            Join communities to connect with like-minded food enthusiasts
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Communities</Text>
        {userCommunities.map(renderCommunityCard)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {renderSearchBar()}
        {renderTabs()}
        
        {activeTab === 'discover' ? renderFeaturedSection() : renderJoinedSection()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#999',
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  sectionLink: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  communityImage: {
    width: '100%',
    height: 120,
  },
  privateBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  privateText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  eventBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  eventText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  communityContent: {
    padding: 16,
  },
  communityName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  priceTag: {
    marginLeft: 'auto',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  communityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  memberBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  memberBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.dark,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  signInButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 50,
  },
});