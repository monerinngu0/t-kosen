import { useEffect, useState } from 'react';
import { japanDate } from '../../../shared/utils/date';
import { usePreference } from '../../../core/client/preferences';
import { effectiveLessons } from '../../timetable/shared/model';
import { useTimetable } from '../../timetable/client/useTimetable';
import { busData, nearestDepartures } from '../../bus/shared/model';

export function Home() {
  const [now, setNow] = useState(() => new Date());
  const [preferred, setPreferred] = usePreference('schedule', '');
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const updateClock = () => setNow(new Date());
    window.addEventListener('focus', updateClock);
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', updateClock);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);

  const date = japanDate(now);
  const { summary, schedule, error, loading, refresh } = useTimetable(
    date,
    preferred,
  );
  const scheduleId = summary?.id;
  const lessons = schedule ? effectiveLessons(schedule, date) : [];
  const buses = nearestDepartures(busData.departures, date, now);

  return (
    <div className="home-sections">
      <section className="panel home-panel" aria-labelledby="today-title">
        <div className="home-section-title">
          <div>
            <h2 id="today-title">今日の授業</h2>
            <p>
              {date}
              {summary ? ` · ${summary.className}` : ''}
            </p>
          </div>
          <a
            href="#timetable"
            onClick={() => {
              if (scheduleId) setPreferred(scheduleId);
            }}
          >
            時間割へ <span aria-hidden="true">›</span>
          </a>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="secondary" onClick={refresh}>
          更新
        </button>
        {!error && loading && <p role="status">読み込み中…</p>}
        {!error && !loading && !summary && (
          <p className="empty">
            {preferred
              ? '設定したクラスの今日の時間割は未登録または学期の期間外です。'
              : '今日の時間割はありません。'}
          </p>
        )}
        {!error && summary && !schedule && (
          <p role="status">授業を読み込み中…</p>
        )}
        {!error &&
          schedule &&
          (lessons.length ? (
            <ol className="home-lessons">
              {lessons.map((lesson) => (
                <li key={lesson.period}>
                  <span className="home-period">{lesson.period}限</span>
                  <strong>{lesson.subject}</strong>
                  {lesson.kind && (
                    <span className="badge">
                      {
                        { replace: '変更', cancel: '休講', extra: '補講' }[
                          lesson.kind
                        ]
                      }
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">今日の授業はありません。</p>
          ))}
      </section>

      <section className="panel home-panel" aria-labelledby="bus-title">
        <div className="home-section-title">
          <div>
            <h2 id="bus-title">次のバス</h2>
            <p>全方面 · 出発が近い5便</p>
          </div>
          <a href="#bus">
            バスへ <span aria-hidden="true">›</span>
          </a>
        </div>
        {buses.length ? (
          <ol className="home-buses">
            {buses.map((bus) => (
              <li
                key={`${bus.serviceDate}-${bus.time}-${bus.stop}-${bus.direction}`}
              >
                <time>{bus.time}</time>
                <div>
                  <strong>{bus.direction}</strong>
                  <small>{bus.stop} 発</small>
                </div>
                {bus.serviceDate !== date && (
                  <span className="day-badge">明日</span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">今日・明日の便はありません。</p>
        )}
        <p className="home-disclaimer">バスの時刻・バス停は仮データです。</p>
      </section>
    </div>
  );
}
