import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { restaurantImageService } from '@/services/restaurantImageService';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    Globe,
    Mail,
    MapPin,
    Phone,
    Store,
    Trash2
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RestaurantData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  cuisine_types: string[];
  price_range: string;
  cover_photo_url: string;
  is_verified: boolean;
}

interface BusinessSettings {
  notifications_enabled: boolean;
  auto_approve_creators: boolean;
  business_email: string;
  business_role: string;
}

export default function RestaurantSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    notifications_enabled: true,
    auto_approve_creators: false,
    business_email: '',
    business_role: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      if (!user?.id) return;

      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select(`
          business_email,
          business_role,
          restaurants (
            id,
            name,
            address,
            city,
            state,
            zip_code,
            phone,
            website,
            cuisine_types,
            price_range,
            cover_photo_url,
            is_verified
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.restaurants) {
        setRestaurantData(profile.restaurants as any);
        setBusinessSettings(prev => ({
          ...prev,
          business_email: profile.business_email || user.email || '',
          business_role: profile.business_role || 'Owner',
        }));
      }
    } catch (error) {
      console.error('Failed to load restaurant data:', error);
      Alert.alert('Error', 'Failed to load restaurant settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePickCoverImage = async () => {
    if (!restaurantData) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingImage(true);

      const imageUrl = await restaurantImageService.uploadRestaurantImage(
        restaurantData.id,
        result.assets[0].uri,
        'cover'
      );

      await restaurantImageService.updateRestaurantImage(
        restaurantData.id,
        imageUrl,
        'cover'
      );

      setRestaurantData(prev => prev ? { ...prev, cover_photo_url: imageUrl } : null);
      Alert.alert('Success', 'Cover photo updated successfully');
    } catch (error) {
      console.error('Failed to upload cover photo:', error);
      Alert.alert('Error', 'Failed to upload cover photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user?.id || !restaurantData) return;

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          phone: restaurantData.phone,
          website: restaurantData.website,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantData.id);

      if (restaurantError) throw restaurantError;

      const { error: profileError } = await supabase
        .from('business_profiles')
        .update({
          business_email: businessSettings.business_email,
          business_role: businessSettings.business_role,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      Alert.alert('Success', 'Settings saved successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurantData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: DS.spacing.md }}>
          <Text>No restaurant data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.lg,
        backgroundColor: DS.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.textDark} />
        </TouchableOpacity>
        <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>Restaurant Settings</Text>
        <TouchableOpacity 
          onPress={editMode ? handleSave : () => setEditMode(true)}
          disabled={saving}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          {editMode ? (
            <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>Save</Text>
          ) : (
            <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>Edit</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={{ margin: DS.spacing.lg }}>
          <View style={{ position: 'relative', marginBottom: DS.spacing.lg }}>
            <Image
              source={{ uri: restaurantData.cover_photo_url || 'https://via.placeholder.com/400x200' }}
              style={{
                width: '100%',
                height: 180,
                borderRadius: DS.borderRadius.lg,
                backgroundColor: DS.colors.surfaceLight,
              }}
            />
            {editMode && (
              <TouchableOpacity
                onPress={handlePickCoverImage}
                disabled={uploadingImage}
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: 8,
                  borderRadius: DS.borderRadius.full,
                }}
              >
                {uploadingImage ? <ActivityIndicator size="small" color="white" /> : <Camera size={20} color="white" />}
              </TouchableOpacity>
            )}
          </View>

          <View style={{ backgroundColor: DS.colors.surface, borderRadius: DS.borderRadius.lg, padding: DS.spacing.lg, ...DS.shadows.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.md }}>
              <Store size={24} color={DS.colors.primaryOrange} style={{ marginRight: DS.spacing.sm }} />
              <Text style={{ ...DS.typography.h2, flex: 1, color: DS.colors.textDark }}>{restaurantData.name}</Text>
              {restaurantData.is_verified && (
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: DS.borderRadius.full }}>
                  <Text style={{ ...DS.typography.caption, color: '#16A34A', fontWeight: '700' }}>VERIFIED</Text>
                </View>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', gap: DS.spacing.sm, marginBottom: DS.spacing.sm }}>
              <MapPin size={16} color={DS.colors.textGray} />
              <Text style={{ ...DS.typography.body, color: DS.colors.textGray, flex: 1 }}>
                {restaurantData.address}, {restaurantData.city}, {restaurantData.state} {restaurantData.zip_code}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: DS.spacing.lg }}>
              <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>{restaurantData.cuisine_types?.join(' • ')}</Text>
              <Text style={{ ...DS.typography.caption, color: DS.colors.textDark, fontWeight: '600' }}>{restaurantData.price_range || '$$$'}</Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={{ marginHorizontal: DS.spacing.lg, marginBottom: DS.spacing.lg }}>
          <Text style={{ ...DS.typography.h3, marginBottom: DS.spacing.md, color: DS.colors.textDark }}>Contact Information</Text>
          <View style={{ backgroundColor: DS.colors.surface, borderRadius: DS.borderRadius.lg, padding: DS.spacing.lg, ...DS.shadows.sm, gap: DS.spacing.lg }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
                <Phone size={16} color={DS.colors.textGray} style={{ marginRight: DS.spacing.xs }} />
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Phone Number</Text>
              </View>
              <TextInput
                value={restaurantData.phone}
                onChangeText={(text) => setRestaurantData({ ...restaurantData, phone: text })}
                editable={editMode}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: editMode ? DS.colors.primaryOrange : DS.colors.border,
                  paddingVertical: DS.spacing.xs,
                  fontSize: 16,
                  color: DS.colors.textDark
                }}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
                <Globe size={16} color={DS.colors.textGray} style={{ marginRight: DS.spacing.xs }} />
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Website</Text>
              </View>
              <TextInput
                value={restaurantData.website}
                onChangeText={(text) => setRestaurantData({ ...restaurantData, website: text })}
                editable={editMode}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: editMode ? DS.colors.primaryOrange : DS.colors.border,
                  paddingVertical: DS.spacing.xs,
                  fontSize: 16,
                  color: DS.colors.textDark
                }}
                placeholder="https://example.com"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
                <Mail size={16} color={DS.colors.textGray} style={{ marginRight: DS.spacing.xs }} />
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Business Email</Text>
              </View>
              <TextInput
                value={businessSettings.business_email}
                onChangeText={(text) => setBusinessSettings({ ...businessSettings, business_email: text })}
                editable={editMode}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: editMode ? DS.colors.primaryOrange : DS.colors.border,
                  paddingVertical: DS.spacing.xs,
                  fontSize: 16,
                  color: DS.colors.textDark
                }}
                placeholder="business@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={{ marginHorizontal: DS.spacing.lg, marginBottom: DS.spacing.lg }}>
          <Text style={{ ...DS.typography.h3, marginBottom: DS.spacing.md, color: DS.colors.textDark }}>Preferences</Text>
          <View style={{ backgroundColor: DS.colors.surface, borderRadius: DS.borderRadius.lg, padding: DS.spacing.lg, ...DS.shadows.sm, gap: DS.spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: DS.spacing.md }}>
                <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>Notifications</Text>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Receive alerts for new applications</Text>
              </View>
              <Switch
                value={businessSettings.notifications_enabled}
                onValueChange={(value) => setBusinessSettings({ ...businessSettings, notifications_enabled: value })}
                disabled={!editMode}
                trackColor={{ false: DS.colors.border, true: DS.colors.primaryOrange }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: DS.spacing.md }}>
                <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>Auto-Approve</Text>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Automatically accept verified creators</Text>
              </View>
              <Switch
                value={businessSettings.auto_approve_creators}
                onValueChange={(value) => setBusinessSettings({ ...businessSettings, auto_approve_creators: value })}
                disabled={!editMode}
                trackColor={{ false: DS.colors.border, true: DS.colors.primaryOrange }}
              />
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={{ marginHorizontal: DS.spacing.lg, marginBottom: DS.spacing.xxl }}>
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: DS.borderRadius.lg, padding: DS.spacing.lg, borderWidth: 1, borderColor: '#FECACA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.md }}>
              <AlertCircle size={20} color="#DC2626" style={{ marginRight: DS.spacing.sm }} />
              <Text style={{ ...DS.typography.h3, color: '#DC2626' }}>Danger Zone</Text>
            </View>
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: DS.spacing.sm }}
              onPress={() => Alert.alert('Contact Support', 'Please contact support to transfer ownership.')}
            >
              <Text style={{ ...DS.typography.button, color: '#DC2626' }}>Transfer Ownership</Text>
            </TouchableOpacity>
            
            <View style={{ height: 1, backgroundColor: '#FECACA', marginVertical: DS.spacing.sm }} />
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: DS.spacing.sm }}
              onPress={() => Alert.alert('Warning', 'This action cannot be undone. Are you sure?', [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive' }])}
            >
              <Trash2 size={16} color="#DC2626" style={{ marginRight: DS.spacing.sm }} />
              <Text style={{ ...DS.typography.button, color: '#DC2626' }}>Remove Restaurant Claim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
