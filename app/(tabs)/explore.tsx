import { ExplorePostCard } from '@/components/cards/ExplorePostCard';
import { theme } from '@/constants/theme';
import { designTokens } from '@/constants/designTokens';
import { ExploreFilter, ExplorePost } from '@/types/core';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { FlatGrid } from 'react-native-super-grid';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ExploreFilter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const filters: ExploreFilter[] = ['All', 'Friends', 'Trending', 'Nearby', 'New', 'Top Rated'];

  // Mock data for explore posts
  const explorePosts: ExplorePost[] = [
    {
      id: 1,
      restaurant: {
        id: 1,
        name: 'Sakura Omakase',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
        cuisine: 'Japanese',
        rating: 4.9,
        location: 'East Village',
        priceRange: '$$$$',
      },
      user: {
        id: 1,
        name: 'Sarah Chen',
        username: 'sarahchen',
        avatar: 'https://i.pravatar.cc/150?img=1',
        persona: 'Luxe Planner',
        verified: true,
        followers: 1247
      },
      socialProof: {
        friendsVisited: ['Emma Wilson', 'Mike Rodriguez'],
        friendsPhotos: [],
        totalFriendVisits: 5,
        mutualFriends: 3
      },
      photos: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800'],
      engagement: {
        likes: 273,
        saves: 89,
        comments: 41
      },
      trending: true,
      caption: 'Perfect date night spot! The sunset views are incredible 😍',
      time: '2 hours ago'
    },
    {
      id: 2,
      restaurant: {
        id: 2,
        name: 'RoofTop Garden',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
        cuisine: 'Mediterranean',
        rating: 4.7,
        location: 'SoHo',
        priceRange: '$$$',
      },
      user: {
        id: 2,
        name: 'Emma Wilson',
        username: 'emmawilson',
        avatar: 'https://i.pravatar.cc/150?img=2',
        persona: 'Foodie Explorer',
        verified: false,
        followers: 892
      },
      socialProof: {
        friendsVisited: [],
        friendsPhotos: [],
        totalFriendVisits: 0,
        mutualFriends: 0
      },
      photos: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800'],
      engagement: {
        likes: 156,
        saves: 62,
        comments: 23
      },
      trending: false,
      caption: 'Incredible omakase experience! Every course was perfection.',
      time: '5 hours ago'
    },
    {
      id: 3,
      restaurant: {
        id: 3,
        name: 'Corner Coffee Co',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
        cuisine: 'Coffee & Brunch',
        rating: 4.5,
        location: 'Brooklyn',
        priceRange: '$',
      },
      user: {
        id: 3,
        name: 'Mike Rodriguez',
        username: 'mikerodriguez',
        avatar: 'https://i.pravatar.cc/150?img=3',
        persona: 'Local Explorer',
        verified: true,
        followers: 567
      },
      socialProof: {
        friendsVisited: ['Sarah Chen'],
        friendsPhotos: [],
        totalFriendVisits: 2,
        mutualFriends: 2
      },
      photos: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800'],
      engagement: {
        likes: 89,
        saves: 34,
        comments: 12
      },
      trending: false,
      caption: 'Best coffee in Brooklyn! Their pastries are also worth the trip.',
      time: '1 day ago'
    },
    {
      id: 4,
      restaurant: {
        id: 4,
        name: 'The Italian Place',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        cuisine: 'Italian',
        rating: 4.8,
        location: 'West Village',
        priceRange: '$$$',
      },
      user: {
        id: 4,
        name: 'Alex Kim',
        username: 'alexkim',
        avatar: 'https://i.pravatar.cc/150?img=4',
        persona: 'Culinary Adventurer',
        verified: false,
        followers: 423
      },
      socialProof: {
        friendsVisited: ['Emma Wilson', 'Sarah Chen', 'Mike Rodriguez'],
        friendsPhotos: [],
        totalFriendVisits: 8,
        mutualFriends: 5
      },
      photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
      engagement: {
        likes: 342,
        saves: 128,
        comments: 56
      },
      trending: true,
      caption: 'Authentic pasta that reminds me of Italy! Must-try: truffle ravioli',
      time: '3 days ago'
    },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Discover through your network</Text>
      
      <View style={styles.searchContainer}>
        <Search size={20} color={designTokens.colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants, friends, or cuisines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.filterButton}>
          <SlidersHorizontal size={20} color={designTokens.colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterPill,
              activeFilter === filter && styles.filterPillActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter && styles.filterTextActive
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatGrid
        ListHeaderComponent={renderHeader}
        itemDimension={150}
        data={explorePosts}
        style={styles.gridView}
        spacing={12}
        renderItem={({ item }) => (
          <ExplorePostCard
            post={item}
            onPress={() => {}}
            onLike={() => {}}
            onComment={() => {}}
            onSave={() => {}}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
        showsVerticalScrollIndicator={false}
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
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.lg,
  },
  title: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  subtitle: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.lg,
    height: 48,
    marginBottom: designTokens.spacing.md,
  },
  searchIcon: {
    marginRight: designTokens.spacing.md,
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.inputText,
    color: designTokens.colors.textDark,
  },
  filterButton: {
    padding: designTokens.spacing.sm,
    marginLeft: designTokens.spacing.sm,
  },
  filtersContainer: {
    marginHorizontal: -designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
  },
  filtersContent: {
    paddingRight: 40,
    gap: designTokens.spacing.sm,
  },
  filterPill: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundGray,
    marginRight: designTokens.spacing.sm,
  },
  filterPillActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  filterText: {
    ...designTokens.typography.filterText,
    color: designTokens.colors.textMediumDark,
  },
  filterTextActive: {
    color: designTokens.colors.white,
  },
  gridView: {
    flex: 1,
  },
});
