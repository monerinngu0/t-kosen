import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const schedules = sqliteTable(
  'schedules',
  {
    id: text('id').primaryKey(),
    classId: text('class_id').notNull(),
    className: text('class_name').notNull(),
    year: integer('year').notNull(),
    term: text('term').notNull(),
    start: text('start').notNull(),
    end: text('end').notNull(),
    revision: integer('revision').notNull(),
    data: text('data').notNull(),
  },
  (t) => [uniqueIndex('schedule_scope').on(t.classId, t.year, t.term)],
);
export const history = sqliteTable(
  'history',
  {
    id: text('id').primaryKey(),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => schedules.id),
    revision: integer('revision').notNull(),
    at: text('at').notNull(),
    actor: text('actor').notNull(),
    data: text('data').notNull(),
  },
  (t) => [uniqueIndex('history_revision').on(t.scheduleId, t.revision)],
);
