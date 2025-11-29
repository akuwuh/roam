/**
 * Time Utilities - Date/time parsing and formatting
 * PRD Phase 2 - Pure functions for time manipulation
 */

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ParsedTimeRange {
  start: string; // HH:mm
  end: string; // HH:mm
  day?: string; // ISO date
}

/**
 * Parse a natural language time range from a question
 * Examples: "between 14:00 and 17:00", "from 2pm to 5pm", "in the morning"
 */
export function parseTimeRange(question: string): ParsedTimeRange | null {
  const lowerQuestion = question.toLowerCase();

  // Try to extract explicit times
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/gi;
  const times: string[] = [];
  let match;

  while ((match = timePattern.exec(lowerQuestion)) !== null) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3]?.toLowerCase();

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    times.push(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    );
  }

  if (times.length >= 2) {
    return {
      start: times[0],
      end: times[1],
    };
  }

  // Handle natural language time references
  if (lowerQuestion.includes('morning')) {
    return { start: '08:00', end: '12:00' };
  }
  if (lowerQuestion.includes('afternoon')) {
    return { start: '12:00', end: '17:00' };
  }
  if (lowerQuestion.includes('evening')) {
    return { start: '17:00', end: '21:00' };
  }
  if (lowerQuestion.includes('night')) {
    return { start: '19:00', end: '23:00' };
  }
  if (lowerQuestion.includes('lunch')) {
    return { start: '11:30', end: '14:00' };
  }
  if (lowerQuestion.includes('dinner')) {
    return { start: '18:00', end: '21:00' };
  }

  return null;
}

/**
 * Check if two time intervals overlap
 */
export function intervalsOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Calculate duration in minutes between two timestamps
 */
export function getDurationMinutes(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
}

/**
 * Format a datetime string to human-readable format
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format just the time portion
 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format just the date portion
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get the day of week from a date string
 */
export function getDayOfWeek(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if a date is today
 */
export function isToday(iso: string): boolean {
  const date = new Date(iso);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Add days to a date
 */
export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Generate array of dates between start and end (inclusive)
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

