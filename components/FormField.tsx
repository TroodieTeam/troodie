import { designTokens } from '@/constants/designTokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface FormFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  children: React.ReactNode;
  style?: any;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  optional,
  error,
  helper,
  children,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
          {optional && <Text style={styles.optional}> (optional)</Text>}
        </Text>
      </View>
      
      {helper && !error && (
        <Text style={styles.helper}>{helper}</Text>
      )}
      
      <View style={styles.inputContainer}>
        {children}
      </View>
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: designTokens.spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: designTokens.spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
  },
  required: {
    color: designTokens.colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
  optional: {
    color: designTokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: 'normal',
  },
  helper: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.xs,
    lineHeight: 18,
  },
  inputContainer: {
    // Allow children to define their own styling
  },
  error: {
    fontSize: 14,
    color: designTokens.colors.error,
    marginTop: designTokens.spacing.xs,
    lineHeight: 18,
  },
});