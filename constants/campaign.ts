export const DELIVERABLE_TYPES = [
  'Instagram Post',
  'Instagram Story',
  'Instagram Reel',
  'TikTok Video',
  'YouTube Video',
  'Blog Article',
  'Troodie Review',
] as const;

export const TOTAL_STEPS = 4;

export const PAYMENT_POLLING_CONFIG = {
  maxAttempts: 20,
  intervalMs: 1000,
  timeoutMs: 10000,
} as const;

