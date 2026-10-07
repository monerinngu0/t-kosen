import { useEffect, useMemo, useState } from 'react';
import {
  busData,
  dayType,
  upcomingDepartures,
  type DayType,
} from '../shared/model';
import { japanDate } from '../../../shared/utils/date';
import { usePreference } from '../../../core/client/preferences';

export function Bus() {
  const [directionQuery, setDirectionQuery] = usePreference(
    'bus-direction',
    '',
  );
  const [now, setNow] = useState(new Date());
  const [override, setOverride] = useState('auto');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = japanDate(now);
  const type = override === 'auto' ? dayType(date) : (override as DayType);
  const departures = busData.departures[type];
  const upcoming = upcomingDepartures(departures, date, now, directionQuery);
  const directions = useMemo(
    () =>
      [
        ...new Set(
          Object.values(busData.departures)
            .flat()
            .map((departure) => departure.direction),
        ),
      ].sort(),
    [],
  );

  return (
    <section className="panel">
      <div className="eyebrow">NEXT DEPARTURES</div>
      <h2>次のバス</h2>
      <p className="notice">{busData.notice}</p>
      <div className="controls">
        <label>
          方面を検索
          <input
            type="search"
            list="bus-directions"
            placeholder="例：富山、小杉"
            value={directionQuery}
            onChange={(e) => setDirectionQuery(e.target.value)}
          />
          <datalist id="bus-directions">
            {directions.map((direction) => (
              <option key={direction} value={direction} />
            ))}
          </datalist>
        </label>
        <label>
          運行日
          <select
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          >
            <option value="auto">自動判定</option>
            <option value="weekday">平日</option>
            <option value="holiday">土日祝</option>
          </select>
        </label>
      </div>
      <div className="departure-heading">
        <h3>
          {directionQuery.trim()
            ? `「${directionQuery.trim()}」の検索結果`
            : '全方面の直近5件'}
        </h3>
        <span>{type === 'weekday' ? '平日' : '土日祝'}</span>
      </div>
      {upcoming.length ? (
        <ol className="bus-list">
          {upcoming.map((departure, index) => (
            <li
              key={`${departure.time}-${departure.stop}-${departure.direction}`}
              className={index === 0 ? 'highlight' : ''}
            >
              <time>{departure.time}</time>
              <div>
                <strong>{departure.direction}</strong>
                <span>{departure.stop} 発</span>
              </div>
              {index === 0 && <b>次の便</b>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">
          {directionQuery.trim()
            ? '指定した方面の本日の便はありません。'
            : '本日の便は終了しました。'}
        </p>
      )}
    </section>
  );
}
