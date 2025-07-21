import { useOnboarding } from '@/contexts/OnboardingContext';
import { favoriteSpotCategories } from '@/data/favoriteSpotCategories';
import { FavoriteSpot, FavoriteSpotCategory } from '@/types/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function FavoriteSpotsScreen() {
  const router = useRouter();
  const { state, addFavoriteSpot, removeFavoriteSpot, updateFavoriteSpot, setCurrentStep } = useOnboarding();
  const [activeCategory, setActiveCategory] = useState<FavoriteSpotCategory>('brunch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<FavoriteSpot | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [location, setLocation] = useState('');

  const categoryInfo = favoriteSpotCategories.find(c => c.id === activeCategory);
  const spotsInCategory = state.favoriteSpots.filter(spot => spot.category === activeCategory);

  const handleAddSpot = () => {
    if (!restaurantName.trim()) {
      Alert.alert('Required Field', 'Please enter a restaurant name');
      return;
    }

    const spot: FavoriteSpot = {
      restaurant_name: restaurantName.trim(),
      category: activeCategory,
      location: location.trim() || undefined,
    };

    if (editingSpot) {
      updateFavoriteSpot(activeCategory, editingSpot.restaurant_name, spot);
    } else {
      // Check for duplicates
      const exists = spotsInCategory.some(
        s => s.restaurant_name.toLowerCase() === spot.restaurant_name.toLowerCase()
      );
      if (exists) {
        Alert.alert('Duplicate Entry', 'This restaurant is already in this category');
        return;
      }
      addFavoriteSpot(spot);
    }

    setShowAddModal(false);
    setRestaurantName('');
    setLocation('');
    setEditingSpot(null);
  };

  const handleEditSpot = (spot: FavoriteSpot) => {
    setEditingSpot(spot);
    setRestaurantName(spot.restaurant_name);
    setLocation(spot.location || '');
    setShowAddModal(true);
  };

  const handleDeleteSpot = (spot: FavoriteSpot) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${spot.restaurant_name}" from ${categoryInfo?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeFavoriteSpot(spot.category, spot.restaurant_name)
        },
      ]
    );
  };

  const handleContinue = () => {
    if (state.favoriteSpots.length === 0) {
      Alert.alert(
        'Add Your Favorites',
        'Add at least one favorite spot to help us personalize your experience',
        [{ text: 'OK' }]
      );
      return;
    }
    setCurrentStep('complete');
    router.push('/onboarding/complete');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Adding Favorites?',
      'You can always add your favorite spots later from your profile',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => {
            setCurrentStep('complete');
            router.push('/onboarding/complete');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Favorite Spots</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Help us personalize your experience
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {favoriteSpotCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.tab, activeCategory === category.id && styles.activeTab]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text style={styles.tabEmoji}>{category.emoji}</Text>
            <Text style={[styles.tabText, activeCategory === category.id && styles.activeTabText]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.categoryInfo}>
        <Text style={styles.categoryDescription}>{categoryInfo?.description}</Text>
        <Text style={styles.categoryExamples}>{categoryInfo?.examples}</Text>
      </View>

      <ScrollView 
        style={styles.spotsContainer}
        contentContainerStyle={styles.spotsContent}
      >
        {spotsInCategory.map((spot, index) => (
          <View key={index} style={styles.spotItem}>
            <View style={styles.spotInfo}>
              <Text style={styles.spotName}>{spot.restaurant_name}</Text>
              {spot.location && (
                <Text style={styles.spotLocation}>{spot.location}</Text>
              )}
            </View>
            <View style={styles.spotActions}>
              <TouchableOpacity onPress={() => handleEditSpot(spot)} style={styles.spotAction}>
                <Ionicons name="pencil" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteSpot(spot)} style={styles.spotAction}>
                <Ionicons name="trash" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={24} color="#FFAD27" />
          <Text style={styles.addButtonText}>Add to {categoryInfo?.name}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomContent}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {state.favoriteSpots.length} favorite{state.favoriteSpots.length !== 1 ? 's' : ''} added
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.continueButton, state.favoriteSpots.length === 0 && styles.continueButtonDisabled]} 
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Complete Setup ({state.favoriteSpots.length} spots added)</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSpot ? 'Edit' : 'Add to'} {categoryInfo?.name}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setRestaurantName('');
                setLocation('');
                setEditingSpot(null);
              }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder="Restaurant Name"
              placeholderTextColor="#999"
              autoFocus
            />

            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Location (Optional)"
              placeholderTextColor="#999"
            />

            <TouchableOpacity style={styles.modalAddButton} onPress={handleAddSpot}>
              <Text style={styles.modalAddButtonText}>
                {editingSpot ? 'Save Changes' : 'Add to List'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    textAlign: 'center',
  },
  skipButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FFAD27',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tabsContainer: {
    maxHeight: 80,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  activeTab: {
    backgroundColor: '#FFAD27',
  },
  tabEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  categoryInfo: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  categoryDescription: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  categoryExamples: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  spotsContainer: {
    flex: 1,
  },
  spotsContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  spotInfo: {
    flex: 1,
  },
  spotName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  spotLocation: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 2,
  },
  spotActions: {
    flexDirection: 'row',
    gap: 12,
  },
  spotAction: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#FFAD27',
    marginLeft: 8,
  },
  bottomContent: {
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  continueButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    marginBottom: 16,
  },
  modalAddButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});