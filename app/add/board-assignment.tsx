import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { restaurantService } from '@/services/restaurantService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check,
  ChevronLeft,
  MapPin,
  Plus,
  Search,
  Star
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function BoardAssignmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const boardId = params.boardId as string;
  const boardTitle = params.boardTitle as string;
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      // Load featured restaurants for Charlotte
      const data = await restaurantService.getFeaturedRestaurants(20);
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      Alert.alert('Error', 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRestaurant = (restaurantId: string) => {
    if (selectedRestaurants.includes(restaurantId)) {
      setSelectedRestaurants(selectedRestaurants.filter(id => id !== restaurantId));
    } else {
      setSelectedRestaurants([...selectedRestaurants, restaurantId]);
    }
  };

  const handleAddToBoard = async () => {
    if (!user || selectedRestaurants.length === 0) return;

    setSaving(true);
    try {
      // Add each selected restaurant to the board
      const promises = selectedRestaurants.map(restaurantId =>
        boardService.addRestaurantToBoard(boardId, restaurantId, user.id)
      );

      await Promise.all(promises);

      Alert.alert(
        'Success',
        `Added ${selectedRestaurants.length} restaurant${selectedRestaurants.length > 1 ? 's' : ''} to your board!`,
        [
          {
            text: 'View Board',
            onPress: () => router.push(`/boards/${boardId}`)
          },
          {
            text: 'Add More',
            style: 'cancel',
            onPress: () => setSelectedRestaurants([])
          }
        ]
      );
    } catch (error) {
      console.error('Error adding restaurants to board:', error);
      Alert.alert('Error', 'Failed to add restaurants to board');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Adding Restaurants?',
      'You can always add restaurants to your board later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => router.push(`/boards/${boardId}`)
        }
      ]
    );
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.cuisine_types?.some((cuisine: string) =>
      cuisine.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={theme.colors.text.dark} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Add to "{boardTitle}"</Text>
          <Text style={styles.subtitle}>{selectedRestaurants.length} selected</Text>
        </View>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <Search size={18} color={theme.colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.text.tertiary}
        />
      </View>
    </View>
  );

  const renderRestaurantItem = ({ item: restaurant }: { item: any }) => {
    const isSelected = selectedRestaurants.includes(restaurant.id);
    
    return (
      <TouchableOpacity
        style={[styles.restaurantCard, isSelected && styles.restaurantCardSelected]}
        onPress={() => handleToggleRestaurant(restaurant.id)}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: restaurantService.getRestaurantImage(restaurant) }} 
          style={styles.restaurantImage} 
        />
        <View style={styles.restaurantContent}>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <View style={styles.restaurantMeta}>
              <Text style={styles.cuisineText} numberOfLines={1}>
                {restaurant.cuisine_types?.[0] || 'Restaurant'}
              </Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.priceText}>{restaurant.price_range || '$$'}</Text>
              {restaurant.google_rating && (
                <>
                  <Text style={styles.separator}>•</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={12} color={theme.colors.primary} fill={theme.colors.primary} />
                    <Text style={styles.ratingText}>{restaurant.google_rating}</Text>
                  </View>
                </>
              )}
            </View>
            {restaurant.address && (
              <View style={styles.locationContainer}>
                <MapPin size={12} color={theme.colors.text.tertiary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {restaurant.neighborhood || restaurant.city || 'Charlotte'}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No restaurants found</Text>
      <Text style={styles.emptySubtext}>Try adjusting your search</Text>
    </View>
  );

  const renderFooter = () => {
    if (selectedRestaurants.length === 0) return null;
    
    return (
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={handleAddToBoard}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>
                Add {selectedRestaurants.length} to Board
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurantItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      )}
      {renderFooter()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  restaurantCardSelected: {
    backgroundColor: theme.colors.primary + '08',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  restaurantImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  restaurantContent: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 12,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 4,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cuisineText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    maxWidth: 100,
  },
  separator: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginHorizontal: 4,
  },
  priceText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});