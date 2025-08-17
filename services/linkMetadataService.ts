import { ExternalContent } from '@/types/post';

export interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  source?: string;
}

class LinkMetadataService {
  /**
   * Detect the source from URL
   */
  detectSource(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('tiktok.com')) {
      return 'tiktok';
    } else if (urlLower.includes('instagram.com')) {
      return 'instagram';
    } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'youtube';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'twitter';
    } else if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
      return 'facebook';
    }
    
    return 'web';
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Clean and normalize URL
   */
  normalizeUrl(url: string): string {
    let normalized = url.trim();
    
    // Add protocol if missing
    if (!normalized.match(/^https?:\/\//)) {
      normalized = 'https://' + normalized;
    }
    
    return normalized;
  }

  /**
   * Fetch metadata for a URL
   * In a real implementation, this would call a backend service
   * that uses tools like puppeteer or playwright to scrape metadata
   */
  async fetchMetadata(url: string): Promise<LinkMetadata> {
    const normalizedUrl = this.normalizeUrl(url);
    
    if (!this.isValidUrl(normalizedUrl)) {
      throw new Error('Invalid URL format');
    }

    const source = this.detectSource(normalizedUrl);
    
    // For now, return mock data based on source
    // In production, this would fetch actual metadata
    const mockMetadata: LinkMetadata = {
      url: normalizedUrl,
      source,
    };

    switch (source) {
      case 'tiktok':
        mockMetadata.title = 'TikTok Video';
        mockMetadata.description = 'Check out this amazing TikTok video!';
        mockMetadata.thumbnail = 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/placeholder.jpg';
        mockMetadata.author = '@creator';
        break;
      
      case 'instagram':
        mockMetadata.title = 'Instagram Post';
        mockMetadata.description = 'View this post on Instagram';
        mockMetadata.thumbnail = 'https://instagram.com/static/images/placeholder.jpg';
        mockMetadata.author = '@user';
        break;
      
      case 'youtube':
        mockMetadata.title = 'YouTube Video';
        mockMetadata.description = 'Watch this video on YouTube';
        mockMetadata.thumbnail = 'https://i.ytimg.com/vi/placeholder/hqdefault.jpg';
        mockMetadata.author = 'Channel Name';
        break;
      
      default:
        mockMetadata.title = 'External Link';
        mockMetadata.description = normalizedUrl;
        break;
    }

    return mockMetadata;
  }

  /**
   * Extract video ID from TikTok URL
   */
  extractTikTokId(url: string): string | null {
    const match = url.match(/\/video\/(\d+)|\/v\/(\d+)|\/(\d+)/);
    return match ? (match[1] || match[2] || match[3]) : null;
  }

  /**
   * Extract post ID from Instagram URL
   */
  extractInstagramId(url: string): string | null {
    const match = url.match(/\/p\/([A-Za-z0-9_-]+)|\/reel\/([A-Za-z0-9_-]+)/);
    return match ? (match[1] || match[2]) : null;
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }
}

export const linkMetadataService = new LinkMetadataService();