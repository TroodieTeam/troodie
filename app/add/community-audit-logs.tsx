import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, UserMinus, Trash2, Shield } from 'lucide-react-native'
import { theme } from '@/constants/theme'
import { CommunityAdminService } from '@/services/communityAdminService'
import { useAuth } from '@/contexts/AuthContext'
import { useCommunityPermissions } from '@/utils/communityPermissions'

interface AuditLogItem {
  id: string
  admin_id: string
  admin?: {
    name: string
    username: string
    avatar_url?: string
  }
  action_type: 'remove_member' | 'delete_post' | 'delete_message' | 'update_role'
  target_user_id?: string
  target_user?: {
    name: string
    username: string
  }
  reason?: string
  created_at: string
  metadata?: any
}

export default function CommunityAuditLogsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { user } = useAuth()
  const communityId = params.communityId as string
  
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const { hasPermission } = useCommunityPermissions(communityId, user?.id)
  
  useEffect(() => {
    if (!hasPermission('view_audit_logs')) {
      router.back()
      return
    }
    
    loadAuditLogs()
  }, [communityId])
  
  const loadAuditLogs = async () => {
    try {
      setRefreshing(true)
      const { data } = await CommunityAdminService.getAuditLogs(communityId)
      setLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return `${diffMinutes}m ago`
      }
      return `${diffHours}h ago`
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
  
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'remove_member':
        return <UserMinus size={16} color={theme.colors.error} />
      case 'delete_post':
      case 'delete_message':
        return <Trash2 size={16} color={theme.colors.error} />
      case 'update_role':
        return <Shield size={16} color={theme.colors.primary} />
      default:
        return null
    }
  }
  
  const getActionText = (item: AuditLogItem) => {
    switch (item.action_type) {
      case 'remove_member':
        return `removed ${item.target_user?.name || 'a member'} from the community`
      case 'delete_post':
        return `deleted a post`
      case 'delete_message':
        return `deleted a message`
      case 'update_role':
        return `updated ${item.target_user?.name || 'a member'}'s role to ${item.metadata?.new_role}`
      default:
        return 'performed an action'
    }
  }
  
  const renderLogItem = ({ item }: { item: AuditLogItem }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Image
          source={{ uri: item.admin?.avatar_url || 'https://i.pravatar.cc/100' }}
          style={styles.avatar}
        />
        <View style={styles.logContent}>
          <View style={styles.actionRow}>
            {getActionIcon(item.action_type)}
            <Text style={styles.actionText}>
              <Text style={styles.adminName}>{item.admin?.name}</Text>
              {' '}{getActionText(item)}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
          {item.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
  
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Audit Logs</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Audit Logs</Text>
        <View style={styles.backButton} />
      </View>
      
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadAuditLogs}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Shield size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No audit logs</Text>
            <Text style={styles.emptyText}>Admin actions will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  logItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  adminName: {
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
  reasonContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
    marginTop: 8,
  },
})