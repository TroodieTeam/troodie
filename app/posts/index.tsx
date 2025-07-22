import { ErrorState } from '@/components/ErrorState';
import { PostCard } from '@/components/PostCard';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postService } from '@/services/postService';
import { getErrorType } from '@/types/errors';
import { PostWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserPostsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadPosts();
    }
  }, [user?.id]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPosts = await postService.getUserPosts(user?.id || '', 50);
      setPosts(userPosts);
    } catch (err: any) {
      console.error('Error loading posts:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handlePostPress = (postId: string) => {
    router.push({
      pathname: '/posts/[id]',
      params: { id: postId }
    });
  };

  const handleEditPost = (postId: string) => {
    router.push({
      pathname: '/posts/edit/[id]',
      params: { id: postId }
    });
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await postService.deletePost(postId);
              setPosts(posts.filter(post => post.id !== postId));
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  const handleLike = (postId: string, liked: boolean) => {
    // Update local state to reflect like change
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1 }
        : post
    ));
  };

  const handleComment = (postId: string) => {
    router.push({
      pathname: '/posts/[id]',
      params: { id: postId }
    });
  };

  const handleSave = (postId: string) => {
    // Update local state to reflect save change
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, saves_count: post.saves_count + 1 }
        : post
    ));
  };

  const renderPost = ({ item }: { item: PostWithUser }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onPress={() => handlePostPress(item.id)}
        onLike={handleLike}
        onComment={handleComment}
        onSave={handleSave}
        showActions={true}
      />
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditPost(item.id)}
        >
          <Ionicons name="create-outline" size={20} color={designTokens.colors.primaryOrange} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeletePost(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="camera-outline" size={64} color={designTokens.colors.textLight} />
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start sharing your restaurant experiences by creating your first post!
      </Text>
      <TouchableOpacity
        style={styles.createPostButton}
        onPress={() => router.push('/add/create-post')}
      >
        <Text style={styles.createPostButtonText}>Create Your First Post</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Posts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Posts</Text>
        </View>
        <ErrorState
          error={error}
          errorType={getErrorType(error)}
          onRetry={loadPosts}
          retrying={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Posts</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/add/create-post')}
        >
          <Ionicons name="add" size={24} color={designTokens.colors.primaryOrange} />
        </TouchableOpacity>
      </View>

      {posts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerTitle: {
    fontSize: designTokens.typography.sectionTitle.fontSize,
    fontFamily: designTokens.typography.sectionTitle.fontFamily,
    color: designTokens.colors.textDark,
  },
  createButton: {
    padding: designTokens.spacing.xs,
  },
  listContainer: {
    paddingBottom: designTokens.spacing.lg,
  },
  postContainer: {
    marginBottom: designTokens.spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    gap: designTokens.spacing.xs,
  },
  actionText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
  },
  emptyTitle: {
    fontSize: designTokens.typography.sectionTitle.fontSize,
    fontFamily: designTokens.typography.sectionTitle.fontFamily,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  emptySubtitle: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textLight,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  createPostButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.sm,
  },
  createPostButtonText: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textLight,
    marginTop: designTokens.spacing.sm,
  },
}); 