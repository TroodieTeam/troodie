import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profileService';
import { postMediaService } from '@/services/postMediaService';
import { designTokens } from '@/constants/designTokens';

export default function ImageUploadTestScreen() {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [postImages, setPostImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResults, setUploadResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setUploadResults(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testProfileImageUpload = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    try {
      setLoading(true);
      addResult('Starting profile image test...');

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        addResult('Image selection cancelled');
        return;
      }

      const imageUri = result.assets[0].uri;
      addResult(`Selected image: ${imageUri}`);

      // Upload profile image
      const uploadedUrl = await profileService.uploadProfileImage(user.id, imageUri);
      addResult(`Profile image uploaded successfully: ${uploadedUrl}`);
      setProfileImage(uploadedUrl);

      // Verify by fetching profile
      const profile = await profileService.getProfile(user.id);
      if (profile?.avatar_url === uploadedUrl) {
        addResult('✅ Profile update verified');
      } else {
        addResult('❌ Profile update verification failed');
      }

    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPostImageUpload = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    try {
      setLoading(true);
      addResult('Starting post image test...');

      // Pick multiple images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.8,
      });

      if (result.canceled) {
        addResult('Image selection cancelled');
        return;
      }

      const imageUris = result.assets.map(asset => asset.uri);
      addResult(`Selected ${imageUris.length} images`);

      // Upload post images
      const testPostId = `test_${Date.now()}`;
      const uploadedUrls = await postMediaService.uploadPostPhotos(imageUris, user.id, testPostId);
      
      uploadedUrls.forEach((url, index) => {
        addResult(`✅ Image ${index + 1} uploaded: ${url}`);
      });
      
      setPostImages(uploadedUrls);

    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setUploadResults([]);
    setProfileImage(null);
    setPostImages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Image Upload Test</Text>
        <Text style={styles.subtitle}>Test both profile and post image uploads</Text>

        {/* Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testProfileImageUpload}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Profile Image Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testPostImageUpload}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Post Images Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearResults}
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {/* Loading indicator */}
        {loading && (
          <ActivityIndicator 
            size="large" 
            color={designTokens.colors.primaryOrange} 
            style={styles.loading}
          />
        )}

        {/* Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Upload Results:</Text>
          {uploadResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>{result}</Text>
          ))}
        </View>

        {/* Profile Image Preview */}
        {profileImage && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Profile Image:</Text>
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
            <Text style={styles.imageUrl}>{profileImage}</Text>
          </View>
        )}

        {/* Post Images Preview */}
        {postImages.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Post Images:</Text>
            <View style={styles.postImagesGrid}>
              {postImages.map((url, index) => (
                <View key={index} style={styles.postImageContainer}>
                  <Image source={{ uri: url }} style={styles.postImage} />
                  <Text style={styles.imageUrl} numberOfLines={2}>{url}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: designTokens.colors.textDark,
  },
  subtitle: {
    fontSize: 16,
    color: designTokens.colors.textMedium,
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: designTokens.colors.primaryOrange,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  clearButton: {
    backgroundColor: designTokens.colors.textMedium,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loading: {
    marginVertical: 20,
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: designTokens.colors.textDark,
  },
  resultText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  imageSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 8,
  },
  postImagesGrid: {
    gap: 12,
  },
  postImageContainer: {
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  imageUrl: {
    fontSize: 10,
    color: designTokens.colors.textLight,
    fontFamily: 'monospace',
  },
});