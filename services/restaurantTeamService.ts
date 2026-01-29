/**
 * Restaurant Team Service
 * Handles team member invitations and access management
 * 
 * Features:
 * - Invite team members via email
 * - Accept invitations with magic link
 * - Manage team members (list, remove)
 * - Check restaurant access
 * - Get all restaurants user can access
 */

import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export interface TeamInvitation {
    id: string;
    restaurant_id: string;
    email: string;
    token: string;
    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
    expires_at: string;
    created_at: string;
    accepted_at?: string;
    user_details?: {
        name?: string;
        username?: string;
        avatar_url?: string | null;
    } | null;
}

export interface TeamMember {
    id: string;
    restaurant_id: string;
    user_id: string;
    email: string;
    role: string;
    joined_at: string;
    invited_by?: string;
    name?: string;
    username?: string;
    avatar_url?: string | null;
}

export interface RestaurantAccess {
    restaurant_id: string;
    restaurant_name: string;
    is_owner: boolean;
}

// ============================================
// Invite Team Member
// ============================================

/**
 * Invite a team member via email
 * Only restaurant owner can invite
 */
export async function inviteTeamMember(
    restaurantId: string,
    email: string
): Promise<{ success: boolean; invitation?: TeamInvitation; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Verify user is the restaurant owner
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id, owner_id, name')
            .eq('id', restaurantId)
            .single();

        if (restaurantError || !restaurant) {
            return { success: false, error: 'Restaurant not found' };
        }

        if (restaurant.owner_id !== user.id) {
            return { success: false, error: 'Only the restaurant owner can invite team members' };
        }

        // Check if email matches owner (can't invite yourself)
        if (email.toLowerCase() === user.email?.toLowerCase()) {
            return { success: false, error: 'You cannot invite yourself' };
        }
        // Clean up any old invitations for this email before creating new one

        await supabase
            .from('restaurant_team_invitations')
            .delete()
            .eq('restaurant_id', restaurantId)
            .eq('email', email.toLowerCase());

        // Create invitation
        const { data: invitation, error: insertError } = await supabase
            .from('restaurant_team_invitations')
            .insert({
                restaurant_id: restaurantId,
                invited_by: user.id,
                email: email.toLowerCase(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('[TeamService] Insert error:', insertError);
            return { success: false, error: insertError.message };
        }

        console.log('[TeamService] Invitation created:', {
            email,
            token: invitation.token,
            restaurantName: restaurant.name,
        });

        // Send invitation email via Edge Function (fire-and-forget)
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('name')
                .eq('id', user.id)
                .single();

            const inviterName = userData?.name || user.email || 'A team member';

            supabase.functions.invoke('send-team-invite', {
                body: {
                    restaurantId: restaurantId,
                    restaurantName: restaurant.name,
                    inviterName: inviterName,
                    inviteeEmail: email.toLowerCase(),
                    invitationToken: invitation.token,
                }
            }).then(({ data, error }) => {
                if (error) {
                    console.error('[TeamService] Email send error:', error);
                } else {
                    console.log('[TeamService] Invitation email sent:', data);
                }
            }).catch(err => {
                console.error('[TeamService] Email send failed:', err);
            });
        } catch (emailError) {
            // Don't fail the invitation if email fails
            console.error('[TeamService] Email setup error:', emailError);
        }

        return { success: true, invitation };
    } catch (error: any) {
        console.error('[TeamService] Invite error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Accept Invitation
// ============================================

/**
 * Accept a team invitation using the token
 */
export async function acceptInvitation(
    token: string
): Promise<{ success: boolean; restaurantId?: string; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('accept_team_invitation', {
            p_token: token,
        });

        if (error) {
            console.error('[TeamService] Accept RPC error:', error);
            return { success: false, error: error.message };
        }

        if (!data || !data.success) {
            return { success: false, error: data?.error || 'Failed to accept invitation' };
        }

        console.log('[TeamService] Invitation accepted:', data);
        await supabase
            .from('restaurant_team_invitations')
            .delete()
            .eq('token', token);

        return { success: true, restaurantId: data.restaurant_id };

    } catch (error: any) {
        console.error('[TeamService] Accept invitation error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Get Team Members
// ============================================

/**
 * Get all team members for a restaurant
 */
export async function getTeamMembers(
    restaurantId: string
): Promise<{ data: TeamMember[] | null; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('restaurant_team_members')
            .select('*, user:users!restaurant_team_members_user_id_fkey(email, name, username, avatar_url)')
            .eq('restaurant_id', restaurantId)
            .order('joined_at', { ascending: false });

        if (error) {
            console.error('[TeamService] Get members error:', error);
            return { data: null, error: error.message };
        }

        // Map the result to flatten user details
        const members = data.map((item: any) => ({
            id: item.id,
            restaurant_id: item.restaurant_id,
            user_id: item.user_id,
            role: item.role,
            joined_at: item.joined_at,
            invited_by: item.invited_by,
            email: item.user?.email || '',
            name: item.user?.name || item.user?.username || item.user?.email?.split('@')[0] || 'Team Member',
            avatar_url: item.user?.avatar_url || null
        }));

        return { data: members };
    } catch (error: any) {
        console.error('[TeamService] Get team members error:', error);
        return { data: null, error: error.message };
    }
}

// ============================================
// Get Pending Invitations
// ============================================

/**
 * Get pending invitations for a restaurant
 */
export async function getPendingInvitations(
    restaurantId: string
): Promise<{ data: TeamInvitation[] | null; error?: string }> {
    try {
        const { data: invitations, error } = await supabase
            .from('restaurant_team_invitations')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[TeamService] Get invitations error:', error);
            return { data: null, error: error.message };
        }

        // Check if any of these emails belong to existing users
        const emails = invitations.map(i => i.email);
        let enrichedInvitations = invitations;

        if (emails.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('email, name, username, avatar_url')
                .in('email', emails);

            if (users) {
                enrichedInvitations = invitations.map(inv => {
                    const user = users.find(u => u.email === inv.email);
                    return {
                        ...inv,
                        user_details: user ? {
                            name: user.name,
                            username: user.username,
                            avatar_url: user.avatar_url
                        } : null
                    };
                });
            }
        }

        return { data: enrichedInvitations as TeamInvitation[] };
    } catch (error: any) {
        console.error('[TeamService] Get pending invitations error:', error);
        return { data: null, error: error.message };
    }
}

// ============================================
// Remove Team Member
// ============================================

/**
 * Remove a team member from a restaurant
 * Only owner can remove members
 */
export async function removeTeamMember(
    restaurantId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('restaurant_team_members')
            .delete()
            .eq('restaurant_id', restaurantId)
            .eq('user_id', userId);

        if (error) {
            console.error('[TeamService] Remove member error:', error);
            return { success: false, error: error.message };
        }

        console.log('[TeamService] Team member removed:', { restaurantId, userId });
        return { success: true };
    } catch (error: any) {
        console.error('[TeamService] Remove team member error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Cancel Invitation
// ============================================

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(
    invitationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('restaurant_team_invitations')
            .delete()
            .eq('id', invitationId)
            .eq('status', 'pending'); // Only cancel pending invitations

        if (error) {
            console.error('[TeamService] Cancel invitation error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('[TeamService] Cancel invitation error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Resend Invitation
// ============================================

/**
 * Resend an invitation - updates expiry and sends email again
 */
export async function resendInvitation(
    invitationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get invitation details
        const { data: invitation, error: fetchError } = await supabase
            .from('restaurant_team_invitations')
            .select(`
                id,
                email,
                token,
                restaurant_id,
                status,
                restaurants (
                    id,
                    name,
                    owner_id
                )
            `)
            .eq('id', invitationId)
            .single();

        if (fetchError || !invitation) {
            console.error('[TeamService] Fetch invitation error:', fetchError);
            return { success: false, error: 'Invitation not found' };
        }

        if (invitation.status !== 'pending') {
            return { success: false, error: 'Can only resend pending invitations' };
        }

        // Update expiry date
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + 7);

        const { error: updateError } = await supabase
            .from('restaurant_team_invitations')
            .update({
                expires_at: newExpiryDate.toISOString(),
                created_at: new Date().toISOString() // Reset created_at to track resend
            })
            .eq('id', invitationId);

        if (updateError) {
            console.error('[TeamService] Update invitation error:', updateError);
            return { success: false, error: updateError.message };
        }

        // Get current user for inviter name
        const { data: { user } } = await supabase.auth.getUser();
        const inviterName = user?.email?.split('@')[0] || 'Team Owner';

        // Call Edge Function to resend email
        const restaurant = invitation.restaurants as any;
        const { error: emailError } = await supabase.functions.invoke('send-team-invite', {
            body: {
                restaurantId: invitation.restaurant_id,
                restaurantName: restaurant?.name || 'Restaurant',
                inviterName,
                inviteeEmail: invitation.email,
                invitationToken: invitation.token,
            },
        });

        if (emailError) {
            console.error('[TeamService] Resend email error:', emailError);
            // Don't fail - invitation is updated, just email failed
        }

        console.log('[TeamService] Invitation resent:', { invitationId, email: invitation.email });
        return { success: true };
    } catch (error: any) {
        console.error('[TeamService] Resend invitation error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Get My Restaurants
// ============================================

/**
 * Get all restaurants the current user has access to
 * Includes both owned restaurants and team memberships
 */
export async function getMyRestaurants(): Promise<{
    data: RestaurantAccess[] | null;
    error?: string;
}> {
    try {
        const { data, error } = await supabase.rpc('get_my_restaurants');

        if (error) {
            console.error('[TeamService] Get my restaurants error:', error);
            return { data: null, error: error.message };
        }

        return { data };
    } catch (error: any) {
        console.error('[TeamService] Get my restaurants error:', error);
        return { data: null, error: error.message };
    }
}

// ============================================
// Check Restaurant Access
// ============================================

/**
 * Check if current user has access to a specific restaurant
 */
export async function hasRestaurantAccess(
    restaurantId: string
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase.rpc('has_restaurant_access', {
            p_user_id: user.id,
            p_restaurant_id: restaurantId,
        });

        if (error) {
            console.error('[TeamService] Check access error:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('[TeamService] Has restaurant access error:', error);
        return false;
    }
}

// ============================================
// Export Service
// ============================================

export const restaurantTeamService = {
    inviteTeamMember,
    acceptInvitation,
    getTeamMembers,
    getPendingInvitations,
    removeTeamMember,
    cancelInvitation,
    resendInvitation,
    getMyRestaurants,
    hasRestaurantAccess,
};