import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Camera,
  MapPin,
  Tag,
  Globe,
  Lock,
  Crown
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { BoardCreationForm } from '@/types/board';
import { boardService } from '@/services/boardService';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, ActivityIndicator } from 'react-native';

export default function BoardDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const boardType = params.boardType as 'free' | 'private' | 'paid';
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleNext = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to create a board');
      return;
    }

    setLoading(true);
    try {
      const boardData: BoardCreationForm = {
        title,
        description,
        type: boardType,
        category,
        location,
        is_private: boardType === 'private',
        allow_comments: true,
        allow_saves: true,
        price: boardType === 'paid' ? 0 : undefined
      };

      const board = await boardService.createBoard(user.id, boardData);

      if (board) {
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

  const isFormValid = title && description && category;

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Board Details</Text>
      <TouchableOpacity 
        style={[styles.nextButton, (!isFormValid || loading) && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!isFormValid || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={[styles.nextText, !isFormValid && styles.nextTextDisabled]}>
            Create Board
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBoardTypeIndicator = () => {
    const typeConfig = {
      free: { icon: Globe, color: theme.colors.primary, label: 'Free Board' },
      private: { icon: Lock, color: '#8B5CF6', label: 'Private Board' },
      paid: { icon: Crown, color: '#FFD700', label: 'Paid Board' }
    };

    const config = typeConfig[boardType];
    const Icon = config.icon;

    return (
      <View style={[styles.typeIndicator, { backgroundColor: config.color + '10' }]}>
        <Icon size={20} color={config.color} />
        <Text style={[styles.typeIndicatorText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderCoverImage = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cover Image</Text>
      <TouchableOpacity style={styles.coverImageUpload}>
        <Camera size={32} color="#999" />
        <Text style={styles.coverImageText}>Add Cover Image</Text>
        <Text style={styles.coverImageSubtext}>Recommended: 1200x630px</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <Text style={styles.label}>Board Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Hidden Speakeasies in Manhattan"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe what makes this board special..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Location (Optional)</Text>
      <View style={styles.inputContainer}>
        <MapPin size={20} color="#999" />
        <TextInput
          style={styles.inputWithIcon}
          placeholder="e.g., Manhattan, New York"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  const renderCategory = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoriesContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                category === cat && styles.categoryPillActive
              ]}
              onPress={() => setCategory(cat)}
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags</Text>
      <Text style={styles.sectionSubtitle}>Help people discover your board</Text>
      <View style={styles.tagsContainer}>
        {suggestedTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[
              styles.tag,
              selectedTags.includes(tag) && styles.tagActive
            ]}
            onPress={() => {
              if (selectedTags.includes(tag)) {
                setSelectedTags(selectedTags.filter(t => t !== tag));
              } else {
                setSelectedTags([...selectedTags, tag]);
              }
            }}
          >
            <Tag size={12} color={selectedTags.includes(tag) ? '#FFFFFF' : '#666'} />
            <Text style={[
              styles.tagText,
              selectedTags.includes(tag) && styles.tagTextActive
            ]}>
              {tag.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
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
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
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
  nextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  nextTextDisabled: {
    color: '#999',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  typeIndicatorText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 16,
  },
  coverImageUpload: {
    height: 150,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  coverImageText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginTop: 12,
  },
  coverImageSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  tagActive: {
    backgroundColor: theme.colors.primary,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 50,
  },
});