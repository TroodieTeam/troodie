import { supabase } from '@/lib/supabase';

export interface BoardInvitation {
  id: string;
  board_id: string;
  inviter_id: string;
  invitee_id?: string;
  invite_email?: string;
  invite_link_token?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  accepted_at?: string;
}

export interface BoardInvitationWithDetails extends BoardInvitation {
  board_title: string;
  board_description?: string;
  inviter_name: string;
  inviter_avatar?: string;
}

class BoardInvitationService {
  /**
   * Send a board invitation to a user by user ID
   */
  async inviteByUserId(
    boardId: string,
    inviterId: string,
    inviteeId: string
  ): Promise<{ success: boolean; invitation?: BoardInvitation; error?: string }> {
    try {
      // Check if user is already a member (using board_collaborators table)
      const { data: existingMember } = await supabase
        .from('board_collaborators')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', inviteeId)
        .single();

      if (existingMember) {
        return { success: false, error: 'User is already a member of this board' };
      }

      // Check if there's already a pending invitation
      const { data: existingInvite } = await supabase
        .from('board_invitations')
        .select('*')
        .eq('board_id', boardId)
        .eq('invitee_id', inviteeId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvite) {
        return { success: false, error: 'An invitation has already been sent to this user' };
      }

      // Create invitation
      const { data, error } = await supabase
        .from('board_invitations')
        .insert({
          board_id: boardId,
          inviter_id: inviterId,
          invitee_id: inviteeId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for invitee
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('title')
        .eq('id', boardId)
        .single();

      const { data: inviter, error: inviterError } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', inviterId)
        .single();

      if (boardError) {
        console.error('Error fetching board for notification:', boardError);
      }

      if (inviterError) {
        console.error('Error fetching inviter for notification:', inviterError);
      }

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: inviteeId,
        type: 'board_invite',
        title: 'Board Invitation',
        message: `${inviter?.name || 'Someone'} invited you to collaborate on "${board?.title || 'a board'}"`,
        related_id: boardId,
        related_type: 'board',
        data: {
          invitation_id: data.id,
          board_id: boardId,
          board_name: board?.title,
          inviter_id: inviterId,
          inviter_name: inviter?.name,
          inviter_avatar: inviter?.avatar_url
        },
      });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      return { success: true, invitation: data };
    } catch (error: any) {
      console.error('Error sending board invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a board invitation by email
   */
  async inviteByEmail(
    boardId: string,
    inviterId: string,
    email: string
  ): Promise<{ success: boolean; invitation?: BoardInvitation; error?: string }> {
    try {
      // Check if email belongs to existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        // Use inviteByUserId instead
        return this.inviteByUserId(boardId, inviterId, existingUser.id);
      }

      // Create invitation with email
      const { data, error } = await supabase
        .from('board_invitations')
        .insert({
          board_id: boardId,
          inviter_id: inviterId,
          invite_email: email,
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Send email notification
      // This would integrate with your email service

      return { success: true, invitation: data };
    } catch (error: any) {
      console.error('Error sending email invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a shareable invite link
   */
  async createInviteLink(
    boardId: string,
    inviterId: string
  ): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
    try {
      // Generate unique token
      const { data: token, error: tokenError } = await supabase
        .rpc('generate_invite_token');

      if (tokenError || !token) throw tokenError || new Error('Failed to generate token');

      // Create invitation with token
      const { data, error } = await supabase
        .from('board_invitations')
        .insert({
          board_id: boardId,
          inviter_id: inviterId,
          invite_link_token: token,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate shareable URL
      const url = `troodie://boards/${boardId}/invite/${token}`;

      return { success: true, token, url };
    } catch (error: any) {
      console.error('Error creating invite link:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept a board invitation
   */
  async acceptInvitation(
    invitationId: string,
    userId: string
  ): Promise<{ success: boolean; boardId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('accept_board_invitation', {
          p_invitation_id: invitationId,
          p_user_id: userId,
        });

      if (error) throw error;

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return { success: true, boardId: data.board_id };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decline a board invitation
   */
  async declineInvitation(
    invitationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('decline_board_invitation', {
          p_invitation_id: invitationId,
          p_user_id: userId,
        });

      if (error) throw error;

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending invitations for a user
   */
  async getUserInvitations(
    userId: string
  ): Promise<{ success: boolean; invitations?: BoardInvitationWithDetails[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_pending_invitations', {
          p_user_id: userId,
        });

      if (error) throw error;

      return { success: true, invitations: data || [] };
    } catch (error: any) {
      console.error('Error fetching user invitations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invitations for a board (for board owners)
   */
  async getBoardInvitations(
    boardId: string
  ): Promise<{ success: boolean; invitations?: BoardInvitation[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('board_invitations')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, invitations: data || [] };
    } catch (error: any) {
      console.error('Error fetching board invitations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel an invitation (by board owner)
   */
  async cancelInvitation(
    invitationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('board_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept invitation via link token
   */
  async acceptInviteLink(
    token: string,
    userId: string
  ): Promise<{ success: boolean; boardId?: string; error?: string }> {
    try {
      // Find invitation by token
      const { data: invitation, error: fetchError } = await supabase
        .from('board_invitations')
        .select('*')
        .eq('invite_link_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !invitation) {
        return { success: false, error: 'Invalid or expired invite link' };
      }

      // Accept the invitation
      return this.acceptInvitation(invitation.id, userId);
    } catch (error: any) {
      console.error('Error accepting invite link:', error);
      return { success: false, error: error.message };
    }
  }
}

export const boardInvitationService = new BoardInvitationService();
