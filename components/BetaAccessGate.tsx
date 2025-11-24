/**
 * Beta Access Gate Component
 * Password protection for beta features
 */

import { DS } from '@/components/design-system/tokens';
import { Lock, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
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

// updated passcode
const BETA_PASSCODE = 'TROODIE2025';

export function BetaAccessGate({
  visible,
  onClose,
  onSuccess,
  title,
  description,
  message = 'This feature is currently in beta. Please reach out to team@troodieapp.com to be onboarded.'
}: BetaAccessGateProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handlePasscodeChange = (text: string) => {
    // auto upper case for better UX
    const value = text.toUpperCase();
    setPasscode(value);
    setError('');
    if(value === BETA_PASSCODE) {
      onSuccess();
      setPasscode('');
    }
  }
  const handleSubmit = () => {
    if (passcode !== BETA_PASSCODE) {
      setError('This code is either invalid or expired');
    }
  };

  const handleContactSupport = async() => {
    const url = 'mailto:team@troodieapp.com?subject=Request Beta Access Code';
    try{
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening email client:', error);
    }
  }

  const handleClose = () => {
    setPasscode('');
    setError('');
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
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <Lock size={48} color={DS.colors.primaryOrange} />
            </View>

            <Text style={styles.title}>{title}</Text>
            {description && (
              <Text style={styles.description}>{description}</Text>
            )}
            <Text style={styles.message}>{message}</Text>

            <View style={styles.divider} />

            <Text style={styles.instructionText}>Enter Beta Passcode</Text>

            <TextInput
              style={[
                styles.mainInput,
                error ? styles.inputError : null
              ]}
              value={passcode}
              onChangeText={handlePasscodeChange}
              placeholder="Enter code (e.g. TROODIE2025)"
              placeholderTextColor={DS.colors.textGray + '80'}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

           {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.helperText}>
                Enter your invite code
              </Text>
            )}
            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>Need Access?</Text>
              <TouchableOpacity onPress={handleContactSupport}>
                <Text style={styles.contactText}>
                  Contact{' '}
                  <Text style={styles.emailText}>team@troodieapp.com</Text>
                  {' '}for your passcode
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.xxl,
    alignItems: 'center',
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
  mainInput: {
    width: '100%',
    height: 56,
    backgroundColor: DS.colors.background,
    borderWidth: 1,
    borderColor: DS.colors.borderLight,
    borderRadius: DS.borderRadius.md,
    paddingHorizontal: DS.spacing.lg,
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.textDark,
    textAlign: 'center',
    marginBottom: DS.spacing.sm,
  },
  inputError: {
    borderColor: DS.colors.error,
    backgroundColor: DS.colors.error + '10',
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
  helperText: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
    marginTop: DS.spacing.xs,
    textAlign: 'center',
    opacity: 0.8,
  },
});
