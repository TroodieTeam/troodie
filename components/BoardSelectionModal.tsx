import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { TrafficLightRating as TLRating } from '@/services/ratingService';
import { Board } from '@/types/board';
import { useRouter } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface BoardSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

export const BoardSelectionModal: React.FC<BoardSelectionModalProps> = ({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  onSuccess,
  onRefresh
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [boardsWithRestaurant, setBoardsWithRestaurant] = useState<string[]>([]);
  const [quickSavesBoard, setQuickSavesBoard] = useState<Board | null>(null);
  const [saveToQuickSaves, setSaveToQuickSaves] = useState(true);
  const [selectedRating, setSelectedRating] = useState<TLRating | undefined>();

  useEffect(() => {
    if (visible && user) {
      loadBoards();
    }
  }, [visible, user]);

  const loadBoards = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [userBoards, restaurantBoards, quickSaves] = await Promise.all([
        boardService.getUserBoards(user.id),
        boardService.getBoardsForRestaurant(restaurantId, user.id),
        boardService.getUserQuickSavesBoard(user.id)
      ]);
      
      // Filter out Quick Saves board from regular boards
      const regularBoards = userBoards.filter(b => b.title !== 'Quick Saves');
      setBoards(regularBoards);
      setBoardsWithRestaurant(restaurantBoards.map(b => b.id));
      setQuickSavesBoard(quickSaves);
      
      // Check if Quick Saves already has this restaurant
      if (quickSaves && restaurantBoards.some(b => b.id === quickSaves.id)) {
        setSaveToQuickSaves(false);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      Alert.alert('Error', 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBoard = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const saves = [];
      
      // Save to Quick Saves if selected
      if (saveToQuickSaves) {
        saves.push(boardService.saveRestaurantToQuickSaves(user.id, restaurantId));
      }
      
      // Save to selected board if any
      if (selectedBoardId) {
        saves.push(boardService.addRestaurantToBoard(selectedBoardId, restaurantId, user.id));
      }
      
      if (saves.length === 0) {
        Alert.alert('Info', 'Please select at least one board');
        setSaving(false);
        return;
      }
      
      await Promise.all(saves);
      
      const message = saves.length > 1 
        ? `Added ${restaurantName} to Quick Saves and your board!`
        : saveToQuickSaves 
          ? `Added ${restaurantName} to Quick Saves!`
          : `Added ${restaurantName} to your board!`;
      
      Alert.alert('Success', message);
      onSuccess?.();
      onRefresh?.();
      onClose();
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        Alert.alert('Info', 'This restaurant is already saved to one of the selected boards');
      } else {
        Alert.alert('Error', 'Failed to save restaurant');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewBoard = () => {
    onClose();
    router.push('/add/create-board');
  };

  const renderBoard = (board: Board) => {
    const isSelected = selectedBoardId === board.id;
    const hasRestaurant = boardsWithRestaurant.includes(board.id);

    return (
      <TouchableOpacity
        key={board.id}
        style={[
          styles.boardItem,
          isSelected && styles.boardItemSelected,
          hasRestaurant && styles.boardItemDisabled
        ]}
        onPress={() => !hasRestaurant && setSelectedBoardId(board.id)}
        disabled={hasRestaurant}
      >
        <View style={styles.boardInfo}>
          <Text style={styles.boardTitle}>{board.title}</Text>
          <Text style={styles.boardMeta}>
            {board.restaurant_count} restaurants • {(board.is_private || board.type === 'private') ? 'Private' : 'Public'}
          </Text>
        </View>
        {hasRestaurant ? (
          <View style={styles.checkmark}>
            <Check size={16} color="#10B981" />
          </View>
        ) : (
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add to Board</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <ScrollView style={styles.boardsList} showsVerticalScrollIndicator={false}>
                {/* Quick Saves option */}
                {quickSavesBoard && (
                  <TouchableOpacity
                    style={[
                      styles.quickSavesItem,
                      saveToQuickSaves && styles.quickSavesItemSelected,
                      boardsWithRestaurant.includes(quickSavesBoard.id) && styles.boardItemDisabled
                    ]}
                    onPress={() => !boardsWithRestaurant.includes(quickSavesBoard.id) && setSaveToQuickSaves(!saveToQuickSaves)}
                    disabled={boardsWithRestaurant.includes(quickSavesBoard.id)}
                  >
                    <View style={styles.boardInfo}>
                      <Text style={styles.quickSavesTitle}>Quick Saves</Text>
                      <Text style={styles.quickSavesMeta}>Your default saved restaurants</Text>
                    </View>
                    {boardsWithRestaurant.includes(quickSavesBoard.id) ? (
                      <View style={styles.checkmark}>
                        <Check size={16} color="#10B981" />
                      </View>
                    ) : (
                      <View style={[styles.checkbox, saveToQuickSaves && styles.checkboxSelected]}>
                        {saveToQuickSaves && <Check size={14} color="#FFFFFF" />}
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                
                {/* Other boards section */}
                {boards.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Your Boards</Text>
                    {boards.map(renderBoard)}
                  </>
                )}
                
                <TouchableOpacity style={styles.createBoardButton} onPress={handleCreateNewBoard}>
                  <Plus size={20} color={theme.colors.primary} />
                  <Text style={styles.createBoardText}>Create New Board</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!selectedBoardId && !saveToQuickSaves) && styles.saveButtonDisabled,
                    saving && styles.saveButtonDisabled
                  ]}
                  onPress={handleSaveToBoard}
                  disabled={(!selectedBoardId && !saveToQuickSaves) || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Add to Board</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  restaurantInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  boardsList: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  boardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  boardItemSelected: {
    backgroundColor: theme.colors.primary + '10',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  boardItemDisabled: {
    opacity: 0.6,
  },
  boardInfo: {
    flex: 1,
  },
  boardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    marginBottom: 2,
  },
  boardMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  createBoardText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  quickSavesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  quickSavesItemSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  quickSavesTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  quickSavesMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  ratingSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ratingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
});