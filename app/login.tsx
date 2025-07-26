import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  
  // This is a placeholder - login is handled in the auth flow
  React.useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
});