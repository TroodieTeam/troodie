import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  Check,
  Search
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { boardService } from '@/services/boardService';
import { restaurantService } from '@/services/restaurantService';
import { useAuth } from '@/contexts/AuthContext';
import { Board } from '@/types/board';

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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Add Restaurants</Text>
      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBoardInfo = () => (
    <View style={styles.boardInfo}>
      <Text style={styles.boardInfoText}>Adding to</Text>
      <Text style={styles.boardTitle}>{boardTitle}</Text>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Search size={20} color="#999" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search restaurants..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderRestaurants = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.restaurantsList} showsVerticalScrollIndicator={false}>
        {filteredRestaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={[
              styles.restaurantCard,
              selectedRestaurants.includes(restaurant.id) && styles.restaurantCardSelected
            ]}
            onPress={() => handleToggleRestaurant(restaurant.id)}
          >
            <Image 
              source={{ uri: restaurantService.getRestaurantImage(restaurant) }} 
              style={styles.restaurantImage} 
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantDetails}>
                {restaurant.cuisine_types?.join(' • ') || 'Restaurant'} • {restaurant.price_range || '$$'}
              </Text>
              <Text style={styles.restaurantLocation}>
                {restaurant.neighborhood || 'Charlotte'}
              </Text>
            </View>
            <View style={[
              styles.checkbox,
              selectedRestaurants.includes(restaurant.id) && styles.checkboxSelected
            ]}>
              {selectedRestaurants.includes(restaurant.id) && (
                <Check size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.selectionCount}>
        {selectedRestaurants.length} restaurant{selectedRestaurants.length !== 1 ? 's' : ''} selected
      </Text>
      <TouchableOpacity
        style={[
          styles.addButton,
          (selectedRestaurants.length === 0 || saving) && styles.addButtonDisabled
        ]}
        onPress={handleAddToBoard}
        disabled={selectedRestaurants.length === 0 || saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add to Board</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderBoardInfo()}
      {renderSearchBar()}
      {renderRestaurants()}
      {renderFooter()}
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
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  boardInfo: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  boardInfoText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  boardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 16,
    margin: 20,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 12,
  },
  restaurantsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  restaurantCardSelected: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  restaurantDetails: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 2,
  },
  restaurantLocation: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  selectionCount: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});