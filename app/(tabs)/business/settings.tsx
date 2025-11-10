import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Store,
  Clock,
  Phone,
  Globe,
  MapPin,
  DollarSign,
  Camera,
  Check,
  AlertCircle,
  Mail,
  Shield,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
  hours?: any;
}

interface BusinessSettings {
  notifications_enabled: boolean;
  auto_approve_creators: boolean;
  min_creator_rating: number;
  preferred_content_types: string[];
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
    min_creator_rating: 4.0,
    preferred_content_types: ['photo', 'video', 'reel'],
    business_email: '',
    business_role: '',
  });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      if (!user?.id) return;

      // Get restaurant data through business profile
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
            is_verified,
            hours
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

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user?.id || !restaurantData) return;

      // Update restaurant data
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          phone: restaurantData.phone,
          website: restaurantData.website,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantData.id);

      if (restaurantError) throw restaurantError;

      // Update business profile
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
          <ActivityIndicator size="large" color={DS.colors.primary} />
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
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 17,
          fontWeight: '600',
          color: DS.colors.text,
        }}>Restaurant Settings</Text>
        <TouchableOpacity 
          onPress={editMode ? handleSave : () => setEditMode(true)}
          disabled={saving}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.primary,
          }}>
            {saving ? 'Saving...' : editMode ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info Section */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          margin: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          {/* Cover Photo */}
          <View style={{ marginBottom: DS.spacing.md }}>
            <Image
              source={{ uri: restaurantData.cover_photo_url || 'https://via.placeholder.com/400x200' }}
              style={{
                width: '100%',
                height: 150,
                borderRadius: DS.borderRadius.sm,
                backgroundColor: DS.colors.border,
              }}
            />
            {editMode && (
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  backgroundColor: DS.colors.primary,
                  padding: DS.spacing.xs,
                  borderRadius: DS.borderRadius.sm,
                }}
              >
                <Camera size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: DS.spacing.md,
          }}>
            <Store size={24} color={DS.colors.primary} />
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: DS.colors.text,
              marginLeft: DS.spacing.sm,
              flex: 1,
            }}>{restaurantData.name}</Text>
            {restaurantData.is_verified && (
              <View style={{
                backgroundColor: '#10B981',
                paddingHorizontal: DS.spacing.xs,
                paddingVertical: 4,
                borderRadius: DS.borderRadius.xs,
              }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>VERIFIED</Text>
              </View>
            )}
          </View>

          {/* Address */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: DS.spacing.sm,
          }}>
            <MapPin size={16} color={DS.colors.textLight} style={{ marginTop: 2 }} />
            <View style={{ marginLeft: DS.spacing.xs, flex: 1 }}>
              <Text style={{ color: DS.colors.text, fontSize: 14 }}>
                {restaurantData.address}
              </Text>
              <Text style={{ color: DS.colors.text, fontSize: 14 }}>
                {restaurantData.city}, {restaurantData.state} {restaurantData.zip_code}
              </Text>
            </View>
          </View>

          {/* Cuisine & Price */}
          <View style={{
            flexDirection: 'row',
            marginBottom: DS.spacing.sm,
          }}>
            <Text style={{ color: DS.colors.textLight, fontSize: 14 }}>
              {restaurantData.cuisine_types?.join(' • ')}
            </Text>
            <Text style={{ color: DS.colors.primary, fontSize: 14, marginLeft: DS.spacing.sm }}>
              {restaurantData.price_range || '$$$'}
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.md,
          }}>Contact Information</Text>

          {/* Phone */}
          <View style={{ marginBottom: DS.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
              <Phone size={16} color={DS.colors.textLight} />
              <Text style={{ color: DS.colors.textLight, fontSize: 12, marginLeft: DS.spacing.xs }}>
                Phone Number
              </Text>
            </View>
            <TextInput
              value={restaurantData.phone}
              onChangeText={(text) => setRestaurantData({ ...restaurantData, phone: text })}
              editable={editMode}
              style={{
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: DS.borderRadius.sm,
                padding: DS.spacing.sm,
                fontSize: 14,
                color: editMode ? DS.colors.text : DS.colors.textLight,
                backgroundColor: editMode ? DS.colors.backgroundWhite : DS.colors.background,
              }}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>

          {/* Website */}
          <View style={{ marginBottom: DS.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
              <Globe size={16} color={DS.colors.textLight} />
              <Text style={{ color: DS.colors.textLight, fontSize: 12, marginLeft: DS.spacing.xs }}>
                Website
              </Text>
            </View>
            <TextInput
              value={restaurantData.website}
              onChangeText={(text) => setRestaurantData({ ...restaurantData, website: text })}
              editable={editMode}
              style={{
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: DS.borderRadius.sm,
                padding: DS.spacing.sm,
                fontSize: 14,
                color: editMode ? DS.colors.text : DS.colors.textLight,
                backgroundColor: editMode ? DS.colors.backgroundWhite : DS.colors.background,
              }}
              placeholder="https://example.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Business Email */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
              <Mail size={16} color={DS.colors.textLight} />
              <Text style={{ color: DS.colors.textLight, fontSize: 12, marginLeft: DS.spacing.xs }}>
                Business Email
              </Text>
            </View>
            <TextInput
              value={businessSettings.business_email}
              onChangeText={(text) => setBusinessSettings({ ...businessSettings, business_email: text })}
              editable={editMode}
              style={{
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: DS.borderRadius.sm,
                padding: DS.spacing.sm,
                fontSize: 14,
                color: editMode ? DS.colors.text : DS.colors.textLight,
                backgroundColor: editMode ? DS.colors.backgroundWhite : DS.colors.background,
              }}
              placeholder="business@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Campaign Settings */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.md,
          }}>Campaign Preferences</Text>

          {/* Auto-approve creators */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: DS.spacing.md,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: DS.colors.text, marginBottom: 4 }}>
                Auto-approve verified creators
              </Text>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
                Automatically accept applications from verified creators
              </Text>
            </View>
            <Switch
              value={businessSettings.auto_approve_creators}
              onValueChange={(value) => setBusinessSettings({ ...businessSettings, auto_approve_creators: value })}
              disabled={!editMode}
              trackColor={{ false: DS.colors.border, true: DS.colors.primary }}
            />
          </View>

          {/* Notifications */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: DS.colors.text, marginBottom: 4 }}>
                Campaign notifications
              </Text>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
                Receive alerts for new applications
              </Text>
            </View>
            <Switch
              value={businessSettings.notifications_enabled}
              onValueChange={(value) => setBusinessSettings({ ...businessSettings, notifications_enabled: value })}
              disabled={!editMode}
              trackColor={{ false: DS.colors.border, true: DS.colors.primary }}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.xl,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          borderWidth: 1,
          borderColor: '#FEE2E2',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.sm }}>
            <AlertCircle size={20} color="#DC2626" />
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#DC2626',
              marginLeft: DS.spacing.xs,
            }}>Danger Zone</Text>
          </View>
          
          <TouchableOpacity
            style={{
              backgroundColor: '#FEE2E2',
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
              marginBottom: DS.spacing.sm,
            }}
            onPress={() => {
              Alert.alert(
                'Transfer Ownership',
                'Contact support to transfer restaurant ownership to another account.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Transfer Ownership</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#DC2626',
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
            onPress={() => {
              Alert.alert(
                'Remove Restaurant',
                'This will permanently remove your restaurant claim. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => console.log('Remove restaurant') }
                ]
              );
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Remove Restaurant Claim</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}