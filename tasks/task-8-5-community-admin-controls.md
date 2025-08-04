# Task 8.5: Community Admin Controls

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: Medium
- **Estimate**: 3 days
- **Status**: ✅ Completed
- **Dependencies**: Task 4.2 (Community Features)
- **Blocks**: Safe community environment
- **Assignee**: -

## Overview
Add admin features for community management, including removing users, deleting posts/messages, and maintaining audit logs for accountability.

## Business Value
- **Community safety**: Maintain healthy environments
- **Trust building**: Users feel protected
- **Legal compliance**: Content moderation capabilities
- **Scalability**: Communities can self-moderate

## Dependencies
- ✅ Task 4.4: Enhance Community Detail Screen (Completed)
- Community membership system
- Role-based access control

## Blocks
- Large community support
- User-generated content at scale
- Community monetization features

## Acceptance Criteria

```gherkin
Feature: Community Admin Controls
  As a community admin
  I want to manage my community effectively
  So that I can maintain a safe and engaging environment

  Scenario: Admin removes a user from community
    Given I am an admin in a community
    When I long-press on a member in the member list
    And I select "Remove from Community"
    And I confirm the action
    Then the user is removed from the community
    And they cannot access community content
    And a removal log entry is created
    And the removed user is notified

  Scenario: Admin deletes inappropriate post
    Given I am viewing a post in my community as an admin
    When I tap the post options menu
    And I see admin-only option "Delete Post"
    And I select it with a reason
    Then the post is soft-deleted
    And an audit log entry is created
    And the post author is notified of the removal

  Scenario: View admin audit log
    Given I am an admin in a community
    When I access community settings
    And I tap "Admin Activity Log"
    Then I see a chronological list of all admin actions
    And each entry shows who, what, when, and why
    And I can filter by action type or admin

  Scenario: Role-based permissions
    Given there are different admin roles (owner, admin, moderator)
    When I attempt various actions
    Then owners can delete the community and change all settings
    And admins can remove users and posts but not delete community
    And moderators can only remove posts
    And all actions respect the permission hierarchy
```

## Technical Implementation

### Admin Actions Service

```typescript
// services/communityAdminService.ts
interface AdminAction {
  communityId: string;
  adminId: string;
  actionType: 'remove_member' | 'delete_post' | 'delete_message' | 'update_role';
  targetId: string;
  targetType: 'user' | 'post' | 'message';
  reason?: string;
}

export class CommunityAdminService {
  static async removeMember(
    communityId: string, 
    memberId: string, 
    reason?: string
  ): Promise<void> {
    // Check admin permissions
    const hasPermission = await this.checkPermission(communityId, 'remove_member');
    if (!hasPermission) throw new Error('Insufficient permissions');
    
    // Remove member
    const { error: removeError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', memberId);
      
    if (removeError) throw removeError;
    
    // Log action
    await this.logAdminAction({
      communityId,
      adminId: getCurrentUserId(),
      actionType: 'remove_member',
      targetId: memberId,
      targetType: 'user',
      reason
    });
    
    // Send notification
    await NotificationService.send({
      userId: memberId,
      type: 'community_removal',
      title: 'Removed from Community',
      message: `You have been removed from the community${reason ? `: ${reason}` : ''}`
    });
  }
  
  static async deletePost(
    communityId: string,
    postId: string,
    reason: string
  ): Promise<void> {
    const hasPermission = await this.checkPermission(communityId, 'delete_post');
    if (!hasPermission) throw new Error('Insufficient permissions');
    
    // Soft delete post
    const { error } = await supabase
      .from('community_posts')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: getCurrentUserId()
      })
      .eq('id', postId)
      .eq('community_id', communityId);
      
    if (error) throw error;
    
    // Log action
    await this.logAdminAction({
      communityId,
      adminId: getCurrentUserId(),
      actionType: 'delete_post',
      targetId: postId,
      targetType: 'post',
      reason
    });
  }
}
```

### Permission System

```typescript
// utils/communityPermissions.ts
type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';
type AdminAction = 'remove_member' | 'delete_post' | 'update_settings' | 'delete_community';

const ROLE_PERMISSIONS: Record<CommunityRole, AdminAction[]> = {
  owner: ['remove_member', 'delete_post', 'update_settings', 'delete_community'],
  admin: ['remove_member', 'delete_post', 'update_settings'],
  moderator: ['delete_post'],
  member: []
};

export async function checkCommunityPermission(
  userId: string,
  communityId: string,
  action: AdminAction
): Promise<boolean> {
  // Get user's role in community
  const { data: member } = await supabase
    .from('community_members')
    .select('role')
    .eq('user_id', userId)
    .eq('community_id', communityId)
    .single();
    
  if (!member) return false;
  
  const allowedActions = ROLE_PERMISSIONS[member.role as CommunityRole];
  return allowedActions.includes(action);
}
```

### Admin UI Components

```typescript
// components/community/AdminControls.tsx
export const MemberAdminMenu = ({ member, communityId }) => {
  const { hasPermission } = useCommunityPermissions(communityId);
  const [showReasonModal, setShowReasonModal] = useState(false);
  
  const handleRemoveMember = async (reason: string) => {
    try {
      await CommunityAdminService.removeMember(
        communityId,
        member.id,
        reason
      );
      Toast.show({ text: 'Member removed' });
    } catch (error) {
      Toast.show({ text: 'Failed to remove member', type: 'error' });
    }
  };
  
  if (!hasPermission('remove_member')) return null;
  
  return (
    <>
      <Menu>
        <MenuTrigger>
          <Icon name="more-vert" />
        </MenuTrigger>
        <MenuOptions>
          <MenuOption onSelect={() => setShowReasonModal(true)}>
            <Text style={styles.deleteText}>Remove from Community</Text>
          </MenuOption>
        </MenuOptions>
      </Menu>
      
      <ReasonModal
        visible={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        onSubmit={handleRemoveMember}
        title="Remove Member"
        placeholder="Reason for removal (optional)"
      />
    </>
  );
};
```

### Audit Log Screen

```typescript
// screens/CommunityAuditLogScreen.tsx
export const CommunityAuditLogScreen = ({ route }) => {
  const { communityId } = route.params;
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [filter, setFilter] = useState<AdminAction | 'all'>('all');
  
  useEffect(() => {
    loadAuditLogs();
  }, [filter]);
  
  const loadAuditLogs = async () => {
    let query = supabase
      .from('community_admin_logs')
      .select(`
        *,
        admin:admin_id(name, avatar_url)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
      
    if (filter !== 'all') {
      query = query.eq('action_type', filter);
    }
    
    const { data } = await query;
    setLogs(data || []);
  };
  
  const renderLogItem = ({ item }: { item: AdminLog }) => (
    <View style={styles.logItem}>
      <Avatar url={item.admin.avatar_url} size="small" />
      <View style={styles.logContent}>
        <Text style={styles.adminName}>{item.admin.name}</Text>
        <Text style={styles.action}>{formatAction(item)}</Text>
        {item.reason && (
          <Text style={styles.reason}>Reason: {item.reason}</Text>
        )}
        <Text style={styles.timestamp}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
    </View>
  );
  
  return (
    <Screen>
      <FilterBar
        options={['all', 'remove_member', 'delete_post', 'update_role']}
        selected={filter}
        onSelect={setFilter}
      />
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={item => item.id}
      />
    </Screen>
  );
};
```

### Database Schema

```sql
-- Admin action logging
CREATE TABLE IF NOT EXISTS community_admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  admin_id UUID REFERENCES users(id),
  action_type VARCHAR NOT NULL CHECK (
    action_type IN ('remove_member', 'delete_post', 'delete_message', 'update_role')
  ),
  target_id UUID NOT NULL,
  target_type VARCHAR NOT NULL CHECK (target_type IN ('user', 'post', 'message')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soft delete support
ALTER TABLE community_posts 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Indexes for performance
CREATE INDEX idx_community_admin_logs_community ON community_admin_logs(community_id);
CREATE INDEX idx_community_admin_logs_admin ON community_admin_logs(admin_id);
CREATE INDEX idx_community_posts_deleted ON community_posts(community_id, deleted_at);
```

## Definition of Done

- [ ] Admin can remove members from community
- [ ] Admin can delete inappropriate posts
- [ ] All admin actions create audit log entries
- [ ] Soft delete implemented for posts
- [ ] Removed users cannot access community
- [ ] Role-based permissions enforced
- [ ] Admin activity log screen implemented
- [ ] Notifications sent for admin actions
- [ ] Confirmation dialogs for destructive actions
- [ ] Reason field for all admin actions
- [ ] Audit logs filterable by action type
- [ ] Performance: Admin actions complete < 1s
- [ ] Error handling with user feedback
- [ ] Accessibility: Screen reader support

## Resources
- [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Soft Delete Pattern](https://www.sqlshack.com/implementing-soft-delete-in-sql-server/)
- [Audit Logging Best Practices](https://www.strongdm.com/blog/audit-logging-best-practices)

## Notes
- Consider adding bulk actions for efficiency
- Implement rate limiting for admin actions
- Add export functionality for audit logs
- Future: AI-powered content moderation
- Consider adding temporary bans vs permanent removal