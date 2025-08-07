/**
 * Date helper utilities for formatting dates and times
 */

/**
 * Format a date to show distance from now
 * @param date - Date string or Date object
 * @returns Formatted string like "2 hours ago", "3 days ago", etc.
 */
export function formatDistanceToNow(date: string | Date): string {
  const now = new Date();
  const past = typeof date === 'string' ? new Date(date) : date;
  const diffInMs = now.getTime() - past.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  } else {
    return `${diffInYears}y ago`;
  }
}

/**
 * Format a date to a readable string
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options: {
    includeTime?: boolean;
    includeYear?: boolean;
    shortMonth?: boolean;
  } = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { includeTime = false, includeYear = true, shortMonth = false } = options;

  const months = shortMonth
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();

  let result = `${month} ${day}`;
  
  if (includeYear) {
    result += `, ${year}`;
  }
  
  if (includeTime) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    result += ` at ${displayHours}:${displayMinutes} ${period}`;
  }

  return result;
}

/**
 * Check if a date is today
 * @param date - Date string or Date object
 * @returns True if the date is today
 */
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 * @param date - Date string or Date object
 * @returns True if the date is yesterday
 */
export function isYesterday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Get a relative date string
 * @param date - Date string or Date object
 * @returns "Today", "Yesterday", or formatted date
 */
export function getRelativeDate(date: string | Date): string {
  if (isToday(date)) {
    return 'Today';
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return formatDate(date, { includeYear: false, shortMonth: true });
  }
}

/**
 * Format duration in seconds to readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration like "2:30" or "1:45:30"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Parse ISO date string to local date
 * @param isoString - ISO date string
 * @returns Date object in local timezone
 */
export function parseISOToLocal(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Get time of day greeting
 * @param date - Optional date (defaults to now)
 * @returns "Good morning", "Good afternoon", or "Good evening"
 */
export function getTimeOfDayGreeting(date?: Date): string {
  const d = date || new Date();
  const hour = d.getHours();
  
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 18) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}