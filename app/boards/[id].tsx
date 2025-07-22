import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { restaurantService } from '@/services/restaurantService';
import { BoardRestaurant, BoardWithRestaurants } from '@/types/board';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Edit,
  Globe,
  Home,
  Lock,
  MapPin,
  MoreVertical,
  Plus,
  Share,
  Star,
  Trash2,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function BoardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const boardId = params.id as string;

  const [board, setBoard] = useState<BoardWithRestaurants | null>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    loadBoardDetails();
  }, [boardId]);

  const loadBoardDetails = async () => {
    try {
      setLoading(true);
      
      // Load board details
      const boardData = await boardService.getBoardWithRestaurants(boardId);
      if (!boardData) {
        Alert.alert('Error', 'Board not found');
        router.back();
        return;
      }
      
      setBoard(boardData);
      setIsOwner(boardData.user_id === user?.id);

      // Load restaurant details for each restaurant in the board
      if (boardData.restaurants && boardData.restaurants.length > 0) {
        const restaurantPromises = boardData.restaurants.map(async (br: BoardRestaurant) => {
          const restaurant = await restaurantService.getRestaurantById(br.restaurant_id);
          return { ...restaurant, boardRestaurant: br };
        });
        
        const restaurantData = await Promise.all(restaurantPromises);
        setRestaurants(restaurantData.filter(r => r !== null));
      }
    } catch (error) {
      console.error('Error loading board details:', error);
      Alert.alert('Error', 'Failed to load board details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurants = () => {
    router.push({
      pathname: '/add/board-assignment',
      params: {
        boardId: board?.id,
        boardTitle: board?.title
      }
    });
  };

  const handleGoHome = () => {
    router.push('/(tabs)');
  };

  const handleShareBoard = () => {
    // TODO: Implement board sharing
    Alert.alert('Share Board', 'Sharing feature coming soon!');
  };

  const handleEditBoard = () => {
    // TODO: Navigate to edit board screen
    Alert.alert('Edit Board', 'Edit feature coming soon!');
  };

  const handleDeleteBoard = () => {
    if (!isOwner) return;

    Alert.alert(
      'Delete Board',
      'Are you sure you want to delete this board? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await boardService.deleteBoard(boardId);
              Alert.alert('Success', 'Board deleted successfully');
              router.push('/(tabs)');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete board');
            }
          }
        }
      ]
    );
  };

  const handleRemoveRestaurant = async (restaurantId: string) => {
    if (!isOwner) return;

    Alert.alert(
      'Remove Restaurant',
      'Are you sure you want to remove this restaurant from the board?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await boardService.removeRestaurantFromBoard(boardId, restaurantId);
              await loadBoardDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove restaurant');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Board</Text>
      {isOwner && (
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
        >
          <MoreVertical size={24} color="#333" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMoreMenu = () => {
    if (!showMoreMenu || !isOwner) return null;

    return (
      <View style={styles.moreMenu}>
        <TouchableOpacity style={styles.menuItem} onPress={handleShareBoard}>
          <Share size={16} color="#333" />
          <Text style={styles.menuText}>Share Board</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleEditBoard}>
          <Edit size={16} color="#333" />
          <Text style={styles.menuText}>Edit Board</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteBoard}>
          <Trash2 size={16} color="#FF4444" />
          <Text style={[styles.menuText, { color: '#FF4444' }]}>Delete Board</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBoardInfo = () => (
    <View style={styles.boardInfo}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>{board?.title}</Text>
        <View style={styles.boardMeta}>
          {board?.is_private ? (
            <View style={styles.metaItem}>
              <Lock size={16} color="#666" />
              <Text style={styles.metaText}>Private</Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Globe size={16} color="#666" />
              <Text style={styles.metaText}>Public</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Users size={16} color="#666" />
            <Text style={styles.metaText}>{board?.member_count || 0} members</Text>
          </View>
        </View>
      </View>
      
      {board?.description && (
        <Text style={styles.boardDescription}>{board.description}</Text>
      )}
      
      <View style={styles.boardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{board?.restaurant_count || 0}</Text>
          <Text style={styles.statLabel}>Restaurants</Text>
        </View>
        {board?.category && (
          <View style={styles.statItem}>
            <Text style={styles.statCategory}>{board.category}</Text>
            <Text style={styles.statLabel}>Category</Text>
          </View>
        )}
        {board?.location && (
          <View style={styles.statItem}>
            <MapPin size={16} color="#666" />
            <Text style={styles.statLabel}>{board.location}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      {isOwner && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddRestaurants}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Restaurants</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
        <Home size={20} color={theme.colors.primary} />
        <Text style={styles.homeButtonText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRestaurants = () => {
    if (restaurants.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No restaurants yet</Text>
          <Text style={styles.emptyText}>
            {isOwner 
              ? 'Add your first restaurant to this board!' 
              : 'This board doesn\'t have any restaurants yet.'}
          </Text>
          {isOwner && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddRestaurants}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Restaurants</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.emptyHomeButton} onPress={handleGoHome}>
            <Home size={16} color={theme.colors.primary} />
            <Text style={styles.emptyHomeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.restaurantsList} showsVerticalScrollIndicator={false}>
        {restaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.restaurantCard}
            onPress={() => router.push(`/restaurant/${restaurant.id}`)}
            onLongPress={() => isOwner && handleRemoveRestaurant(restaurant.id)}
          >
            <Image 
              source={{ uri: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' }} 
              style={styles.restaurantImage} 
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantDetails}>
                {restaurant.cuisine_types?.join(' • ') || 'Restaurant'} • {restaurant.price_range || '$$'}
              </Text>
              <View style={styles.restaurantMeta}>
                <Text style={styles.restaurantLocation}>
                  {restaurant.neighborhood || 'Charlotte'}
                </Text>
                {restaurant.google_rating && (
                  <View style={styles.rating}>
                    <Star size={12} fill="#FFD700" color="#FFD700" />
                    <Text style={styles.ratingText}>{restaurant.google_rating}</Text>
                  </View>
                )}
              </View>
              {restaurant.boardRestaurant?.notes && (
                <Text style={styles.restaurantNotes}>{restaurant.boardRestaurant.notes}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading board...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderMoreMenu()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderBoardInfo()}
        {renderActionButtons()}
        {renderRestaurants()}
      </ScrollView>
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
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  moreMenu: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  menuText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    marginLeft: 8,
  },
  boardInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  boardHeader: {
    marginBottom: 12,
  },
  boardTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  boardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  boardDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  boardStats: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  statCategory: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    marginLeft: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  emptyHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  emptyHomeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  restaurantsList: {
    paddingHorizontal: 20,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  restaurantImage: {
    width: 80,
    height: 80,
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
    marginBottom: 4,
  },
  restaurantDetails: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  restaurantMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantLocation: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  restaurantNotes: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});