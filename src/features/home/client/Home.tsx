import { useEffect, useState } from 'react';
import { api } from '../../../shared/client/api';
import { japanDate } from '../../../shared/utils/date';
import { usePreference } from '../../../core/client/preferences';
import {
  currentSchedule,
  effectiveLessons,
  type Schedule,
  type ScheduleSummary,
} from '../../timetable/shared/model';
import { busData, nearestDepartures } from '../../bus/shared/model';

export function Home() {
  const [now, setNow] = useState(() => new Date());
  const [preferred, setPreferred] = usePreference('schedule', '');
  const [summaries, setSummaries] = useState<ScheduleSummary[] | null>(null);
  const [loaded, setLoaded] = useState<{
    id: string;
    schedule: Schedule;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    api<ScheduleSummary[]>('/timetables')
      .then((items) => {
        if (active) setSummaries(items);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const date = japanDate(now);
  const summary = currentSchedule(summaries ?? [], date, preferred);
  const scheduleId = summary?.id;
  useEffect(() => {
    if (!scheduleId) return;
    let active = true;
    api<Schedule>('/timetables/' + scheduleId)
      .then((schedule) => {
        if (active) {
          setLoaded({ id: scheduleId, schedule });
          setError('');
        }
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [scheduleId]);

  const schedule = loaded && loaded.id === scheduleId ? loaded.schedule : null;
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
        {!error && summaries === null && <p role="status">読み込み中…</p>}
        {!error && summaries !== null && !summary && (
          <p className="empty">今日の時間割はありません。</p>
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
