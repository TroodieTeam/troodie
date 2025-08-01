import { supabase } from '../lib/supabase'
import { NotificationService } from './notificationService'
import { getCurrentUserId } from './authService'

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
      const adminId = await getCurrentUserId()
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
        await NotificationService.send({
          userId: memberId,
          type: 'system',
          title: 'Removed from Community',
          message: `You have been removed from "${community?.name || 'the community'}"${reason ? `: ${reason}` : ''}`,
          relatedId: communityId,
          relatedType: 'community'
        })
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

  /**
   * Soft delete a post
   */
  static async deletePost(
    communityId: string,
    postId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adminId = await getCurrentUserId()
      if (!adminId) {
        return { success: false, error: 'Not authenticated' }
      }

      // Check permissions
      const hasPermission = await this.checkPermission(adminId, communityId, 'delete_post')
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Get post details for notification
      const { data: post } = await supabase
        .from('community_posts')
        .select('user_id, user:users!user_id(name)')
        .eq('id', postId)
        .single()

      // Soft delete post
      const { error } = await supabase
        .from('community_posts')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: adminId
        })
        .eq('id', postId)
        .eq('community_id', communityId)

      if (error) throw error

      // Log admin action
      await this.logAdminAction({
        communityId,
        adminId,
        actionType: 'delete_post',
        targetId: postId,
        targetType: 'post',
        reason
      })

      // Notify post author
      if (post?.user_id && post.user_id !== adminId) {
        await NotificationService.send({
          userId: post.user_id,
          type: 'system',
          title: 'Post Removed',
          message: `Your post has been removed by a community admin: ${reason}`,
          relatedId: communityId,
          relatedType: 'community'
        })
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting post:', error)
      return { success: false, error: error.message || 'Failed to delete post' }
    }
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
      const adminId = await getCurrentUserId()
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
      const adminId = await getCurrentUserId()
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
      await NotificationService.send({
        userId: memberId,
        type: 'system',
        title: 'Role Updated',
        message: `Your role has been updated to ${newRole}`,
        relatedId: communityId,
        relatedType: 'community'
      })

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