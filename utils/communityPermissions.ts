import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member'
export type AdminAction = 'remove_member' | 'delete_post' | 'update_settings' | 'delete_community' | 'view_audit_logs' | 'update_role'

const ROLE_PERMISSIONS: Record<CommunityRole, AdminAction[]> = {
  owner: ['remove_member', 'delete_post', 'update_settings', 'delete_community', 'view_audit_logs', 'update_role'],
  admin: ['remove_member', 'delete_post', 'update_settings', 'view_audit_logs', 'update_role'],
  moderator: ['delete_post'],
  member: []
}

/**
 * Get a user's role in a community
 */
export async function getCommunityRole(
  userId: string,
  communityId: string
): Promise<CommunityRole | null> {
  try {
    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .single()

    return member?.role as CommunityRole || null
  } catch (error) {
    console.error('Error getting community role:', error)
    return null
  }
}

/**
 * Check if a user has permission for a specific action in a community
 */
export async function checkCommunityPermission(
  userId: string,
  communityId: string,
  action: AdminAction
): Promise<boolean> {
  const role = await getCommunityRole(userId, communityId)
  if (!role) return false

  const allowedActions = ROLE_PERMISSIONS[role]
  return allowedActions.includes(action)
}

/**
 * Check if a role has permission for an action (no database call)
 */
export function hasPermission(role: CommunityRole, action: AdminAction): boolean {
  const allowedActions = ROLE_PERMISSIONS[role]
  return allowedActions.includes(action)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: CommunityRole): AdminAction[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * React hook to get user's role and permissions in a community
 */
export function useCommunityPermissions(communityId: string | undefined, userId: string | undefined) {
  const [role, setRole] = useState<CommunityRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!communityId || !userId) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      setLoading(true)
      const userRole = await getCommunityRole(userId, communityId)
      setRole(userRole)
      setLoading(false)
    }

    fetchRole()
  }, [communityId, userId])

  const hasPermission = (action: AdminAction): boolean => {
    if (!role) return false
    return ROLE_PERMISSIONS[role].includes(action)
  }

  const permissions = role ? ROLE_PERMISSIONS[role] : []

  return {
    role,
    loading,
    hasPermission,
    permissions,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    isModerator: role === 'owner' || role === 'admin' || role === 'moderator',
    isMember: role !== null
  }
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: CommunityRole): string {
  switch (role) {
    case 'owner':
      return 'Owner'
    case 'admin':
      return 'Admin'
    case 'moderator':
      return 'Moderator'
    case 'member':
      return 'Member'
    default:
      return 'Member'
  }
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: CommunityRole): string {
  switch (role) {
    case 'owner':
      return '#FF6B6B' // Red
    case 'admin':
      return '#4ECDC4' // Teal
    case 'moderator':
      return '#45B7D1' // Blue
    case 'member':
    default:
      return '#95A5A6' // Gray
  }
}