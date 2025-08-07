import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal
} from 'react-native';
import { Check, Plus, X, ChevronUp } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { designTokens } from '@/constants/designTokens';
import { Board } from '@/types/board';
import { boardService } from '@/services/boardService';
import { saveService } from '@/services/saveService';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

interface BoardSelectionToastProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onSuccess?: () => void;
}

export const BoardSelectionToast: React.FC<BoardSelectionToastProps> = ({
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
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [boardsWithRestaurant, setBoardsWithRestaurant] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  
  const slideAnim = useState(new Animated.Value(300))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const expandAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      loadBoards();
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset state
      setExpanded(false);
      setSelectedBoardIds([]);
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const loadBoards = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [userBoards, restaurantBoards] = await Promise.all([
        boardService.getUserBoards(user.id),
        boardService.getBoardsForRestaurant(restaurantId, user.id)
      ]);
      
      // Filter out Your Saves board
      const regularBoards = userBoards.filter(b => b.title !== 'Your Saves');
      setBoards(regularBoards);
      setBoardsWithRestaurant(restaurantBoards.map(b => b.id));
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };

  const handleSaveToBoards = async () => {
    if (!user || selectedBoardIds.length === 0) return;

    setSaving(true);
    try {
      await saveService.saveToBoards(
        user.id,
        restaurantId,
        selectedBoardIds,
        false, // Don't include Your Saves
        restaurantName
      );
      
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error saving to boards:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleBoardSelection = (boardId: string) => {
    setSelectedBoardIds(prev => 
      prev.includes(boardId)
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const handleCreateNewBoard = () => {
    handleClose();
    router.push('/add/create-board');
  };

  const expandedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 400]
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleClose}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <BlurView intensity={10} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              height: expandedHeight
            }
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Add to Boards</Text>
                <Text style={styles.subtitle}>{restaurantName}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={20} color={designTokens.colors.textMedium} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <>
                <ScrollView 
                  style={styles.boardsList} 
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={expanded}
                >
                  {boards.slice(0, expanded ? boards.length : 3).map((board) => {
                    const isSelected = selectedBoardIds.includes(board.id);
                    const hasRestaurant = boardsWithRestaurant.includes(board.id);

                    return (
                      <TouchableOpacity
                        key={board.id}
                        style={[
                          styles.boardItem,
                          isSelected && styles.boardItemSelected,
                          hasRestaurant && styles.boardItemDisabled
                        ]}
                        onPress={() => !hasRestaurant && toggleBoardSelection(board.id)}
                        disabled={hasRestaurant}
                      >
                        <Text style={styles.boardTitle} numberOfLines={1}>
                          {board.title}
                        </Text>
                        {hasRestaurant ? (
                          <Check size={16} color="#10B981" />
                        ) : (
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" />}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {boards.length > 3 && !expanded && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => setExpanded(true)}
                    >
                      <Text style={styles.expandText}>Show {boards.length - 3} more</Text>
                      <ChevronUp size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}

                  {expanded && (
                    <TouchableOpacity style={styles.createBoardButton} onPress={handleCreateNewBoard}>
                      <Plus size={16} color={theme.colors.primary} />
                      <Text style={styles.createBoardText}>Create New Board</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      selectedBoardIds.length === 0 && styles.saveButtonDisabled
                    ]}
                    onPress={handleSaveToBoards}
                    disabled={selectedBoardIds.length === 0 || saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        Add to {selectedBoardIds.length} Board{selectedBoardIds.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  boardsList: {
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  boardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  boardItemSelected: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  boardItemDisabled: {
    opacity: 0.6,
  },
  boardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: designTokens.colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  expandText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  createBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  createBoardText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
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