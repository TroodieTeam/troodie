import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { boardService } from '@/services/boardService'
import { boardServiceExtended } from '@/services/boardServiceExtended'
import { restaurantService } from '@/services/restaurantService'
import { BoardRestaurant } from '@/types/board'
import { RestaurantInfo } from '@/types/core'
import { RestaurantCard } from '@/components/cards/RestaurantCard'
import { theme } from '@/constants/theme'
import { designTokens } from '@/constants/designTokens'
import { eventBus, EVENTS } from '@/utils/eventBus'

interface QuickSavesBoardProps {
  onRestaurantPress?: (restaurantId: string) => void
  refreshTrigger?: number
}

const QuickSavesBoard: React.FC<QuickSavesBoardProps> = ({ onRestaurantPress, refreshTrigger }) => {
  const [saves, setSaves] = useState<Array<BoardRestaurant & { restaurant?: RestaurantInfo }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const loadQuickSaves = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // First try to get Your Saves restaurants
      let quickSaves = await boardService.getQuickSavesRestaurants(user.id, 10)
      
      // If no Quick Saves board, get ALL saves (limited to 10 most recent)
      if (quickSaves.length === 0) {
        console.log('No Quick Saves board found, fetching all saves for homepage')
        quickSaves = await boardServiceExtended.getAllUserSaves(user.id, 10)
      }
      
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
      console.error('Error loading your saves:', error)
      setError('Failed to load saved restaurants')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadQuickSaves()
  }, [user?.id, refreshTrigger])

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadQuickSaves()
    }, [loadQuickSaves])
  )

  // Listen for save events
  useEffect(() => {
    const unsubscribeQuickSaves = eventBus.on(EVENTS.QUICK_SAVES_UPDATED, loadQuickSaves)
    const unsubscribeSaved = eventBus.on(EVENTS.RESTAURANT_SAVED, loadQuickSaves)
    
    return () => {
      unsubscribeQuickSaves()
      unsubscribeSaved()
    }
  }, [loadQuickSaves])

  const handleRestaurantPress = (restaurantId: string) => {
    if (onRestaurantPress) {
      onRestaurantPress(restaurantId)
    } else {
      router.push(`/restaurant/${restaurantId}`)
    }
  }

  const handleViewAll = () => {
    router.push('/quick-saves')
  }

  if (!user) return null

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Saves</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Saves</Text>
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  if (saves.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Saves</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No saved restaurants yet</Text>
          <Text style={styles.emptySubtext}>Tap the save button on any restaurant to add it here</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Saves</Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {saves.map((save) => (
          save.restaurant && (
            <View key={save.id} style={styles.restaurantCard}>
              <RestaurantCard
                restaurant={save.restaurant}
                onPress={() => handleRestaurantPress(save.restaurant_id)}
              />
            </View>
          )
        ))}
      </ScrollView>
    </View>
  )
}

const styles = {
  container: {
    marginVertical: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: theme.colors.text.primary,
  },
  viewAllText: {
    ...designTokens.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
  },
  restaurantCard: {
    marginRight: 12,
    width: 240, // Reduced width for compact cards
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  errorText: {
    ...designTokens.typography.bodyRegular,
    color: theme.colors.error,
    textAlign: 'center' as const,
    paddingHorizontal: theme.spacing.md,
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    ...designTokens.typography.bodyRegular,
    color: theme.colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    ...designTokens.typography.detailText,
    color: theme.colors.text.tertiary,
    textAlign: 'center' as const,
  },
}

export default QuickSavesBoard