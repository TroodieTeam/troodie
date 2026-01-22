/**
 * Team Invitation Deep Link Handler
 * Route: troodie://invite/{token} or /invite/{token}
 * 
 * This screen processes team invitation tokens and handles:
 * 1. Validating the token
 * 2. Ensuring user is authenticated
 * 3. Accepting the invitation
 * 4. Redirecting to the business dashboard
 */

import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Loader2, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type InvitationStatus = 'loading' | 'auth_required' | 'processing' | 'success' | 'error';

interface InvitationResult {
    success: boolean;
    restaurant_id?: string;
    member_id?: string;
    error?: string;
}

export default function InviteScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, refreshAccountInfo } = useAuth();
    const { refreshRestaurants } = useRestaurant();

    const [status, setStatus] = useState<InvitationStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            setStatus('auth_required');
            return;
        }

        // User is authenticated, process the invitation
        processInvitation();
    }, [authLoading, isAuthenticated, user, token]);

    const processInvitation = async () => {
        if (!token) {
            setError('Invalid invitation link - no token provided');
            setStatus('error');
            return;
        }

        setStatus('processing');

        try {
            console.log('[InviteScreen] Processing invitation token:', token.substring(0, 8) + '...');

            // Call the database function to accept the invitation
            const { data, error: rpcError } = await supabase.rpc('accept_team_invitation', {
                p_token: token
            });

            console.log('[InviteScreen] RPC result:', { data, error: rpcError });

            if (rpcError) {
                console.error('[InviteScreen] RPC error:', rpcError);
                setError(rpcError.message);
                setStatus('error');
                return;
            }

            const result = data as InvitationResult;

            if (!result.success) {
                setError(result.error || 'Failed to accept invitation');
                setStatus('error');
                return;
            }

            // Success!
            setRestaurantId(result.restaurant_id || null);
            setStatus('success');

            // Refresh contexts to ensure the new restaurant is available
            try {
                await Promise.all([
                    refreshRestaurants(),
                    refreshAccountInfo()
                ]);
                console.log('[InviteScreen] Contexts refreshed successfully');
            } catch (refreshErr) {
                console.error('[InviteScreen] Error refreshing contexts:', refreshErr);
                // We still proceed with the success state and redirect
            }

            // Auto-redirect after 2 seconds
            setTimeout(() => {
                router.replace('/business/dashboard');
            }, 2000);

        } catch (err) {
            console.error('[InviteScreen] Error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setStatus('error');
        }
    };

    const handleSignIn = () => {
        // Store the token so we can process it after auth
        // Then navigate to login
        router.push({
            pathname: '/onboarding/email',
            params: { returnTo: `/invite/${token}` }
        });
    };

    const handleRetry = () => {
        setError(null);
        processInvitation();
    };

    const handleGoHome = () => {
        router.replace('/(tabs)');
    };

    const handleGoToDashboard = () => {
        router.replace('/business/dashboard');
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

