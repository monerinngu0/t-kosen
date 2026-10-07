import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const loginLimits = sqliteTable(
  'login_limits',
  {
    key: text('key').primaryKey(),
    window: integer('window').notNull(),
    attempts: integer('attempts').notNull(),
  },
  (t) => [index('login_limit_window').on(t.window)],
);
