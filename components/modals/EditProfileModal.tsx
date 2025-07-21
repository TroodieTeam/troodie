import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { Camera, X, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '@/constants/theme';
import { profileService, Profile } from '@/services/profileService';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => void;
  currentProfile: Profile | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onSave,
  currentProfile
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState(currentProfile?.profile_image_url || '');
  const [username, setUsername] = useState(currentProfile?.username || '');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [location, setLocation] = useState(currentProfile?.location || '');
  const [website, setWebsite] = useState(currentProfile?.website || '');
  const [instagramHandle, setInstagramHandle] = useState(currentProfile?.instagram_handle || '');
  const [emailPreferences, setEmailPreferences] = useState({
    marketing: currentProfile?.email_preferences?.marketing ?? true,
    social: currentProfile?.email_preferences?.social ?? true,
    notifications: currentProfile?.email_preferences?.notifications ?? true
  });
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (visible && currentProfile) {
      // Reset form when modal opens
      setImageUri(currentProfile.profile_image_url || '');
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setLocation(currentProfile.location || '');
      setWebsite(currentProfile.website || '');
      setInstagramHandle(currentProfile.instagram_handle || '');
      setEmailPreferences({
        marketing: currentProfile.email_preferences?.marketing ?? true,
        social: currentProfile.email_preferences?.social ?? true,
        notifications: currentProfile.email_preferences?.notifications ?? true
      });
      setUsernameError('');
    }
  }, [visible, currentProfile]);

  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera to take a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUsernameChange = async (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    
    if (cleaned && cleaned !== currentProfile?.username) {
      setCheckingUsername(true);
      setUsernameError('');
      
      try {
        const available = await profileService.checkUsernameAvailability(cleaned);
        if (!available) {
          setUsernameError('Username already taken');
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    } else {
      setUsernameError('');
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (usernameError) {
      Alert.alert('Error', 'Please fix the username error');
      return;
    }

    if (username && username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      let updatedProfile: Profile | null = null;

      // Upload image if changed
      if (imageUri && imageUri !== currentProfile?.profile_image_url) {
        await profileService.uploadProfileImage(user.id, imageUri);
      }

      // Update username if changed
      if (username && username !== currentProfile?.username) {
        updatedProfile = await profileService.setUsername(user.id, username);
      }

      // Update bio if changed
      if (bio !== currentProfile?.bio) {
        updatedProfile = await profileService.setBio(user.id, bio);
      }

      // Update other fields
      updatedProfile = await profileService.updateProfile(user.id, {
        location,
        website,
        instagram_handle: instagramHandle,
        email_preferences: emailPreferences
      });

      if (updatedProfile) {
        // Check for profile completion achievement
        await profileService.updateProfile(user.id, {}); // This will trigger the completion check
        onSave(updatedProfile);
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderImagePicker = () => (
    <View style={styles.imageSection}>
      <TouchableOpacity 
        style={styles.imageContainer} 
        onPress={handleImagePick}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.profileImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Camera size={32} color="#999" />
          </View>
        )}
        <View style={styles.imageOverlay}>
          <Camera size={20} color="#FFF" />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.changePhotoButton} onPress={handleTakePhoto}>
        <Text style={styles.changePhotoText}>Take Photo</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.headerButton, saving && styles.disabledButton]}
            disabled={saving || !!usernameError}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Check size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderImagePicker()}

          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, usernameError && styles.inputError]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {checkingUsername && (
                <ActivityIndicator size="small" color="#999" style={styles.inputIcon} />
              )}
            </View>
            {usernameError && (
              <Text style={styles.errorText}>{usernameError}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="City, State"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Instagram</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefix]}
                value={instagramHandle}
                onChangeText={setInstagramHandle}
                placeholder="username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Preferences</Text>
            
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceText}>Marketing emails</Text>
              <Switch
                value={emailPreferences.marketing}
                onValueChange={(value) => setEmailPreferences(prev => ({ ...prev, marketing: value }))}
                trackColor={{ false: '#DDD', true: theme.colors.primary + '40' }}
                thumbColor={emailPreferences.marketing ? theme.colors.primary : '#FFF'}
              />
            </View>

            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceText}>Social notifications</Text>
              <Switch
                value={emailPreferences.social}
                onValueChange={(value) => setEmailPreferences(prev => ({ ...prev, social: value }))}
                trackColor={{ false: '#DDD', true: theme.colors.primary + '40' }}
                thumbColor={emailPreferences.social ? theme.colors.primary : '#FFF'}
              />
            </View>

            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceText}>Activity updates</Text>
              <Switch
                value={emailPreferences.notifications}
                onValueChange={(value) => setEmailPreferences(prev => ({ ...prev, notifications: value }))}
                trackColor={{ false: '#DDD', true: theme.colors.primary + '40' }}
                thumbColor={emailPreferences.notifications ? theme.colors.primary : '#FFF'}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerButton: {
    padding: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  inputWithPrefix: {
    paddingLeft: 32,
  },
  inputPrefix: {
    position: 'absolute',
    left: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    zIndex: 1,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#FF5252',
    marginTop: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferenceText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
});