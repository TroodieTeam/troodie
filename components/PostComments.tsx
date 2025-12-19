import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CommentWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface PostCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  showInput?: boolean;
  showComments?: boolean;
  postAuthorName?: string; // For "Replying to" text
  bottomOffset?: number;
}

interface RestaurantSuggestion {
  id: string;
  name: string;
  address: string | null;
  cover_photo_url: string | null;
  owner_id: string | null;
}

export function PostComments({ 
  postId, 
  onCommentAdded, 
  onCommentDeleted, 
  showInput = true, 
  showComments = true,
  postAuthorName,
  bottomOffset = 0,
}: PostCommentsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mentionsMap, setMentionsMap] = useState<Map<string, Array<{ restaurantId: string; restaurantName: string; startIndex: number; endIndex: number }>>>(new Map());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
  const [inputHeight, setInputHeight] = useState(0);
  const [tempMentions, setTempMentions] = useState<RestaurantSuggestion[]>([]);
  
  
  const handleCommentChange = async (text: string) => {
    setNewComment(text);

    // Regex: Check if the cursor is at the end of a word starting with @
    // Updated to match database pattern - handles spaces and special characters
    const match = text.match(/@([A-Za-z0-9\s&'-]*)$/);

    if (match) {
      const query = match[1];
      setShowSuggestions(true);
      // Search Supabase directly
      if (query.length >= 1) {
        const { data } = await supabase
          .from('restaurants')
          .select('id, name, address, cover_photo_url, owner_id')
          .ilike('name', `%${query}%`)
          .limit(20);
        
        if (data) setSuggestions(data);
      }
    } else {
      setShowSuggestions(false);
    }
  };
  const handleSelectMention = (restaurant: RestaurantSuggestion) => {
    // Updated regex to match the improved pattern
    const newText = newComment.replace(/@([A-Za-z0-9\s&'-]*)$/, `@${restaurant.name} `);
    
    setNewComment(newText);
    setTempMentions(prev => [...prev, restaurant]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [postId, showComments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      // First get comments, then get user data separately to avoid foreign key issues
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error loading comments:', error);
        return;
      }
      
      
      // Get user data for each comment
      const commentsWithUsers = await Promise.all(
        (commentsData || []).map(async (comment) => {
          
          // First try to get from users table
          let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, username, avatar_url, persona, is_verified')
            .eq('id', comment.user_id)
            .single();
            
          if (userError || !userData) {
            
            // Fallback: try to get from auth.users if not in users table
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(comment.user_id);
            
            if (authUser && authUser.user) {
              userData = {
                id: authUser.user.id,
                name: authUser.user.user_metadata?.name || authUser.user.email || 'User',
                username: authUser.user.user_metadata?.username || 'user',
                avatar_url: authUser.user.user_metadata?.avatar_url || '',
                persona: authUser.user.user_metadata?.persona || 'Food Explorer',
                is_verified: authUser.user.user_metadata?.is_verified || false,
              };
            }
          }
            
          return {
            ...comment,
            user: userData || {
              id: comment.user_id,
              name: 'Unknown User',
              username: 'unknown',
              avatar_url: '',
              persona: 'Food Explorer',
              is_verified: false,
            }
          };
        })
      );
      
      const formattedComments = commentsWithUsers.map(comment => ({
        ...comment,
        user: {
          id: comment.user?.id || '',
          name: comment.user?.name || comment.user?.username || 'Unknown User', // Use username as fallback if name is null
          username: comment.user?.username || 'unknown',
          avatar: comment.user?.avatar_url || '',
          persona: comment.user?.persona || 'Food Explorer',
          verified: comment.user?.is_verified || false,
        },
        replies: []
      }));
      
      setComments(formattedComments as CommentWithUser[]);
      
      // Load mentions for all comments
      const commentIds = formattedComments.map(c => c.id);
      if (commentIds.length > 0) {
        const { data: mentionsData } = await supabase
          .from('restaurant_mentions')
          .select('comment_id, restaurant_id, restaurant_name')
          .in('comment_id', commentIds);
        
        // Build mentions map
        const mentions = new Map<string, Array<{ restaurantId: string; restaurantName: string; startIndex: number; endIndex: number }>>();
        
        formattedComments.forEach(comment => {
          const commentMentions = (mentionsData || [])
            .filter(m => m.comment_id === comment.id)
            .map(m => {
              // Find mention in comment text
              const mentionText = '@' + m.restaurant_name;
              const startIndex = comment.content.indexOf(mentionText);
              if (startIndex !== -1) {
                return {
                  restaurantId: m.restaurant_id,
                  restaurantName: m.restaurant_name,
                  startIndex,
                  endIndex: startIndex + mentionText.length
                };
              }
              return null;
            })
            .filter((m): m is { restaurantId: string; restaurantName: string; startIndex: number; endIndex: number } => m !== null);
          
          if (commentMentions.length > 0) {
            mentions.set(comment.id, commentMentions);
          }
        });
        
        setMentionsMap(mentions);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user?.id || !newComment.trim()) return;

    const commentText = newComment.trim();
    const tempId = `temp-${Date.now()}`;

    try {
      setSubmitting(true);
      
      // Get current user data for optimistic update
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, persona, is_verified')
        .eq('id', user.id)
        .single();

      // Create optimistic comment
      const optimisticComment: CommentWithUser = {
        id: tempId,
        post_id: postId,
        user_id: user.id,
        content: commentText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_comment_id: null,
        likes_count: 0,
        user: {
          id: user.id,
          name: currentUserData?.name || currentUserData?.username || user.user_metadata?.name || user.user_metadata?.username || user.email || 'Anonymous',
          username: currentUserData?.username || user.user_metadata?.username || 'user',
          avatar: currentUserData?.avatar_url || user.user_metadata?.avatar_url || '',
          persona: currentUserData?.persona || user.user_metadata?.persona || 'Food Explorer',
          verified: currentUserData?.is_verified || user.user_metadata?.is_verified || false,
        },
        replies: []
      };
      
      // Add optimistic comment immediately
      setComments(prev => [optimisticComment, ...prev]);
      setNewComment('');
      Keyboard.dismiss();
      
      // Use the database function to handle comment adding and count updating
      const { data, error } = await supabase.rpc('handle_post_engagement', {
        p_action: 'add_comment',
        p_post_id: postId,
        p_user_id: user.id,
        p_content: commentText
      });
        
      if (error) {
        console.error('Error submitting comment:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Remove optimistic comment on error
        setComments(prev => prev.filter(c => c.id !== tempId));
        
        Toast.show({
          type: 'error',
          text1: 'Failed to post comment',
          text2: error.message || 'Please try again',
          visibilityTime: 3000,
          position: 'top',
        });
        return;
      }
      
      // Get the returned comment data
      const commentData = data?.comment;

      // Note: Mentions are automatically processed by database trigger
      // No need to manually save mentions here - trigger handles it
      // Clear tempMentions for next comment
      setTempMentions([]);

      if (!commentData) {
        // Fallback: reload comments if no comment data returned
        await loadComments();
        Toast.show({
          type: 'success',
          text1: 'Comment posted!',
          visibilityTime: 2000,
          position: 'top',
        });
        onCommentAdded?.();
        return;
      }

      // Fetch user data for the comment
      const { data: commentUserData } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, persona, is_verified')
        .eq('id', commentData.user_id)
        .single();

      // Replace optimistic comment with real one
      const realComment: CommentWithUser = {
        ...commentData,
        user: {
          id: commentUserData?.id || commentData.user_id,
          name: commentUserData?.name || commentUserData?.username || 'Unknown User',
          username: commentUserData?.username || 'unknown',
          avatar: commentUserData?.avatar_url || '',
          persona: commentUserData?.persona || 'Food Explorer',
          verified: commentUserData?.is_verified || false,
        },
        replies: []
      };

      // Replace optimistic comment with real one
      setComments(prev => prev.map(c => c.id === tempId ? realComment : c));
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Comment posted!',
        visibilityTime: 2000,
        position: 'top',
      });
      
      onCommentAdded?.();
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== tempId));
      
      Toast.show({
        type: 'error',
        text1: 'Failed to post comment',
        text2: error.message || 'Please try again',
        visibilityTime: 3000,
        position: 'top',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Optimistic update - remove from UI immediately
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      onCommentDeleted?.();
      
      // Delete from database
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);
        
      if (error) {
        console.error('Error deleting comment:', error);
        // On error, reload comments to restore state
        loadComments();
        return;
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      // On error, reload comments to restore state
      loadComments();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderCommentText = (content: string, commentId: string) => {
    const mentions = mentionsMap.get(commentId) || [];
    
    if (mentions.length === 0) {
      return <Text style={styles.commentText}>{content}</Text>;
    }
    
    // Sort mentions by start index
    const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex);
    
    const parts: Array<{ text: string; isMention: boolean; restaurantId?: string }> = [];
    let lastIndex = 0;
    
    sortedMentions.forEach(mention => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push({
          text: content.substring(lastIndex, mention.startIndex),
          isMention: false
        });
      }
      
      // Add mention
      parts.push({
        text: content.substring(mention.startIndex, mention.endIndex),
        isMention: true,
        restaurantId: mention.restaurantId
      });
      
      lastIndex = mention.endIndex;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        text: content.substring(lastIndex),
        isMention: false
      });
    }
    
    return (
      <Text style={styles.commentText}>
        {parts.map((part, index) => {
          if (part.isMention && part.restaurantId) {
            return (
              <Text
                key={index}
                style={styles.mentionText}
                onPress={() => router.push(`/restaurant/${part.restaurantId}`)}
              >
                {part.text}
              </Text>
            );
          }
          return <Text key={index}>{part.text}</Text>;
        })}
      </Text>
    );
  }; 


const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <View style={styles.suggestionListContainer}>
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          style={styles.listStyle}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectMention(item)}
            >
              {item.cover_photo_url ? (
                <Image source={{ uri: item.cover_photo_url }} style={styles.suggestionImage} />
              ) : (
                <View style={[styles.suggestionImage, { backgroundColor: '#eee' }]} />
              )}
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };
  const renderComment = ({ item }: { item: CommentWithUser }) => {
    return (
      <View style={styles.commentContainer}>
        <Image 
          source={{ uri: item.user.avatar || DEFAULT_IMAGES.avatar }} 
          style={styles.commentAvatar}
          defaultSource={{ uri: DEFAULT_IMAGES.avatar }}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentBody}>
            <View style={styles.commentUserNameRow}>
              <Text style={styles.commentUserName}>{item.user.name}</Text>
              {item.user.verified && (
                <Ionicons name="checkmark-circle" size={14} color={designTokens.colors.primaryOrange} />
              )}
              <Text style={styles.commentTime}>• {formatTimeAgo(item.created_at)}</Text>
            </View>
            {renderCommentText(item.content, item.id)}
          </View>
        {item.user_id === user?.id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              // Add confirmation to prevent accidental deletes
              const { Alert } = require('react-native');
              Alert.alert(
                'Delete Comment',
                'Are you sure you want to delete this comment?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => handleDeleteComment(item.id)
                  }
                ]
              );
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={14} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  // If only showing input (Twitter-style fixed bottom input)
  if (showInput && !showComments) {
    const offset = bottomOffset + insets.bottom;
    return (
      <KeyboardAvoidingView 
        style={[styles.fixedInputContainer, { bottom: offset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.twitterInputContainer}>
          {/* Replying to text - outside of input field like Twitter */}
          {postAuthorName && (
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToUsername}>@{postAuthorName}</Text>
            </Text>
          )}
          {renderSuggestions()}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.twitterCommentInput}
              value={newComment}
              onChangeText={handleCommentChange}
              placeholder="Post your reply"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={newComment.trim() ? handleSubmitComment : undefined}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.twitterSubmitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={designTokens.colors.white} />
              ) : (
                <Text style={styles.replyButtonText}>Reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // If only showing input (Twitter-style fixed bottom input)
  if (showInput && !showComments) {
    const offset = bottomOffset + insets.bottom;
    return (
      <KeyboardAvoidingView 
        style={[styles.fixedInputContainer, { bottom: offset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Suggestions render OUTSIDE the input view to prevent clipping */}
        <View style={{ position: 'absolute', bottom: inputHeight, left: 0, right: 0, zIndex: 9999 }}>
          {renderSuggestions()}
        </View>

        <View 
          style={styles.twitterInputContainer}
          onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
        >
          {/* Replying to text */}
          {postAuthorName && (
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToUsername}>@{postAuthorName}</Text>
            </Text>
          )}
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.twitterCommentInput}
              value={newComment}
              onChangeText={handleCommentChange}
              placeholder="Post your reply"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={newComment.trim() ? handleSubmitComment : undefined}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.twitterSubmitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={designTokens.colors.white} />
              ) : (
                <Text style={styles.replyButtonText}>Reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Default: show both (legacy behavior)
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Comments List - Move above input so it can scroll */}
      {showComments && (
        <View style={styles.commentsList}>
          {comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={32} color={designTokens.colors.textLight} />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            comments.slice(0, 5).map((item) => ( // Limit to 5 comments to avoid height issues
              <View key={item.id}>
                {renderComment({ item })}
              </View>
            ))
          )}
          {comments.length > 5 && (
            <View style={styles.showMoreContainer}>
              <Text style={styles.showMoreText}>... and {comments.length - 5} more comments</Text>
            </View>
          )}
        </View>
      )}

      {/* Comment Input - Fixed at bottom */}
      {showInput && (
        <View>
          {/* Suggestions render OUTSIDE the input container */}
          <View style={{ position: 'absolute', bottom: inputHeight, left: 0, right: 0, zIndex: 9999 }}>
            {renderSuggestions()}
          </View>

          <View 
            style={styles.inputContainer}
            onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={handleCommentChange}
                placeholder="Add a comment..."
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={newComment.trim() ? handleSubmitComment : undefined}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.submitButton, (!newComment.trim() || submitting) && styles.submitButtonDisabled]}
                onPress={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={designTokens.colors.white} />
                ) : (
                  <Ionicons name="send" size={16} color={designTokens.colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
 suggestionListContainer: {
    marginHorizontal: 12,
    marginBottom: 4, 
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 180, 
    flexGrow: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  listStyle: {
    flexGrow: 0, 
  },
  listContent: {
    paddingVertical: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  suggestionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  suggestionImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#eee',
  },
  suggestionName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  suggestionAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8E8E93',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333333',
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8F9FA',
  },
  submitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    flex: 1,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
  },
  commentUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginRight: 6,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
    lineHeight: 20,
    marginTop: 2,
  },
  mentionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
    textDecorationLine: 'underline',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    marginTop: 8,
  },
  showMoreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  // Twitter-style fixed input styles
  fixedInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  twitterInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  replyingToText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
    paddingLeft: 4,
  },
  replyingToUsername: {
    color: '#1DA1F2', // Twitter blue
    fontFamily: 'Inter_500Medium',
  },
  twitterCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
    minHeight: 36,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8F9FA',
  },
  twitterSubmitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    minWidth: 60,
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  commentsOnlyContainer: {
    backgroundColor: '#FFFFFF',
  },
}); 