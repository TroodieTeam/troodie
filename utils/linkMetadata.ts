/**
 * Extract metadata from a URL
 * In a real app, this would call a backend service that uses libraries like 
 * `link-preview-js` or `metascraper` to fetch actual metadata
 */
export async function extractLinkMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  siteName?: string;
}> {
  // Mock implementation for now
  // In production, this would make an API call to your backend
  
  const mockData: Record<string, any> = {
    'tiktok.com': {
      title: 'Amazing Restaurant Experience',
      description: 'Check out this incredible dining experience at this hidden gem!',
      thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
      author: '@foodie123',
      siteName: 'TikTok',
    },
    'instagram.com': {
      title: 'Restaurant Review Post',
      description: 'Beautiful ambiance and delicious food at this local spot',
      thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      author: '@instafoodie',
      siteName: 'Instagram',
    },
    'youtube.com': {
      title: 'Restaurant Tour Video',
      description: 'Full walkthrough and review of this amazing restaurant',
      thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
      author: 'Food Vlogger',
      siteName: 'YouTube',
    },
  };

  // Detect platform
  let platform = 'default';
  if (url.includes('tiktok.com')) platform = 'tiktok.com';
  else if (url.includes('instagram.com')) platform = 'instagram.com';
  else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube.com';

  // Return mock data for the platform
  return mockData[platform] || {
    title: 'External Content',
    description: 'Content from ' + new URL(url).hostname,
    thumbnail: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    author: null,
    siteName: new URL(url).hostname,
  };
}

/**
 * Detect the source platform from a URL
 */
export function detectPlatform(url: string): 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'article' | 'other' {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
  
  // Check for common article/blog platforms
  if (lowerUrl.includes('medium.com') || 
      lowerUrl.includes('substack.com') ||
      lowerUrl.includes('wordpress.com') ||
      lowerUrl.includes('blogspot.com')) {
    return 'article';
  }
  
  return 'other';
}