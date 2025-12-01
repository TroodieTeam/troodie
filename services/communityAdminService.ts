import { supabase } from '../lib/supabase'
import { notificationService } from './notificationService'
import { authService } from './authService'
import { eventBus, EVENTS } from '@/utils/eventBus'

export type AdminAction = 'remove_member' | 'delete_post' | 'delete_message' | 'update_role' | 'view_audit_logs'
export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member'

interface AdminLogEntry {
  communityId: string
  adminId: string
  actionType: AdminAction
  targetId: string
  targetType: 'user' | 'post' | 'message'
  reason?: string
}

export class CommunityAdminService {
  /**
   * Check if user has permission for specific admin action
   */
  static async checkPermission(
    userId: string,
    communityId: string,
    action: AdminAction
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_community_permission', {
          p_user_id: userId,
          p_community_id: communityId,
          p_action: action
        })

      if (error) {
        console.error('Error checking permission:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error in checkPermission:', error)
      return false
    }
  }

  /**
   * Remove a member from community
   */
  static async removeMember(
    communityId: string,
    memberId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adminId = await authService.getCurrentUserId()
      if (!adminId) {
        return { success: false, error: 'Not authenticated' }
      }

      // Check permissions
      const hasPermission = await this.checkPermission(adminId, communityId, 'remove_member')
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Cannot remove owner
      const { data: targetMember } = await supabase
        .from('community_members')
        .select('role, user:users!user_id(name)')
        .eq('user_id', memberId)
        .eq('community_id', communityId)
        .single()

      if (targetMember?.role === 'owner') {
        return { success: false, error: 'Cannot remove community owner' }
      }

      // Remove member
      const { error: removeError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', memberId)

      if (removeError) throw removeError

      // Log admin action
      await this.logAdminAction({
        communityId,
        adminId,
        actionType: 'remove_member',
        targetId: memberId,
        targetType: 'user',
        reason
      })

      // Get community name for notification
      const { data: community } = await supabase
        .from('communities')
        .select('name')
        .eq('id', communityId)
        .single()

      // Send notification to removed user
      if (targetMember?.user) {
        await notificationService.createSystemNotification(
          memberId,
          'Removed from Community',
          `You have been removed from "${community?.name || 'the community'}"${reason ? `: ${reason}` : ''}`,
          undefined,
          undefined,
          { communityId, relatedType: 'community' }
        )
      }

      // Update member count
      await supabase
        .from('communities')
        .update({ 
          member_count: supabase.raw('member_count - 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', communityId)

      return { success: true }
    } catch (error: any) {
      console.error('Error removing member:', error)
      return { success: false, error: error.message || 'Failed to remove member' }
    }
  }

  private static deletedPostsCache = new Set<string>();

  /**
   * Delete a post from a community
   */
  static async deletePost(
    postId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adminId = await authService.getCurrentUserId()
      
      if (!adminId) {
        return { success: false, error: 'Not authenticated' }
      }

      // Check if already deleted (idempotency)
      if (this.deletedPostsCache.has(postId)) {
        return { success: true };
      }

      // Get post details for notification from the posts table
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, user_id, users!user_id(name)')
        .eq('id', postId)
        .maybeSingle();

      if (postError || !post) {
        // Post not found - treat as already deleted
        return { success: true };
      }

      // Get community_id from post_communities junction table
      const { data: postCommunity } = await supabase
        .from('post_communities')
        .select('community_id')
        .eq('post_id', postId)
        .maybeSingle();

      const communityId = postCommunity?.community_id || '';

      // Verify user has permission (is post author OR community admin/moderator)
      const hasPermission = await this.verifyDeletePermission(
        adminId,
        postId,
        communityId,
        post.user_id
      );

      if (!hasPermission) {
        return {
          success: false,
          error: 'You do not have permission to delete this post'
        };
      }

      // First, delete from post_communities (this will trigger the count update)
      if (communityId) {
        await supabase
          .from('post_communities')
          .delete()
          .eq('post_id', postId)
          .eq('community_id', communityId);
      }

      // Then delete the post itself (cascade will handle likes, comments, etc.)
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        return { success: false, error: deleteError.message || 'Failed to delete post' };
      }

      // Cache deletion to prevent duplicates
      this.deletedPostsCache.add(postId);
      setTimeout(() => this.deletedPostsCache.delete(postId), 5000);

      // Log moderation action if admin deleted (not author)
      if (reason && post.user_id !== adminId && communityId) {
        await this.logAdminAction({
          communityId: communityId,
          adminId,
          actionType: 'delete_post',
          targetId: postId,
          targetType: 'post',
          reason
        });

        // Notify post author that their post was removed
        await notificationService.createSystemNotification(
          post.user_id,
          'Post Removed from Community',
          `Your post has been removed from the community${reason ? `: ${reason}` : ''}`,
          undefined,
          undefined,
          { communityId: communityId, relatedType: 'community' }
        );
      }

      // Emit event for post deletion so UI can update
      eventBus.emit(EVENTS.COMMUNITY_POST_DELETED, {
        postId,
        communityId
      });

      // Note: post_count updated automatically via DB trigger on post_communities
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting post:', error);
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  }

  /**
   * Verify user has permission to delete post
   */
  private static async verifyDeletePermission(
    userId: string,
    postId: string,
    communityId: string,
    postAuthorId: string
  ): Promise<boolean> {
    // Check if user is post author
    if (postAuthorId === userId) return true;

    // Check if user is community admin/moderator/owner
    if (communityId) {
      const { data: membership } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (membership?.role && ['owner', 'admin', 'moderator'].includes(membership.role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get community audit logs
   */
  static async getAuditLogs(
    communityId: string,
    options?: {
      limit?: number
      offset?: number
      actionType?: AdminAction
    }
  ): Promise<any[]> {
    try {
      const adminId = await authService.getCurrentUserId()
      if (!adminId) return []

      // Check if user can view audit logs
      const hasPermission = await this.checkPermission(adminId, communityId, 'view_audit_logs')
      if (!hasPermission) return []

      let query = supabase
        .from('community_admin_logs')
        .select(`
          *,
          admin:admin_id(id, name, avatar_url),
          target_user:users!target_id(id, name, avatar_url)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })

      if (options?.actionType) {
        query = query.eq('action_type', options.actionType)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
      }

      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    communityId: string,
    memberId: string,
    newRole: CommunityRole,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adminId = await authService.getCurrentUserId()
      if (!adminId) {
        return { success: false, error: 'Not authenticated' }
      }

      // Check permissions
      const hasPermission = await this.checkPermission(adminId, communityId, 'update_role')
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Cannot change owner role
      const { data: targetMember } = await supabase
        .from('community_members')
        .select('role')
        .eq('user_id', memberId)
        .eq('community_id', communityId)
        .single()

      if (targetMember?.role === 'owner') {
        return { success: false, error: 'Cannot change owner role' }
      }

      // Update role
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('community_id', communityId)
        .eq('user_id', memberId)

      if (error) throw error

      // Log admin action
      await this.logAdminAction({
        communityId,
        adminId,
        actionType: 'update_role',
        targetId: memberId,
        targetType: 'user',
        reason: reason || `Role changed to ${newRole}`
      })

      // Notify user
      await notificationService.createSystemNotification(
        memberId,
        'Role Updated',
        `Your role has been updated to ${newRole}`,
        undefined,
        undefined,
        { communityId, relatedType: 'community' }
      )

      return { success: true }
    } catch (error: any) {
      console.error('Error updating member role:', error)
      return { success: false, error: error.message || 'Failed to update role' }
    }
  }

  /**
   * Log admin action
   */
  private static async logAdminAction(entry: AdminLogEntry): Promise<void> {
    try {
      await supabase
        .from('community_admin_logs')
        .insert({
          community_id: entry.communityId,
          admin_id: entry.adminId,
          action_type: entry.actionType,
          target_id: entry.targetId,
          target_type: entry.targetType,
          reason: entry.reason
        })
    } catch (error) {
      console.error('Error logging admin action:', error)
    }
  }
}