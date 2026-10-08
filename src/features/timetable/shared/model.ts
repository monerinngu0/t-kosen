import { z } from 'zod';
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + 'T00:00:00Z');
    return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
  }, '有効な日付を指定してください');
export const lessonSchema = z.object({
  id: z.string().uuid(),
  weekday: z.number().int().min(1).max(5),
  period: z.number().int().min(1).max(8),
  subject: z.string().trim().min(1).max(100),
  teacher: z.string().max(100),
  room: z.string().max(100),
});
export const changeSchema = z
  .object({
    id: z.string().uuid(),
    date: dateSchema,
    period: z.number().int().min(1).max(8),
    kind: z.enum(['replace', 'cancel', 'extra']),
    subject: z.string().max(100),
    teacher: z.string().max(100),
    room: z.string().max(100),
    note: z.string().max(500),
  })
  .refine(
    (x) => x.kind === 'cancel' || x.subject.trim().length > 0,
    '科目名が必要です',
  );
export const scheduleSchema = z
  .object({
    classId: z.string().regex(/^[A-Za-z0-9_-]{1,20}$/),
    className: z.string().trim().min(1).max(50),
    year: z.number().int().min(2020).max(2100),
    term: z.enum(['first', 'second']),
    start: dateSchema,
    end: dateSchema,
    revision: z.number().int().min(0),
    lessons: z.array(lessonSchema).max(40),
    changes: z.array(changeSchema).max(500),
  })
  .superRefine((s, c) => {
    if (s.start > s.end)
      c.addIssue({
        code: 'custom',
        message: '開始日は終了日以前にしてください',
      });
    const slots = new Set<string>();
    for (const x of s.lessons) {
      const k = `${x.weekday}-${x.period}`;
      if (slots.has(k))
        c.addIssue({
          code: 'custom',
          message: '通常時間割のコマが重複しています',
        });
      slots.add(k);
    }
    const dates = new Set<string>();
    for (const x of s.changes) {
      const k = `${x.date}-${x.period}`;
      if (dates.has(k))
        c.addIssue({
          code: 'custom',
          message: '同じ日付・時限の変更が重複しています',
        });
      dates.add(k);
      if (x.date < s.start || x.date > s.end)
        c.addIssue({ code: 'custom', message: '変更日を学期内にしてください' });
    }
  });
export type Schedule = z.infer<typeof scheduleSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Change = z.infer<typeof changeSchema>;
export type ScheduleSummary = {
  id: string;
  classId: string;
  className: string;
  year: number;
  term: string;
  start: string;
  end: string;
  revision: number;
};

export function currentSchedule(
  summaries: ScheduleSummary[],
  date: string,
  preferredId: string,
): ScheduleSummary | undefined {
  const active = summaries.filter(
    (item) => item.start <= date && item.end >= date,
  );
  const preferred = summaries.find((item) => item.id === preferredId);
  return (
    active.find((item) => item.id === preferredId) ??
    active.find((item) => item.classId === preferred?.classId) ??
    active[0]
  );
}
// AI imports can produce this same draft; only reviewed drafts use the authenticated save API.
export type ScheduleDraft = Omit<Schedule, 'revision'>;
export function effectiveLessons(s: Schedule, date: string) {
  if (date < s.start || date > s.end) return [];
  const weekday = new Date(date + 'T12:00:00+09:00').getUTCDay();
  const rows = new Map<
    number,
    Lesson & { kind?: Change['kind']; note?: string }
  >();
  for (const l of s.lessons) if (l.weekday === weekday) rows.set(l.period, l);
  for (const c of s.changes)
    if (c.date === date) {
      rows.set(c.period, {
        ...c,
        weekday,
        subject: c.kind === 'cancel' ? '休講' : c.subject,
      });
    }
  return [...rows.values()].sort((a, b) => a.period - b.period);
}
