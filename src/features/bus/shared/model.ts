import holiday from '@holiday-jp/holiday_jp';
import data from './timetable.json';
import { japanDate } from '../../../shared/utils/date';
export type DayType = 'weekday' | 'holiday';
export type BusDeparture = {
  time: string;
  stop: string;
  direction: string;
};
export type DatedBusDeparture = BusDeparture & {
  serviceDate: string;
};
type BusSchedule = Record<DayType, BusDeparture[]>;
export const busData = data;
export function dayType(date: string): DayType {
  const d = new Date(date + 'T12:00:00+09:00');
  return [0, 6].includes(d.getUTCDay()) || holiday.isHoliday(date)
    ? 'holiday'
    : 'weekday';
}
export function upcomingDepartures(
  departures: BusDeparture[],
  date: string,
  now = new Date(),
  directionQuery = '',
  limit = 5,
) {
  const today = japanDate(now);
  if (date < today || limit <= 0) return [];
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  const query = directionQuery.trim().toLocaleLowerCase('ja');
  return departures
    .filter(
      (departure) =>
        (date > today || departure.time + ':00' >= clock) &&
        (!query || departure.direction.toLocaleLowerCase('ja').includes(query)),
    )
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, limit);
}

function addDays(date: string, days: number) {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function nearestDepartures(
  schedules: BusSchedule,
  date: string,
  now = new Date(),
  directionQuery = '',
  limit = 5,
  override?: DayType,
): DatedBusDeparture[] {
  if (limit <= 0) return [];

  const todayType = override ?? dayType(date);
  const today = upcomingDepartures(
    schedules[todayType],
    date,
    now,
    directionQuery,
    limit,
  ).map((departure) => ({ ...departure, serviceDate: date }));

  if (today.length >= limit) return today;

  const tomorrowDate = addDays(date, 1);
  const tomorrowType = override ?? dayType(tomorrowDate);
  const tomorrow = upcomingDepartures(
    schedules[tomorrowType],
    tomorrowDate,
    now,
    directionQuery,
    limit - today.length,
  ).map((departure) => ({ ...departure, serviceDate: tomorrowDate }));

  return [...today, ...tomorrow];
}
