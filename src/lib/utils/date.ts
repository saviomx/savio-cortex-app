/**
 * Date formatting utilities
 * Centralized date/time formatting functions for consistent display across the app
 */

/**
 * Format a timestamp for display in lists (leads, conversations)
 * - Within 2 minutes: "just now"
 * - Within 24 hours: time only (e.g., "10:30 AM")
 * - Yesterday: "Yesterday"
 * - Older: date (e.g., "Jan 15")
 */
export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = diffMs / (1000 * 60 * 60);

    // Within 2 minutes: "just now"
    if (diffMins < 2) {
      return 'just now';
    }

    // Within last 24 hours: show time only
    if (diffHours < 24) {
      return formatTime(date);
    }

    // Yesterday (24-48 hours ago)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Older: show date
    return formatShortDate(date);
  } catch {
    return '';
  }
}

/**
 * Format time only (e.g., "10:30 AM")
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format short date (e.g., "Jan 15")
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date divider for chat messages (WhatsApp style)
 * - Today: "Today"
 * - Yesterday: "Yesterday"
 * - Within 7 days: weekday name (e.g., "Monday")
 * - Older: full date (e.g., "January 15" or "January 15, 2024")
 */
export function formatDateDivider(timestamp: string | null | undefined): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();

    // Today
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Within last 7 days: show weekday
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    // Older: show full date
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
    };

    // Add year if different from current year
    if (date.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
  } catch {
    return '';
  }
}

/**
 * Check if a date divider should be shown between two messages
 */
export function shouldShowDateDivider(
  currentTimestamp: string | null | undefined,
  previousTimestamp: string | null | undefined
): boolean {
  if (!currentTimestamp) return false;
  if (!previousTimestamp) return true; // First message always shows divider

  try {
    const currentDate = new Date(currentTimestamp);
    const prevDate = new Date(previousTimestamp);

    if (isNaN(currentDate.getTime()) || isNaN(prevDate.getTime())) {
      return false;
    }

    // Show divider if dates are different
    return currentDate.toDateString() !== prevDate.toDateString();
  } catch {
    return false;
  }
}

/**
 * Format chat bubble timestamp
 * For messages inside a conversation - simple time display
 * - Within 1 minute: "just now"
 * - Otherwise: time only (e.g., "10:30 AM")
 */
export function formatChatBubbleTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    // Within 1 minute: "just now"
    if (diffSecs < 60) {
      return 'just now';
    }

    // Otherwise: just show the time
    return formatTime(date);
  } catch {
    return '';
  }
}

/**
 * Format a full datetime for display (e.g., "Jan 15, 2024 at 10:30 AM")
 */
export function formatFullDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}
