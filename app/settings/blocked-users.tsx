import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { moderationService } from '@/services/moderationService';
import { profileService } from '@/services/profileService';
import { getAvatarUrlWithFallback } from '@/utils/avatarUtils';
import { useAuth } from '@/contexts/AuthContext';

interface BlockedUser {
  blocked_id: string;
  blocker_id: string;
  created_at: string;
  reason?: string;
  profile?: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBlockedUsers = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const blockedList = await moderationService.getBlockedUsers();
      
      // Load profiles for blocked users
      const usersWithProfiles = await Promise.all(
        blockedList.map(async (userId) => {
          try {
            const profile = await profileService.getProfile(userId);
            return {
              blocked_id: userId,
              blocker_id: user.id,
              created_at: new Date().toISOString(),
              profile: profile ? {
                id: profile.id,
                username: profile.username || '',
                name: profile.name || profile.email?.split('@')[0] || '',
                avatar_url: profile.avatar_url
              } : undefined
            };
          } catch (error) {
            console.error('Error loading profile for blocked user:', error);
            return {
              blocked_id: userId,
              blocker_id: user.id,
              created_at: new Date().toISOString(),
            };
          }
        })
      );
      
      setBlockedUsers(usersWithProfiles.filter(u => u.profile));
    } catch (error) {
      console.error('Error loading blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  }, [user?.id]);

  const handleUnblock = useCallback((blockedUser: BlockedUser) => {
    if (!blockedUser.profile) return;
    
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${blockedUser.profile.name || blockedUser.profile.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              const success = await moderationService.unblockUser(blockedUser.blocked_id);
              
              if (success) {
                // Remove from local list with animation
                setBlockedUsers(prev => prev.filter(u => u.blocked_id !== blockedUser.blocked_id));
                // Show success feedback
                Alert.alert(
                  'User Unblocked',
                  `${blockedUser.profile?.name || 'User'} has been unblocked.`
                );
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        }
      ]
    );
  }, []);

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => {
    if (!item.profile) return null;
    
    return (
      <View style={styles.userItem}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/user/${item.blocked_id}`)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: getAvatarUrlWithFallback(item.profile.avatar_url, item.profile.name) }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.profile.name}</Text>
            <Text style={styles.userUsername}>@{item.profile.username}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => handleUnblock(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.unblockButtonText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Shield size={48} color={designTokens.colors.textLight} />
      </View>
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptyDescription}>
        Users you block won't see your content{'\n'}and you won't see theirs
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={[
            styles.listContent,
            blockedUsers.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={designTokens.colors.primaryOrange}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
    paddingTop: 100,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: designTokens.colors.white,
    marginVertical: 1,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  unblockButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: designTokens.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: designTokens.colors.borderMedium,
  },
  unblockButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    lineHeight: 20,
  },
});