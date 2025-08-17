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

export default function FollowingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [following, setFollowing] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchFollowing = useCallback(async (refresh = false) => {
    if (!id) return;
    
    try {
      if (refresh) {
        setRefreshing(true);
        setOffset(0);
      }
      
      const { data, error } = await followService.getFollowing(
        id,
        refresh ? 0 : offset,
        limit
      );
      
      if (error) {
        console.error('Error fetching following:', error);
        return;
      }
      
      const followingData = data || [];
      
      if (refresh) {
        setFollowing(followingData);
      } else {
        setFollowing(prev => [...prev, ...followingData]);
      }
      
      setHasMore(followingData.length === limit);
      setOffset(prev => prev + followingData.length);
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, offset]);

  useEffect(() => {
    fetchFollowing(true);
  }, [id]);

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchFollowing(false);
    }
  };

  const handleRefresh = () => {
    fetchFollowing(true);
  };

  const handleFollowToggle = () => {
    // Refresh the list after follow/unfollow
    fetchFollowing(true);
  };

  const renderFollowing = ({ item }: { item: SearchUserResult }) => (
    <UserSearchResult 
      user={item} 
      onFollowToggle={handleFollowToggle}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Not following anyone</Text>
        <Text style={styles.emptySubtext}>
          {id === currentUser?.id 
            ? "Find people to follow on the discover page"
            : "This user isn't following anyone yet"}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || following.length === 0) return null;
    
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
        <Text style={styles.headerTitle}>Following</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={following}
        renderItem={renderFollowing}
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