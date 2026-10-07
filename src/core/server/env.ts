export type Env = {
  Bindings: { DB: D1Database; ADMIN_PASSWORD: string; SESSION_SECRET: string };
  Variables: { actor: string };
};
