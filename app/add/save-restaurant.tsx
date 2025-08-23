import { BetaRestaurantNotice } from '@/components/BetaRestaurantNotice';
import { theme } from '@/constants/theme';
import { designTokens, compactDesign } from '@/constants/designTokens';
import { restaurantService } from '@/services/restaurantService';
import { RestaurantSearchResult } from '@/types/add-flow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Camera,
    ChevronLeft,
    Edit3,
    MapPin,
    Search,
    Star,
    Plus
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AddRestaurantModal } from '@/components/AddRestaurantModal';

export default function SaveRestaurantScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMethod, setSearchMethod] = useState<'text' | 'location' | 'photo' | 'manual'>('text');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const restaurants = await restaurantService.getAllRestaurants(200); // Get more restaurants from all locations
      setAllRestaurants(restaurants);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    }
  };

  // Transform restaurant data to match RestaurantSearchResult format
  const transformRestaurant = (restaurant: any): RestaurantSearchResult => {
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address || 'Charlotte, NC',
      cuisine: restaurant.cuisine_types || ['Restaurant'],
      rating: restaurant.google_rating || restaurant.troodie_rating || 4.5,
      photos: restaurant.photos || ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'],
      verified: restaurant.verified || false,
      distance: Math.random() * 5, // Mock distance for now
      priceRange: restaurant.price_range || '$$'
    };
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await restaurantService.searchRestaurants(searchQuery);
      setSearchResults(results.map(transformRestaurant));
    } catch (error) {
      console.error('Error searching restaurants:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRestaurant = (restaurant: RestaurantSearchResult) => {
    const params = useLocalSearchParams();
    const flow = params.flow as string || 'save';
    
    router.push({
      pathname: '/add/restaurant-details',
      params: { 
        restaurant: JSON.stringify(restaurant),
        flow
      }
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={compactDesign.icon.medium} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      <Text style={styles.title}>Save a Restaurant</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddRestaurantModal(true)}>
        <Plus size={compactDesign.icon.medium} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchMethods = () => (
    <View style={styles.searchMethods}>
      <TouchableOpacity
        style={[styles.methodButton, searchMethod === 'text' && styles.methodButtonActive]}
        onPress={() => setSearchMethod('text')}
      >
        <Search size={20} color={searchMethod === 'text' ? theme.colors.primary : '#666'} />
        <Text style={[styles.methodText, searchMethod === 'text' && styles.methodTextActive]}>
          Search
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.methodButton, searchMethod === 'location' && styles.methodButtonActive]}
        onPress={() => setSearchMethod('location')}
      >
        <MapPin size={20} color={searchMethod === 'location' ? theme.colors.primary : '#666'} />
        <Text style={[styles.methodText, searchMethod === 'location' && styles.methodTextActive]}>
          Nearby
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.methodButton, searchMethod === 'photo' && styles.methodButtonActive]}
        onPress={() => setSearchMethod('photo')}
      >
        <Camera size={20} color={searchMethod === 'photo' ? theme.colors.primary : '#666'} />
        <Text style={[styles.methodText, searchMethod === 'photo' && styles.methodTextActive]}>
          Photo
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.methodButton, searchMethod === 'manual' && styles.methodButtonActive]}
        onPress={() => setSearchMethod('manual')}
      >
        <Edit3 size={20} color={searchMethod === 'manual' ? theme.colors.primary : '#666'} />
        <Text style={[styles.methodText, searchMethod === 'manual' && styles.methodTextActive]}>
          Manual
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => {
    // Auto-search as user types
    React.useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        if (searchQuery) {
          handleSearch();
        } else {
          setSearchResults([]);
        }
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    return (
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholderTextColor="#999"
          returnKeyType="search"
        />
      </View>
    );
  };

  const renderSearchResults = () => (
    <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching restaurants...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        searchResults.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.resultCard}
            onPress={() => handleSelectRestaurant(restaurant)}
          >
            <Image source={{ uri: restaurant.photos[0] }} style={styles.resultImage} />
            <View style={styles.resultInfo}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{restaurant.name}</Text>
                {restaurant.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.resultAddress}>{restaurant.address}</Text>
              <View style={styles.resultDetails}>
                <Text style={styles.resultCuisine}>{restaurant.cuisine.join(' • ')}</Text>
                {restaurant.distance && (
                  <Text style={styles.resultDistance}>{restaurant.distance} mi</Text>
                )}
              </View>
              <View style={styles.resultFooter}>
                {restaurant.rating && (
                  <View style={styles.rating}>
                    <Star size={compactDesign.icon.small} color="#FFD700" />
                    <Text style={styles.ratingText}>{restaurant.rating}</Text>
                  </View>
                )}
                <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : searchQuery && !isSearching ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No restaurants found</Text>
          <Text style={styles.emptyDescription}>
            Can't find what you're looking for? Add it to our database!
          </Text>
          <TouchableOpacity style={styles.addRestaurantButton} onPress={() => setShowAddRestaurantModal(true)}>
            <Plus size={20} color="#FFF" />
            <Text style={styles.addRestaurantText}>Add Restaurant</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );

  const renderRecentSearches = () => (
    <View style={styles.recentSection}>
      <Text style={styles.sectionTitle}>Recent Searches</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentTags}>
        {['Japanese', 'Pizza', 'Coffee', 'Brunch', 'Italian'].map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.recentTag}
            onPress={() => {
              setSearchQuery(tag);
              handleSearch();
            }}
          >
            <Text style={styles.recentTagText}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const handleRestaurantAdded = (restaurant: any) => {
    // Transform the added restaurant to match our format
    const transformedRestaurant = transformRestaurant(restaurant);
    handleSelectRestaurant(transformedRestaurant);
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <BetaRestaurantNotice />
      <View style={styles.content}>
        {renderSearchMethods()}
        {searchMethod === 'text' && (
          <>
            {renderSearchBar()}
            {!searchResults.length && !searchQuery && renderRecentSearches()}
            {renderSearchResults()}
          </>
        )}
        {searchMethod === 'location' && (
          <View style={styles.placeholderContent}>
            <MapPin size={48} color="#DDD" />
            <Text style={styles.placeholderText}>Enable location services in Settings to search nearby</Text>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setSearchMethod('text')}
            >
              <Text style={styles.secondaryButtonText}>Search by name instead</Text>
            </TouchableOpacity>
          </View>
        )}
        {searchMethod === 'photo' && (
          <View style={styles.placeholderContent}>
            <Camera size={48} color="#DDD" />
            <Text style={styles.placeholderText}>Photo search will be available in a future update</Text>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setSearchMethod('text')}
            >
              <Text style={styles.secondaryButtonText}>Search by name instead</Text>
            </TouchableOpacity>
          </View>
        )}
        {searchMethod === 'manual' && (
          <View style={styles.placeholderContent}>
            <Edit3 size={48} color="#DDD" />
            <Text style={styles.placeholderText}>Can't find the restaurant?</Text>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {
                setSearchMethod('text');
                setShowAddRestaurantModal(true);
              }}
            >
              <Text style={styles.secondaryButtonText}>Add it manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <AddRestaurantModal
        visible={showAddRestaurantModal}
        onClose={() => setShowAddRestaurantModal(false)}
        onRestaurantAdded={handleRestaurantAdded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  secondaryButton: {
    marginTop: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.primaryOrange,
  },
  secondaryButtonText: {
    ...designTokens.typography.buttonText,
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.header.paddingHorizontal,
    paddingVertical: compactDesign.header.paddingVertical,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    width: compactDesign.button.height,
    height: compactDesign.button.height,
    justifyContent: 'center',
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  placeholder: {
    width: 40,
  },
  addButton: {
    width: compactDesign.button.height,
    height: compactDesign.button.height,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: compactDesign.button.height / 2,
    backgroundColor: theme.colors.primary + '10',
  },
  content: {
    flex: 1,
  },
  searchMethods: {
    flexDirection: 'row',
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: compactDesign.content.paddingCompact,
    gap: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundGray,
    gap: 4,
  },
  methodButtonActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  methodText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  methodTextActive: {
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.sm,
    marginHorizontal: compactDesign.content.padding,
    paddingHorizontal: compactDesign.input.paddingHorizontal,
    height: compactDesign.input.height,
    ...designTokens.shadows.card,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.inputText,
    color: designTokens.colors.textDark,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: compactDesign.content.padding,
    paddingTop: compactDesign.content.paddingCompact,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    borderRadius: compactDesign.card.borderRadius,
    padding: compactDesign.card.padding,
    marginBottom: compactDesign.content.gap,
    ...designTokens.shadows.card,
  },
  resultImage: {
    width: 60, // Reduced from 80
    height: 60,
    borderRadius: designTokens.borderRadius.sm,
    marginRight: compactDesign.card.gap,
  },
  resultInfo: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultName: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#4CAF50',
  },
  resultAddress: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: 4,
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultCuisine: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  resultDistance: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  priceRange: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  addRestaurantButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: compactDesign.button.paddingHorizontal,
    height: compactDesign.button.height,
    borderRadius: designTokens.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addRestaurantText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  recentSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  recentTags: {
    flexDirection: 'row',
  },
  recentTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  recentTagText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    textAlign: 'center',
  },
});