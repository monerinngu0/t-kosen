import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { app } from '../src/app/worker';
import { database } from './database';
import type { Schedule } from '../src/features/timetable/shared/model';
let resources: Awaited<ReturnType<typeof database>>;
const env = {
  ADMIN_PASSWORD: 'test-password-long-enough',
  SESSION_SECRET: 'b'.repeat(48),
  DB: {} as D1Database,
};
let cookie = '';
beforeAll(async () => {
  resources = await database();
  env.DB = resources.db;
  const r = await app.request(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { Origin: 'http://localhost' },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    },
    env,
  );
  cookie = r.headers.get('set-cookie')!.split(';')[0];
});
afterAll(async () => {
  await resources?.runtime.dispose();
});
const s: Schedule = {
  classId: 'I1',
  className: '情報1年',
  year: 2026,
  term: 'second',
  start: '2026-10-01',
  end: '2027-03-31',
  revision: 0,
  lessons: [],
  changes: [],
};
function save(data: Schedule) {
  return app.request(
    '/api/timetables',
    {
      method: 'PUT',
      headers: { Origin: 'http://localhost', Cookie: cookie },
      body: JSON.stringify(data),
    },
    env,
  );
}
describe('実D1での時間割保存', () => {
  it('認証・検証・新規・更新・競合・履歴', async () => {
    expect(
      (
        await app.request(
          '/api/timetables',
          {
            method: 'PUT',
            headers: { Origin: 'http://localhost' },
            body: JSON.stringify(s),
          },
          env,
        )
      ).status,
    ).toBe(401);
    expect((await save({ ...s, start: 'invalid' })).status).toBe(400);
    const created = await save(s);
    expect(created.status).toBe(200);
    expect(((await created.json()) as Schedule).revision).toBe(1);
    expect((await save(s)).status).toBe(409);
    expect(
      (await save({ ...s, revision: 1, className: '新しい名前' })).status,
    ).toBe(200);
    expect((await save({ ...s, revision: 1 })).status).toBe(409);
    const rows = (await (
      await app.request('/api/timetables', {}, env)
    ).json()) as { id: string }[];
    expect(rows).toHaveLength(1);
    const result = (await (
      await app.request('/api/timetables/' + rows[0].id, {}, env)
    ).json()) as Schedule;
    expect(result.className).toBe('新しい名前');
    expect(result.revision).toBe(2);
    const response = await app.request(
      '/api/timetables/' + rows[0].id + '/history',
      { headers: { Cookie: cookie } },
      env,
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    const history = (await response.json()) as {
      revision: number;
      data: Schedule;
    }[];
    expect(history.map((h) => h.revision)).toEqual([2, 1]);
    expect(history[1].data.className).toBe('情報1年');
    expect((await app.request('/api/timetables/missing', {}, env)).status).toBe(
      404,
    );
  });
  it('ログイン試行をD1で制限する', async () => {
    for (let i = 0; i < 10; i++) {
      expect(
        (
          await app.request(
            '/api/auth/login',
            {
              method: 'POST',
              headers: {
                Origin: 'http://localhost',
                'CF-Connecting-IP': '192.0.2.1',
              },
              body: JSON.stringify({ password: 'wrong' }),
            },
            env,
          )
        ).status,
      ).toBe(401);
    }
    expect(
      (
        await app.request(
          '/api/auth/login',
          {
            method: 'POST',
            headers: {
              Origin: 'http://localhost',
              'CF-Connecting-IP': '192.0.2.1',
            },
            body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
          },
          env,
        )
      ).status,
    ).toBe(429);
  });
});
