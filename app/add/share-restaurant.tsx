import { theme } from '@/constants/theme';
import { RestaurantSaveForm } from '@/types/add-flow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    CheckCircle,
    ChevronLeft,
    Globe,
    Instagram,
    Lock,
    Twitter,
    UserCheck,
    Users
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ShareRestaurantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const saveForm: RestaurantSaveForm = JSON.parse(params.saveForm as string);
  const selectedBoards = JSON.parse(params.selectedBoards as string);

  const [shareToFeed, setShareToFeed] = useState(true);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [shareToStories, setShareToStories] = useState(false);
  const [shareToInstagram, setShareToInstagram] = useState(false);
  const [shareToTwitter, setShareToTwitter] = useState(false);
  // const [taggedFriends, setTaggedFriends] = useState<string[]>([]);

  const handleSave = () => {
    // In a real app, this would save the restaurant with all the details
    router.push('/add/save-success');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.title}>Share</Text>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRestaurantCard = () => (
    <View style={styles.restaurantCard}>
      <Image source={{ uri: saveForm.restaurant.photos[0] }} style={styles.restaurantImage} />
      <View style={styles.restaurantOverlay}>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {saveForm.userInput.personalRating}</Text>
        </View>
      </View>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{saveForm.restaurant.name}</Text>
        <Text style={styles.restaurantDetails}>
          {saveForm.restaurant.cuisine.join(' • ')} • {saveForm.userInput.priceRange}
        </Text>
        {saveForm.userInput.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {saveForm.userInput.tags.slice(0, 3).map((tag, index) => (
              <Text key={index} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderShareOptions = () => (
    <View style={styles.section}>
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Share to Feed</Text>
        <Switch
          value={shareToFeed}
          onValueChange={setShareToFeed}
          trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
        />
      </View>

      {shareToFeed && (
        <>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <View style={styles.privacySelector}>
            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'public' && styles.privacyOptionActive]}
              onPress={() => setPrivacy('public')}
            >
              <Globe size={16} color={privacy === 'public' ? theme.colors.primary : '#666'} />
              <Text style={[styles.privacyText, privacy === 'public' && styles.privacyTextActive]}>
                Public
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'friends' && styles.privacyOptionActive]}
              onPress={() => setPrivacy('friends')}
            >
              <Users size={16} color={privacy === 'friends' ? theme.colors.primary : '#666'} />
              <Text style={[styles.privacyText, privacy === 'friends' && styles.privacyTextActive]}>
                Friends
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'private' && styles.privacyOptionActive]}
              onPress={() => setPrivacy('private')}
            >
              <Lock size={16} color={privacy === 'private' ? theme.colors.primary : '#666'} />
              <Text style={[styles.privacyText, privacy === 'private' && styles.privacyTextActive]}>
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.divider} />

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Share to Stories</Text>
        <Switch
          value={shareToStories}
          onValueChange={setShareToStories}
          trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
        />
      </View>

      <View style={styles.divider} />

      <Text style={styles.subsectionTitle}>Cross-Platform Sharing</Text>

      <View style={styles.optionRow}>
        <View style={styles.socialOption}>
          <Instagram size={20} color="#E4405F" />
          <Text style={styles.optionLabel}>Instagram</Text>
        </View>
        <Switch
          value={shareToInstagram}
          onValueChange={setShareToInstagram}
          trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
        />
      </View>

      <View style={styles.optionRow}>
        <View style={styles.socialOption}>
          <Twitter size={20} color="#1DA1F2" />
          <Text style={styles.optionLabel}>Twitter</Text>
        </View>
        <Switch
          value={shareToTwitter}
          onValueChange={setShareToTwitter}
          trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
        />
      </View>
    </View>
  );

  const renderTagFriends = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tag Friends</Text>
      <TouchableOpacity style={styles.tagFriendsButton}>
        <UserCheck size={20} color="#666" />
        <Text style={styles.tagFriendsText}>Tag friends who would love this</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>Summary</Text>
      <View style={styles.summaryItem}>
        <CheckCircle size={16} color="#4CAF50" />
        <Text style={styles.summaryText}>
          Adding to {selectedBoards.length} board{selectedBoards.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {shareToFeed && (
        <View style={styles.summaryItem}>
          <CheckCircle size={16} color="#4CAF50" />
          <Text style={styles.summaryText}>Sharing to {privacy} feed</Text>
        </View>
      )}
      {shareToStories && (
        <View style={styles.summaryItem}>
          <CheckCircle size={16} color="#4CAF50" />
          <Text style={styles.summaryText}>Sharing to stories</Text>
        </View>
      )}
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
          {renderRestaurantCard()}
          {renderShareOptions()}
          {renderTagFriends()}
          {renderSummary()}
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  saveText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  restaurantCard: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantImage: {
    width: '100%',
    height: 200,
  },
  restaurantOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantDetails: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    padding: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  privacySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  privacyOptionActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  privacyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  privacyTextActive: {
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 16,
  },
  socialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  tagFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  tagFriendsText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  summarySection: {
    backgroundColor: '#E8F5E9',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#2E7D32',
  },
  bottomPadding: {
    height: 50,
  },
});