import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { designTokens } from '@/constants/designTokens'

export const BetaRestaurantNotice = () => (
  <View style={styles.notice}>
    <Text style={styles.title}>🚀 Beta Testing Period</Text>
    <Text style={styles.description}>
      During beta, you can save restaurants from our curated database of Charlotte's best spots.
      New restaurant submissions will be available soon!
    </Text>
  </View>
)

const styles = StyleSheet.create({
  notice: {
    marginHorizontal: designTokens.spacing.lg,
    marginVertical: designTokens.spacing.md,
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.primaryOrange + '0D',
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
  },
  title: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  description: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
  },
})