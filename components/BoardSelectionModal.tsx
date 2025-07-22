import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Plus, Check, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { boardService } from '@/services/boardService';
import { useAuth } from '@/contexts/AuthContext';
import { Board } from '@/types/board';
import { useRouter } from 'expo-router';

interface BoardSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onSuccess?: () => void;
}

export const BoardSelectionModal: React.FC<BoardSelectionModalProps> = ({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  onSuccess
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [boardsWithRestaurant, setBoardsWithRestaurant] = useState<string[]>([]);

  useEffect(() => {
    if (visible && user) {
      loadBoards();
    }
  }, [visible, user]);

  const loadBoards = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [userBoards, restaurantBoards] = await Promise.all([
        boardService.getUserBoards(user.id),
        boardService.getBoardsForRestaurant(restaurantId, user.id)
      ]);
      
      setBoards(userBoards);
      setBoardsWithRestaurant(restaurantBoards.map(b => b.id));
    } catch (error) {
      console.error('Error loading boards:', error);
      Alert.alert('Error', 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBoard = async () => {
    if (!selectedBoardId || !user) return;

    setSaving(true);
    try {
      await boardService.addRestaurantToBoard(selectedBoardId, restaurantId, user.id);
      Alert.alert('Success', `Added ${restaurantName} to your board!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        Alert.alert('Info', 'This restaurant is already in the selected board');
      } else {
        Alert.alert('Error', 'Failed to add restaurant to board');
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
            {board.restaurant_count} restaurants • {board.is_private ? 'Private' : 'Public'}
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

          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <Text style={styles.subtitle}>Select a board to save this restaurant</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <ScrollView style={styles.boardsList} showsVerticalScrollIndicator={false}>
                {boards.map(renderBoard)}
                
                <TouchableOpacity style={styles.createBoardButton} onPress={handleCreateNewBoard}>
                  <Plus size={20} color={theme.colors.primary} />
                  <Text style={styles.createBoardText}>Create New Board</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!selectedBoardId || saving) && styles.saveButtonDisabled
                  ]}
                  onPress={handleSaveToBoard}
                  disabled={!selectedBoardId || saving}
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
});