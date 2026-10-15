import { useState } from 'react';
import { usePreference } from '../../../core/client/preferences';
import { japanDate } from '../../../shared/utils/date';
import { effectiveLessons } from '../shared/model';
import { useTimetable } from './useTimetable';
export function Timetable() {
  const [selected, setSelected] = usePreference('schedule', '');
  const [date, setDate] = useState(japanDate());
  // Explicit browsing can show past semesters; initial selection follows the date.
  const [browsingId, setBrowsingId] = useState('');
  const { list, summary, schedule, error, loading, refresh } = useTimetable(
    date,
    selected,
    browsingId,
  );
  const id = summary?.id;
  return (
    <section className="panel">
      <h2>時間割</h2>
      <button className="secondary" onClick={refresh}>
        更新
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
          {schedule && ' 表示中の時間割は前回取得した内容です。'}
        </p>
      )}
      {loading && <p role="status">読み込み中…</p>}
      {!loading && !list.length && !error && (
        <p className="empty">
          まだ時間割が登録されていません。管理画面からクラスと学期を登録できます。
        </p>
      )}
      {list.length > 0 && (
        <>
          <div className="controls">
            <label>
              クラス・学期
              <select
                value={id ?? ''}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setBrowsingId(e.target.value);
                }}
              >
                <option value="" disabled>
                  クラス・学期を選択してください
                </option>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.className} · {s.year}年度{' '}
                    {s.term === 'first' ? '前期' : '後期'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              日付
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value || japanDate())}
              />
            </label>
          </div>
          {schedule ? (
            <>
              <h3>{date}の授業</h3>
              {(date < schedule.start || date > schedule.end) && (
                <p className="notice">選択日はこの学期の期間外です。</p>
              )}
              <div className="lessons">
                {effectiveLessons(schedule, date).map((l) => (
                  <article
                    key={l.period}
                    className={'lesson ' + (l.kind ?? '')}
                  >
                    <span className="period">
                      {l.period}
                      <small>限</small>
                    </span>
                    <div>
                      <strong>{l.subject}</strong>
                      <p>
                        {l.teacher} {l.room && `· ${l.room}`}
                      </p>
                      {l.note && <p>{l.note}</p>}
                    </div>
                    {l.kind && (
                      <span className="badge">
                        {
                          { replace: '変更', cancel: '休講', extra: '補講' }[
                            l.kind
                          ]
                        }
                      </span>
                    )}
                  </article>
                ))}
              </div>
              {!effectiveLessons(schedule, date).length && (
                <p className="empty">この日の授業はありません。</p>
              )}
              <details>
                <summary>通常の週間時間割</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>時限</th>
                        {['月', '火', '水', '木', '金'].map((d) => (
                          <th key={d}>{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        {
                          length: Math.max(
                            4,
                            ...schedule.lessons.map((l) => l.period),
                          ),
                        },
                        (_, i) => (
                          <tr key={i}>
                            <th>{i + 1}</th>
                            {[1, 2, 3, 4, 5].map((d) => {
                              const l = schedule.lessons.find(
                                (l) => l.weekday === d && l.period === i + 1,
                              );
                              return (
                                <td key={d}>
                                  {l?.subject ?? '—'}
                                  <small>{l?.room}</small>
                                </td>
                              );
                            })}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
              <p className="muted">
                {schedule.start}〜{schedule.end} · 更新 #{schedule.revision}
              </p>
            </>
          ) : !summary && !loading ? (
            <p className="empty">
              設定したクラスの選択日の時間割は未登録または学期の期間外です。クラス・学期を選択して確認できます。
            </p>
          ) : !error ? (
            <p role="status">時間割を読み込み中…</p>
          ) : null}
        </>
      )}
    </section>
  );
}
