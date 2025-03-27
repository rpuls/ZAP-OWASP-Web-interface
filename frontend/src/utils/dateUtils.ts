/**
 * Format a date as a string in the format "DD-MM-YYYY"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format a time as a string in the format "HH:MM" (24-hour)
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Format full date and time in the format "DD-MM-YYYY HH:MM" (24-hour)
 */
export function formatFullDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}
