import { designTokens } from '@/constants/designTokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * Post detail screen - redirects to comments modal
 * This route is kept for deep links/back-compat and immediately redirects to the comments modal.
 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  useEffect(() => {
    if (!id) return;
    router.replace(`/posts/${id}/comments`);
  }, [id, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: designTokens.colors.white }}>
      <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
    </View>
  );
}
