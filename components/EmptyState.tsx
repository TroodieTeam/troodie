import React from 'react'
import {
  View,
  Text,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  description?: string
}

export default function EmptyState({ icon = 'alert-circle-outline', title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#ccc" />
      <Text style={styles.title}>{title}</Text>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
})