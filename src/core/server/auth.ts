import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';
import type { Env } from './env';
const name = 'tk_session';
export const sameOrigin = createMiddleware<Env>(async (c, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
    c.req.header('Origin') !== new URL(c.req.url).origin
  )
    return c.json({ error: 'Originが一致しません' }, 403);
  await next();
});
export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  if (!c.env.SESSION_SECRET || c.env.SESSION_SECRET.length < 32)
    return c.json({ error: '認証設定が未完了です' }, 503);
  try {
    const token = getCookie(c, name);
    if (!token) throw Error();
    const claims = await verify(token, c.env.SESSION_SECRET, 'HS256');
    if (claims.sub !== 'admin') throw Error();
    c.set('actor', 'admin');
  } catch {
    return c.json({ error: 'ログインが必要です' }, 401);
  }
  await next();
});
async function equal(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  return (
    new Uint8Array(x).reduce((v, n, i) => v | (n ^ new Uint8Array(y)[i]), 0) ===
    0
  );
}
export const authRoutes = new Hono<Env>();
authRoutes.use('*', sameOrigin);
authRoutes.post('/login', async (c) => {
  if (
    !c.env.ADMIN_PASSWORD ||
    c.env.ADMIN_PASSWORD.length < 16 ||
    !c.env.SESSION_SECRET ||
    c.env.SESSION_SECRET.length < 32
  )
    return c.json({ error: '認証設定が未完了です' }, 503);
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ip),
  );
  const key = Array.from(new Uint8Array(hash), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
  const window = Math.floor(Date.now() / 600000);
  // One bounded row per address; counters reset every 10 minutes, across Worker instances.
  const limit = await c.env.DB.prepare(
    `INSERT INTO login_limits(key,window,attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window=excluded.window, attempts=CASE WHEN login_limits.window=excluded.window THEN login_limits.attempts+1 ELSE 1 END RETURNING attempts`,
  )
    .bind(key, window)
    .first<{ attempts: number }>();
  if (!limit || limit.attempts > 10) {
    c.header('Retry-After', '600');
    return c.json(
      { error: 'ログイン試行が多すぎます。10分後に再試行してください' },
      429,
    );
  }
  await c.env.DB.prepare('DELETE FROM login_limits WHERE window < ?')
    .bind(window - 6)
    .run();
  const body = await c.req.json<{ password?: unknown }>();
  if (
    typeof body.password !== 'string' ||
    body.password.length > 200 ||
    !(await equal(body.password, c.env.ADMIN_PASSWORD))
  )
    return c.json({ error: 'パスワードが違います' }, 401);
  const token = await sign(
    { sub: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 },
    c.env.SESSION_SECRET,
    'HS256',
  );
  setCookie(c, name, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Strict',
    path: '/api',
    maxAge: 3600,
  });
  return c.json({ ok: true });
});
authRoutes.get('/session', requireAdmin, (c) =>
  c.json({ authenticated: true }),
);
authRoutes.post('/logout', (c) => {
  deleteCookie(c, name, { path: '/api' });
  return c.json({ ok: true });
});
