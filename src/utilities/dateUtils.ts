/**
 * Utility functions for handling dates, times, and formatting.
 */

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(timestamp: number | null): string {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // convert 0 to 12
  const minutesStr = String(minutes).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutesStr} ${ampm}`;
}

export function formatDatePretty(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

/**
 * Calculates late arrival status based on target start time and grace minutes.
 */
export function calculateLateStatus(tapInTimeMs: number, shiftStartStr: string, graceMinutes: number): boolean {
  if (!shiftStartStr || typeof shiftStartStr !== 'string') return false;
  const parts = shiftStartStr.split(':');
  if (parts.length < 2) return false;
  const [shiftHour, shiftMin] = parts.map(Number);
  
  const targetDate = new Date(tapInTimeMs);
  targetDate.setHours(shiftHour, shiftMin, 0, 0);
  
  // Late is if they tap in past the shift start plus grace minutes
  const limitTime = targetDate.getTime() + (graceMinutes * 60 * 1000);
  return tapInTimeMs > limitTime;
}

/**
 * Calculates early exit status based on target end time.
 */
export function calculateEarlyExitStatus(tapOutTimeMs: number, shiftEndStr: string): boolean {
  if (!shiftEndStr || typeof shiftEndStr !== 'string') return false;
  const parts = shiftEndStr.split(':');
  if (parts.length < 2) return false;
  const [shiftHour, shiftMin] = parts.map(Number);
  
  const targetDate = new Date(tapOutTimeMs);
  targetDate.setHours(shiftHour, shiftMin, 0, 0);
  
  return tapOutTimeMs < targetDate.getTime();
}
