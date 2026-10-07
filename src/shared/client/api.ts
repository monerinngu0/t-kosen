export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? '通信に失敗しました');
  return body as T;
}
