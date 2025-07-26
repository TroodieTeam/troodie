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
  Share2,
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
  View,
  Dimensions
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={handleShareBoard}>
          <Share2 size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreVertical size={20} color={theme.colors.text.primary} />
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

  const renderBoardInfo = () => (
    <View style={styles.boardInfo}>
      <View style={styles.boardTitleSection}>
        <Text style={styles.boardTitle}>{board?.title}</Text>
        <View style={styles.privacyBadge}>
          {board?.is_private ? (
            <>
              <Lock size={14} color={theme.colors.text.secondary} />
              <Text style={styles.privacyText}>Private</Text>
            </>
          ) : (
            <>
              <Globe size={14} color={theme.colors.text.secondary} />
              <Text style={styles.privacyText}>Public</Text>
            </>
          )}
        </View>
      </View>
      
      {board?.description && (
        <Text style={styles.boardDescription}>{board.description}</Text>
      )}
      
      <View style={styles.boardMeta}>
        <View style={styles.metaCard}>
          <Text style={styles.metaNumber}>{board?.restaurant_count || 0}</Text>
          <Text style={styles.metaLabel}>Places</Text>
        </View>
        
        <View style={styles.metaCard}>
          <Users size={16} color={theme.colors.text.secondary} />
          <Text style={styles.metaNumber}>{board?.member_count || 0}</Text>
          <Text style={styles.metaLabel}>Members</Text>
        </View>
        
        {board?.category && (
          <View style={styles.metaCard}>
            <Text style={styles.metaCategory}>{board.category}</Text>
          </View>
        )}
        
        {board?.location && (
          <View style={styles.metaCard}>
            <MapPin size={14} color={theme.colors.text.secondary} />
            <Text style={styles.metaLocation}>{board.location}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActionBar = () => {
    if (!isOwner) return null;
    
    return (
      <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddRestaurants}>
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingAddText}>Add Places</Text>
      </TouchableOpacity>
    );
  };

  const renderRestaurants = () => {
    if (restaurants.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MapPin size={48} color={theme.colors.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No places yet</Text>
          <Text style={styles.emptyText}>
            {isOwner 
              ? 'Start building your collection' 
              : 'This board is waiting for its first recommendation'}
          </Text>
          {isOwner && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddRestaurants}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Your First Place</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.restaurantsList}>
        {restaurants.map((restaurant, index) => (
          <TouchableOpacity
            key={restaurant.id}
            style={[
              styles.restaurantCard,
              index === restaurants.length - 1 && styles.lastCard
            ]}
            onPress={() => router.push(`/restaurant/${restaurant.id}`)}
            onLongPress={() => isOwner && handleRemoveRestaurant(restaurant.id)}
          >
            <Image 
              source={{ uri: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' }} 
              style={styles.restaurantImage} 
            />
            <View style={styles.restaurantContent}>
              <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                {restaurant.google_rating && (
                  <View style={styles.rating}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>{restaurant.google_rating}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.restaurantCuisine} numberOfLines={1}>
                {restaurant.cuisine_types?.join(' • ') || 'Restaurant'}
              </Text>
              
              <View style={styles.restaurantFooter}>
                <Text style={styles.restaurantLocation}>
                  {restaurant.neighborhood || 'Charlotte'}
                </Text>
                <Text style={styles.restaurantPrice}>
                  {restaurant.price_range || '$$'}
                </Text>
              </View>
              
              {restaurant.boardRestaurant?.notes && (
                <Text style={styles.restaurantNote} numberOfLines={2}>
                  "{restaurant.boardRestaurant.notes}"
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderBoardInfo()}
        {renderRestaurants()}
      </ScrollView>
      {renderActionBar()}
      
      <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
        <Home size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moreMenu: {
    position: 'absolute',
    top: 70,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  menuItemLast: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  menuText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.text.primary,
  },
  boardInfo: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  boardTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  boardTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.heading.bold,
    color: theme.colors.text.dark,
    flex: 1,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundGray,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.xxl,
    gap: theme.spacing.xs,
  },
  privacyText: {
    fontSize: 12,
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.text.secondary,
  },
  boardDescription: {
    fontSize: 16,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.secondary,
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  boardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundGray,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  metaNumber: {
    fontSize: 16,
    fontFamily: theme.fonts.body.semiBold,
    color: theme.colors.text.primary,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.secondary,
  },
  metaCategory: {
    fontSize: 14,
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.primary,
  },
  metaLocation: {
    fontSize: 14,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.secondary,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 80,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: theme.spacing.sm,
  },
  floatingAddText: {
    fontSize: 16,
    fontFamily: theme.fonts.body.semiBold,
    color: '#FFFFFF',
  },
  homeButton: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.lg,
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.heading.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xxl,
    gap: theme.spacing.sm,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.body.semiBold,
    color: '#FFFFFF',
  },
  restaurantsList: {
    paddingHorizontal: theme.spacing.lg,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  lastCard: {
    marginBottom: 0,
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.backgroundGray,
  },
  restaurantContent: {
    padding: theme.spacing.lg,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: theme.fonts.heading.semiBold,
    color: theme.colors.text.dark,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  restaurantCuisine: {
    fontSize: 14,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  restaurantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantLocation: {
    fontSize: 14,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.tertiary,
  },
  restaurantPrice: {
    fontSize: 14,
    fontFamily: theme.fonts.body.medium,
    color: theme.colors.primary,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: theme.fonts.body.semiBold,
    color: theme.colors.text.primary,
  },
  restaurantNote: {
    fontSize: 14,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});