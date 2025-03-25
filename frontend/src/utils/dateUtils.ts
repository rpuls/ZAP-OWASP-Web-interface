/**
 * Format a date as a string in the format "YYYY-MM-DD"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

/**
 * Format a time as a string in the format "HH:MM"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
