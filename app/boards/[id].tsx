import { RestaurantCard } from '@/components/cards/RestaurantCard';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { boardService } from '@/services/boardService';
import { boardInvitationService } from '@/services/boardInvitationService';
import { restaurantService } from '@/services/restaurantService';
import ShareService from '@/services/shareService';
import { ToastService } from '@/services/toastService';
import { BoardRestaurant, BoardWithRestaurants } from '@/types/board';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Edit,
  Globe,
  Lock,
  MapPin,
  MoreVertical,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<any>(null);
  const [showInvitationAcceptModal, setShowInvitationAcceptModal] = useState(false);
  const [invitationActionLoading, setInvitationActionLoading] = useState(false);

  useEffect(() => {
    console.log('[BoardDetail] Component mounted with boardId:', boardId);
    loadBoardDetails();
  }, [boardId]);

  const loadBoardDetails = async () => {
    try {
      setLoading(true);
      console.log('[BoardDetail] Loading board details for boardId:', boardId);

      const boardData = await boardService.getBoardWithRestaurants(boardId);
      console.log('[BoardDetail] Board data loaded:', boardData ? 'success' : 'null');

      if (!boardData) {
        console.log('[BoardDetail] Board not found, navigating back');
        Alert.alert('Error', 'Board not found');
        router.back();
        return;
      }

      setBoard(boardData);
      setIsOwner(boardData.user_id === user?.id);
      console.log('[BoardDetail] Is owner:', boardData.user_id === user?.id);

      // Check if user has a pending invitation for this board
      if (user?.id) {
        console.log('[BoardDetail] Checking for pending invitations for user:', user.id);

        // First, try to get invitation ID from route params (if coming from notification)
        const invitationIdFromParams = params.invitation_id as string | undefined;
        console.log('[BoardDetail] Invitation ID from params:', invitationIdFromParams);

        let invitation = null;

        // If we have an invitation_id, fetch that specific invitation
        if (invitationIdFromParams) {
          console.log('[BoardDetail] Fetching specific invitation:', invitationIdFromParams);
          console.log('[BoardDetail] Current user ID:', user.id);

          // Try without the invitee_id filter to see if RLS is the issue
          const { data: allData, error: allError } = await supabase
            .from('board_invitations')
            .select('id, board_id, inviter_id, invitee_id, status, created_at, expires_at')
            .eq('id', invitationIdFromParams);

          console.log('[BoardDetail] Query without invitee filter - data:', allData);
          console.log('[BoardDetail] Query without invitee filter - error:', allError);

          const { data, error } = await supabase
            .from('board_invitations')
            .select('id, board_id, inviter_id, invitee_id, status, created_at, expires_at')
            .eq('id', invitationIdFromParams)
            .maybeSingle();

          if (error) {
            console.error('[BoardDetail] Error fetching specific invitation:', error);
          } else if (data) {
            console.log('[BoardDetail] Found invitation with status:', data.status);
            invitation = data;
          } else {
            console.log('[BoardDetail] Invitation not found by ID, it may have been deleted or already processed');
          }
        }

        // Otherwise, look for any pending invitations for this board and user
        if (!invitation) {
          console.log('[BoardDetail] Looking for pending invitations by board_id and invitee_id');
          const { data: invitations, error: invitationError } = await supabase
            .from('board_invitations')
            .select('id, board_id, inviter_id, invitee_id, status, created_at, expires_at')
            .eq('board_id', boardId)
            .eq('invitee_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

          if (invitationError) {
            console.error('[BoardDetail] Error fetching invitations:', invitationError);
          }

          invitation = invitations && invitations.length > 0 ? invitations[0] : null;
        }

        console.log('[BoardDetail] Final invitation:', invitation ? 'found' : 'not found');
        console.log('[BoardDetail] Invitation data:', JSON.stringify(invitation, null, 2));

        if (invitation && invitation.status === 'pending') {
          console.log('[BoardDetail] Setting pending invitation and showing modal');
          setPendingInvitation(invitation);
          setShowInvitationAcceptModal(true);
        }
      }

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

  const handleShareBoard = async () => {
    if (!board) return;

    try {
      const result = await ShareService.share({
        type: 'board',
        id: board.id,
        title: board.name,
        description: board.description || `Check out my curated collection of ${restaurants.length} restaurants`,
        count: restaurants.length
      });

      if (result.success) {
        ToastService.showSuccess('Board shared successfully');
      }
    } catch (error) {
      console.error('Error sharing board:', error);
      ToastService.showError('Failed to share board');
    }
  };

  const handleInviteCollaborator = async () => {
    if (!inviteUsername.trim()) {
      ToastService.showError('Please enter a username');
      return;
    }

    try {
      setInviteLoading(true);
      // TODO: Look up user by username and get their ID
      // For now, we'll show a success message
      ToastService.showSuccess(`Invitation sent to @${inviteUsername}`);
      setShowInviteModal(false);
      setInviteUsername('');
    } catch (error) {
      console.error('Error sending invitation:', error);
      ToastService.showError('Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEditBoard = () => {
    if (!isOwner) return;

    Alert.alert(
      'Edit Board',
      'What would you like to edit?',
      [
        {
          text: 'Board Name',
          onPress: () => {
            Alert.prompt(
              'Edit Board Name',
              'Enter a new name for your board:',
              async (newName) => {
                if (newName && newName.trim()) {
                  try {
                    await boardService.updateBoard(boardId, { name: newName.trim() });
                    setBoard(prev => prev ? { ...prev, name: newName.trim() } : null);
                    ToastService.showSuccess('Board name updated');
                  } catch (error) {
                    ToastService.showError('Failed to update board name');
                  }
                }
              },
              'plain-text',
              board?.name
            );
          }
        },
        {
          text: 'Board Description',
          onPress: () => {
            Alert.prompt(
              'Edit Board Description',
              'Enter a new description for your board:',
              async (newDescription) => {
                if (newDescription !== undefined) {
                  try {
                    await boardService.updateBoard(boardId, { description: newDescription.trim() || null });
                    setBoard(prev => prev ? { ...prev, description: newDescription.trim() || null } : null);
                    ToastService.showSuccess('Board description updated');
                  } catch (error) {
                    ToastService.showError('Failed to update board description');
                  }
                }
              },
              'plain-text',
              board?.description || ''
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
              ToastService.showSuccess('Board deleted');
              router.push('/(tabs)');
            } catch (error) {
              ToastService.showError('Failed to delete board');
            }
          }
        }
      ]
    );
  };

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation || !user?.id) return;

    try {
      setInvitationActionLoading(true);
      const result = await boardInvitationService.acceptInvitation(pendingInvitation.id, user.id);

      if (result.success) {
        ToastService.showSuccess('Invitation accepted! You are now a collaborator');
        setShowInvitationAcceptModal(false);
        setPendingInvitation(null);
        // Reload board to show updated member status
        await loadBoardDetails();
      } else {
        ToastService.showError(result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      ToastService.showError('Failed to accept invitation');
    } finally {
      setInvitationActionLoading(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!pendingInvitation || !user?.id) return;

    try {
      setInvitationActionLoading(true);
      const result = await boardInvitationService.declineInvitation(pendingInvitation.id, user.id);

      if (result.success) {
        ToastService.showSuccess('Invitation declined');
        setShowInvitationAcceptModal(false);
        setPendingInvitation(null);
        // Navigate back since user declined
        router.back();
      } else {
        ToastService.showError(result.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      ToastService.showError('Failed to decline invitation');
    } finally {
      setInvitationActionLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color={theme.colors.text.dark} />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconButton} onPress={handleShareBoard}>
          <Share2 size={20} color={theme.colors.text.dark} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreVertical size={20} color={theme.colors.text.dark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderMoreMenu = () => {
    if (!showMoreMenu || !isOwner) return null;

    return (
      <Pressable
        style={styles.menuOverlay}
        onPress={() => setShowMoreMenu(false)}
      >
        <View style={styles.moreMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMoreMenu(false);
              handleEditBoard();
            }}
          >
            <Edit size={18} color={theme.colors.text.primary} />
            <Text style={styles.menuText}>Edit Board</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={() => {
              setShowMoreMenu(false);
              handleDeleteBoard();
            }}
          >
            <Trash2 size={18} color={theme.colors.error} />
            <Text style={[styles.menuText, { color: theme.colors.error }]}>Delete Board</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderBoardHeader = () => (
    <View style={styles.boardHeader}>
      <View style={styles.boardHeaderTop}>
        <View style={styles.boardTitleContainer}>
          <Text style={styles.boardTitle} numberOfLines={2}>{board?.title || 'Board'}</Text>
          <View style={styles.boardMeta}>
            {board?.is_private ? (
              <View style={styles.metaItem}>
                <Lock size={12} color={theme.colors.text.secondary} />
                <Text style={styles.metaText}>Private</Text>
              </View>
            ) : (
              <View style={styles.metaItem}>
                <Globe size={12} color={theme.colors.text.secondary} />
                <Text style={styles.metaText}>Public</Text>
              </View>
            )}
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{board?.restaurant_count || 0} places</Text>
            {board?.member_count && board.member_count > 1 && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <View style={styles.metaItem}>
                  <Users size={12} color={theme.colors.text.secondary} />
                  <Text style={styles.metaText}>{board.member_count} members</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {board?.description && (
        <Text style={styles.boardDescription} numberOfLines={3}>{board.description}</Text>
      )}

      {board?.location && (
        <View style={styles.locationTag}>
          <MapPin size={12} color={theme.colors.primary} />
          <Text style={styles.locationText}>{board.location}</Text>
        </View>
      )}
    </View>
  );

  const renderActionCards = () => {
    if (!isOwner) return null;

    return (
      <View style={styles.actionCards}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleAddRestaurants}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardIcon}>
            <Plus size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Add Places</Text>
            <Text style={styles.actionCardSubtitle}>Curate your collection</Text>
          </View>
          <ChevronLeft size={16} color={theme.colors.text.tertiary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowInviteModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardIcon}>
            <UserPlus size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Invite Collaborators</Text>
            <Text style={styles.actionCardSubtitle}>Plan together with friends</Text>
          </View>
          <ChevronLeft size={16} color={theme.colors.text.tertiary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderInviteModal = () => (
    <Modal
      visible={showInviteModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowInviteModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowInviteModal(false)}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Collaborators</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Invite friends to add places and collaborate on this board
          </Text>

          <View style={styles.inviteInputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                value={inviteUsername}
                onChangeText={setInviteUsername}
                placeholder="username"
                placeholderTextColor={theme.colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleInviteCollaborator}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonTextPrimary}>Send Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderInvitationAcceptModal = () => (
    <Modal
      visible={showInvitationAcceptModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowInvitationAcceptModal(false);
        router.back();
      }}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => {
          setShowInvitationAcceptModal(false);
          router.back();
        }}
      >
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Board Invitation</Text>
          </View>

          <Text style={styles.modalDescription}>
            You've been invited to collaborate on "{board?.title || 'this board'}".
            Accept to start adding and curating places together!
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={handleDeclineInvitation}
              disabled={invitationActionLoading}
            >
              {invitationActionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.text.primary} />
              ) : (
                <Text style={styles.modalButtonTextSecondary}>Decline</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleAcceptInvitation}
              disabled={invitationActionLoading}
            >
              {invitationActionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonTextPrimary}>Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderRestaurantsList = () => {
    if (restaurants.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MapPin size={32} color={theme.colors.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No places yet</Text>
          <Text style={styles.emptyText}>
            {isOwner ? 'Start building your collection' : 'This board is empty'}
          </Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddRestaurants}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add First Place</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.restaurantsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Places ({restaurants.length})</Text>
        </View>
        {restaurants.map((restaurant) => (
          <View key={restaurant.id} style={styles.restaurantItem}>
            <RestaurantCard
              restaurant={restaurant}
              onPress={() => router.push(`/restaurant/${restaurant.id}`)}
            />
          </View>
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
      {renderInviteModal()}
      {renderInvitationAcceptModal()}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderBoardHeader()}
        {renderActionCards()}
        {renderRestaurantsList()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  moreMenu: {
    position: 'absolute',
    top: 68,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  menuText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  boardHeaderTop: {
    marginBottom: 12,
  },
  boardTitleContainer: {
    flex: 1,
  },
  boardTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: theme.colors.text.dark,
    marginBottom: 8,
    lineHeight: 30,
  },
  boardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
  },
  metaDot: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginHorizontal: 2,
  },
  boardDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFAD27',
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  actionCards: {
    padding: 16,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  restaurantsSection: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
  },
  restaurantItem: {
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: theme.colors.text.dark,
  },
  modalClose: {
    fontSize: 24,
    color: theme.colors.text.tertiary,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    marginBottom: 24,
  },
  inviteInputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    height: 48,
  },
  inputPrefix: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
  },
  modalButtonTextPrimary: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
