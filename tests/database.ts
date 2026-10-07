import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
export async function database() {
  const runtime = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-08-01',
    d1Databases: ['DB'],
  });
  const db = await runtime.getD1Database('DB');
  for (const file of readdirSync('migrations')
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync('migrations/' + file, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint'))
      if (statement.trim()) await db.prepare(statement).run();
  }
  return { runtime, db: db as unknown as D1Database };
}
