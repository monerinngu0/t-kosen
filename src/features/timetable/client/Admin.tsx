import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../shared/client/api';
import { japanDate } from '../../../shared/utils/date';
import { scheduleSchema, type Schedule } from '../shared/model';
import type { Summary } from './Timetable';
const initial = (): Schedule => {
  const y = Number(japanDate().slice(0, 4));
  return {
    classId: 'I1',
    className: '情報系 1年',
    year: y,
    term: 'second',
    start: `${y}-10-01`,
    end: `${y + 1}-03-31`,
    revision: 0,
    lessons: [],
    changes: [],
  };
};
type History = {
  id: string;
  revision: number;
  at: string;
  actor: string;
  data: Schedule;
};
export function Admin() {
  const [authenticated, setAuth] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [list, setList] = useState<Summary[]>([]);
  const [draft, setDraft] = useState<Schedule>(initial);
  const [history, setHistory] = useState<History[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/auth/session')
      .then(() => setAuth(true))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (authenticated)
      api<Summary[]>('/timetables')
        .then(setList)
        .catch((e) => setMessage(e.message));
  }, [authenticated]);
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setPassword('');
      setAuth(true);
      setMessage('');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load(id: string) {
    setBusy(true);
    setMessage('');
    try {
      const s = await api<Schedule>('/timetables/' + id);
      setDraft(s);
      setHistory(await api<History[]>('/timetables/' + id + '/history'));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const valid = scheduleSchema.safeParse(draft);
    if (!valid.success) {
      setMessage(valid.error.issues.map((i) => i.message).join(' / '));
      return;
    }
    setBusy(true);
    try {
      const saved = await api<Schedule & { id: string }>('/timetables', {
        method: 'PUT',
        body: JSON.stringify(valid.data),
      });
      setDraft(saved);
      setList(await api<Summary[]>('/timetables'));
      setHistory(await api<History[]>('/timetables/' + saved.id + '/history'));
      setMessage('保存しました。学生画面への反映には最大30秒かかります。');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <section className="panel">
        <p>認証を確認中…</p>
      </section>
    );
  if (!authenticated)
    return (
      <section className="panel">
        <h2>管理者ログイン</h2>
        <form onSubmit={login}>
          <label>
            管理者パスワード
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={200}
            />
          </label>
          <button disabled={busy}>ログイン</button>
        </form>
        {message && <p role="alert">{message}</p>}
      </section>
    );
  return (
    <section className="panel admin">
      <div className="section-head">
        <div>
          <h2>時間割を管理</h2>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await api('/auth/logout', { method: 'POST' });
              setAuth(false);
              setMessage('');
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          ログアウト
        </button>
      </div>
      <label>
        編集する時間割
        <select
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value === 'new') {
              setDraft(initial());
              setHistory([]);
            } else if (e.target.value) void load(e.target.value);
          }}
        >
          <option value="">選択してください</option>
          <option value="new">新しいクラス・学期</option>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.className} {s.year} {s.term === 'first' ? '前期' : '後期'}
            </option>
          ))}
        </select>
      </label>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <legend>クラスと学期</legend>
          <div className="form-grid">
            <label>
              クラスID
              <input
                required
                disabled={draft.revision > 0}
                value={draft.classId}
                onChange={(e) =>
                  setDraft({ ...draft, classId: e.target.value })
                }
              />
            </label>
            <label>
              クラス名
              <input
                required
                value={draft.className}
                onChange={(e) =>
                  setDraft({ ...draft, className: e.target.value })
                }
              />
            </label>
            <label>
              年度
              <input
                required
                type="number"
                min="2020"
                max="2100"
                disabled={draft.revision > 0}
                value={draft.year}
                onChange={(e) =>
                  setDraft({ ...draft, year: Number(e.target.value) })
                }
              />
            </label>
            <label>
              学期
              <select
                disabled={draft.revision > 0}
                value={draft.term}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    term: e.target.value as Schedule['term'],
                  })
                }
              >
                <option value="first">前期</option>
                <option value="second">後期</option>
              </select>
            </label>
            <label>
              開始日
              <input
                required
                type="date"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </label>
            <label>
              終了日
              <input
                required
                type="date"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </label>
          </div>
          <h3>通常時間割</h3>
          {draft.lessons.map((l, i) => (
            <div className="edit-row" key={l.id}>
              <label>
                曜日
                <select
                  value={l.weekday}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lessons: draft.lessons.map((x, j) =>
                        j === i ? { ...x, weekday: Number(e.target.value) } : x,
                      ),
                    })
                  }
                >
                  {['月', '火', '水', '木', '金'].map((d, n) => (
                    <option key={d} value={n + 1}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              {(['period', 'subject', 'teacher', 'room'] as const).map((k) => (
                <label key={k}>
                  {
                    {
                      period: '時限',
                      subject: '科目',
                      teacher: '教員',
                      room: '教室',
                    }[k]
                  }
                  <input
                    type={k === 'period' ? 'number' : 'text'}
                    min={1}
                    max={8}
                    required={k === 'subject' || k === 'period'}
                    value={l[k]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lessons: draft.lessons.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                [k]:
                                  k === 'period'
                                    ? Number(e.target.value)
                                    : e.target.value,
                              }
                            : x,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    lessons: draft.lessons.filter((x) => x.id !== l.id),
                  })
                }
              >
                削除
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setDraft({
                ...draft,
                lessons: [
                  ...draft.lessons,
                  {
                    id: crypto.randomUUID(),
                    weekday: 1,
                    period: 1,
                    subject: '',
                    teacher: '',
                    room: '',
                  },
                ],
              })
            }
          >
            ＋ 授業を追加
          </button>
          <h3>日付別の変更・休講・補講</h3>
          {draft.changes.map((c, i) => (
            <div className="edit-row" key={c.id}>
              <label>
                種類
                <select
                  value={c.kind}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      changes: draft.changes.map((x, j) =>
                        j === i
                          ? { ...x, kind: e.target.value as typeof c.kind }
                          : x,
                      ),
                    })
                  }
                >
                  <option value="replace">変更</option>
                  <option value="cancel">休講</option>
                  <option value="extra">補講</option>
                </select>
              </label>
              {(
                [
                  'date',
                  'period',
                  'subject',
                  'teacher',
                  'room',
                  'note',
                ] as const
              ).map((k) => (
                <label key={k}>
                  {
                    {
                      date: '日付',
                      period: '時限',
                      subject: '科目',
                      teacher: '教員',
                      room: '教室',
                      note: '備考',
                    }[k]
                  }
                  <input
                    type={
                      k === 'date' ? 'date' : k === 'period' ? 'number' : 'text'
                    }
                    min={k === 'period' ? 1 : undefined}
                    max={k === 'period' ? 8 : undefined}
                    required={
                      k === 'date' ||
                      k === 'period' ||
                      (k === 'subject' && c.kind !== 'cancel')
                    }
                    value={c[k]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        changes: draft.changes.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                [k]:
                                  k === 'period'
                                    ? Number(e.target.value)
                                    : e.target.value,
                              }
                            : x,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    changes: draft.changes.filter((x) => x.id !== c.id),
                  })
                }
              >
                削除
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setDraft({
                ...draft,
                changes: [
                  ...draft.changes,
                  {
                    id: crypto.randomUUID(),
                    date: draft.start,
                    period: 1,
                    kind: 'replace',
                    subject: '',
                    teacher: '',
                    room: '',
                    note: '',
                  },
                ],
              })
            }
          >
            ＋ 日付別変更を追加
          </button>
          <hr />
          <button type="submit">{busy ? '保存中…' : '時間割を保存'}</button>
        </fieldset>
      </form>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <h3>変更履歴</h3>
      <p className="muted">
        過去の時間割を確認できます（最新100件）。履歴は保存時に自動記録します。
      </p>
      {history.map((h) => (
        <details key={h.id}>
          <summary>
            #{h.revision} ·{' '}
            {new Date(h.at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}{' '}
            · {h.actor}
          </summary>
          <pre>{JSON.stringify(h.data, null, 2)}</pre>
        </details>
      ))}
    </section>
  );
}
