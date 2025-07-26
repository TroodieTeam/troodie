import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { userService } from '@/services/userService';
import { BoardCreationForm } from '@/types/board';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    Crown,
    Globe,
    Lock,
    MapPin,
    Tag
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BoardDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const boardType = params.boardType as 'free' | 'private' | 'paid';
  const { user } = useAuth();
  const { updateNetworkProgress } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form validation states
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const categories = [
    'Date Night',
    'Quick Lunch',
    'Hidden Gems',
    'Fine Dining',
    'Brunch Spots',
    'Coffee Shops',
    'Vegetarian',
    'Family Friendly',
    'Late Night',
    'Special Occasion'
  ];

  const suggestedTags = [
    'romantic',
    'cozy',
    'trendy',
    'affordable',
    'luxury',
    'outdoor_seating',
    'rooftop',
    'waterfront',
    'historic',
    'modern'
  ];

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!title.trim()) {
      newErrors.title = 'Board title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    if (!category) {
      newErrors.category = 'Please select a category';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to create a board');
      return;
    }
    
    if (!validateForm()) {
      AccessibilityInfo.announceForAccessibility('Please fix the form errors before continuing');
      return;
    }

    setLoading(true);
    try {
      const boardData: BoardCreationForm = {
        title: title.trim(),
        description: description.trim(),
        type: boardType,
        category,
        location: location.trim(),
        is_private: boardType === 'private',
        allow_comments: true,
        allow_saves: true,
        price: boardType === 'paid' ? 0 : undefined
      };

      const board = await boardService.createBoard(user.id, boardData);

      if (board) {
        // Update network progress
        try {
          await userService.updateNetworkProgress(user.id, 'board');
          updateNetworkProgress('board');
        } catch (error) {
          console.error('Error updating network progress:', error);
        }

        // Navigate to board assignment screen
        router.push({
          pathname: '/add/board-assignment',
          params: { 
            boardId: board.id,
            boardTitle: board.title
          }
        });
      } else {
        Alert.alert('Error', 'Failed to create board. Please try again.');
      }
    } catch (error) {
      console.error('Error creating board:', error);
      Alert.alert('Error', 'Failed to create board. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = title.trim() && description.trim() && category;

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <ArrowLeft size={24} color={theme.colors.text.dark} />
      </TouchableOpacity>
      
      <View style={styles.headerTitle}>
        <Text style={styles.title} accessibilityRole="header">Board Details</Text>
        <Text style={styles.subtitle}>Add information about your board</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.createButton, (!isFormValid || loading) && styles.createButtonDisabled]}
        onPress={handleNext}
        disabled={!isFormValid || loading}
        accessibilityLabel="Create board"
        accessibilityRole="button"
        accessibilityState={{ disabled: !isFormValid || loading }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.createButtonText}>Create</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBoardTypeIndicator = () => {
    const typeConfig = {
      free: { icon: Globe, color: '#10B981', label: 'Public Board' },
      private: { icon: Lock, color: '#64748B', label: 'Private Board' },
      paid: { icon: Crown, color: theme.colors.primary, label: 'Paid Board' }
    };

    const config = typeConfig[boardType];
    const Icon = config.icon;

    return (
      <View 
        style={[styles.typeIndicator, { backgroundColor: config.color + '1A' }]}
        accessibilityLabel={`${config.label} selected`}
      >
        <Icon size={16} color={config.color} />
        <Text style={[styles.typeIndicatorText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderCoverImage = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cover Image</Text>
      <TouchableOpacity 
        style={styles.coverImageUpload}
        accessibilityLabel="Add cover image"
        accessibilityRole="button"
        accessibilityHint="Tap to select a cover image for your board"
      >
        <Camera size={24} color={theme.colors.text.secondary} />
        <Text style={styles.coverImageText}>Add Cover Image</Text>
        <Text style={styles.coverImageSubtext}>Recommended: 1200x630px</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <View style={styles.formField}>
        <Text style={styles.label}>Board Title <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="e.g., Hidden Speakeasies in Manhattan"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) {
              setErrors({...errors, title: ''});
            }
          }}
          placeholderTextColor={theme.colors.text.light}
          accessibilityLabel="Board title"
          accessibilityHint="Enter a descriptive title for your board"
          maxLength={100}
        />
        {errors.title && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.title}</Text>
          </View>
        )}
      </View>

      <View style={styles.formField}>
        <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.description && styles.inputError]}
          placeholder="Describe what makes this board special..."
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description) {
              setErrors({...errors, description: ''});
            }
          }}
          multiline
          numberOfLines={4}
          placeholderTextColor={theme.colors.text.light}
          accessibilityLabel="Board description"
          accessibilityHint="Describe what your board is about"
          maxLength={500}
        />
        {errors.description && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.description}</Text>
          </View>
        )}
      </View>

      <View style={styles.formField}>
        <Text style={styles.label}>Location <Text style={styles.optional}>(Optional)</Text></Text>
        <View style={[styles.inputContainer, location && styles.inputContainerActive]}>
          <MapPin size={16} color={location ? theme.colors.primary : theme.colors.text.light} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder="e.g., Manhattan, New York"
            value={location}
            onChangeText={setLocation}
            placeholderTextColor={theme.colors.text.light}
            accessibilityLabel="Board location"
            accessibilityHint="Optional: Add a location for your board"
          />
        </View>
      </View>
    </View>
  );

  const renderCategory = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Category <Text style={styles.required}>*</Text></Text>
        {errors.category && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.category}</Text>
          </View>
        )}
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
        accessibilityLabel="Category selection"
      >
        <View style={styles.categoriesContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                category === cat && styles.categoryPillActive
              ]}
              onPress={() => {
                setCategory(cat);
                if (errors.category) {
                  setErrors({...errors, category: ''});
                }
              }}
              accessibilityLabel={cat}
              accessibilityRole="button"
              accessibilityState={{ selected: category === cat }}
            >
              <Text style={[
                styles.categoryText,
                category === cat && styles.categoryTextActive
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderTags = () => (
    <View style={[styles.section, styles.lastSection]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <Text style={styles.sectionSubtitle}>Help people discover your board</Text>
      </View>
      <View style={styles.tagsContainer}>
        {suggestedTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tag,
                isSelected && styles.tagActive
              ]}
              onPress={() => {
                if (isSelected) {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                } else if (selectedTags.length < 5) {
                  setSelectedTags([...selectedTags, tag]);
                } else {
                  Alert.alert('Tag Limit', 'You can select up to 5 tags');
                }
              }}
              accessibilityLabel={tag.replace('_', ' ')}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityHint={isSelected ? 'Tap to remove tag' : 'Tap to add tag'}
            >
              <Tag size={12} color={isSelected ? '#FFFFFF' : theme.colors.text.secondary} />
              <Text style={[
                styles.tagText,
                isSelected && styles.tagTextActive
              ]}>
                {tag.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedTags.length > 0 && (
        <Text style={styles.tagCount}>{selectedTags.length}/5 tags selected</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderBoardTypeIndicator()}
          {renderCoverImage()}
          {renderBasicInfo()}
          {renderCategory()}
          {renderTags()}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  typeIndicatorText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastSection: {
    borderBottomWidth: 0,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  coverImageUpload: {
    height: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverImageText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
  },
  coverImageSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  optional: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.dark,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputContainerActive: {
    borderColor: theme.colors.primary,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.dark,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#EF4444',
  },
  categoriesScrollContent: {
    paddingRight: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  tagTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
  },
  tagCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  bottomPadding: {
    height: 100,
  },
});