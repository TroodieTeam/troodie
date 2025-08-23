import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

export interface ShareContent {
  type: 'board' | 'post' | 'profile' | 'restaurant';
  id: string;
  title?: string;
  description?: string;
  image?: string;
  username?: string;
  tags?: string[];
  count?: number;
}

export interface ShareResult {
  success: boolean;
  action?: string;
  error?: string;
}

interface ShareAnalytics {
  user_id: string;
  content_type: string;
  content_id: string;
  action: 'initiated' | 'completed' | 'failed';
  platform?: string;
  method?: string;
  error?: string;
  metadata?: any;
}

class ShareService {
  private static instance: ShareService;
  
  // Production URLs - Using the same Supabase URL from app config
  private static readonly SUPABASE_PROJECT_URL = Constants.expoConfig?.extra?.supabaseUrl || 'https://your-project.supabase.co';
  private static readonly SHARE_FUNCTION_URL = `${ShareService.SUPABASE_PROJECT_URL}/functions/v1/share-redirect`;
  
  private constructor() {}
  
  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }
  
  /**
   * Generate deep link URL for content
   */
  static generateDeepLink(content: ShareContent): string {
    // Development mode - use Expo development URL
    if (__DEV__) {
      switch (content.type) {
        case 'profile':
          return Linking.createURL(`/user/${content.id}`);
        case 'restaurant':
          return Linking.createURL(`/restaurant/${content.id}`);
        case 'post':
          return Linking.createURL(`/posts/${content.id}`);
        case 'board':
          return Linking.createURL(`/boards/${content.id}`);
        default:
          return Linking.createURL('/');
      }
    }
    
    // Production - use Supabase Edge Function URL
    switch (content.type) {
      case 'board':
        return `${ShareService.SHARE_FUNCTION_URL}/board/${content.id}`;
      case 'post':
        return `${ShareService.SHARE_FUNCTION_URL}/post/${content.id}`;
      case 'profile':
        return `${ShareService.SHARE_FUNCTION_URL}/profile/${content.username || content.id}`;
      case 'restaurant':
        return `${ShareService.SHARE_FUNCTION_URL}/restaurant/${content.id}`;
      default:
        return ShareService.SHARE_FUNCTION_URL;
    }
  }
  
  /**
   * Generate share message based on content type
   */
  static generateMessage(content: ShareContent): string {
    const messages: Record<string, string[]> = {
      board: [
        content.title ? `Check out my restaurant collection: "${content.title}"` : 'Check out my restaurant collection',
        content.title ? `I curated these amazing spots: "${content.title}"` : 'I curated these amazing spots',
        content.count ? `${content.count} handpicked restaurants in "${content.title}"` : 'My handpicked restaurant collection'
      ],
      post: [
        content.title ? `Just discovered this gem: ${content.title}` : 'Just discovered this amazing place',
        'You have to try this place! 🍽️',
        content.tags?.length ? `Found the perfect spot for ${content.tags.join(', ')}` : 'Found the perfect spot'
      ],
      profile: [
        `Follow @${content.username} on Troodie for amazing food recommendations 🍽️`,
        `Check out @${content.username}'s restaurant discoveries on Troodie`,
        `@${content.username} knows the best spots in town - Follow on Troodie!`
      ],
      restaurant: [
        content.title ? `You need to try ${content.title}!` : 'You need to try this place!',
        content.title ? `${content.title} is a must-visit` : 'This restaurant is a must-visit',
        'Found your next favorite restaurant 📍'
      ]
    };
    
    const typeMessages = messages[content.type] || ['Check this out on Troodie'];
    
    // A/B testing: randomly select message
    const message = typeMessages[Math.floor(Math.random() * typeMessages.length)];
    
    // Add description if provided
    if (content.description) {
      return `${message}\n\n${content.description}`;
    }
    
    return message;
  }
  
  /**
   * Track share analytics
   */
  private static async trackAnalytics(analytics: Partial<ShareAnalytics>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('share_analytics').insert({
        user_id: user.id,
        platform: Platform.OS,
        ...analytics
      });
    } catch (error) {
      console.error('Failed to track share analytics:', error);
    }
  }
  
  /**
   * Main share function
   */
  static async share(content: ShareContent): Promise<ShareResult> {
    try {
      // Track share initiated
      await ShareService.trackAnalytics({
        content_type: content.type,
        content_id: content.id,
        action: 'initiated',
        metadata: {
          title: content.title,
          has_image: !!content.image
        }
      });
      
      const url = ShareService.generateDeepLink(content);
      const message = ShareService.generateMessage(content);
      
      // Always include URL in the message for better compatibility
      // This ensures the link is visible on all platforms
      const fullMessage = `${message}\n\n${url}`;
      
      // Prepare share options
      const shareOptions = {
        message: fullMessage,
        title: content.title
      };
      
      // Show native share sheet
      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        // Track successful share
        await ShareService.trackAnalytics({
          content_type: content.type,
          content_id: content.id,
          action: 'completed',
          method: result.activityType || 'unknown'
        });
        
        return {
          success: true,
          action: result.activityType
        };
      } else if (result.action === Share.dismissedAction) {
        // User dismissed the share sheet
        return {
          success: false,
          action: 'dismissed'
        };
      }
      
      return { success: false };
      
    } catch (error: any) {
      // Track failed share
      await ShareService.trackAnalytics({
        content_type: content.type,
        content_id: content.id,
        action: 'failed',
        error: error.message
      });
      
      console.error('Share failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Share to specific platform (future enhancement)
   */
  static async shareToInstagram(content: ShareContent): Promise<ShareResult> {
    // Instagram-specific sharing logic
    // This would require additional setup and Instagram SDK
    return ShareService.share(content);
  }
  
  /**
   * Share to Twitter/X
   */
  static async shareToTwitter(content: ShareContent): Promise<ShareResult> {
    const message = ShareService.generateMessage(content);
    const url = ShareService.generateDeepLink(content);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
    
    try {
      await Linking.openURL(tweetUrl);
      
      await ShareService.trackAnalytics({
        content_type: content.type,
        content_id: content.id,
        action: 'completed',
        method: 'twitter'
      });
      
      return { success: true, action: 'twitter' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Copy link to clipboard
   */
  static async copyLink(content: ShareContent): Promise<ShareResult> {
    try {
      const url = ShareService.generateDeepLink(content);
      
      // React Native doesn't have built-in clipboard, you'll need expo-clipboard
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(url);
      
      await ShareService.trackAnalytics({
        content_type: content.type,
        content_id: content.id,
        action: 'completed',
        method: 'copy_link'
      });
      
      return { success: true, action: 'copy_link' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get share statistics for content
   */
  static async getShareStats(contentType: string, contentId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('share_analytics')
        .select('action, method, created_at')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const stats = {
        total_shares: data.filter(s => s.action === 'completed').length,
        initiated: data.filter(s => s.action === 'initiated').length,
        completed: data.filter(s => s.action === 'completed').length,
        methods: data.reduce((acc: any, share) => {
          if (share.method) {
            acc[share.method] = (acc[share.method] || 0) + 1;
          }
          return acc;
        }, {})
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to get share stats:', error);
      return null;
    }
  }
}

export default ShareService;