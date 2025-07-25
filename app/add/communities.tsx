import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Search,
  MapPin,
  Users,
  TrendingUp,
  Crown,
  Calendar,
  Lock
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Community } from '@/types/add-flow';
import { useAuth } from '@/contexts/AuthContext';

export default function CommunitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');

  // Mock communities data
  const featuredCommunities: Community[] = [
    {
      id: '1',
      name: 'TechCrunch Disrupt 2025',
      description: 'Connect with fellow attendees and discover SF&apos;s best eats',
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      category: 'Event',
      location: 'San Francisco, CA',
      memberCount: 1247,
      activityLevel: 23,
      type: 'paid',
      price: 9.99,
      admin: {
        name: 'TechCrunch Team',
        avatar: 'https://i.pravatar.cc/150?img=10',
        verified: true,
        bio: 'Community Admin'
      },
      stats: {
        postsToday: 23,
        activeMembers: 234,
        recentPhotos: []
      },
      isPremium: true
    },
    {
      id: '2',
      name: 'South End Foodies',
      description: 'Boston&apos;s South End neighborhood food enthusiasts',
      coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      category: 'Location',
      location: 'Boston, MA',
      memberCount: 892,
      activityLevel: 15,
      type: 'public',
      admin: {
        name: 'Sarah Chen',
        avatar: 'https://i.pravatar.cc/150?img=1',
        verified: false,
        bio: 'Local food blogger'
      },
      stats: {
        postsToday: 15,
        activeMembers: 156,
        recentPhotos: []
      }
    },
    {
      id: '3',
      name: 'Downtown Charlotte Eats',
      description: 'Best spots in uptown Charlotte',
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      category: 'Location',
      location: 'Charlotte, NC',
      memberCount: 567,
      activityLevel: 12,
      type: 'public',
      admin: {
        name: 'Admin',
        avatar: 'https://i.pravatar.cc/150?img=2',
        verified: false,
        bio: 'Community Admin'
      },
      stats: {
        postsToday: 12,
        activeMembers: 89,
        recentPhotos: []
      }
    }
  ];

  const joinedCommunities: Community[] = [
    {
      id: '4',
      name: 'CTRL+ALT+SYNC 2025',
      description: 'Charlotte tech conference attendees',
      coverImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800',
      category: 'Event',
      location: 'Charlotte, NC',
      memberCount: 234,
      activityLevel: 8,
      type: 'public',
      admin: {
        name: 'Event Team',
        avatar: 'https://i.pravatar.cc/150?img=3',
        verified: true,
        bio: 'Official event organizers'
      },
      stats: {
        postsToday: 8,
        activeMembers: 45,
        recentPhotos: []
      },
      isJoined: true
    }
  ];

  const handleCommunityPress = (community: Community) => {
    router.push({
      pathname: '/add/community-detail',
      params: { community: JSON.stringify(community) }
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
          Joined ({joinedCommunities.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCommunityCard = (community: Community) => (
    <TouchableOpacity
      key={community.id}
      style={styles.communityCard}
      onPress={() => handleCommunityPress(community)}
    >
      <Image source={{ uri: community.coverImage }} style={styles.communityImage} />
      
      {community.isPremium && (
        <View style={styles.premiumBadge}>
          <Crown size={14} color="#FFFFFF" />
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      )}
      
      {community.category === 'Event' && (
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
            <Text style={styles.statText}>{community.memberCount.toLocaleString()}</Text>
          </View>
          
          <View style={styles.stat}>
            <TrendingUp size={14} color="#666" />
            <Text style={styles.statText}>{community.activityLevel} today</Text>
          </View>
          
          {community.price && (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>${community.price.toFixed(2)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.communityFooter}>
          <View style={styles.locationTag}>
            <MapPin size={12} color="#666" />
            <Text style={styles.locationText}>{community.location}</Text>
          </View>
          
          {community.type === 'private' && (
            <Lock size={14} color="#666" />
          )}
        </View>
        
        {!community.isJoined && (
          <TouchableOpacity 
            style={[
              styles.joinButton,
              community.isPremium && styles.joinButtonPremium
            ]}
          >
            <Text style={[
              styles.joinButtonText,
              community.isPremium && styles.joinButtonTextPremium
            ]}>
              {community.price ? `Join for $${community.price.toFixed(2)}` : 'Join Community'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Communities</Text>
        <TouchableOpacity>
          <Text style={styles.sectionLink}>Hot</Text>
        </TouchableOpacity>
      </View>
      
      {featuredCommunities.map(renderCommunityCard)}
    </View>
  );

  const renderJoinedSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Communities</Text>
      
      {joinedCommunities.length > 0 ? (
        joinedCommunities.map(renderCommunityCard)
      ) : (
        <View style={styles.emptyState}>
          <Users size={48} color="#DDD" />
          <Text style={styles.emptyTitle}>No Communities Yet</Text>
          <Text style={styles.emptyDescription}>
            Join communities to connect with like-minded food enthusiasts
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
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
  premiumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  premiumText: {
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
  joinButtonPremium: {
    backgroundColor: '#FFD700',
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  joinButtonTextPremium: {
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