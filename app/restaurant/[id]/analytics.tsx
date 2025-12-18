/**
 * Restaurant Analytics Screen
 * 
 * Shows analytics for claimed restaurants including:
 * - Total saves and trending status
 * - Mentions and creator posts
 * - Engagement metrics
 * - Daily trends
 * - Top savers
 */

import { MetricCard } from '@/components/business/MetricCard';
import { SavesChart } from '@/components/business/SavesChart';
import { TopSaversList } from '@/components/business/TopSaversList';
import { TrendingBadge } from '@/components/business/TrendingBadge';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import {
    exportAnalyticsToCSV,
    getRestaurantAnalytics,
    RestaurantAnalytics,
    subscribeToRestaurantSaves,
} from '@/services/restaurantAnalyticsService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, Calendar, Camera, Download, Heart } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RestaurantAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useAuth();
  const { businessProfile, loading: profileLoading } = useBusinessProfile();
  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user owns this restaurant (compare as strings to handle UUID comparison)
  const isOwner = businessProfile?.restaurant_id && restaurantId 
    ? String(businessProfile.restaurant_id) === String(restaurantId)
    : false;
  
  // Enhanced debug logging
  useEffect(() => {
    console.log('[Restaurant Analytics] Component State:', {
      restaurantId,
      restaurantIdType: typeof restaurantId,
      user: user?.id,
      profileLoading,
      businessProfile: businessProfile ? {
        id: businessProfile.id,
        user_id: businessProfile.user_id,
        restaurant_id: businessProfile.restaurant_id,
        restaurant_idType: typeof businessProfile.restaurant_id,
        verification_status: businessProfile.verification_status,
      } : null,
      isOwner,
      isOwnerCalculated: businessProfile?.restaurant_id && restaurantId 
        ? String(businessProfile.restaurant_id) === String(restaurantId)
        : false,
    });
  }, [restaurantId, businessProfile, isOwner, profileLoading, user]);

  useEffect(() => {
    console.log('[Restaurant Analytics] Effect triggered:', {
      profileLoading,
      restaurantId,
      hasBusinessProfile: !!businessProfile,
    });

    // Wait for profile to load before checking ownership
    if (profileLoading) {
      console.log('[Restaurant Analytics] Waiting for profile to load...');
      return;
    }

    if (!restaurantId) {
      console.log('[Restaurant Analytics] No restaurantId provided');
      setLoading(false);
      return;
    }

    // If no business profile, show error
    if (!businessProfile) {
      console.log('[Restaurant Analytics] No business profile found');
      setLoading(false);
      Alert.alert('Access Denied', 'You need to claim a restaurant to view analytics.');
      router.push('/(tabs)/more');
      return;
    }

    // Check ownership - compare restaurant_id from businessProfile with route param
    const businessRestaurantId = businessProfile.restaurant_id;
    const ownsRestaurant = businessRestaurantId 
      ? String(businessRestaurantId) === String(restaurantId)
      : false;

    console.log('[Restaurant Analytics] Ownership Check:', {
      businessRestaurantId,
      businessRestaurantIdString: businessRestaurantId ? String(businessRestaurantId) : null,
      routeRestaurantId: restaurantId,
      routeRestaurantIdString: String(restaurantId),
      ownsRestaurant,
      comparison: businessRestaurantId 
        ? `${String(businessRestaurantId)} === ${String(restaurantId)} = ${String(businessRestaurantId) === String(restaurantId)}`
        : 'N/A (no restaurant_id in profile)',
    });

    // If profile is loaded and user is not owner, show error
    if (!ownsRestaurant) {
      console.log('[Restaurant Analytics] Access denied - user does not own restaurant');
      setLoading(false);
      Alert.alert(
        'Access Denied', 
        `You can only view analytics for your own restaurant.\n\nExpected: ${restaurantId}\nYour restaurant: ${businessRestaurantId || 'None'}`
      );
      router.push('/(tabs)/more');
      return;
    }

    // If user is owner, load analytics
    if (ownsRestaurant) {
      console.log('[Restaurant Analytics] Access granted - loading analytics');
      loadAnalytics();

      // Subscribe to real-time updates
      const subscription = subscribeToRestaurantSaves(
        restaurantId,
        (newCount) => {
          setAnalytics((prev) =>
            prev
              ? {
                  ...prev,
                  totalSaves: newCount,
                  savesLast24h: prev.savesLast24h + 1,
                }
              : null
          );
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Not owner and profile is loaded - stop loading
      setLoading(false);
    }
  }, [restaurantId, isOwner, businessProfile, profileLoading]);

  const loadAnalytics = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await getRestaurantAnalytics(restaurantId);

      if (error) {
        console.error('Error loading analytics:', error);
        Alert.alert('Error', `Failed to load analytics data: ${error.message || 'Unknown error'}`);
        setLoading(false);
      } else if (data) {
        setAnalytics(data);
        setLoading(false);
      } else {
        // No data returned but no error - might be empty
        setAnalytics({
          totalSaves: 0,
          savesThisMonth: 0,
          savesLast24h: 0,
          isTrending: false,
          mentionsCount: 0,
          creatorPostsCount: 0,
          totalPostLikes: 0,
          dailySaves: [],
          topSavers: [],
        });
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Unexpected error loading analytics:', err);
      Alert.alert('Error', `Failed to load analytics: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExport = async () => {
    if (!analytics) return;

    try {
      const csv = exportAnalyticsToCSV(analytics);
      await Share.share({
        message: csv,
        title: 'Restaurant Analytics Export',
      });
    } catch (error) {
      console.error('Error exporting analytics:', error);
      Alert.alert('Error', 'Failed to export analytics data');
    }
  };

  const calculateTrend = (
    current: number,
    previous: number
  ): { direction: 'up' | 'down' | 'neutral'; percentage: number } => {
    if (previous === 0) {
      return current > 0
        ? { direction: 'up', percentage: 100 }
        : { direction: 'neutral', percentage: 0 };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change),
    };
  };

  if (profileLoading || loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color={DS.colors.primary} />
        <Text style={{ marginTop: 16, color: DS.colors.textLight }}>
          {profileLoading ? 'Loading profile...' : 'Loading analytics...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/more')}>
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, color: DS.colors.textLight, textAlign: 'center' }}>
            No analytics data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: DS.colors.backgroundWhite,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: DS.colors.text }}>Restaurant Analytics</Text>
        <TouchableOpacity onPress={handleExport}>
          <Download size={24} color={DS.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Trending Badge */}
        {analytics.isTrending && <TrendingBadge savesCount={analytics.savesLast24h} />}

        {/* Key Metrics Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -8,
            marginBottom: 16,
          }}
        >
          <View style={{ width: '50%', padding: 8 }}>
            <MetricCard
              title="Total Saves"
              value={analytics.totalSaves}
              icon={Bookmark}
              trend={calculateTrend(analytics.savesThisMonth, analytics.totalSaves - analytics.savesThisMonth)}
            />
          </View>
          <View style={{ width: '50%', padding: 8 }}>
            <MetricCard title="This Month" value={analytics.savesThisMonth} icon={Calendar} />
          </View>
          <View style={{ width: '50%', padding: 8 }}>
            <MetricCard title="Creator Posts" value={analytics.creatorPostsCount} icon={Camera} />
          </View>
          <View style={{ width: '50%', padding: 8 }}>
            <MetricCard title="Total Engagement" value={analytics.totalPostLikes} icon={Heart} />
          </View>
        </View>

        {/* Saves Chart */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: DS.colors.text,
              marginBottom: 12,
            }}
          >
            Saves Over Time
          </Text>
          <SavesChart data={analytics.dailySaves} />
        </View>

        {/* Top Savers */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: DS.colors.text,
              marginBottom: 12,
            }}
          >
            Top Savers
          </Text>
          <TopSaversList savers={analytics.topSavers} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

