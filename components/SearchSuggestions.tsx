import { designTokens } from '@/constants/designTokens'
import { MapPin, TrendingUp, Users } from 'lucide-react-native'
import React from 'react'
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

interface SearchSuggestion {
  id: string
  text: string
  icon: any
  type: 'trending' | 'location' | 'recent' | 'category'
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[]
  onSuggestionPress: (suggestion: SearchSuggestion) => void
  title?: string
}

export default function SearchSuggestions({ 
  suggestions, 
  onSuggestionPress,
  title = "Try searching for:"
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.suggestionsList}>
        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.suggestionItem}
            onPress={() => onSuggestionPress(suggestion)}
          >
            <suggestion.icon 
              size={14} 
              color={designTokens.colors.textMedium} 
              style={styles.suggestionIcon}
            />
            <Text style={styles.suggestionText}>{suggestion.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// Default search suggestions for the find friends screen
export const getDefaultSearchSuggestions = (userLocation?: string): SearchSuggestion[] => {
  const suggestions: SearchSuggestion[] = [
    {
      id: 'food-bloggers',
      text: 'food bloggers',
      icon: TrendingUp,
      type: 'trending'
    },
    {
      id: 'local-foodies',
      text: 'local foodies',
      icon: Users,
      type: 'category'
    },
    {
      id: 'restaurant-critics',
      text: 'restaurant critics',
      icon: TrendingUp,
      type: 'category'
    },
    {
      id: 'verified-users',
      text: 'verified food lovers',
      icon: TrendingUp,
      type: 'trending'
    }
  ]

  // Add location-based suggestion if user has location
  if (userLocation) {
    suggestions.splice(1, 0, {
      id: 'location-based',
      text: `foodies in ${userLocation.split(',')[0]}`,
      icon: MapPin,
      type: 'location'
    })
  }

  return suggestions
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  title: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.sm,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    gap: 4,
  },
  suggestionIcon: {
    // Icon styling handled by component
  },
  suggestionText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
})