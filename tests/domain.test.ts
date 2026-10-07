import { describe, it, expect } from 'vitest';
import {
  scheduleSchema,
  effectiveLessons,
  type Schedule,
} from '../src/features/timetable/shared/model';
import {
  dayType,
  upcomingDepartures,
  type BusDeparture,
} from '../src/features/bus/shared/model';
import { japanDate } from '../src/shared/utils/date';
const s: Schedule = {
  classId: 'I1',
  className: 'I1',
  year: 2026,
  term: 'second',
  start: '2026-10-01',
  end: '2027-03-31',
  revision: 0,
  lessons: [
    {
      id: 'a24e9c22-3ecb-4a11-9150-70789c5df2e8',
      weekday: 1,
      period: 1,
      subject: '数学',
      teacher: '',
      room: '',
    },
  ],
  changes: [],
};
describe('時間割', () => {
  it('通常授業・変更・休講・週末補講を合成する', () => {
    expect(effectiveLessons(s, '2026-10-05')[0].subject).toBe('数学');
    const change = {
      id: crypto.randomUUID(),
      date: '2026-10-05',
      period: 1,
      kind: 'cancel' as const,
      subject: '',
      teacher: '',
      room: '',
      note: '先生不在',
    };
    expect(
      effectiveLessons({ ...s, changes: [change] }, change.date)[0].subject,
    ).toBe('休講');
    expect(
      effectiveLessons(
        { ...s, changes: [{ ...change, kind: 'replace', subject: '英語' }] },
        change.date,
      )[0].subject,
    ).toBe('英語');
    expect(
      effectiveLessons(
        {
          ...s,
          changes: [
            { ...change, date: '2026-10-10', kind: 'extra', subject: '補講' },
          ],
        },
        '2026-10-10',
      )[0].subject,
    ).toBe('補講');
    expect(effectiveLessons(s, '2026-10-10')).toEqual([]);
    expect(effectiveLessons(s, '2026-09-28')).toEqual([]);
  });
  it('日付・重複コマ・学期外を拒否する', () => {
    expect(scheduleSchema.safeParse(s).success).toBe(true);
    expect(
      scheduleSchema.safeParse({ ...s, start: '2026-02-30' }).success,
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({ ...s, lessons: [...s.lessons, ...s.lessons] })
        .success,
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({
        ...s,
        changes: [
          {
            id: crypto.randomUUID(),
            date: '2028-01-01',
            period: 1,
            kind: 'extra',
            subject: '数学',
            teacher: '',
            room: '',
            note: '',
          },
        ],
      }).success,
    ).toBe(false);
  });
});
describe('バス', () => {
  it('JSTの日付と祝日・土日判定', () => {
    expect(japanDate(new Date('2026-10-06T16:00:00Z'))).toBe('2026-10-07');
    expect(dayType('2026-10-07')).toBe('weekday');
    expect(dayType('2026-10-10')).toBe('holiday');
    expect(dayType('2026-10-12')).toBe('holiday');
  });
  it('全方面から近い順に5件を返し、方面で検索する', () => {
    const departures: BusDeparture[] = [
      { time: '18:10', stop: '学校前', direction: '富山駅方面' },
      { time: '16:45', stop: '正門前', direction: '高岡駅方面' },
      { time: '16:30', stop: '学校前', direction: '富山駅方面' },
      { time: '17:20', stop: '学校前', direction: '小杉駅方面' },
      { time: '18:25', stop: '正門前', direction: '高岡駅方面' },
      { time: '19:00', stop: '北門前', direction: '岩瀬浜方面' },
    ];
    const now = new Date('2026-10-07T07:30:00Z');
    expect(
      upcomingDepartures(departures, '2026-10-07', now).map((x) => x.time),
    ).toEqual(['16:30', '16:45', '17:20', '18:10', '18:25']);
    expect(
      upcomingDepartures(departures, '2026-10-07', now, '高岡').map(
        (x) => x.time,
      ),
    ).toEqual(['16:45', '18:25']);
    expect(
      upcomingDepartures(departures, '2026-10-07', new Date(+now + 1000))[0]
        .time,
    ).toBe('16:45');
    expect(upcomingDepartures(departures, '2026-10-06', now)).toEqual([]);
    expect(
      upcomingDepartures(departures, '2026-10-08', now, '', 1)[0].time,
    ).toBe('16:30');
  });
});
