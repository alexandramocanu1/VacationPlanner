import {DayPlan} from '../types';

export function generateDays(startDate: string, endDate: string): DayPlan[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: DayPlan[] = [];

  let current = new Date(start);
  let dayNum = 1;

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    days.push({
      id: `day_${dateStr}`,
      date: dateStr,
      dayNumber: dayNum,
      locations: [],
      travelMode: 'walking',
    });
    current.setDate(current.getDate() + 1);
    dayNum++;
  }

  return days;
}

export function formatDate(
  dateStr: string,
  format: 'short' | 'long' | 'day' = 'short',
): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (format === 'day') {
    return date.toLocaleDateString('ro-RO', {weekday: 'short', day: 'numeric'});
  }
  if (format === 'long') {
    return date.toLocaleDateString('ro-RO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
  return date.toLocaleDateString('ro-RO', {day: 'numeric', month: 'short'});
}

export function getTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function getTodayVacationDay(startDate: string): number | null {
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return null;
  return diff + 1;
}
