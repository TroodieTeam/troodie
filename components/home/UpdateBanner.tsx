import { designTokens } from '@/constants/designTokens';
import { ArrowUpCircle, X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function UpdateBanner({ onUpdate, onDismiss }: UpdateBannerProps) {
  return (
    <View testID="update-banner" style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.iconContainer}>
          <ArrowUpCircle size={20} color={designTokens.colors.white} />
        </View>
        <Text style={styles.text} numberOfLines={2}>
          A new version of Troodie is available!
        </Text>
        <TouchableOpacity testID="update-banner-cta" style={styles.updateButton} onPress={onUpdate}>
          <Text style={styles.updateButtonText}>Update</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="update-banner-dismiss" style={styles.dismissButton} onPress={onDismiss} hitSlop={8}>
          <X size={16} color={designTokens.colors.textMedium} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BANNER_BG = '#FFF7ED';
const BANNER_BORDER = '#FFAD2733';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BANNER_BG,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: BANNER_BORDER,
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textDark,
    flex: 1,
  },
  updateButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
  },
  updateButtonText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  dismissButton: {
    padding: designTokens.spacing.xs,
  },
});
