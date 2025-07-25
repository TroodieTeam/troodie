import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Globe, Lock, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/services/communityService';
import { CommunityType, CommunityFormData } from '@/types/community';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CommunityFormData>({
    name: '',
    description: '',
    location: '',
    type: 'private' as CommunityType,
    is_event_based: false,
    event_name: '',
    event_date: ''
  });

  const [errors, setErrors] = useState<Partial<CommunityFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CommunityFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Community name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Community name must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.is_event_based && !formData.event_name?.trim()) {
      newErrors.event_name = 'Event name is required for event-based communities';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a community');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { community, error } = await communityService.createCommunity(
        user.id,
        formData
      );

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      if (community) {
        Alert.alert(
          'Success',
          'Community created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.push(`/communities/${community.id}`)
            }
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to create community. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={theme.colors.text.dark} />
      </TouchableOpacity>
      
      <View style={styles.headerTitle}>
        <Text style={styles.title}>Create Community</Text>
        <Text style={styles.subtitle}>Build your Troodie network</Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.createButton,
          (!formData.name || !formData.description || !formData.location || loading) && 
          styles.createButtonDisabled
        ]}
        onPress={handleCreate}
        disabled={!formData.name || !formData.description || !formData.location || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.createButtonText}>Create</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCommunityType = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Community Type</Text>
      
      <TouchableOpacity
        style={[
          styles.typeCard,
          formData.type === 'public' && styles.typeCardSelected
        ]}
        onPress={() => setFormData({ ...formData, type: 'public' })}
      >
        <View style={[styles.typeIcon, { backgroundColor: '#10B981' + '1A' }]}>
          <Globe size={16} color="#10B981" />
        </View>
        <View style={styles.typeContent}>
          <Text style={styles.typeTitle}>Public Community</Text>
          <Text style={styles.typeDescription}>Anyone can discover and join</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeCard,
          formData.type === 'private' && styles.typeCardSelected
        ]}
        onPress={() => setFormData({ ...formData, type: 'private' })}
      >
        <View style={[styles.typeIcon, { backgroundColor: '#64748B' + '1A' }]}>
          <Lock size={16} color="#64748B" />
        </View>
        <View style={styles.typeContent}>
          <Text style={styles.typeTitle}>Private Community</Text>
          <Text style={styles.typeDescription}>Invite-only membership</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCommunityDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Community Details</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Community Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="e.g., NYC Tech Foodies"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          maxLength={100}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.textArea, errors.description && styles.inputError]}
          placeholder="Describe your community and what makes it special..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location</Text>
        <View style={styles.locationInputWrapper}>
          <MapPin size={16} color="#9CA3AF" style={styles.locationIcon} />
          <TextInput
            style={[styles.locationInput, errors.location && styles.inputError]}
            placeholder="e.g., New York, NY"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
          />
        </View>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
      </View>

      <View style={styles.toggleContainer}>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleLabel}>Event-based Community</Text>
          <Text style={styles.toggleDescription}>
            Community tied to a specific event or conference
          </Text>
        </View>
        <Switch
          value={formData.is_event_based}
          onValueChange={(value) => setFormData({ ...formData, is_event_based: value })}
          trackColor={{ false: '#E5E7EB', true: theme.colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {formData.is_event_based && (
        <View style={styles.eventSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Event Name</Text>
            <TextInput
              style={[styles.input, errors.event_name && styles.inputError]}
              placeholder="e.g., TechCrunch Disrupt 2024"
              value={formData.event_name}
              onChangeText={(text) => setFormData({ ...formData, event_name: text })}
            />
            {errors.event_name && <Text style={styles.errorText}>{errors.event_name}</Text>}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderCommunityType()}
          {renderCommunityDetails()}
          
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
    color: theme.colors.text.medium,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  typeCardSelected: {
    borderColor: '#64748B',
    borderWidth: 2,
    backgroundColor: '#F8FAFC',
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.medium,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.dark,
    minHeight: 80,
  },
  locationInputWrapper: {
    position: 'relative',
  },
  locationIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingLeft: 36,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.dark,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.medium,
  },
  eventSection: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#EF4444',
    marginTop: 4,
  },
  bottomPadding: {
    height: 100,
  },
});