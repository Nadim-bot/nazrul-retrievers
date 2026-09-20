/**
 * Nazrul Retrievers - JKKNIU Lost & Found System
 * Highly Polished Date & Relative Time Helper Utilities
 */

/**
 * Formats a given ISO date string or Date object into a relative time-ago string
 * (e.g., "Just now", "45 mins ago", "2 hours ago", "Yesterday", "3 days ago")
 * or an exact readable date if it is older than 7 days (e.g., "09 Jul 2026").
 */
export function formatPostTime(input: string | Date | undefined | null, fallbackDate?: string | Date | null): string {
  let target = input;
  // If target is a static placeholder string, prefer fallbackDate if provided
  if (typeof target === 'string') {
    const lower = target.trim().toLowerCase();
    if ((lower === 'just now' || lower === 'recently') && fallbackDate) {
      target = fallbackDate;
    }
  }

  if (!target) {
    if (fallbackDate) target = fallbackDate;
    else return 'Recently';
  }

  const d = new Date(target);
  if (isNaN(d.getTime())) {
    // If not parseable as date, return original string as fallback
    return typeof target === 'string' ? target : 'Recently';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  // Handle future dates or extremely small differences safely
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Fallback to exact date format (e.g., "09 Jul 2026")
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}
