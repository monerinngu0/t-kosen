import { describe, it, expect } from 'vitest';
import {
  scheduleSchema,
  effectiveLessons,
  type Schedule,
} from '../src/features/timetable/shared/model';
import { dayType, nextBus } from '../src/features/bus/shared/model';
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
  it('出発時刻・最終便後・過去・未来', () => {
    const now = new Date('2026-10-07T07:30:00Z');
    expect(nextBus(['16:30', '18:10'], '2026-10-07', now)).toBe('16:30');
    expect(
      nextBus(['16:30', '18:10'], '2026-10-07', new Date(+now + 1000)),
    ).toBe('18:10');
    expect(
      nextBus(['16:30'], '2026-10-07', new Date('2026-10-07T10:00:00Z')),
    ).toBeNull();
    expect(nextBus(['16:30'], '2026-10-06', now)).toBeNull();
    expect(nextBus(['08:00'], '2026-10-08', now)).toBe('08:00');
  });
});
