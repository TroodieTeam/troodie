import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BaseToast, BaseToastProps } from 'react-native-toast-message';
import { CheckCircle, XCircle, Info } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[styles.base, styles.success]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <CheckCircle size={20} color="#fff" />
        </View>
      )}
      renderTrailingIcon={() => 
        props.props?.isActionable ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={props.props?.onActionPress}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>{props.props?.actionLabel}</Text>
          </TouchableOpacity>
        ) : null
      }
    />
  ),

  error: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[styles.base, styles.error]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <XCircle size={20} color="#fff" />
        </View>
      )}
    />
  ),

  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[styles.base, styles.info]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <Info size={20} color="#fff" />
        </View>
      )}
    />
  ),
};

const styles = StyleSheet.create({
  base: {
    borderLeftWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
    width: '90%',
    borderRadius: 12,
    marginTop: 10,
  },
  success: {
    backgroundColor: theme.colors.success || '#4CAF50',
  },
  error: {
    backgroundColor: theme.colors.error || '#F44336',
  },
  info: {
    backgroundColor: theme.colors.info || '#2196F3',
  },
  contentContainer: {
    paddingHorizontal: 8,
    flex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    marginRight: 12,
  },
  text1: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  text2: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});