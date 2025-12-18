# Improve Deliverable URL Validation

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.6

## Overview

The current URL validation for deliverable submissions is too strict and may reject valid social media URLs. The validation only accepts specific URL patterns and misses newer formats, international domains, and edge cases.

## Business Value

- **Creator Experience**: Creators frustrated when valid content URLs are rejected
- **Revenue Impact**: Failed submissions delay campaign completion and payments
- **Platform Flexibility**: Social media platforms frequently change URL formats

## Current Problem

```typescript
// Location: services/deliverableSubmissionService.ts:66-112

// Instagram - Missing patterns
if (hostname.includes('instagram.com')) {
  if (urlObj.pathname.includes('/p/') ||
      urlObj.pathname.includes('/reel/') ||
      urlObj.pathname.includes('/stories/')) {
    // MISSING: /tv/, /share/, future formats
  }
}

// TikTok - May miss international domains
if (hostname.includes('tiktok.com')) {
  // MISSING: vm.tiktok.com, tiktok.com/@user (profile links)
}
```

**Missing URL patterns:**
- Instagram: `/tv/`, `/share/`, links with `?igsh=` params
- TikTok: `vm.tiktok.com`, regional domains
- YouTube: `/live/`, YouTube Shorts via `youtube.com/shorts/`
- Twitter/X: Mobile URLs (`mobile.twitter.com`)
- Threads: `threads.net` (new platform)

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Flexible Deliverable URL Validation
  As a creator submitting deliverables
  I want my valid social media URLs accepted
  So that I can complete campaigns without frustration

  Scenario: Valid Instagram post URL
    Given I submit an Instagram URL
    When the URL is "https://www.instagram.com/p/ABC123/"
    Then validation passes
    And platform is detected as "instagram"

  Scenario: Instagram Reel with query params
    Given I submit an Instagram Reel URL
    When the URL is "https://www.instagram.com/reel/ABC123/?igsh=xyz"
    Then validation passes
    And platform is detected as "instagram"

  Scenario: TikTok shortened URL
    Given I submit a TikTok shortened URL
    When the URL is "https://vm.tiktok.com/ABC123/"
    Then validation passes
    And platform is detected as "tiktok"

  Scenario: YouTube Shorts
    Given I submit a YouTube Shorts URL
    When the URL is "https://youtube.com/shorts/ABC123"
    Then validation passes
    And platform is detected as "youtube"

  Scenario: Threads post
    Given I submit a Threads URL
    When the URL is "https://www.threads.net/@user/post/ABC123"
    Then validation passes
    And platform is detected as "threads"

  Scenario: Unsupported platform with warning
    Given I submit an unsupported platform URL
    When the URL is "https://example.com/post/123"
    Then validation passes with warning
    And platform is detected as "other"
    And user sees "Platform not auto-detected. Please verify the link works."
```

## Technical Implementation

### Updated URL Validation

```typescript
// services/deliverableSubmissionService.ts

export type SupportedPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'threads'
  | 'linkedin'
  | 'other';

interface ValidationResult {
  valid: boolean;
  platform: SupportedPlatform;
  warning?: string;
  error?: string;
}

// Platform detection patterns
const PLATFORM_PATTERNS: Record<SupportedPlatform, RegExp[]> = {
  instagram: [
    /instagram\.com\/(p|reel|reels|tv|stories|share)\//i,
    /instagram\.com\/[^\/]+\/(p|reel)\//i,
    /instagr\.am\//i,
  ],
  tiktok: [
    /tiktok\.com\/@[^\/]+\/video\//i,
    /tiktok\.com\/t\//i,
    /vm\.tiktok\.com\//i,
    /tiktok\.com\/@[^\/]+$/i, // Profile with video
  ],
  youtube: [
    /youtube\.com\/watch/i,
    /youtube\.com\/shorts\//i,
    /youtube\.com\/live\//i,
    /youtu\.be\//i,
    /youtube\.com\/embed\//i,
  ],
  twitter: [
    /twitter\.com\/[^\/]+\/status\//i,
    /x\.com\/[^\/]+\/status\//i,
    /mobile\.twitter\.com\/[^\/]+\/status\//i,
  ],
  facebook: [
    /facebook\.com\/.+\/posts\//i,
    /facebook\.com\/watch\//i,
    /facebook\.com\/reel\//i,
    /fb\.watch\//i,
    /fb\.com\//i,
  ],
  threads: [
    /threads\.net\/@[^\/]+\/post\//i,
    /threads\.net\/t\//i,
  ],
  linkedin: [
    /linkedin\.com\/posts\//i,
    /linkedin\.com\/feed\/update\//i,
  ],
  other: [], // Fallback
};

export function validateSocialMediaUrl(url: string): ValidationResult {
  // Basic URL validation
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return {
      valid: false,
      platform: 'other',
      error: 'Invalid URL format. Please enter a valid URL starting with https://',
    };
  }

  // Require HTTPS
  if (urlObj.protocol !== 'https:') {
    return {
      valid: false,
      platform: 'other',
      error: 'URL must use HTTPS',
    };
  }

  // Detect platform
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platform === 'other') continue;

    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return {
          valid: true,
          platform: platform as SupportedPlatform,
        };
      }
    }
  }

  // Check if it's a known social media domain but unrecognized format
  const knownDomains = [
    'instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be',
    'twitter.com', 'x.com', 'facebook.com', 'fb.com',
    'threads.net', 'linkedin.com',
  ];

  const isKnownDomain = knownDomains.some(domain =>
    urlObj.hostname.includes(domain)
  );

  if (isKnownDomain) {
    // Known platform but unknown format - allow with warning
    return {
      valid: true,
      platform: detectPlatformFromDomain(urlObj.hostname),
      warning: 'URL format not recognized. Please verify the link is to a specific post.',
    };
  }

  // Unknown platform - allow but warn
  return {
    valid: true,
    platform: 'other',
    warning: 'Platform not auto-detected. Please verify the link works and is publicly accessible.',
  };
}

function detectPlatformFromDomain(hostname: string): SupportedPlatform {
  if (hostname.includes('instagram')) return 'instagram';
  if (hostname.includes('tiktok')) return 'tiktok';
  if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'youtube';
  if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('facebook') || hostname.includes('fb.')) return 'facebook';
  if (hostname.includes('threads')) return 'threads';
  if (hostname.includes('linkedin')) return 'linkedin';
  return 'other';
}

// URL accessibility check (optional, can be slow)
export async function checkUrlAccessibility(url: string): Promise<{
  accessible: boolean;
  warning?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 200, 301, 302 = accessible
    // 403 = may require login but likely exists
    // 404 = not found
    if (response.ok || response.status === 403) {
      return { accessible: true };
    }

    if (response.status === 404) {
      return {
        accessible: false,
        warning: 'This URL may not exist. Please double-check the link.'
      };
    }

    return { accessible: true }; // Other statuses, assume OK
  } catch {
    // Network error or timeout - don't block submission
    return {
      accessible: true,
      warning: 'Could not verify URL accessibility. Please ensure the link is correct.'
    };
  }
}
```

### Update Submission UI

```typescript
// In deliverable submission component

const [urlWarning, setUrlWarning] = useState<string | null>(null);

const handleUrlChange = (url: string) => {
  setPostUrl(url);

  if (url.length > 10) {
    const result = validateSocialMediaUrl(url);
    if (!result.valid) {
      setUrlError(result.error || 'Invalid URL');
      setUrlWarning(null);
    } else {
      setUrlError(null);
      setUrlWarning(result.warning || null);
      setPlatform(result.platform);
    }
  }
};

// In render
{urlWarning && (
  <View style={styles.warningBanner}>
    <AlertTriangle size={16} color="#F59E0B" />
    <Text style={styles.warningText}>{urlWarning}</Text>
  </View>
)}
```

### Files to Modify

1. **Update**: `services/deliverableSubmissionService.ts` - New validation logic
2. **Update**: Deliverable submission UI components
3. **Add**: Warning UI component for soft validation failures

## Definition of Done

- [ ] URL validation accepts all common social media URL formats
- [ ] New platforms supported: Threads, LinkedIn
- [ ] Unknown but valid URLs allowed with warning
- [ ] Clear error messages for invalid URLs
- [ ] Warning banner for unrecognized formats
- [ ] Platform auto-detection for all supported platforms
- [ ] Unit tests for all URL patterns
- [ ] Manual test: submit URLs from each platform

## Test Cases

```typescript
describe('validateSocialMediaUrl', () => {
  // Instagram
  it('accepts Instagram post', () => { /* /p/ABC */ });
  it('accepts Instagram reel', () => { /* /reel/ABC */ });
  it('accepts Instagram reel with params', () => { /* /reel/ABC/?igsh=xyz */ });
  it('accepts Instagram TV', () => { /* /tv/ABC */ });

  // TikTok
  it('accepts TikTok video', () => { /* /@user/video/123 */ });
  it('accepts TikTok shortened', () => { /* vm.tiktok.com/ABC */ });

  // YouTube
  it('accepts YouTube watch', () => { /* /watch?v=ABC */ });
  it('accepts YouTube shorts', () => { /* /shorts/ABC */ });
  it('accepts youtu.be', () => { /* youtu.be/ABC */ });

  // Twitter/X
  it('accepts twitter status', () => { /* /user/status/123 */ });
  it('accepts x.com status', () => { /* x.com/user/status/123 */ });

  // New platforms
  it('accepts Threads post', () => { /* threads.net/@user/post/123 */ });
  it('accepts LinkedIn post', () => { /* linkedin.com/posts/123 */ });

  // Edge cases
  it('allows unknown URLs with warning', () => {});
  it('rejects non-HTTPS', () => {});
  it('rejects invalid URLs', () => {});
});
```

## Notes

- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.6
- Prefer allowing URLs with warnings over blocking valid content
- Social platforms change URL formats frequently - design for flexibility
- Consider periodic review of URL patterns as platforms evolve
