import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Post Detail: {id}</Text>
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