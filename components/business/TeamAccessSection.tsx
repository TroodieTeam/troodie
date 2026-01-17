/**
 * Team Access Section Component
 * Displays team members with ability to invite new members and remove access
 * Part of the Restaurant Team Invitation System
 */

import { DS } from '@/components/design-system/tokens';
import { restaurantTeamService, TeamMember as ServiceTeamMember, TeamInvitation } from '@/services/restaurantTeamService';
import {
    Crown,
    Mail,
    MoreVertical,
    Plus,
    Shield,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// UI Data shape
export interface UITeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'pending';
    invited_at?: string;
    joined_at?: string;
    avatar_url?: string | null;
    // Store original objects for operations
    originalMember?: ServiceTeamMember;
    originalInvitation?: TeamInvitation;
}

interface TeamAccessSectionProps {
    restaurantId: string;
    restaurantName: string;
    currentUserId: string;
    isOwner: boolean;
    onInviteMember?: (email: string, role: string) => Promise<void>;
    onRemoveMember?: (memberId: string) => Promise<void>;
    onResendInvite?: (memberId: string) => Promise<void>;
}

export function TeamAccessSection({
    restaurantId,
    restaurantName,
    currentUserId,
    isOwner,
    onInviteMember, // Optional overrides
    onRemoveMember,
    onResendInvite,
}: TeamAccessSectionProps) {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('admin');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<UITeamMember[]>([]);

    useEffect(() => {
        loadTeamData();
    }, [restaurantId]);

    const loadTeamData = async () => {
        setLoading(true);
        try {
            // Fetch both members and pending invitations in parallel
            const [membersResult, invitesResult] = await Promise.all([
                restaurantTeamService.getTeamMembers(restaurantId),
                restaurantTeamService.getPendingInvitations(restaurantId)
            ]);


            const uiMembers: UITeamMember[] = [];

            // Process Active Members
            if (membersResult.data) {
                membersResult.data.forEach(m => {
                    uiMembers.push({
                        id: m.user_id, // Use user_id as ID for members
                        name: m.name || m.username || m.email.split('@')[0],
                        avatar_url: m.avatar_url,
                        email: m.email || '',
                        role: m.role,
                        status: 'active',
                        joined_at: m.joined_at,
                        originalMember: m
                    });
                });
            }

            // Process Pending Invitations
            if (invitesResult.data) {
                invitesResult.data.forEach(inv => {
                    uiMembers.push({
                        id: inv.id, // Use invitation ID for pending
                        name: inv.user_details?.name || inv.user_details?.username || '',
                        avatar_url: inv.user_details?.avatar_url,
                        email: inv.email,
                        role: 'admin', // Default or stored in invite? Service doesn't store role in invite yet, assuming admin
                        status: 'pending',
                        invited_at: inv.created_at,
                        originalInvitation: inv
                    });
                });
            }

            // Sort: Owner first, then members by join date, then pending by date
            uiMembers.sort((a, b) => {
                if (a.role === 'owner') return -1;
                if (b.role === 'owner') return 1;
                // Active before pending
                if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
                return 0;
            });

            setTeamMembers(uiMembers);
        } catch (error) {
            console.error('Failed to load team data:', error);
            Alert.alert('Error', 'Failed to load team members');
        } finally {
            setLoading(false);
        }
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleInvite = async () => {
        if (!validateEmail(inviteEmail)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        // Check if email already exists in team
        if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
            Alert.alert('Already a Member', 'This email is already associated with a team member or pending invitation.');
            return;
        }

        setSending(true);
        try {
            // Use props if provided (for flexibility), otherwise use service
            if (onInviteMember) {
                await onInviteMember(inviteEmail, selectedRole);
            } else {
                const result = await restaurantTeamService.inviteTeamMember(restaurantId, inviteEmail);
                if (!result.success) {
                    throw new Error(result.error);
                }
            }

            Alert.alert(
                'Invitation Sent!',
                `An invitation has been sent to ${inviteEmail}. They'll receive a magic link to join your team.`,
                [{
                    text: 'OK', onPress: () => {
                        setShowInviteModal(false);
                        setInviteEmail('');
                        setSelectedRole('admin');
                        loadTeamData(); // Refresh list
                    }
                }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send invitation. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleRemoveMember = (member: UITeamMember) => {
        if (member.role === 'owner') {
            Alert.alert('Cannot Remove Owner', 'The owner cannot be removed. Transfer ownership first.');
            return;
        }

        const action = member.status === 'pending' ? 'cancel this invitation' : 'remove this team member';

        Alert.alert(
            member.status === 'pending' ? 'Cancel Invitation?' : 'Remove Team Member?',
            `Are you sure you want to ${action}? ${member.status === 'active' ? 'They will lose access to ' + restaurantName + '.' : ''}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: member.status === 'pending' ? 'Cancel Invite' : 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (onRemoveMember) {
                                await onRemoveMember(member.id);
                            } else {
                                if (member.status === 'pending') {
                                    // Cancel invitation
                                    const result = await restaurantTeamService.cancelInvitation(member.id);
                                    if (!result.success) throw new Error(result.error);
                                } else {
                                    // Remove member
                                    const result = await restaurantTeamService.removeTeamMember(restaurantId, member.id);
                                    if (!result.success) throw new Error(result.error);
                                }
                            }
                            loadTeamData(); // Refresh
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to remove member');
                        }
                    },
                },
            ]
        );
    };

    const handleResendInvite = async (member: UITeamMember) => {
        try {
            if (onResendInvite) {
                await onResendInvite(member.id);
            } else {
                const result = await restaurantTeamService.resendInvitation(member.id);
                if (!result.success) throw new Error(result.error);
            }
            Alert.alert('Invitation Resent', `A new invitation has been sent to ${member.email}.`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend invitation. Please try again.');
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner':
                return <Crown size={16} color="#F59E0B" />;
            case 'admin':
                return <Shield size={16} color="#6366F1" />;
            case 'manager':
                return <Users size={16} color="#10B981" />;
            default:
                return <Users size={16} color={DS.colors.textGray} />;
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'owner':
                return 'Owner';
            case 'admin':
                return 'Admin';
            case 'manager':
                return 'Manager';
            default:
                return role;
        }
    };

    const getTimeAgo = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <Users size={20} color={DS.colors.textDark} />
                    <Text style={styles.sectionTitle}>Team Access</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                    {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Team Members List */}
            {loading ? (
                <View style={[styles.membersList, { padding: 32, alignItems: 'center' }]}>
                    <ActivityIndicator color={DS.colors.primaryOrange} />
                </View>
            ) : (
                <View style={styles.membersList}>
                    {teamMembers.length === 0 ? (
                        <View style={{ padding: 32, alignItems: 'center' }}>
                            <Text style={{ ...DS.typography.body, color: DS.colors.textGray }}>No team members yet.</Text>
                        </View>
                    ) : (
                        teamMembers.map((member, index) => (
                            <View
                                key={member.id}
                                style={[
                                    styles.memberCard,
                                    index === teamMembers.length - 1 && styles.memberCardLast,
                                    selectedMemberId === member.id && { zIndex: 100 }, // Ensure dropdown appears on top
                                ]}
                            >
                                {/* Avatar */}
                                <View style={[
                                    styles.avatar,
                                    member.status === 'pending' && styles.avatarPending,
                                ]}>
                                    <Text style={styles.avatarText}>
                                        {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                {/* Member Info */}
                                <View style={styles.memberInfo}>
                                    <View style={styles.memberNameRow}>
                                        <Text style={styles.memberName} numberOfLines={1}>
                                            {member.name || member.email}
                                        </Text>
                                        {member.status === 'pending' && (
                                            <View style={styles.pendingBadge}>
                                                <Text style={styles.pendingBadgeText}>PENDING</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.memberEmail} numberOfLines={1}>
                                        {member.name ? member.email : ''}
                                    </Text>
                                    <View style={styles.memberMeta}>
                                        {getRoleIcon(member.role)}
                                        <Text style={styles.memberRole}>{getRoleLabel(member.role)}</Text>
                                        <Text style={styles.memberDot}>•</Text>
                                        <Text style={styles.memberDate}>
                                            {member.status === 'pending'
                                                ? `Invited ${getTimeAgo(member.invited_at)}`
                                                : `Joined ${getTimeAgo(member.joined_at)}`
                                            }
                                        </Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                {isOwner && member.role !== 'owner' && (
                                    <TouchableOpacity
                                        style={styles.memberActions}
                                        onPress={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                                    >
                                        <MoreVertical size={20} color={DS.colors.textGray} />
                                    </TouchableOpacity>
                                )}

                                {/* Action Menu */}
                                {selectedMemberId === member.id && (
                                    <View style={styles.actionMenu}>
                                        {member.status === 'pending' && (
                                            <TouchableOpacity
                                                style={styles.actionMenuItem}
                                                onPress={() => {
                                                    setSelectedMemberId(null);
                                                    handleResendInvite(member);
                                                }}
                                            >
                                                <Mail size={16} color={DS.colors.textDark} />
                                                <Text style={styles.actionMenuText}>Resend Invite</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={styles.actionMenuItem}
                                            onPress={() => {
                                                setSelectedMemberId(null);
                                                handleRemoveMember(member);
                                            }}
                                        >
                                            <Trash2 size={16} color={DS.colors.error} />
                                            <Text style={[styles.actionMenuText, styles.actionMenuTextDanger]}>
                                                {member.status === 'pending' ? 'Cancel Invite' : 'Remove Access'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Invite Button */}
            {isOwner && (
                <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => setShowInviteModal(true)}
                >
                    <UserPlus size={20} color={DS.colors.primaryOrange} />
                    <Text style={styles.inviteButtonText}>Invite Team Member</Text>
                </TouchableOpacity>
            )}

            {/* Invite Modal */}
            <Modal
                visible={showInviteModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowInviteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <UserPlus size={24} color={DS.colors.primaryOrange} />
                                <Text style={styles.modalTitle}>Invite Team Member</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowInviteModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X size={24} color={DS.colors.textGray} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Restaurant Info */}
                            <View style={styles.inviteRestaurantInfo}>
                                <Text style={styles.inviteRestaurantLabel}>Inviting to</Text>
                                <Text style={styles.inviteRestaurantName}>{restaurantName}</Text>
                            </View>

                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <View style={styles.emailInputContainer}>
                                    <Mail size={20} color={DS.colors.textGray} />
                                    <TextInput
                                        style={styles.emailInput}
                                        value={inviteEmail}
                                        onChangeText={setInviteEmail}
                                        placeholder="colleague@email.com"
                                        placeholderTextColor={DS.colors.textLight}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>

                            {/* Info Note */}
                            <View style={styles.infoNote}>
                                <Text style={styles.infoNoteText}>
                                    They'll receive an email with a magic link to join your team. The link expires in 7 days.
                                </Text>
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowInviteModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!inviteEmail || sending) && styles.sendButtonDisabled,
                                ]}
                                onPress={handleInvite}
                                disabled={!inviteEmail || sending}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Plus size={18} color="#FFFFFF" />
                                        <Text style={styles.sendButtonText}>Send Invitation</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: DS.spacing.lg,
    },
    sectionHeader: {
        marginBottom: DS.spacing.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DS.spacing.sm,
        marginBottom: DS.spacing.xs,
    },
    sectionTitle: {
        ...DS.typography.h3,
        color: DS.colors.textDark,
    },
    sectionSubtitle: {
        ...DS.typography.caption,
        color: DS.colors.textGray,
        marginLeft: 28,
    },
    membersList: {
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.lg,
        ...DS.shadows.sm,
        // overflow: 'hidden', // Removed to allow dropdown to show
        zIndex: 1, // Ensure dropdown overlaps subsequent elements (like the invite button)
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: DS.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
        position: 'relative',
    },
    memberCardLast: {
        borderBottomWidth: 0,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: DS.colors.primaryOrange,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: DS.spacing.md,
    },
    avatarPending: {
        backgroundColor: DS.colors.surfaceLight,
        borderWidth: 2,
        borderColor: DS.colors.border,
        borderStyle: 'dashed',
    },
    avatarText: {
        ...DS.typography.h3,
        color: '#FFFFFF',
    },
    memberInfo: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DS.spacing.sm,
    },
    memberName: {
        ...DS.typography.body,
        fontWeight: '600',
        color: DS.colors.textDark,
        flex: 1,
    },
    pendingBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: DS.borderRadius.xs,
    },
    pendingBadgeText: {
        ...DS.typography.caption,
        fontSize: 10,
        fontWeight: '700',
        color: '#D97706',
    },
    memberEmail: {
        ...DS.typography.caption,
        color: DS.colors.textGray,
        marginTop: 2,
    },
    memberMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    memberRole: {
        ...DS.typography.caption,
        color: DS.colors.textGray,
    },
    memberDot: {
        color: DS.colors.textLight,
        fontSize: 10,
    },
    memberDate: {
        ...DS.typography.caption,
        color: DS.colors.textLight,
    },
    memberActions: {
        padding: DS.spacing.sm,
    },
    actionMenu: {
        position: 'absolute',
        right: DS.spacing.md,
        top: '100%',
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.md,
        ...DS.shadows.lg,
        borderWidth: 1,
        borderColor: DS.colors.border,
        zIndex: 100,
        minWidth: 160,
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DS.spacing.sm,
        padding: DS.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
    },
    actionMenuText: {
        ...DS.typography.body,
        color: DS.colors.textDark,
    },
    actionMenuTextDanger: {
        color: DS.colors.error,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DS.spacing.sm,
        backgroundColor: DS.colors.surface,
        borderRadius: DS.borderRadius.lg,
        padding: DS.spacing.md,
        marginTop: DS.spacing.md,
        borderWidth: 2,
        borderColor: DS.colors.primaryOrange,
        borderStyle: 'dashed',
    },
    inviteButtonText: {
        ...DS.typography.button,
        color: DS.colors.primaryOrange,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: DS.colors.surface,
        borderTopLeftRadius: DS.borderRadius.xl,
        borderTopRightRadius: DS.borderRadius.xl,
        maxHeight: '90%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DS.spacing.sm,
    },
    modalTitle: {
        ...DS.typography.h3,
        color: DS.colors.textDark,
    },
    modalCloseButton: {
        padding: DS.spacing.xs,
    },
    inviteRestaurantInfo: {
        backgroundColor: DS.colors.surfaceLight,
        padding: DS.spacing.md,
        marginHorizontal: DS.spacing.lg,
        marginTop: DS.spacing.lg,
        borderRadius: DS.borderRadius.md,
    },
    inviteRestaurantLabel: {
        ...DS.typography.caption,
        color: DS.colors.textGray,
        marginBottom: 4,
    },
    inviteRestaurantName: {
        ...DS.typography.h3,
        color: DS.colors.textDark,
    },
    inputGroup: {
        paddingHorizontal: DS.spacing.lg,
        marginTop: DS.spacing.lg,
    },
    inputLabel: {
        ...DS.typography.body,
        fontWeight: '600',
        color: DS.colors.textDark,
        marginBottom: DS.spacing.sm,
    },
    emailInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DS.colors.surfaceLight,
        borderRadius: DS.borderRadius.md,
        paddingHorizontal: DS.spacing.md,
        gap: DS.spacing.sm,
    },
    emailInput: {
        flex: 1,
        height: 48,
        ...DS.typography.body,
        color: DS.colors.textDark,
    },

    infoNote: {
        backgroundColor: '#EFF6FF',
        padding: DS.spacing.md,
        marginHorizontal: DS.spacing.lg,
        marginTop: DS.spacing.lg,
        borderRadius: DS.borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
    },
    infoNoteText: {
        ...DS.typography.caption,
        color: '#1E40AF',
        lineHeight: 18,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: DS.spacing.md,
        padding: DS.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: DS.colors.border,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: DS.colors.surfaceLight,
        borderRadius: DS.borderRadius.md,
    },
    cancelButtonText: {
        ...DS.typography.button,
        color: DS.colors.textDark,
    },
    sendButton: {
        flex: 1,
        height: 48,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: DS.spacing.xs,
        backgroundColor: DS.colors.primaryOrange,
        borderRadius: DS.borderRadius.md,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        ...DS.typography.button,
        color: '#FFFFFF',
    },
});
