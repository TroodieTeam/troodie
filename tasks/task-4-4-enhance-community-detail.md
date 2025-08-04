# Task 4.4: Enhance Community Detail Screen with Live Data

## Epic
Epic 4: Board and Community Features

## Priority
High

## Estimate
3 days

## Status
🔴 Not Started

## Overview
Replace mock data in the community detail screen with live user data and implement missing core features including posting in communities, viewing member profiles, leaving communities, and admin editing capabilities.

## Business Value
- **Increased Engagement**: Enable users to actively participate in communities through posts
- **Better Community Management**: Admins can update and maintain their communities
- **Improved User Experience**: Real member data and profiles create authentic connections
- **Enhanced Retention**: Full-featured communities keep users engaged with the platform
- **Trust Building**: Seeing real members and activity builds community trust

## Dependencies
- Task 4.3: Community Features (basic community creation)
- Task 3.4: User Profile Implementation (for member profile viewing)
- Task 6.2: Post Creation & Management (for community posts)
- Existing community database schema and service

## Blocks
- Enhanced community discovery features
- Community analytics and insights
- Advanced moderation tools

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Enhanced Community Detail Screen
  As a community member
  I want to interact with real community data and features
  So that I can fully participate in the community

Scenario: View Real Community Members
  Given I am on the community detail screen
  When I tap on the "Members" tab
  Then I should see actual community members
  And each member should show their real profile data
  And I should see member count matching actual membership

Scenario: View Member Profile
  Given I am viewing the members list
  When I tap on a member
  Then I should navigate to their profile screen
  And I should see their profile information
  And I should be able to follow/unfollow them

Scenario: Create Community Post
  Given I am a member of the community
  When I tap the "Create Post" button
  Then I should see a post creation screen
  And I should be able to add text and images
  And the post should appear in the community feed after creation

Scenario: Leave Community
  Given I am a member of a public community
  When I tap the "Leave Community" button
  And I confirm my action
  Then I should be removed from the community
  And the member count should decrease
  And I should see the "Join Community" button

Scenario: Edit Community as Admin
  Given I am an admin of the community
  When I tap the menu button (three dots)
  Then I should see an "Edit Community" option
  And I should be able to update community details
  And changes should be reflected immediately

Scenario: View Real Community Posts
  Given I am on the community detail screen
  When I view the "Feed" tab
  Then I should see actual posts from community members
  And posts should be ordered by recency
  And I should be able to interact with posts
```

## Technical Implementation

### 1. Update Community Service

```typescript
// services/communityService.ts - Add new methods

export const communityService = {
  // ... existing methods ...

  async getCommunityMembers(communityId: string, limit = 50): Promise<CommunityMember[]> {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        *,
        user:users(
          id,
          name,
          username,
          avatar_url,
          bio
        )
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getCommunityPosts(communityId: string, limit = 20): Promise<CommunityPost[]> {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        user:users(
          id,
          name,
          username,
          avatar_url
        ),
        restaurant:restaurants(
          id,
          name,
          cover_photo_url
        ),
        interactions:post_interactions(count),
        comments:post_comments(count)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async updateCommunity(
    communityId: string, 
    updates: Partial<Community>
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', communityId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  },

  async checkAdminStatus(userId: string, communityId: string): Promise<boolean> {
    const { data } = await supabase
      .from('community_members')
      .select('role')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single()

    return data?.role === 'admin' || data?.role === 'owner'
  }
}
```

### 2. Create Post Button Component

```typescript
// components/community/CreatePostButton.tsx
import React from 'react'
import { TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { theme } from '@/constants/theme'

interface CreatePostButtonProps {
  communityId: string
  communityName: string
}

export const CreatePostButton: React.FC<CreatePostButtonProps> = ({ 
  communityId, 
  communityName 
}) => {
  const router = useRouter()

  const handlePress = () => {
    router.push({
      pathname: '/add/create-post',
      params: { 
        communityId,
        communityName 
      }
    })
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Plus size={20} color="#FFFFFF" />
      <Text style={styles.text}>Create Post</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  }
})
```

### 3. Update Community Detail Screen

```typescript
// app/add/community-detail.tsx - Key updates

const CommunityDetailScreen = () => {
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadCommunityData()
  }, [communityId])

  const loadCommunityData = async () => {
    try {
      // Load members
      const membersData = await communityService.getCommunityMembers(communityId)
      setMembers(membersData)

      // Load posts
      const postsData = await communityService.getCommunityPosts(communityId)
      setPosts(postsData)

      // Check admin status
      if (user) {
        const adminStatus = await communityService.checkAdminStatus(user.id, communityId)
        setIsAdmin(adminStatus)
      }
    } catch (error) {
      console.error('Error loading community data:', error)
    }
  }

  const handleMemberPress = (member: CommunityMember) => {
    router.push(`/profile/${member.user.username}`)
  }

  const handleEditCommunity = () => {
    router.push({
      pathname: '/community/edit',
      params: { communityId }
    })
  }

  const renderMoreMenu = () => {
    if (!isAdmin) return null

    return (
      <Menu>
        <MenuTrigger>
          <Text style={styles.moreText}>•••</Text>
        </MenuTrigger>
        <MenuOptions>
          <MenuOption onSelect={handleEditCommunity}>
            <Text>Edit Community</Text>
          </MenuOption>
          <MenuOption onSelect={handleManageMembers}>
            <Text>Manage Members</Text>
          </MenuOption>
        </MenuOptions>
      </Menu>
    )
  }

  const renderRealMembers = () => (
    <View style={styles.membersContainer}>
      <Text style={styles.sectionTitle}>
        Members ({members.length})
      </Text>
      
      {members.map((member) => (
        <TouchableOpacity 
          key={member.id} 
          style={styles.memberItem}
          onPress={() => handleMemberPress(member)}
        >
          <Image 
            source={{ uri: member.user.avatar_url || 'https://via.placeholder.com/48' }} 
            style={styles.memberAvatar} 
          />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.user.name}</Text>
            <Text style={styles.memberRole}>{member.user.bio || 'Member'}</Text>
            <Text style={styles.memberJoined}>
              Joined {formatDate(member.joined_at)}
            </Text>
          </View>
          {member.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Crown size={16} color="#FFD700" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderRealFeed = () => (
    <View style={styles.feedContainer}>
      {posts.length === 0 ? (
        <EmptyState 
          title="No posts yet"
          message="Be the first to share something with the community!"
          icon={MessageCircle}
        />
      ) : (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            onPress={() => router.push(`/post/${post.id}`)}
          />
        ))
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* ... existing header ... */}
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={loadCommunityData}
          />
        }
      >
        {/* ... existing community info ... */}
        
        {activeTab === 'feed' && renderRealFeed()}
        {activeTab === 'members' && renderRealMembers()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {isMember && activeTab === 'feed' && (
        <CreatePostButton 
          communityId={communityId}
          communityName={community.name}
        />
      )}
    </SafeAreaView>
  )
}
```

### 4. Create Edit Community Screen

```typescript
// app/community/edit.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { communityService } from '@/services/communityService'

export default function EditCommunityScreen() {
  const router = useRouter()
  const { communityId } = useLocalSearchParams()
  const [community, setCommunity] = useState<Community | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCommunity()
  }, [])

  const loadCommunity = async () => {
    const data = await communityService.getCommunityById(communityId as string)
    if (data) {
      setCommunity(data)
      setName(data.name)
      setDescription(data.description || '')
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const { success, error } = await communityService.updateCommunity(
      communityId as string,
      { name, description }
    )

    if (success) {
      Alert.alert('Success', 'Community updated successfully')
      router.back()
    } else {
      Alert.alert('Error', error || 'Failed to update community')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Community</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveText, loading && styles.disabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Community Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter community name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's your community about?"
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

### 5. Update Post Creation for Communities

```typescript
// app/add/create-post.tsx - Add community support
const CreatePostScreen = () => {
  const { communityId, communityName } = useLocalSearchParams()

  const handlePublish = async () => {
    // ... existing validation ...

    const postData = {
      user_id: user.id,
      restaurant_id: selectedRestaurant?.id,
      community_id: communityId || null, // Add community_id
      caption,
      rating,
      photos,
      tags,
      privacy
    }

    const result = await postService.createPost(postData)
    // ... handle result ...
  }

  return (
    <SafeAreaView>
      {/* Show community context if posting to community */}
      {communityId && (
        <View style={styles.communityContext}>
          <Text style={styles.communityContextText}>
            Posting to: {communityName}
          </Text>
        </View>
      )}
      
      {/* ... rest of the screen ... */}
    </SafeAreaView>
  )
}
```

## Definition of Done

### Functional Requirements
- [ ] Community members list shows real user data
- [ ] Tapping a member navigates to their profile
- [ ] Community posts show real posts from members
- [ ] Create Post button appears for members
- [ ] Leave Community functionality works correctly
- [ ] Admin users see Edit Community option
- [ ] Edit Community screen allows updating details
- [ ] All data refreshes when pulled down

### Technical Implementation
- [ ] Community service methods implemented
- [ ] Real-time updates for member/post counts
- [ ] Proper error handling for all operations
- [ ] Loading states for data fetching
- [ ] Empty states for no posts/members
- [ ] Accessibility labels on interactive elements

### User Experience
- [ ] Smooth navigation between screens
- [ ] Clear feedback for all actions
- [ ] Appropriate loading indicators
- [ ] Confirmation dialogs for destructive actions
- [ ] Consistent styling with design system

### Testing
- [ ] All Gherkin scenarios pass
- [ ] Admin vs member permissions tested
- [ ] Error scenarios handled gracefully
- [ ] Performance acceptable with large member lists
- [ ] Cross-platform compatibility verified

## Resources

### Database Schema
- Communities table with id, name, description, type, created_by
- Community_members table with user_id, community_id, role, joined_at
- Community_posts table linking posts to communities

### Related Screens
- `/app/profile/[username].tsx` - User profile screen
- `/app/add/create-post.tsx` - Post creation screen
- `/app/post/[id].tsx` - Post detail screen

### Services
- `communityService.ts` - Community data operations
- `postService.ts` - Post creation and management
- `userService.ts` - User profile data

## Notes

### Current Implementation
- Screen currently uses mock data for all content
- Basic join/leave functionality exists
- Community data fetching is implemented
- Missing post creation and member interaction

### Security Considerations
- Verify user permissions for edit operations
- Validate community membership for posting
- Ensure RLS policies are enforced
- Sanitize user input for community updates

### Performance Optimization
- Implement pagination for large member lists
- Cache member data to reduce queries
- Use optimistic updates for better UX
- Consider virtual lists for long feeds

### Future Enhancements
- Member roles and permissions management
- Community moderation tools
- Community analytics dashboard
- Invite system for private communities
- Community rules and guidelines