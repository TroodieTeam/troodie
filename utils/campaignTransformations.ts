import { Deliverable } from '@/types/campaign';

export function expandDeliverables(deliverables: Deliverable[]) {
  const expanded = deliverables.flatMap((deliverable) => {
    return Array.from({ length: deliverable.quantity }, (_, index) => ({
      index: index + 1,
      type: deliverable.type,
      description: deliverable.description,
      platform: deliverable.type.toLowerCase().includes('instagram')
        ? 'instagram'
        : deliverable.type.toLowerCase().includes('tiktok')
          ? 'tiktok'
          : deliverable.type.toLowerCase().includes('youtube')
            ? 'youtube'
            : deliverable.type.toLowerCase().includes('facebook')
              ? 'facebook'
              : deliverable.type.toLowerCase().includes('twitter')
                ? 'twitter'
                : undefined,
      content_type: deliverable.type.toLowerCase().includes('reel')
        ? 'reel'
        : deliverable.type.toLowerCase().includes('story')
          ? 'story'
          : deliverable.type.toLowerCase().includes('video')
            ? 'video'
            : deliverable.type.toLowerCase().includes('article')
              ? 'article'
              : 'post',
      required: true,
    }));
  });

  // Re-index deliverables sequentially across all types
  return expanded.map((deliverable, index) => ({
    ...deliverable,
    index: index + 1,
  }));
}

export function formatEndDate(deadline: string): string {
  if (!deadline || deadline.trim() === '') {
    throw new Error('Deadline is required');
  }

  // Parse the date-only string (YYYY-MM-DD) and convert to ISO string
  // Set to end of day UTC for consistency
  const [year, month, day] = deadline.split('-').map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return endDate.toISOString();
}

export function convertBudgetToCents(budget: string): number {
  return Math.round(parseFloat(budget) * 100);
}
