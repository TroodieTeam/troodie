import { designTokens } from '@/constants/designTokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View
} from 'react-native';

/**
 * Legacy compatibility route: `/post/[id]` → `/posts/[id]/comments`
 *
 * Canonical post detail screen lives at `app/posts/[id]/comments.tsx`.
 * This redirect keeps older links/deeplinks working.
 */
export default function PostDetailRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (!id) return;
    router.replace(`/posts/${id}/comments`);
  }, [id, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: designTokens.colors.white,
      }}
    >
      <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
});