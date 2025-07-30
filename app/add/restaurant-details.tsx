import { theme } from '@/constants/theme';
import { RestaurantSaveForm, RestaurantSearchResult } from '@/types/add-flow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  Car,
  ChevronLeft,
  Coffee,
  ShoppingBag,
  Star
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function RestaurantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const restaurant: RestaurantSearchResult = JSON.parse(params.restaurant as string);
  const flow = params.flow as string || 'save'; // 'save' or 'create-post'

  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<'$' | '$$' | '$$$' | '$$$$'>('$$');
  const [visitType, setVisitType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const suggestedTags = [
    'Date Night',
    'Quick Lunch',
    'Business Dinner',
    'Family Friendly',
    'Hidden Gem',
    'Special Occasion',
    'Casual',
    'Romantic',
    'Vegetarian Options',
    'Great Service',
    'Must Try',
    'Cozy Atmosphere'
  ];

  const handleAddTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleNext = () => {
    if (flow === 'create-post') {
      // For create post flow, return to create-post with selected restaurant
      router.push({
        pathname: '/add/create-post',
        params: { 
          selectedRestaurant: JSON.stringify(restaurant),
          rating: rating.toString(),
          notes,
          tags: JSON.stringify(selectedTags),
          priceRange,
          visitType
        }
      });
    } else {
      // For save restaurant flow, continue to board assignment
      const saveForm: RestaurantSaveForm = {
        restaurant,
        userInput: {
          personalRating: rating,
          visitDate: new Date(),
          photos: [],
          notes,
          tags: selectedTags,
          wouldRecommend: wouldRecommend || false,
          priceRange,
          visitType
        },
        privacy: 'public'
      };

      router.push({
        pathname: '/add/board-assignment',
        params: { saveForm: JSON.stringify(saveForm) }
      });
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Add Details</Text>
      <TouchableOpacity 
        style={[styles.nextButton, rating === 0 && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={rating === 0}
      >
        <Text style={[styles.nextText, rating === 0 && styles.nextTextDisabled]}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRestaurantInfo = () => (
    <View style={styles.restaurantInfo}>
      <Image source={{ uri: restaurant.photos[0] }} style={styles.restaurantImage} />
      <View style={styles.restaurantDetails}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine.join(' • ')}</Text>
      </View>
    </View>
  );

  const renderRating = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How was your experience?</Text>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Star
              size={32}
              color={star <= rating ? '#FFD700' : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingText}>
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </Text>
      )}
    </View>
  );

  const renderVisitType = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How did you visit?</Text>
      <View style={styles.visitTypeContainer}>
        <TouchableOpacity
          style={[styles.visitTypeButton, visitType === 'dine_in' && styles.visitTypeButtonActive]}
          onPress={() => setVisitType('dine_in')}
        >
          <Coffee size={20} color={visitType === 'dine_in' ? theme.colors.primary : '#666'} />
          <Text style={[styles.visitTypeText, visitType === 'dine_in' && styles.visitTypeTextActive]}>
            Dine In
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.visitTypeButton, visitType === 'takeout' && styles.visitTypeButtonActive]}
          onPress={() => setVisitType('takeout')}
        >
          <ShoppingBag size={20} color={visitType === 'takeout' ? theme.colors.primary : '#666'} />
          <Text style={[styles.visitTypeText, visitType === 'takeout' && styles.visitTypeTextActive]}>
            Takeout
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.visitTypeButton, visitType === 'delivery' && styles.visitTypeButtonActive]}
          onPress={() => setVisitType('delivery')}
        >
          <Car size={20} color={visitType === 'delivery' ? theme.colors.primary : '#666'} />
          <Text style={[styles.visitTypeText, visitType === 'delivery' && styles.visitTypeTextActive]}>
            Delivery
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPriceRange = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Price Range</Text>
      <View style={styles.priceRangeContainer}>
        {(['$', '$$', '$$$', '$$$$'] as const).map((price) => (
          <TouchableOpacity
            key={price}
            style={[styles.priceButton, priceRange === price && styles.priceButtonActive]}
            onPress={() => setPriceRange(price)}
          >
            <Text style={[styles.priceText, priceRange === price && styles.priceTextActive]}>
              {price}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPhotos = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Add Photos</Text>
      <TouchableOpacity style={styles.photoUploadButton}>
        <Camera size={24} color="#666" />
        <Text style={styles.photoUploadText}>Upload Photos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotes = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="What made this experience memorable?"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderTags = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags</Text>
      <View style={styles.tagsContainer}>
        {suggestedTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
            onPress={() => handleAddTag(tag)}
          >
            <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecommendation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Would you recommend this place?</Text>
      <View style={styles.recommendContainer}>
        <TouchableOpacity
          style={[styles.recommendButton, wouldRecommend === true && styles.recommendButtonActive]}
          onPress={() => setWouldRecommend(true)}
        >
          <Text style={[styles.recommendText, wouldRecommend === true && styles.recommendTextActive]}>
            Yes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.recommendButton, wouldRecommend === false && styles.recommendButtonActive]}
          onPress={() => setWouldRecommend(false)}
        >
          <Text style={[styles.recommendText, wouldRecommend === false && styles.recommendTextActive]}>
            No
          </Text>
        </TouchableOpacity>
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
          {renderRestaurantInfo()}
          {renderRating()}
          {renderVisitType()}
          {renderPriceRange()}
          {renderPhotos()}
          {renderNotes()}
          {renderTags()}
          {renderRecommendation()}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
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
  restaurantInfo: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    textAlign: 'center',
  },
  visitTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visitTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    gap: 8,
  },
  visitTypeButtonActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  visitTypeText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  visitTypeTextActive: {
    color: theme.colors.primary,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  priceButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  priceText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  priceTextActive: {
    color: '#FFFFFF',
  },
  photoUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    backgroundColor: '#F8F8F8',
  },
  photoUploadText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginBottom: 8,
  },
  tagActive: {
    backgroundColor: theme.colors.primary,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
  recommendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  recommendButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  recommendText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  recommendTextActive: {
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 50,
  },
});