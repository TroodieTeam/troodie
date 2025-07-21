# Task 6.1: Restaurant Detail Screen

**Epic:** Missing Core Screens and Functionality  
**Priority:** Critical  
**Estimate:** 4 days  
**Status:** 🔴 Not Started

## Overview
Create a comprehensive restaurant detail screen that displays all restaurant information, user saves/reviews, photos, and provides actions for saving, sharing, and social interaction.

## Business Value
- Central hub for restaurant information and social proof
- Enables users to make informed dining decisions
- Drives user engagement through social features
- Foundation for restaurant save and review functionality

## Dependencies
- Task 1.1: Supabase Backend Setup (for data access)
- Task 2.1: Charlotte Restaurant Seeding (for restaurant data)

## Blocks
- Task 3.1: Restaurant Save Functionality (navigation from detail screen)
- Task 3.3: Activity Feed & Interactions (social features)

---

## Acceptance Criteria

```gherkin
Feature: Restaurant Detail Screen
  As a user
  I want to view comprehensive restaurant information
  So that I can make informed decisions about dining

Background:
  Given the restaurant database is populated
  And I am an authenticated user
  And the restaurant detail screen is accessible from multiple entry points

Scenario: Restaurant Information Display
  Given I tap on a restaurant from any list
  When the restaurant detail screen loads
  Then I should see:
    | Section | Content |
    | Header | Name, cuisine, rating, price range |
    | Hero Image | Main restaurant photo |
    | Quick Actions | Save, share, directions, call |
    | Details | Address, phone, hours, website |
    | Photos Gallery | Restaurant and food photos |
    | Social Proof | Friend saves, recent activity |
    | User Reviews | Saves and reviews from other users |
    | Map | Location with nearby restaurants |

Scenario: Restaurant Header Information
  Given I am viewing a restaurant detail
  When the screen loads
  Then the header should display:
    | Element | Requirement |
    | Restaurant name | Bold, large font |
    | Cuisine types | Comma-separated list |
    | Google rating | Stars with numeric value |
    | Price range | $ to $$$$ symbols |
    | Distance | From user's location if available |
    | Verification badge | If restaurant is verified |

Scenario: Photo Gallery Implementation
  Given a restaurant has multiple photos
  When I view the restaurant detail
  Then I should see:
    | Gallery Feature | Behavior |
    | Hero image | Main photo displayed prominently |
    | Photo count | "1 of 12" indicator |
    | Swipe navigation | Horizontal scrolling through photos |
    | Full screen view | Tap to view larger |
    | Photo attribution | Google/user attribution |
    | Loading states | Skeleton while loading |

Scenario: Restaurant Contact Information
  Given I am viewing restaurant details
  When I scroll to the information section
  Then I should see:
    | Information | Display Format |
    | Address | Full formatted address |
    | Phone number | Clickable to call |
    | Website | Clickable link |
    | Hours | Today's hours prominently |
    | All hours | Expandable weekly schedule |
    | Features | Outdoor seating, WiFi, etc. |

Scenario: Quick Actions Functionality
  Given I am on a restaurant detail screen
  When I interact with quick actions
  Then I should be able to:
    | Action | Behavior |
    | Save restaurant | Navigate to save flow |
    | Share restaurant | Open native share sheet |
    | Get directions | Open maps app |
    | Call restaurant | Open phone dialer |
    | View menu | Open website/menu if available |

Scenario: Social Proof Display
  Given other users have saved this restaurant
  When I view the restaurant detail
  Then I should see:
    | Social Element | Display |
    | Friend saves | "3 friends saved this" |
    | Friend avatars | Small circular profile pics |
    | Recent activity | "Sarah visited yesterday" |
    | Total saves | "247 people saved this" |
    | Trending indicator | If recently popular |

Scenario: User Reviews and Saves Section
  Given users have saved and reviewed this restaurant
  When I scroll to the reviews section
  Then I should see:
    | Review Element | Display |
    | User avatar | Profile picture |
    | User name | Name and persona |
    | Rating | Personal star rating |
    | Visit date | "Visited 2 weeks ago" |
    | Photos | User-uploaded photos |
    | Notes | Personal review text |
    | Tags | "Great for dates", etc. |
    | Interaction buttons | Like, comment, follow |

Scenario: Map Integration
  Given the restaurant has location coordinates
  When I view the map section
  Then I should see:
    | Map Feature | Requirement |
    | Restaurant pin | Clearly marked location |
    | User location | If permission granted |
    | Nearby restaurants | Other saved restaurants |
    | Transit options | If available |
    | Parking info | If available |

Scenario: Save Restaurant from Detail
  Given I am viewing a restaurant detail
  When I tap "Save Restaurant"
  Then I should be taken to the save flow
  And restaurant information should be pre-filled
  And I should be able to complete the save process
  And return to the detail screen after saving

Scenario: Social Actions from Detail
  Given I am viewing a restaurant with user saves
  When I interact with other users' saves
  Then I should be able to:
    | Action | Behavior |
    | Like saves | Heart icon, increment count |
    | Comment on saves | Open comment dialog |
    | View user profile | Navigate to user profile |
    | Follow users | Follow button if not following |

Scenario: Error Handling
  Given various error conditions may occur
  When I encounter issues loading restaurant data
  Then I should see appropriate error states:
    | Error Type | Display |
    | No internet | "Check your connection" |
    | Restaurant not found | "Restaurant not available" |
    | Photos failed to load | Placeholder images |
    | Location permission denied | Map without user location |

Scenario: Loading States
  Given the restaurant detail screen is loading
  When data is being fetched
  Then I should see:
    | Element | Loading State |
    | Restaurant info | Skeleton placeholders |
    | Photos | Gray rectangles |
    | User reviews | Shimmer effect |
    | Map | Loading spinner |
    | All content loads progressively | No blank screens |

Scenario: Accessibility Features
  Given I am using assistive technology
  When I navigate the restaurant detail screen
  Then I should have:
    | Accessibility Feature | Requirement |
    | Screen reader support | All content readable |
    | Touch targets | Minimum 44px |
    | Color contrast | WCAG compliant |
    | Focus indicators | Visible focus states |
    | Semantic markup | Proper headings |

Scenario: Performance Requirements
  Given I am viewing a restaurant detail
  When the screen loads
  Then performance should meet:
    | Metric | Requirement |
    | Initial load time | Under 2 seconds |
    | Image load time | Under 3 seconds |
    | Scroll performance | 60fps |
    | Memory usage | Reasonable for images |
    | Network requests | Optimized queries |

Scenario: Navigation and Back Behavior
  Given I navigated to restaurant detail from various screens
  When I use back navigation
  Then I should return to:
    | Source Screen | Return Behavior |
    | Home trending | Back to home |
    | Explore grid | Back to explore |
    | Search results | Back to search |
    | User profile | Back to profile |
    | Activity feed | Back to activity |
  And scroll position should be preserved where applicable

Scenario: Deep Linking Support
  Given restaurant detail screens support deep linking
  When I receive a shared restaurant link
  Then I should be able to:
    | Deep Link Scenario | Behavior |
    | Open from outside app | Launch to detail |
    | Open while app is running | Navigate to detail |
    | Invalid restaurant ID | Show error gracefully |
    | Share current restaurant | Generate valid link |

Scenario: Offline Behavior
  Given I previously viewed a restaurant detail
  When I lose internet connection
  Then I should still be able to:
    | Offline Feature | Availability |
    | View basic info | From cache |
    | View cached photos | Previously loaded |
    | See saved reviews | From local storage |
    | Use basic navigation | Back button works |
    | Queue save actions | Sync when online |
```

---

## Technical Implementation

### Restaurant Detail Screen Component
```typescript
// app/restaurant/[id].tsx
import React, { useEffect, useState } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Linking,
  Share,
  ActivityIndicator 
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { 
  Heart, 
  Share2, 
  Phone, 
  MapPin, 
  Clock, 
  Star,
  ExternalLink 
} from 'lucide-react-native'
import { restaurantService } from '@/services/restaurantService'
import { useAuth } from '@/contexts/AuthContext'

interface RestaurantDetail {
  id: string
  name: string
  cuisine_types: string[]
  google_rating: number
  price_range: string
  address: string
  phone: string
  website: string
  photos: Array<{url: string, attribution?: string}>
  hours: Record<string, {open: string, close: string}>
  features: string[]
  saves: Array<{
    user: any
    rating: number
    notes: string
    photos: string[]
    visit_date: string
    tags: string[]
  }>
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  useEffect(() => {
    loadRestaurantDetail()
  }, [id])

  const loadRestaurantDetail = async () => {
    try {
      setLoading(true)
      const data = await restaurantService.getRestaurantDetail(id)
      setRestaurant(data)
    } catch (err) {
      setError('Failed to load restaurant details')
      console.error('Restaurant detail error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRestaurant = () => {
    router.push(`/add/save-restaurant?restaurantId=${id}`)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${restaurant?.name} on Troodie!`,
        url: `https://troodie.app/restaurant/${id}`
      })
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  const handleCall = () => {
    if (restaurant?.phone) {
      Linking.openURL(`tel:${restaurant.phone}`)
    }
  }

  const handleDirections = () => {
    if (restaurant?.address) {
      const encodedAddress = encodeURIComponent(restaurant.address)
      Linking.openURL(`maps://app?daddr=${encodedAddress}`)
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.restaurantName}>{restaurant?.name}</Text>
      <Text style={styles.cuisineTypes}>
        {restaurant?.cuisine_types.join(', ')}
      </Text>
      <View style={styles.ratingRow}>
        <View style={styles.starRating}>
          <Star size={16} color="#FFD700" fill="#FFD700" />
          <Text style={styles.rating}>{restaurant?.google_rating}</Text>
        </View>
        <Text style={styles.priceRange}>{restaurant?.price_range}</Text>
      </View>
    </View>
  )

  const renderPhotoGallery = () => (
    <View style={styles.photoGallery}>
      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const index = Math.round(nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width)
          setCurrentPhotoIndex(index)
        }}
      >
        {restaurant?.photos.map((photo, index) => (
          <Image 
            key={index}
            source={{ uri: photo.url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      <View style={styles.photoIndicator}>
        <Text style={styles.photoCount}>
          {currentPhotoIndex + 1} of {restaurant?.photos.length}
        </Text>
      </View>
    </View>
  )

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.actionButton} onPress={handleSaveRestaurant}>
        <Heart size={24} color="#FFAD27" />
        <Text style={styles.actionText}>Save</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <Share2 size={24} color="#666" />
        <Text style={styles.actionText}>Share</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
        <Phone size={24} color="#666" />
        <Text style={styles.actionText}>Call</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
        <MapPin size={24} color="#666" />
        <Text style={styles.actionText}>Directions</Text>
      </TouchableOpacity>
    </View>
  )

  const renderRestaurantInfo = () => (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>Information</Text>
      
      <View style={styles.infoRow}>
        <MapPin size={20} color="#666" />
        <Text style={styles.infoText}>{restaurant?.address}</Text>
      </View>
      
      {restaurant?.phone && (
        <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
          <Phone size={20} color="#666" />
          <Text style={styles.infoText}>{restaurant.phone}</Text>
        </TouchableOpacity>
      )}
      
      {restaurant?.website && (
        <TouchableOpacity 
          style={styles.infoRow} 
          onPress={() => Linking.openURL(restaurant.website)}
        >
          <ExternalLink size={20} color="#666" />
          <Text style={styles.infoText}>Website</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.infoRow}>
        <Clock size={20} color="#666" />
        <Text style={styles.infoText}>
          {/* Today's hours logic */}
          Open until 10:00 PM
        </Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFAD27" />
        <Text style={styles.loadingText}>Loading restaurant...</Text>
      </View>
    )
  }

  if (error || !restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Restaurant not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRestaurantDetail}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {renderPhotoGallery()}
      {renderHeader()}
      {renderQuickActions()}
      {renderRestaurantInfo()}
      {/* Additional sections: social proof, reviews, map */}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  // Style definitions...
})
```

### Restaurant Service Updates
```typescript
// services/restaurantService.ts
export const restaurantService = {
  async getRestaurantDetail(restaurantId: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        saves:restaurant_saves(
          id,
          user:users(id, name, username, avatar_url, persona),
          personal_rating,
          notes,
          photos,
          visit_date,
          tags,
          created_at
        )
      `)
      .eq('id', restaurantId)
      .single()

    if (error) throw error
    return data
  },

  async getSocialProof(restaurantId: string, userId?: string) {
    // Get friend saves, recent activity, total saves
    const { data, error } = await supabase
      .from('restaurant_saves')
      .select(`
        user:users(id, name, avatar_url),
        created_at
      `)
      .eq('restaurant_id', restaurantId)
      .in('user_id', /* friend IDs */)
      .limit(5)

    if (error) throw error
    return data
  }
}
```

---

## Definition of Done

- [ ] Restaurant detail screen displays all required information
- [ ] Photo gallery works with swipe navigation
- [ ] Quick actions (save, share, call, directions) function correctly
- [ ] Social proof shows friend activity and saves
- [ ] User reviews/saves are displayed with proper formatting
- [ ] Map integration shows restaurant location
- [ ] Error states handle all failure scenarios gracefully
- [ ] Loading states provide good user experience
- [ ] Navigation from all entry points works correctly
- [ ] Deep linking support is implemented
- [ ] Accessibility features meet requirements
- [ ] Performance meets specified benchmarks
- [ ] All Gherkin scenarios pass
- [ ] Screen is responsive across device sizes

---

## Resources

- [Core Screens PRD](../prd/core-screens/prd.md)
- [React Navigation Documentation](https://reactnavigation.org/)
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/)
- [Task 2.1: Restaurant Seeding](./task-2-1-restaurant-seeding.md)

---

## Notes

- This screen is referenced throughout the app and is critical for user experience
- Consider implementing image caching for better performance
- Social features depend on user authentication and friend relationships
- Map integration may require additional permissions and setup
- Consider implementing sharing with custom preview cards 