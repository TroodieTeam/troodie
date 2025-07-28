import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { restaurantService } from '@/services/restaurantService';
import { BoardRestaurant, BoardWithRestaurants } from '@/types/board';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  DollarSign,
  Edit,
  Globe,
  Home,
  Lock,
  MapPin,
  MoreVertical,
  Plus,
  Share2,
  Star,
  Trash2
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
      
      const boardData = await boardService.getBoardWithRestaurants(boardId);
      if (!boardData) {
        Alert.alert('Error', 'Board not found');
        router.back();
        return;
      }
      
      setBoard(boardData);
      setIsOwner(boardData.user_id === user?.id);

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
    Alert.alert('Share Board', 'Sharing feature coming soon!');
  };

  const handleEditBoard = () => {
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
      <View style={styles.navigationGroup}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={theme.colors.text.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={handleGoHome}>
          <Home size={18} color={theme.colors.text.dark} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle} numberOfLines={1}>{board?.title || 'Board'}</Text>
        <Text style={styles.headerSubtitle}>
          {board?.restaurant_count || 0} places • {board?.is_private ? 'Private' : 'Public'}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={handleShareBoard}>
          <Share2 size={18} color={theme.colors.text.dark} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreVertical size={18} color={theme.colors.text.dark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderMoreMenu = () => {
    if (!showMoreMenu || !isOwner) return null;

    return (
      <View style={styles.moreMenu}>
        <TouchableOpacity style={styles.menuItem} onPress={handleEditBoard}>
          <Edit size={16} color={theme.colors.text.primary} />
          <Text style={styles.menuText}>Edit Board</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleDeleteBoard}>
          <Trash2 size={16} color={theme.colors.error} />
          <Text style={[styles.menuText, { color: theme.colors.error }]}>Delete Board</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBoardInfo = () => {
    if (!board?.description && !board?.category && !board?.location) return null;
    
    return (
      <View style={styles.boardInfo}>
        {board?.description && (
          <Text style={styles.boardDescription} numberOfLines={2}>{board.description}</Text>
        )}
        <View style={styles.boardTags}>
          {board?.category && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{board.category}</Text>
            </View>
          )}
          {board?.location && (
            <View style={styles.tag}>
              <MapPin size={10} color={theme.colors.text.secondary} />
              <Text style={styles.tagText}>{board.location}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isOwner || restaurants.length === 0) return null;
    
    return (
      <TouchableOpacity style={styles.addMoreButton} onPress={handleAddRestaurants}>
        <Plus size={16} color={theme.colors.primary} />
        <Text style={styles.addMoreText}>Add More Places</Text>
      </TouchableOpacity>
    );
  };

  const renderRestaurantItem = ({ item: restaurant }: { item: any }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      onLongPress={() => isOwner && handleRemoveRestaurant(restaurant.id)}
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
          {restaurant.neighborhood && (
            <View style={styles.locationContainer}>
              <MapPin size={10} color={theme.colors.text.tertiary} />
              <Text style={styles.locationText}>{restaurant.neighborhood}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MapPin size={32} color={theme.colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No places yet</Text>
      <Text style={styles.emptyText}>
        {isOwner ? 'Add your first recommendation' : 'This board is empty'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderMoreMenu()}
      <FlatList
        data={restaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderBoardInfo()}
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={renderFooter()}
      />
      {isOwner && restaurants.length === 0 && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddRestaurants}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.floatingAddText}>Add Places</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  navigationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  menuItemLast: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  menuText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.primary,
  },
  boardInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  boardDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  boardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
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
  restaurantImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundGray,
  },
  restaurantContent: {
    flex: 1,
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
    marginBottom: 4,
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
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
  },
  floatingAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  floatingAddText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 6,
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
});