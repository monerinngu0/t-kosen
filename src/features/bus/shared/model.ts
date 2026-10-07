import holiday from '@holiday-jp/holiday_jp';
import data from './timetable.json';
import { japanDate } from '../../../shared/utils/date';
export type DayType = 'weekday' | 'holiday';
export const busData = data;
export function dayType(date: string): DayType {
  const d = new Date(date + 'T12:00:00+09:00');
  return [0, 6].includes(d.getUTCDay()) || holiday.isHoliday(date)
    ? 'holiday'
    : 'weekday';
}
export function nextBus(times: string[], date: string, now = new Date()) {
  const today = japanDate(now);
  if (date < today) return null;
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  return times.find((t) => date > today || t + ':00' >= clock) ?? null;
}
