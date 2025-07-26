import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { communityService, Community } from '@/services/communityService';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function EditCommunityScreen() {
  const router = useRouter();
  const { communityId } = useLocalSearchParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadCommunity();
  }, [communityId]);

  const loadCommunity = async () => {
    if (!communityId) return;
    
    setLoading(true);
    try {
      const data = await communityService.getCommunityById(communityId as string);
      if (data) {
        // Check if user is admin
        const isAdmin = await communityService.checkAdminStatus(user!.id, data.id);
        if (!isAdmin) {
          Alert.alert('Unauthorized', 'You do not have permission to edit this community.');
          router.back();
          return;
        }
        
        setCommunity(data);
        setName(data.name);
        setDescription(data.description || '');
        setLocation(data.location || '');
      }
    } catch (error) {
      console.error('Error loading community:', error);
      Alert.alert('Error', 'Failed to load community details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Community name is required');
      return;
    }
    
    setSaving(true);
    try {
      const { success, error } = await communityService.updateCommunity(
        communityId as string,
        { 
          name: name.trim(), 
          description: description.trim() || undefined,
          location: location.trim() || undefined
        }
      );

      if (success) {
        Alert.alert('Success', 'Community updated successfully');
        router.back();
      } else {
        Alert.alert('Error', error || 'Failed to update community');
      }
    } catch (error) {
      console.error('Error updating community:', error);
      Alert.alert('Error', 'Failed to update community');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Community</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && styles.disabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Community Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter community name"
            placeholderTextColor="#999"
            maxLength={50}
          />
          <Text style={styles.charCount}>{name.length}/50</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's your community about?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Charlotte, NC"
            placeholderTextColor="#999"
            maxLength={100}
          />
        </View>
        
        {community?.is_event_based && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Event-based communities have special features. Event details cannot be edited after creation.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  saveText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.medium,
    marginTop: 12,
  },
  infoBox: {
    backgroundColor: '#FFF9E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#7A6A00',
    lineHeight: 20,
  },
});