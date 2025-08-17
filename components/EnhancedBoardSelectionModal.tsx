import { designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { linkMetadataService } from '@/services/linkMetadataService';
import { TrafficLightRating as TLRating } from '@/services/ratingService';
import { Board } from '@/types/board';
import { useRouter } from 'expo-router';
import { Check, FileText, Link, Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface EnhancedBoardSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

export const EnhancedBoardSelectionModal: React.FC<EnhancedBoardSelectionModalProps> = ({
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
  
  // New fields for context
  const [externalUrl, setExternalUrl] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [showAddContext, setShowAddContext] = useState(true); // Show by default

  useEffect(() => {
    if (visible && user) {
      loadBoards();
      // Reset context fields when modal opens
      setExternalUrl('');
      setContextNote('');
      setShowAddContext(true); // Keep visible by default
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
      
      // Filter out Your Saves board from regular boards
      const regularBoards = userBoards.filter(b => b.title !== 'Your Saves');
      setBoards(regularBoards);
      setBoardsWithRestaurant(restaurantBoards.map(b => b.id));
      setQuickSavesBoard(quickSaves);
      
      // Check if Your Saves already has this restaurant
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

  const validateAndNormalizeUrl = (url: string): string | null => {
    if (!url.trim()) return null;
    
    const normalized = linkMetadataService.normalizeUrl(url);
    if (!linkMetadataService.isValidUrl(normalized)) {
      Alert.alert('Invalid URL', 'Please enter a valid URL');
      return null;
    }
    
    return normalized;
  };

  const handleSaveToBoard = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const saves = [];
      
      // Validate URL if provided
      let validatedUrl = null;
      if (externalUrl.trim()) {
        validatedUrl = validateAndNormalizeUrl(externalUrl);
        if (externalUrl.trim() && !validatedUrl) {
          setSaving(false);
          return;
        }
      }
      
      // Save to Your Saves if selected
      if (saveToQuickSaves) {
        saves.push(
          boardService.saveRestaurantToQuickSavesWithContext(
            user.id, 
            restaurantId,
            contextNote || undefined,
            selectedRating,
            validatedUrl || undefined
          )
        );
      }
      
      // Save to selected board if any
      if (selectedBoardId) {
        saves.push(
          boardService.addRestaurantToBoardWithContext(
            selectedBoardId, 
            restaurantId, 
            user.id,
            contextNote || undefined,
            selectedRating,
            validatedUrl || undefined
          )
        );
      }
      
      if (saves.length === 0) {
        Alert.alert('Info', 'Please select at least one board');
        setSaving(false);
        return;
      }
      
      await Promise.all(saves);
      
      const contextAdded = externalUrl || contextNote;
      const message = saves.length > 1 
        ? `Added ${restaurantName} to Your Saves and your board${contextAdded ? ' with context!' : '!'}`
        : saveToQuickSaves 
          ? `Added ${restaurantName} to Your Saves${contextAdded ? ' with context!' : '!'}`
          : `Added ${restaurantName} to your board${contextAdded ? ' with context!' : '!'}`;
      
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
          <Text style={styles.boardDescription}>
            {board.restaurant_count || 0} restaurants
          </Text>
        </View>
        {hasRestaurant ? (
          <Text style={styles.savedText}>Already saved</Text>
        ) : isSelected ? (
          <View style={styles.checkmark}>
            <Check size={16} color={theme.colors.white} />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderRating = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>Rate this place (optional):</Text>
      <View style={styles.ratingOptions}>
        {([1, 2, 3] as TLRating[]).map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingOption,
              selectedRating === rating && styles.ratingOptionSelected,
              selectedRating === rating && {
                backgroundColor: rating === 1 ? '#FF4444' : rating === 2 ? '#FFAA44' : '#00AA00'
              }
            ]}
            onPress={() => setSelectedRating(selectedRating === rating ? undefined : rating)}
          >
            <Text style={[
              styles.ratingText,
              selectedRating === rating && styles.ratingTextSelected
            ]}>
              {rating === 1 ? '😕 Poor' : rating === 2 ? '😐 Average' : '😊 Excellent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderContextSection = () => (
    <View style={styles.contextSection}>
      {showAddContext && (
        <View style={styles.contextFields}>
          <Text style={styles.contextTitle}>Add Context (Optional)</Text>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Link size={16} color={designTokens.colors.textMedium} />
              <Text style={styles.inputLabelText}>Link (TikTok, Instagram, etc.)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Paste a link that inspired this save..."
              placeholderTextColor={designTokens.colors.textLight}
              value={externalUrl}
              onChangeText={setExternalUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <FileText size={16} color={designTokens.colors.textMedium} />
              <Text style={styles.inputLabelText}>Note</Text>
            </View>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Why are you saving this? (e.g., 'Amazing pasta from @foodie')"
              placeholderTextColor={designTokens.colors.textLight}
              value={contextNote}
              onChangeText={setContextNote}
              multiline
              maxLength={200}
            />
            <Text style={[
              styles.charCount,
              contextNote.length >= 200 && styles.charCountWarning
            ]}>{contextNote.length}/200</Text>
          </View>

          <TouchableOpacity
            style={styles.clearContextButton}
            onPress={() => {
              setExternalUrl('');
              setContextNote('');
              // Keep the context section visible after clearing
            }}
          >
            <Text style={styles.clearContextText}>Clear context</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Save Restaurant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>

            {/* Your Saves option */}
            <TouchableOpacity
              style={[
                styles.quickSaveOption,
                saveToQuickSaves && styles.quickSaveOptionSelected
              ]}
              onPress={() => setSaveToQuickSaves(!saveToQuickSaves)}
            >
              <View style={styles.boardInfo}>
                <Text style={[styles.boardTitle, { fontSize: 16, fontWeight: '600' }]}>Your Saves</Text>
                <Text style={[styles.boardDescription, { fontSize: 14 }]}>Quick access to all your saved places</Text>
              </View>
              {saveToQuickSaves && (
                <View style={styles.checkmark}>
                  <Check size={16} color={theme.colors.white} />
                </View>
              )}
            </TouchableOpacity>

            {/* Context Section - Show First as per test guide */}
            {renderContextSection()}

            {/* Rating */}
            {renderRating()}

            {/* Boards list */}
            {boards.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Or add to a board:</Text>
                {loading ? (
                  <ActivityIndicator style={styles.loader} />
                ) : (
                  boards.map(renderBoard)
                )}
              </>
            )}

            {/* Create new board */}
            <TouchableOpacity style={styles.createBoardButton} onPress={handleCreateNewBoard}>
              <Plus size={20} color={theme.colors.primary} />
              <Text style={styles.createBoardText}>Create New Board</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveToBoard}
              disabled={saving || (!saveToQuickSaves && !selectedBoardId)}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: designTokens.borderRadius.xl,
    borderTopRightRadius: designTokens.borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  quickSaveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickSaveOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  boardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  boardItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  boardItemDisabled: {
    opacity: 0.5,
  },
  boardInfo: {
    flex: 1,
  },
  boardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  boardDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  ratingContainer: {
    marginBottom: theme.spacing.md,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  ratingOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
  },
  ratingOptionSelected: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingText: {
    fontSize: 12,
    color: theme.colors.text.primary,
  },
  ratingTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  contextSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  addContextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderStyle: 'dashed',
  },
  addContextText: {
    fontSize: 14,
    color: designTokens.colors.primaryOrange,
    fontWeight: '500',
  },
  contextFields: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  inputLabelText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  input: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  noteInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: '#FF4444',
    fontWeight: '600',
  },
  clearContextButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.xs,
  },
  clearContextText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textDecorationLine: 'underline',
  },
  createBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    borderStyle: 'dashed',
  },
  createBoardText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  loader: {
    marginVertical: theme.spacing.lg,
  },
});