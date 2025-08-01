import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface FilterBadgeProps {
  label: string
  onRemove: () => void
}

export default function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Ionicons name="close" size={16} color="#666" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  removeButton: {
    padding: 2,
  },
})