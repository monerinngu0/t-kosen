import { useEffect, useState } from 'react';
import { busData, dayType, nextBus, type DayType } from '../shared/model';
import { japanDate } from '../../../shared/utils/date';
import { usePreference } from '../../../core/client/preferences';
export function Bus() {
  const [routeId, setRoute] = usePreference('route', 'toyama');
  const [now, setNow] = useState(new Date());
  const [override, setOverride] = useState('auto');
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const date = japanDate(now);
  const type = override === 'auto' ? dayType(date) : (override as DayType);
  const route =
    busData.routes.find((r) => r.id === routeId) ?? busData.routes[0];
  const next = nextBus(route[type], date, now);
  return (
    <section className="panel">
      <div className="eyebrow">GO HOME</div>
      <h2>帰りのバス</h2>
      <p className="notice">{busData.notice}</p>
      <div className="controls">
        <label>
          方面
          <select value={route.id} onChange={(e) => setRoute(e.target.value)}>
            {busData.routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
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
      <div className="next-bus">
        <span>次のバス · {type === 'weekday' ? '平日' : '土日祝'}</span>
        <strong>{next ?? '本日の便は終了'}</strong>
        <span>{route.destination}行き</span>
      </div>
      <ul className="bus-list">
        {route[type].map((t) => (
          <li key={t} className={t === next ? 'highlight' : ''}>
            <time>{t}</time>
            <span>{route.destination}行き</span>
            {t === next && <b>次の便</b>}
          </li>
        ))}
      </ul>
    </section>
  );
}
