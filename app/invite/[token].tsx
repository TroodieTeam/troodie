/**
 * Team Invitation Deep Link Handler
 * Route: troodie://invite/{token} or /invite/{token}
 * 
 * This screen processes team invitation tokens and handles:
 * 1. Validating the token
 * 2. Ensuring user is authenticated
 * 3. Accepting the invitation via service layer
 * 4. Refreshing restaurant context
 * 5. Redirecting to the business dashboard
 */

import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { restaurantTeamService } from '@/services/restaurantTeamService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Loader2, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INVITATION_TOKEN_KEY = 'pending_invitation_token';

type InvitationStatus = 'loading' | 'auth_required' | 'processing' | 'success' | 'error';

export default function InviteScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const { refreshRestaurants } = useRestaurant();

    const [status, setStatus] = useState<InvitationStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // Validate and normalize token
    const normalizedToken = token && typeof token === 'string' ? token.trim() : null;

    // Store token for return after auth
    const storeTokenForReturn = useCallback(async (tokenToStore: string) => {
        try {
            await AsyncStorage.setItem(INVITATION_TOKEN_KEY, tokenToStore);
        } catch (err) {
            console.error('[InviteScreen] Failed to store token:', err);
        }
    }, []);

    // Retrieve stored token
    const getStoredToken = useCallback(async (): Promise<string | null> => {
        try {
            const stored = await AsyncStorage.getItem(INVITATION_TOKEN_KEY);
            return stored;
        } catch (err) {
            console.error('[InviteScreen] Failed to retrieve stored token:', err);
            return null;
        }
    }, []);

    // Clear stored token
    const clearStoredToken = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(INVITATION_TOKEN_KEY);
        } catch (err) {
            console.error('[InviteScreen] Failed to clear stored token:', err);
        }
    }, []);

    // Process invitation using service layer
    const processInvitation = useCallback(async (invitationToken: string) => {
        // Validate token
        if (!invitationToken || invitationToken.trim().length === 0) {
            setError('Invalid invitation link - no token provided');
            setStatus('error');
            return;
        }

        setStatus('processing');
        setError(null);

        try {

            // Use service layer instead of direct RPC call
            const result = await restaurantTeamService.acceptInvitation(invitationToken);

            console.log('[InviteScreen] Service result:', { 
                success: result.success, 
                restaurantId: result.restaurantId,
                error: result.error 
            });

            if (!result.success) {
                // Provide user-friendly error messages
                let userFriendlyError = result.error || 'Failed to accept invitation';
                
                // Map common errors to user-friendly messages
                if (result.error?.includes('expired')) {
                    userFriendlyError = 'This invitation has expired. Please ask for a new invitation.';
                } else if (result.error?.includes('different email')) {
                    userFriendlyError = 'This invitation was sent to a different email address. Please sign in with the email that received the invitation.';
                } else if (result.error?.includes('Invalid or expired')) {
                    userFriendlyError = 'This invitation is invalid or has expired. Please contact the restaurant owner for a new invitation.';
                }

                setError(userFriendlyError);
                setStatus('error');
                return;
            }

            // Success!
            setRestaurantId(result.restaurantId || null);
            setStatus('success');

            // Clear stored token since we've successfully processed it
            await clearStoredToken();

            // Refresh restaurant context to show new access immediately
            try {
                await refreshRestaurants();
                console.log('[InviteScreen] Restaurant context refreshed');
            } catch (refreshError) {
                console.error('[InviteScreen] Failed to refresh restaurant context:', refreshError);
                // Don't fail the flow if refresh fails
            }

            // Auto-redirect after 3 seconds (increased from 2 for better UX)
            setTimeout(() => {
                router.replace('/(tabs)/business/dashboard');
            }, 3000);

        } catch (err) {
            console.error('[InviteScreen] Error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setStatus('error');
        }
    }, [clearStoredToken, refreshRestaurants, router]);

    // Main effect to handle invitation processing
    useEffect(() => {
        const handleInvitation = async () => {
            // Wait for auth to finish loading
            if (authLoading) {
                return;
            }

            // Check if we have a token from URL params or stored
            let tokenToProcess = normalizedToken;
            
            // If no token in URL, check for stored token (return after auth)
            if (!tokenToProcess) {
                const storedToken = await getStoredToken();
                if (storedToken) {
                    tokenToProcess = storedToken;
                    console.log('[InviteScreen] Using stored token from return after auth');
                }
            }

            // If still no token, show error
            if (!tokenToProcess) {
                setError('Invalid invitation link - no token provided');
                setStatus('error');
                return;
            }

            // If user is not authenticated, store token and show auth required
            if (!isAuthenticated || !user) {
                // Store token for return after authentication
                await storeTokenForReturn(tokenToProcess);
                setStatus('auth_required');
                return;
            }

            // User is authenticated, process the invitation
            processInvitation(tokenToProcess);
        };

        handleInvitation();
    }, [authLoading, isAuthenticated, user, normalizedToken, getStoredToken, storeTokenForReturn, processInvitation]);

    const handleSignIn = () => {
        // Token is already stored, navigate to login
        // The onboarding flow should handle returning to this screen
        router.push({
            pathname: '/login',
            params: { returnTo: `/invite/${normalizedToken || 'pending'}` }
        });
    };

    const handleRetry = () => {
        setError(null);
        if (normalizedToken) {
            processInvitation(normalizedToken);
        } else {
            // Try to get stored token
            getStoredToken().then((storedToken) => {
                if (storedToken) {
                    processInvitation(storedToken);
                } else {
                    setError('No invitation token found. Please use the link from your email.');
                    setStatus('error');
                }
            });
        }
    };

    const handleGoHome = () => {
        clearStoredToken();
        router.replace('/(tabs)');
    };

    const handleGoToDashboard = () => {
        router.replace('/(tabs)/business/dashboard');
    };

    // Loading state
    if (status === 'loading') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
                    <Text style={styles.loadingText}>Loading invitation...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Auth required
    if (status === 'auth_required') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.emoji}>🔐</Text>
                    </View>
                    <Text style={styles.title}>Sign In Required</Text>
                    <Text style={styles.description}>
                        Please sign in to accept this team invitation.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Processing
    if (status === 'processing') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Loader2 size={48} color={DS.colors.primaryOrange} />
                    <Text style={styles.title}>Accepting Invitation</Text>
                    <Text style={styles.description}>
                        Please wait while we add you to the team...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Success
    if (status === 'success') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={[styles.iconContainer, styles.successIcon]}>
                        <CheckCircle size={48} color="#10B981" />
                    </View>
                    <Text style={styles.title}>You're In! 🎉</Text>
                    <Text style={styles.description}>
                        You've successfully joined the team. You now have access to manage this restaurant.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleGoToDashboard}>
                        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Error
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, styles.errorIcon]}>
                    <XCircle size={48} color="#EF4444" />
                </View>
                <Text style={styles.title}>Invitation Failed</Text>
                <Text style={styles.description}>
                    {error || 'Unable to process this invitation.'}
                </Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
                        <Text style={styles.secondaryButtonText}>Go Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
                        <Text style={styles.primaryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DS.colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: DS.spacing.xl,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${DS.colors.primaryOrange}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: DS.spacing.lg,
    },
    successIcon: {
        backgroundColor: '#10B98115',
    },
    errorIcon: {
        backgroundColor: '#EF444415',
    },
    emoji: {
        fontSize: 48,
    },
    title: {
        ...DS.typography.h1,
        color: DS.colors.textDark,
        textAlign: 'center',
        marginBottom: DS.spacing.md,
    },
    description: {
        ...DS.typography.body,
        color: DS.colors.textGray,
        textAlign: 'center',
        marginBottom: DS.spacing.xl,
        lineHeight: 24,
    },
    loadingText: {
        ...DS.typography.body,
        color: DS.colors.textGray,
        marginTop: DS.spacing.md,
    },
    primaryButton: {
        backgroundColor: DS.colors.primaryOrange,
        paddingVertical: DS.spacing.md,
        paddingHorizontal: DS.spacing.xl,
        borderRadius: DS.borderRadius.full,
        minWidth: 200,
    },
    primaryButtonText: {
        ...DS.typography.button,
        color: DS.colors.textWhite,
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: DS.colors.surface,
        paddingVertical: DS.spacing.md,
        paddingHorizontal: DS.spacing.lg,
        borderRadius: DS.borderRadius.full,
        borderWidth: 1,
        borderColor: DS.colors.borderLight,
    },
    secondaryButtonText: {
        ...DS.typography.button,
        color: DS.colors.textDark,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: DS.spacing.md,
    },
});
