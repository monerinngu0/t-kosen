import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, desc } from 'drizzle-orm';
import type { Env } from '../../../core/server/env';
import { requireAdmin, sameOrigin } from '../../../core/server/auth';
import { scheduleSchema } from '../shared/model';
import { schedules, history } from './schema';
export const timetableRoutes = new Hono<Env>();
timetableRoutes.get('/', async (c) => {
  const rows = await drizzle(c.env.DB)
    .select({
      id: schedules.id,
      classId: schedules.classId,
      className: schedules.className,
      year: schedules.year,
      term: schedules.term,
      start: schedules.start,
      end: schedules.end,
      revision: schedules.revision,
    })
    .from(schedules)
    .orderBy(desc(schedules.year));
  c.header('Cache-Control', 'public, max-age=30');
  return c.json(rows);
});
timetableRoutes.get('/:id', async (c) => {
  const [row] = await drizzle(c.env.DB)
    .select()
    .from(schedules)
    .where(eq(schedules.id, c.req.param('id')));
  if (!row) return c.json({ error: '時間割がありません' }, 404);
  c.header('Cache-Control', 'public, max-age=30');
  return c.json({ id: row.id, ...JSON.parse(row.data) });
});
timetableRoutes.get('/:id/history', requireAdmin, async (c) => {
  const rows = await drizzle(c.env.DB)
    .select()
    .from(history)
    .where(eq(history.scheduleId, c.req.param('id')))
    .orderBy(desc(history.revision))
    .limit(100);
  c.header('Cache-Control', 'no-store');
  return c.json(rows.map((r) => ({ ...r, data: JSON.parse(r.data) })));
});
timetableRoutes.use('*', sameOrigin);
timetableRoutes.put('/', requireAdmin, async (c) => {
  const parsed = scheduleSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: parsed.error.issues.map((i) => i.message).join(' / ') },
      400,
    );
  const s = parsed.data;
  const id = `${s.classId}-${s.year}-${s.term}`;
  const db = drizzle(c.env.DB);
  const value = { ...s, revision: s.revision + 1 };
  const row = {
    id,
    classId: s.classId,
    className: s.className,
    year: s.year,
    term: s.term,
    start: s.start,
    end: s.end,
    revision: value.revision,
    data: JSON.stringify(value),
  };
  // Compare-and-swap plus SQLite audit trigger: snapshot and revision change are atomic.
  if (s.revision === 0) {
    const inserted = await db
      .insert(schedules)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: schedules.id });
    if (!inserted.length)
      return c.json(
        { error: '他の管理者が更新しました。再読込してください' },
        409,
      );
  } else {
    const updated = await db
      .update(schedules)
      .set(row)
      .where(and(eq(schedules.id, id), eq(schedules.revision, s.revision)))
      .returning({ id: schedules.id });
    if (!updated.length)
      return c.json(
        { error: '他の管理者が更新しました。再読込してください' },
        409,
      );
  }
  return c.json({ id, ...value });
});
