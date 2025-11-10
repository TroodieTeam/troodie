/**
 * Beta Access Gate Component
 * Password protection for beta features
 */

import { DS } from '@/components/design-system/tokens';
import { Lock, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface BetaAccessGateProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  description?: string;
  message?: string;
}

const BETA_PASSCODE = '2468';

export function BetaAccessGate({
  visible,
  onClose,
  onSuccess,
  title,
  description,
  message = 'This feature is currently in beta. Please reach out to team@troodieapp.com to be onboarded.'
}: BetaAccessGateProps) {
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = React.useRef<Array<TextInput | null>>([]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newPasscode = [...passcode];
    newPasscode[index] = value;
    setPasscode(newPasscode);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are entered
    if (index === 3 && value) {
      const enteredCode = newPasscode.join('');
      if (enteredCode === BETA_PASSCODE) {
        onSuccess();
        resetForm();
      } else {
        setError('Incorrect passcode. Please try again.');
        // Clear passcode after error
        setTimeout(() => {
          setPasscode(['', '', '', '']);
          setError('');
          inputRefs.current[0]?.focus();
        }, 1500);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !passcode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resetForm = () => {
    setPasscode(['', '', '', '']);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <Text style={styles.headerTitle}>Beta Access</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={DS.colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Lock size={48} color={DS.colors.primaryOrange} />
            </View>

            <Text style={styles.title}>{title}</Text>
            {description && (
              <Text style={styles.description}>{description}</Text>
            )}
            <Text style={styles.message}>{message}</Text>

            <View style={styles.divider} />

            <Text style={styles.instructionText}>Enter Passcode</Text>

            {/* Passcode Inputs */}
            <View style={styles.passcodeContainer}>
              {passcode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.passcodeInput,
                    error && styles.passcodeInputError
                  ]}
                  value={digit}
                  onChangeText={(value) => handleDigitChange(index, value)}
                  onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                  secureTextEntry
                />
              ))}
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Contact Information */}
            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>Need Access?</Text>
              <Text style={styles.contactText}>
                Contact{' '}
                <Text style={styles.emailText}>team@troodieapp.com</Text>
                {' '}for your passcode
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.borderLight,
  },
  headerLeft: {
    width: 24,
  },
  headerTitle: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DS.colors.primaryOrange + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.spacing.xl,
  },
  title: {
    ...DS.typography.h2,
    color: DS.colors.textDark,
    textAlign: 'center',
    marginBottom: DS.spacing.md,
  },
  description: {
    ...DS.typography.body,
    color: DS.colors.textDark,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
  },
  message: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: DS.spacing.md,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: DS.colors.borderLight,
    marginVertical: DS.spacing.xl,
  },
  instructionText: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: DS.spacing.md,
  },
  passcodeContainer: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginBottom: DS.spacing.md,
  },
  passcodeInput: {
    width: 56,
    height: 64,
    backgroundColor: DS.colors.background,
    borderWidth: 2,
    borderColor: DS.colors.borderLight,
    borderRadius: DS.borderRadius.md,
    ...DS.typography.h1,
    textAlign: 'center',
    color: DS.colors.textDark,
  },
  passcodeInputError: {
    borderColor: DS.colors.error,
    backgroundColor: DS.colors.error + '10',
  },
  errorText: {
    ...DS.typography.caption,
    color: DS.colors.error,
    marginTop: DS.spacing.xs,
    textAlign: 'center',
  },
  contactSection: {
    marginTop: DS.spacing.xxl,
    alignItems: 'center',
    paddingHorizontal: DS.spacing.lg,
  },
  contactTitle: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xs,
  },
  contactText: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    textAlign: 'center',
  },
  emailText: {
    color: DS.colors.primaryOrange,
    fontWeight: '600',
  },
});
