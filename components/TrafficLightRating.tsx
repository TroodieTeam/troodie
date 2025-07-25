import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { ratingService, TrafficLightRating as TLRating, RatingSummary } from '@/services/ratingService'
import { theme } from '@/constants/theme'
import { designTokens } from '@/constants/designTokens'

interface TrafficLightRatingProps {
  restaurantId: string
  onRatingChange?: (rating: TLRating) => void
  showUserRating?: boolean
  showSummary?: boolean
  size?: 'small' | 'medium' | 'large'
  style?: ViewStyle
}

export const TrafficLightRating: React.FC<TrafficLightRatingProps> = ({
  restaurantId,
  onRatingChange,
  showUserRating = true,
  showSummary = true,
  size = 'medium',
  style
}) => {
  const { user } = useAuth()
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null)
  const [userRating, setUserRating] = useState<TLRating | undefined>()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadRatingSummary()
  }, [restaurantId, user?.id])

  const loadRatingSummary = async () => {
    try {
      setLoading(true)
      const summary = await ratingService.getRestaurantRatingSummary(
        restaurantId,
        user?.id
      )
      if (summary) {
        setRatingSummary(summary)
        setUserRating(summary.userRating)
      }
    } catch (error) {
      console.error('Error loading rating summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRatingPress = async (rating: TLRating) => {
    if (!user || updating) return

    try {
      setUpdating(true)
      const result = await ratingService.rateRestaurant(
        user.id,
        restaurantId,
        rating
      )
      
      if (result.success) {
        setUserRating(rating)
        await loadRatingSummary() // Refresh summary
        onRatingChange?.(rating)
      }
    } catch (error) {
      console.error('Error rating restaurant:', error)
    } finally {
      setUpdating(false)
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: styles.smallButton,
          text: styles.smallText,
          bar: styles.smallBar
        }
      case 'large':
        return {
          button: styles.largeButton,
          text: styles.largeText,
          bar: styles.largeBar
        }
      default:
        return {
          button: styles.mediumButton,
          text: styles.mediumText,
          bar: styles.mediumBar
        }
    }
  }

  const sizeStyles = getSizeStyles()

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    )
  }

  const renderRatingBar = () => {
    if (!showSummary || !ratingSummary || ratingSummary.totalCount === 0) {
      return null
    }

    const total = ratingSummary.totalCount || 1 // Prevent division by zero
    const redWidth = (ratingSummary.redCount / total) * 100
    const yellowWidth = (ratingSummary.yellowCount / total) * 100
    const greenWidth = (ratingSummary.greenCount / total) * 100

    return (
      <View style={styles.summaryContainer}>
        <View style={[styles.ratingBar, sizeStyles.bar]}>
          {redWidth > 0 && (
            <View style={[styles.ratingSegment, styles.redSegment, { flex: redWidth }]} />
          )}
          {yellowWidth > 0 && (
            <View style={[styles.ratingSegment, styles.yellowSegment, { flex: yellowWidth }]} />
          )}
          {greenWidth > 0 && (
            <View style={[styles.ratingSegment, styles.greenSegment, { flex: greenWidth }]} />
          )}
        </View>
        <Text style={[styles.ratingText, sizeStyles.text]}>
          {ratingSummary.totalCount} {ratingSummary.totalCount === 1 ? 'rating' : 'ratings'}
        </Text>
      </View>
    )
  }

  const renderRatingButtons = () => {
    if (!showUserRating || !user) {
      return null
    }

    return (
      <View style={styles.ratingButtons}>
        <TouchableOpacity
          style={[
            styles.ratingButton,
            sizeStyles.button,
            styles.redButton,
            userRating === 'red' && styles.selectedRating,
            updating && styles.disabledButton
          ]}
          onPress={() => handleRatingPress('red')}
          disabled={updating}
        >
          <Text style={[styles.ratingButtonText, sizeStyles.text]}>
            {size === 'small' ? '👎' : 'Hate it'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.ratingButton,
            sizeStyles.button,
            styles.yellowButton,
            userRating === 'yellow' && styles.selectedRating,
            updating && styles.disabledButton
          ]}
          onPress={() => handleRatingPress('yellow')}
          disabled={updating}
        >
          <Text style={[styles.ratingButtonText, sizeStyles.text]}>
            {size === 'small' ? '🤷' : 'Meh'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.ratingButton,
            sizeStyles.button,
            styles.greenButton,
            userRating === 'green' && styles.selectedRating,
            updating && styles.disabledButton
          ]}
          onPress={() => handleRatingPress('green')}
          disabled={updating}
        >
          <Text style={[styles.ratingButtonText, sizeStyles.text]}>
            {size === 'small' ? '👍' : 'Love it'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {renderRatingBar()}
      {renderRatingButtons()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  ratingBar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundGray,
  },
  smallBar: {
    height: 4,
  },
  mediumBar: {
    height: 6,
  },
  largeBar: {
    height: 8,
  },
  ratingSegment: {
    height: '100%',
  },
  redSegment: {
    backgroundColor: '#E74C3C',
  },
  yellowSegment: {
    backgroundColor: '#F39C12',
  },
  greenSegment: {
    backgroundColor: '#2ECC71',
  },
  ratingText: {
    ...designTokens.typography.detailText,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  mediumButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  largeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  redButton: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  yellowButton: {
    backgroundColor: '#F39C12',
    borderColor: '#F39C12',
  },
  greenButton: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  selectedRating: {
    borderColor: theme.colors.text.dark,
    borderWidth: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  ratingButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
})

export default TrafficLightRating