import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefit: string;
  buttonText: string;
  onPress: () => void;
  colorScheme: 'blue' | 'green' | 'purple';
}

export const ActionCard: React.FC<ActionCardProps> = ({
  icon: Icon,
  title,
  description,
  benefit,
  buttonText,
  onPress,
  colorScheme,
}) => {
  const getCardColors = () => {
    switch (colorScheme) {
      case 'blue':
        return {
          bg: '#EBF5FF',
          border: '#BEE3F8',
          iconBg: '#FFFFFF',
          iconColor: '#2B6CB0',
          titleColor: '#1A365D',
          descColor: '#2C5282',
          benefitColor: '#2B6CB0',
          buttonBg: '#2B6CB0',
          buttonHover: '#2C5282',
        };
      case 'green':
        return {
          bg: '#F0FDF4',
          border: '#BBF7D0',
          iconBg: '#FFFFFF',
          iconColor: '#059669',
          titleColor: '#064E3B',
          descColor: '#047857',
          benefitColor: '#059669',
          buttonBg: '#059669',
          buttonHover: '#047857',
        };
      case 'purple':
        return {
          bg: '#FAF5FF',
          border: '#E9D8FD',
          iconBg: '#FFFFFF',
          iconColor: '#7C3AED',
          titleColor: '#44337A',
          descColor: '#6B46C1',
          benefitColor: '#7C3AED',
          buttonBg: '#7C3AED',
          buttonHover: '#6B46C1',
        };
    }
  };

  const colors = getCardColors();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
        <Icon size={20} color={colors.iconColor} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.titleColor }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.descColor }]}>
          {description}
        </Text>
        <Text style={[styles.benefit, { color: colors.benefitColor }]}>
          {benefit}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBg }]}
        onPress={onPress}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    marginBottom: designTokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: designTokens.spacing.xs,
    opacity: 0.8,
  },
  benefit: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: designTokens.spacing.xs,
  },
  button: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    height: 36,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
});