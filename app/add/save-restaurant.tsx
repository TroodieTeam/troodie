import { theme } from '@/constants/theme';
import { designTokens } from '@/constants/designTokens';
import { RestaurantSearchResult } from '@/types/add-flow';
import { useRouter } from 'expo-router';
import {
    Camera,
    ChevronLeft,
    Edit3,
    MapPin,
    Search,
    Star
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
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
import { restaurantService } from '@/services/restaurantService';
import { BetaRestaurantNotice } from '@/components/BetaRestaurantNotice';

export default function SaveRestaurantScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMethod, setSearchMethod] = useState<'text' | 'location' | 'photo' | 'manual'>('text');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const restaurants = await restaurantService.getRestaurantsByCity('Charlotte', 100);
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
      const results = await restaurantService.searchRestaurants(searchQuery, {
        city: 'Charlotte'
      });
      setSearchResults(results.map(transformRestaurant));
    } catch (error) {
      console.error('Error searching restaurants:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRestaurant = (restaurant: RestaurantSearchResult) => {
    router.push({
      pathname: '/add/restaurant-details',
      params: { restaurant: JSON.stringify(restaurant) }
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Save a Restaurant</Text>
      <View style={styles.placeholder} />
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
          placeholder="Search Charlotte restaurants..."
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
                    <Star size={14} color="#FFD700" fill="#FFD700" />
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
            Try searching with different keywords or add it manually
          </Text>
          <TouchableOpacity style={styles.manualAddButton} onPress={() => setSearchMethod('manual')}>
            <Text style={styles.manualAddText}>Add Manually</Text>
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
            <Text style={styles.placeholderText}>Location-based search coming soon</Text>
          </View>
        )}
        {searchMethod === 'photo' && (
          <View style={styles.placeholderContent}>
            <Camera size={48} color="#DDD" />
            <Text style={styles.placeholderText}>Photo search coming soon</Text>
          </View>
        )}
        {searchMethod === 'manual' && (
          <View style={styles.placeholderContent}>
            <Edit3 size={48} color="#DDD" />
            <Text style={styles.placeholderText}>Manual entry coming soon</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  searchMethods: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    gap: 4,
  },
  methodButtonActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  methodText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  methodTextActive: {
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
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
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
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
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
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
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  manualAddButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualAddText: {
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