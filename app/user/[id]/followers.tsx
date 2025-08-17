import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import UserSearchResult from '@/components/UserSearchResult';
import { followService } from '@/services/followService';
import { useAuth } from '@/contexts/AuthContext';
import { designTokens } from '@/constants/designTokens';
import { SearchUserResult } from '@/lib/supabase';

export default function FollowersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [followers, setFollowers] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchFollowers = useCallback(async (refresh = false) => {
    if (!id) return;
    
    try {
      if (refresh) {
        setRefreshing(true);
        setOffset(0);
      }
      
      const { data, error } = await followService.getFollowers(
        id,
        refresh ? 0 : offset,
        limit
      );
      
      if (error) {
        console.error('Error fetching followers:', error);
        return;
      }
      
      const followersData = data || [];
      
      if (refresh) {
        setFollowers(followersData);
      } else {
        setFollowers(prev => [...prev, ...followersData]);
      }
      
      setHasMore(followersData.length === limit);
      setOffset(prev => prev + followersData.length);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, offset]);

  useEffect(() => {
    fetchFollowers(true);
  }, [id]);

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchFollowers(false);
    }
  };

  const handleRefresh = () => {
    fetchFollowers(true);
  };

  const handleFollowToggle = () => {
    // Refresh the list after follow/unfollow
    fetchFollowers(true);
  };

  const renderFollower = ({ item }: { item: SearchUserResult }) => (
    <UserSearchResult 
      user={item} 
      onFollowToggle={handleFollowToggle}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No followers yet</Text>
        <Text style={styles.emptySubtext}>
          {id === currentUser?.id 
            ? "When people follow you, they'll appear here"
            : "This user doesn't have any followers yet"}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || followers.length === 0) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={followers}
        renderItem={renderFollower}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={designTokens.colors.primaryOrange}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});