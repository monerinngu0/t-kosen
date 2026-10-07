import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from '../core/server/env';
import { authRoutes } from '../core/server/auth';
import { serverFeatures } from '../core/server/features';
export const app = new Hono<Env>();
app.use('*', secureHeaders());
app.use(
  '/api/*',
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (c) => c.json({ error: 'リクエストが大きすぎます' }, 413),
  }),
);
app.use('/api/auth/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.route('/api/auth', authRoutes);
for (const f of serverFeatures) app.route(f.path, f.routes);
app.get('/api/health', (c) => c.json({ ok: true }));
app.notFound((c) => c.json({ error: 'APIが見つかりません' }, 404));
app.onError((e, c) => {
  if (e instanceof SyntaxError)
    return c.json({ error: 'JSON形式が不正です' }, 400);
  console.error('API error', e.message);
  return c.json({ error: '処理に失敗しました' }, 500);
});
export default app;
