import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React from 'react'
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SearchUserResult } from '../lib/supabase'
import { useFollowState } from '../hooks/useFollowState'
import FollowButton from './FollowButton'

interface UserSearchResultProps {
  user: SearchUserResult
  onFollowToggle?: () => void
}

export default function UserSearchResult({ user, onFollowToggle }: UserSearchResultProps) {
  const {
    isFollowing,
    followersCount,
    loading,
    toggleFollow
  } = useFollowState({
    userId: user.id,
    initialIsFollowing: user.isFollowing || false,
    initialFollowersCount: user.followers_count || 0,
    onFollowChange: () => onFollowToggle?.()
  })

  const handlePress = () => {
    router.push(`/user/${user.id}`)
  }

  const handleFollowPress = async () => {
    if (user.isCurrentUser) return
    await toggleFollow()
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={styles.avatarContainer}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {getInitials(user.name || user.username)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name || user.username || 'Anonymous'}
          </Text>
          {user.is_verified && (
            <Ionicons name="checkmark-circle" size={16} color="#FFAD27" />
          )}
        </View>
        
        {user.username && (
          <Text style={styles.username} numberOfLines={1}>
            @{user.username}
          </Text>
        )}
        
        {user.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}
        
        <Text style={styles.stats}>
          {followersCount} followers · {user.saves_count || 0} saves
        </Text>
      </View>

      {!user.isCurrentUser && (
        <FollowButton
          isFollowing={isFollowing}
          isLoading={loading}
          onPress={handleFollowPress}
        />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#FFAD27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  stats: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
})