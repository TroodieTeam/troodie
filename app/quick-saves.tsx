import { RestaurantCard } from '@/components/cards/RestaurantCard'
import { designTokens } from '@/constants/designTokens'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
import { boardService } from '@/services/boardService'
import { restaurantService } from '@/services/restaurantService'
import { BoardRestaurant } from '@/types/board'
import { RestaurantInfo } from '@/types/core'
import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

type QuickSave = BoardRestaurant & { restaurant?: RestaurantInfo }

export default function QuickSavesScreen() {
  const [saves, setSaves] = useState<QuickSave[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadQuickSaves()
  }, [user?.id])

  const loadQuickSaves = async () => {
    if (!user?.id) return

    try {
      setError(null)
      
      // Get all Quick Saves (no limit)
      const quickSaves = await boardService.getQuickSavesRestaurants(user.id)
      
      // Load restaurant details for each save
      const savesWithRestaurants = await Promise.all(
        quickSaves.map(async (save) => {
          const restaurant = await restaurantService.getRestaurantById(save.restaurant_id)
          return {
            ...save,
            restaurant: restaurant || undefined
          }
        })
      )

      setSaves(savesWithRestaurants.filter(save => save.restaurant))
    } catch (error) {
      console.error('Error loading quick saves:', error)
      setError('Failed to load saved restaurants')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadQuickSaves()
  }

  const handleRestaurantPress = (restaurantId: string) => {
    router.push(`/restaurant/${restaurantId}`)
  }

  const handleRemove = async (save: QuickSave) => {
    try {
      // Get the Quick Saves board
      const board = await boardService.getUserQuickSavesBoard(user!.id)
      if (board) {
        await boardService.removeRestaurantFromBoard(board.id, save.restaurant_id)
        // Refresh the list
        await loadQuickSaves()
      }
    } catch (error) {
      console.error('Error removing from Quick Saves:', error)
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Quick Saves</Text>
      <View style={styles.placeholder} />
    </View>
  )

  const renderRestaurant = ({ item }: { item: QuickSave }) => {
    if (!item.restaurant) return null

    return (
      <View style={styles.saveItem}>
        <RestaurantCard
          restaurant={item.restaurant}
          onPress={() => handleRestaurantPress(item.restaurant_id)}
        />
        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}
        <View style={styles.metadata}>
          <Text style={styles.savedDate}>
            Saved {new Date(item.added_at).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your saved restaurants...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQuickSaves}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {saves.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Quick Saves Yet</Text>
          <Text style={styles.emptyText}>
            Tap the save button on any restaurant to add it to your Quick Saves
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={saves}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.countText}>
              {saves.length} saved {saves.length === 1 ? 'restaurant' : 'restaurants'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...designTokens.typography.sectionTitle,
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    ...designTokens.typography.bodyRegular,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.xl,
  },
  errorText: {
    ...designTokens.typography.bodyRegular,
    color: theme.colors.error,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
  },
  retryText: {
    ...designTokens.typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...designTokens.typography.bodyRegular,
    color: theme.colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.xl,
  },
  exploreButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 24,
  },
  exploreButtonText: {
    ...designTokens.typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  listContent: {
    paddingVertical: theme.spacing.md,
  },
  countText: {
    ...designTokens.typography.detailText,
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  saveItem: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  notes: {
    ...designTokens.typography.bodyRegular,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  metadata: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  savedDate: {
    ...designTokens.typography.detailText,
    color: theme.colors.text.tertiary,
  },
  removeButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  removeText: {
    ...designTokens.typography.detailText,
    color: theme.colors.error,
    fontWeight: '600' as const,
  },
}