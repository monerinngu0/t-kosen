import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: [
    './src/features/timetable/server/schema.ts',
    './src/core/server/schema.ts',
  ],
  out: './migrations',
  dialect: 'sqlite',
});
