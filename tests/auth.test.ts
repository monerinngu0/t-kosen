import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { database } from './database';
let runtime: Awaited<ReturnType<typeof database>>['runtime'];
beforeAll(async () => {
  const result = await database();
  env.DB = result.db;
  runtime = result.runtime;
});
afterAll(async () => {
  await runtime?.dispose();
});
import { app } from '../src/app/worker';
import { sign } from 'hono/jwt';
const env = {
  ADMIN_PASSWORD: 'test-password-long-enough',
  SESSION_SECRET: 'a'.repeat(48),
  DB: {} as D1Database,
};
const origin = 'http://localhost';
describe('管理者認証', () => {
  it('未認証APIアクセスを拒否する', async () => {
    const r = await app.request('/api/timetables/x/history', {}, env);
    expect(r.status).toBe(401);
  });
  it('外部Origin・パスワード誤り・不正JSONを拒否する', async () => {
    expect(
      (
        await app.request(
          '/api/auth/login',
          {
            method: 'POST',
            headers: { Origin: 'https://evil.test' },
            body: '{}',
          },
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(
          '/api/auth/login',
          {
            method: 'POST',
            headers: { Origin: origin },
            body: JSON.stringify({ password: 'wrong' }),
          },
          env,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await app.request(
          '/api/auth/login',
          { method: 'POST', headers: { Origin: origin }, body: '{' },
          env,
        )
      ).status,
    ).toBe(400);
  });
  it('ログインCookieとセッション・ログアウト', async () => {
    const r = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { Origin: origin },
        body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
      },
      env,
    );
    expect(r.status).toBe(200);
    const cookie = r.headers.get('set-cookie')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(
      (
        await app.request(
          '/api/auth/session',
          { headers: { Cookie: cookie.split(';')[0] } },
          env,
        )
      ).status,
    ).toBe(200);
    const logout = await app.request(
      '/api/auth/logout',
      { method: 'POST', headers: { Origin: origin } },
      env,
    );
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
  });
  it('期限切れ・改ざん・未設定を拒否', async () => {
    const token = await sign(
      { sub: 'admin', exp: 1 },
      env.SESSION_SECRET,
      'HS256',
    );
    expect(
      (
        await app.request(
          '/api/auth/session',
          { headers: { Cookie: `tk_session=${token}` } },
          env,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await app.request(
          '/api/auth/session',
          { headers: { Cookie: 'tk_session=bad' } },
          env,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await app.request(
          '/api/auth/session',
          {},
          { ...env, SESSION_SECRET: '' },
        )
      ).status,
    ).toBe(503);
  });
  it('サイズ超過と未知のAPI', async () => {
    expect(
      (
        await app.request(
          '/api/auth/login',
          {
            method: 'POST',
            headers: { Origin: origin },
            body: 'x'.repeat(300000),
          },
          env,
        )
      ).status,
    ).toBe(413);
    expect((await app.request('/api/missing', {}, env)).status).toBe(404);
  });
});
