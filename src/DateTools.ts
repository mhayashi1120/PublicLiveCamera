/**
 * Wrapper module
 */

const dateFormat = require('date-format');

export function formatDate(date: Date, fmt: string): string {
  return dateFormat.asString(fmt, date);
}

/**
 * Tools handle add seconds to basis date.
 */
export function incSeconds(seconds: number, basis: Date = new Date()): Date {
  const d = new Date(basis.getTime() + (seconds * 1000));

  return d;
}

/**
 * Tools handle add minutes to basis date.
 */
export function incMinutes(minutes: number, basis: Date = new Date()): Date {
  return incSeconds((minutes * 60), basis);
}

/**
 * Tools handle add hours to basis date.
 */
export function incHours(hours: number, basis: Date = new Date()): Date {
  return incSeconds((hours * 60 * 60), basis);
}

/**
 * Tools handle add days to basis date.
 */
export function incDays(days: number, basis: Date = new Date()): Date {
  return incSeconds((days * 24 * 60 * 60), basis);
}

export const constructDate = incSeconds;

/**
 * compare time string serialized by Date.toISOString()
 */
export function compareTimeString(s1At: string, s2At: string): number {
  const s1Time = new Date(s1At);
  const s2Time = new Date(s2At);

  return compareTime(s1Time, s2Time);
}

/**
 * compare time
 */
export function compareTime(s1Time: Date, s2Time: Date): number {
  if (s1Time.getTime() < s2Time.getTime()) {
    return -1;
  }

  if (s1Time.getTime() > s2Time.getTime()) {
    return 1;
  }

  return 0;
}
