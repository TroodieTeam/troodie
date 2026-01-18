import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { applyShadow, designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { restaurantTeamService } from '@/services/restaurantTeamService';

interface InviteCodeModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const InviteCodeModal = ({ visible, onClose, onSuccess }: InviteCodeModalProps) => {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Now safe to use because it's wrapped in TabLayout
    const { refreshRestaurants } = useRestaurant();
    const { refreshAccountInfo } = useAuth();

    const handleVerify = async () => {
        if (!code.trim()) {
            setError('Please enter an invitation code');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await restaurantTeamService.acceptInvitation(code.trim());

            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Welcome to the team!',
                    text2: 'Invitation accepted successfully.',
                });

                onClose();
                if (onSuccess) onSuccess();

                // Refresh restaurant and account context
                try {
                    await Promise.all([
                        refreshRestaurants(),
                        refreshAccountInfo()
                    ]);
                } catch (err) {
                    console.error('Failed to refresh contexts after invite:', err);
                }

                // Navigate to the business dashboard or the specific restaurant if ID is returned
                // For now, let's go to the main business tab which should show the new access
                if (result.restaurantId) {
                    router.push(`/restaurant/${result.restaurantId}`);
                } else {
                    router.push('/(tabs)/business/dashboard' as any);
                }
            } else {
                setError(result.error || 'Failed to accept invitation');
                Toast.show({
                    type: 'error',
                    text1: 'Invitation Failed',
                    text2: result.error || 'Could not verify code. Please try again.',
                });
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'An unexpected error occurred',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCode('');
        setError(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.overlay}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Enter Invite Code</Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <X size={24} color={designTokens.colors.textMedium} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.description}>
                            Enter the unique code or magic link OTP sent to your email to join the team.
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[
                                    styles.input,
                                    error ? styles.inputError : null
                                ]}
                                placeholder="Enter code (e.g. 123456)"
                                placeholderTextColor={designTokens.colors.textLight}
                                value={code}
                                onChangeText={(text) => {
                                    setCode(text);
                                    if (error) setError(null);
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {error && <Text style={styles.errorText}>{error}</Text>}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.verifyButton,
                                loading && styles.verifyButtonDisabled,
                                !code.trim() && styles.verifyButtonDisabled
                            ]}
                            onPress={handleVerify}
                            disabled={loading || !code.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color={designTokens.colors.white} />
                            ) : (
                                <Text style={styles.verifyButtonText}>Verify Invitation</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: designTokens.spacing.lg,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: designTokens.colors.white,
        borderRadius: designTokens.borderRadius.xl,
        padding: designTokens.spacing.xl,
        ...applyShadow('card'),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: designTokens.spacing.md,
    },
    title: {
        ...designTokens.typography.screenTitle,
        fontSize: 20,
        color: designTokens.colors.textDark,
    },
    closeButton: {
        padding: designTokens.spacing.xs,
    },
    description: {
        ...designTokens.typography.bodyRegular,
        color: designTokens.colors.textMedium,
        marginBottom: designTokens.spacing.xl,
    },
    inputContainer: {
        marginBottom: designTokens.spacing.xl,
    },
    input: {
        height: 50,
        backgroundColor: designTokens.colors.backgroundGray,
        borderRadius: designTokens.borderRadius.md,
        paddingHorizontal: designTokens.spacing.lg,
        color: designTokens.colors.textDark,
        ...designTokens.typography.inputText,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: designTokens.colors.error,
    },
    errorText: {
        ...designTokens.typography.smallText,
        color: designTokens.colors.error,
        marginTop: designTokens.spacing.xs,
        marginLeft: designTokens.spacing.xs,
    },
    verifyButton: {
        height: 50,
        backgroundColor: designTokens.colors.primaryOrange,
        borderRadius: designTokens.borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...applyShadow('button'),
    },
    verifyButtonDisabled: {
        opacity: 0.7,
    },
    verifyButtonText: {
        ...designTokens.typography.buttonText,
        color: designTokens.colors.white,
        fontSize: 16,
    },
});
