# Task 6.10: Enhance Post Functionality for External Content

## Epic
Epic 6: Missing Core Screens and Functionality

## Priority
Medium

## Estimate
3 days

## Status
🔴 Not Started

## Overview
Enhance the post functionality to allow users to save and share content from external sources (TikTok, Instagram, articles, etc.) while maintaining the ability to create original reviews and experiences.

## Business Value
- Enables users to curate and share content from multiple sources
- Increases content variety and engagement
- Allows users to save interesting restaurant content they find elsewhere
- Creates a more comprehensive restaurant discovery experience
- Distinguishes between original posts and curated content

## Dependencies
- Task 6.2: Post Creation & Management (for base post functionality)
- Task 6.1: Restaurant Detail Screen (for post display)

## Blocks
- Enhanced content creation and curation features
- Better user engagement through diverse content types

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: External Content Posts
  As a user
  I want to save and share restaurant content from external sources
  So that I can curate a diverse collection of restaurant experiences

Scenario: Save TikTok Video as Post
  Given a user finds a TikTok video about a restaurant
  When they tap "Save to Troodie"
  Then they can create a post with the TikTok link
  And the post is marked as external content
  And the restaurant is associated with the post

Scenario: Save Instagram Post
  Given a user finds an Instagram post about a restaurant
  When they save it to Troodie
  Then they can add their own caption
  And the post shows the Instagram content preview
  And it's clearly marked as external content

Scenario: Save Article Link
  Given a user reads an article about a restaurant
  When they save it to Troodie
  Then they can create a post with the article link
  And the post shows the article title and description
  And it's categorized as external content

Scenario: Create Original Post
  Given a user wants to share their own experience
  When they create a new post
  Then they can choose between original and external content
  And original posts are clearly distinguished
  And they can add photos, ratings, and personal notes

Scenario: View Mixed Content Feed
  Given a user is browsing posts
  When they view the feed
  Then they see both original and external content
  And external content is clearly marked
  And they can filter by content type

Scenario: External Content Attribution
  Given a user views an external content post
  When they see the post
  Then the original source is clearly attributed
  And they can tap to view the original content
  And the post shows who saved it to Troodie
```

## Technical Implementation

### Backend Changes

#### Database Schema Updates
```sql
-- Add external content fields to posts table
ALTER TABLE public.posts 
ADD COLUMN content_type character varying DEFAULT 'original' CHECK (
  content_type::text = ANY (
    ARRAY['original'::character varying, 'external'::character varying]
  )
),
ADD COLUMN external_source character varying,
ADD COLUMN external_url text,
ADD COLUMN external_title text,
ADD COLUMN external_description text,
ADD COLUMN external_thumbnail text,
ADD COLUMN external_author text;

-- Create external content sources table
CREATE TABLE public.external_content_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  domain character varying,
  icon_url text,
  is_supported boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_content_sources_pkey PRIMARY KEY (id)
);

-- Insert common external sources
INSERT INTO public.external_content_sources (name, domain, icon_url) VALUES
  ('TikTok', 'tiktok.com', 'https://example.com/tiktok-icon.png'),
  ('Instagram', 'instagram.com', 'https://example.com/instagram-icon.png'),
  ('YouTube', 'youtube.com', 'https://example.com/youtube-icon.png'),
  ('Twitter', 'twitter.com', 'https://example.com/twitter-icon.png'),
  ('Article', NULL, 'https://example.com/article-icon.png');
```

#### Post Service Updates
```typescript
// services/postService.ts
interface ExternalContent {
  source: string;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  author?: string;
}

interface CreatePostData {
  userId: string;
  restaurantId: string;
  content?: string;
  photos?: string[];
  rating?: number;
  visitDate?: Date;
  priceRange?: string;
  visitType?: string;
  tags?: string[];
  privacy?: string;
  contentType: 'original' | 'external';
  externalContent?: ExternalContent;
}

export const createPost = async (data: CreatePostData) => {
  const postData = {
    user_id: data.userId,
    restaurant_id: data.restaurantId,
    caption: data.content,
    photos: data.photos,
    rating: data.rating,
    visit_date: data.visitDate,
    price_range: data.priceRange,
    visit_type: data.visitType,
    tags: data.tags,
    privacy: data.privacy || 'public',
    content_type: data.contentType,
    external_source: data.externalContent?.source,
    external_url: data.externalContent?.url,
    external_title: data.externalContent?.title,
    external_description: data.externalContent?.description,
    external_thumbnail: data.externalContent?.thumbnail,
    external_author: data.externalContent?.author,
    created_at: new Date().toISOString()
  };

  const { data: post, error } = await supabase
    .from('posts')
    .insert(postData)
    .select()
    .single();

  if (error) throw error;
  return post;
};

export const getPosts = async (
  filters?: {
    contentType?: 'original' | 'external' | 'all';
    restaurantId?: string;
    userId?: string;
  }
) => {
  let query = supabase
    .from('posts')
    .select(`
      *,
      user:users(id, username, name, avatar_url),
      restaurant:restaurants(id, name, cover_photo_url)
    `)
    .order('created_at', { ascending: false });

  if (filters?.contentType && filters.contentType !== 'all') {
    query = query.eq('content_type', filters.contentType);
  }

  if (filters?.restaurantId) {
    query = query.eq('restaurant_id', filters.restaurantId);
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;
  return { data, error };
};
```

### Frontend Changes

#### Enhanced Post Creation Component
```typescript
// components/CreatePostModal.tsx
interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  restaurantId
}) => {
  const { user } = useAuth();
  const [contentType, setContentType] = useState<'original' | 'external'>('original');
  const [content, setContent] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalSource, setExternalSource] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [rating, setRating] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const handleCreatePost = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const postData: CreatePostData = {
        userId: user.id,
        restaurantId,
        content,
        photos,
        rating,
        contentType,
        privacy: 'public'
      };

      if (contentType === 'external' && externalUrl) {
        postData.externalContent = {
          source: externalSource,
          url: externalUrl,
          // Additional metadata will be fetched by backend
        };
      }

      await createPost(postData);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Post</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content Type Selection */}
          <View style={styles.contentTypeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                contentType === 'original' && styles.activeType
              ]}
              onPress={() => setContentType('original')}
            >
              <Text style={styles.typeButtonText}>My Experience</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                contentType === 'external' && styles.activeType
              ]}
              onPress={() => setContentType('external')}
            >
              <Text style={styles.typeButtonText}>Save from Web</Text>
            </TouchableOpacity>
          </View>

          {/* Original Content */}
          {contentType === 'original' && (
            <View style={styles.originalContent}>
              <TextInput
                style={styles.contentInput}
                placeholder="Share your experience..."
                value={content}
                onChangeText={setContent}
                multiline
              />
              
              <TrafficLightRating
                restaurantId={restaurantId}
                onRatingChange={setRating}
              />
              
              <PhotoPicker
                photos={photos}
                onPhotosChange={setPhotos}
              />
            </View>
          )}

          {/* External Content */}
          {contentType === 'external' && (
            <View style={styles.externalContent}>
              <TextInput
                style={styles.urlInput}
                placeholder="Paste URL from TikTok, Instagram, etc."
                value={externalUrl}
                onChangeText={setExternalUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              
              <TextInput
                style={styles.contentInput}
                placeholder="Add your thoughts..."
                value={content}
                onChangeText={setContent}
                multiline
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={handleCreatePost}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

#### Enhanced Post Display Component
```typescript
// components/PostCard.tsx
interface PostCardProps {
  post: Post;
  onPress?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPress }) => {
  const isExternal = post.content_type === 'external';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Post Header */}
      <View style={styles.header}>
        <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{post.user.username}</Text>
          <Text style={styles.timestamp}>
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>
        {isExternal && (
          <View style={styles.externalBadge}>
            <Ionicons name="link" size={16} color="#666" />
            <Text style={styles.externalText}>External</Text>
          </View>
        )}
      </View>

      {/* Post Content */}
      <View style={styles.content}>
        {isExternal ? (
          <ExternalContentPreview post={post} />
        ) : (
          <OriginalContentPreview post={post} />
        )}
      </View>

      {/* Post Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.likes_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="bookmark-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.saves_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ExternalContentPreview: React.FC<{ post: Post }> = ({ post }) => (
  <View style={styles.externalPreview}>
    <View style={styles.externalHeader}>
      <Image 
        source={{ uri: getSourceIcon(post.external_source) }} 
        style={styles.sourceIcon} 
      />
      <Text style={styles.sourceName}>{post.external_source}</Text>
    </View>
    
    {post.external_thumbnail && (
      <Image 
        source={{ uri: post.external_thumbnail }} 
        style={styles.externalThumbnail} 
      />
    )}
    
    <Text style={styles.externalTitle}>{post.external_title}</Text>
    <Text style={styles.externalDescription}>{post.external_description}</Text>
    
    {post.caption && (
      <Text style={styles.caption}>{post.caption}</Text>
    )}
  </View>
);

const OriginalContentPreview: React.FC<{ post: Post }> = ({ post }) => (
  <View style={styles.originalPreview}>
    {post.caption && (
      <Text style={styles.caption}>{post.caption}</Text>
    )}
    
    {post.photos && post.photos.length > 0 && (
      <Image source={{ uri: post.photos[0] }} style={styles.photo} />
    )}
    
    {post.rating && (
      <TrafficLightRating 
        restaurantId={post.restaurant_id}
        size="small"
        showUserRating={false}
      />
    )}
  </View>
);
```

## Definition of Done

- [ ] Database schema supports external content posts
- [ ] Post creation supports both original and external content
- [ ] External content is clearly marked and attributed
- [ ] Users can save content from TikTok, Instagram, articles
- [ ] Post feed displays mixed content types
- [ ] External content previews are properly displayed
- [ ] Content filtering by type is implemented
- [ ] Performance is optimized for external content
- [ ] Error handling is implemented for all operations
- [ ] User experience is intuitive and engaging

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for consistent styling
- Use appropriate icons for different external sources
- Follow established card and modal patterns

### Technical References
- `/docs/backend-design.md` for database schema
- Existing post functionality for integration
- URL parsing and metadata extraction

### Related Documentation
- Post creation and management
- Restaurant detail screen integration
- Content moderation and safety

## Notes

### User Experience Considerations
- Make it easy to distinguish between original and external content
- Provide clear attribution for external sources
- Ensure external content previews are engaging
- Consider content moderation for external links

### Technical Considerations
- Implement URL validation and safety checks
- Handle metadata extraction for external content
- Consider rate limiting for external content creation
- Implement proper error handling for broken links

### Future Enhancements
- Add support for more external platforms
- Implement content recommendation based on external sources
- Add analytics for external content engagement
- Consider content curation features 