import { useEffect, useReducer, useState } from 'react';
import { api } from '../../../shared/client/api';
import {
  currentSchedule,
  type Schedule,
  type ScheduleSummary,
} from '../shared/model';

function selectSummary(
  list: ScheduleSummary[],
  date: string,
  preferredId: string,
  browsingId: string,
) {
  return browsingId
    ? list.find((item) => item.id === browsingId)
    : currentSchedule(list, date, preferredId);
}

export function useTimetable(
  date: string,
  preferredId: string,
  browsingId = '',
) {
  const [refreshCount, refresh] = useReducer((count: number) => count + 1, 0);
  const [state, setState] = useState<{
    list: ScheduleSummary[];
    loaded: { id: string; schedule: Schedule } | null;
    error: string;
    settled: boolean;
  }>({ list: [], loaded: null, error: '', settled: false });

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function load() {
      if (running) return;
      running = true;
      try {
        // Revalidation must reach the server even within the public 30-second cache.
        const options = {
          signal: controller.signal,
          cache: 'no-store' as const,
        };
        const list = await api<ScheduleSummary[]>('/timetables', options);
        const summary = selectSummary(list, date, preferredId, browsingId);
        const schedule = summary
          ? await api<Schedule>('/timetables/' + summary.id, options)
          : null;
        if (!controller.signal.aborted)
          setState({
            list,
            loaded: summary && schedule ? { id: summary.id, schedule } : null,
            error: '',
            settled: true,
          });
      } catch (cause) {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            error:
              '時間割を取得できませんでした。更新して再試行してください。' +
              (cause instanceof Error ? `（${cause.message}）` : ''),
            settled: true,
          }));
      } finally {
        running = false;
      }
    }
    const revalidate = () => {
      if (document.visibilityState === 'visible') void load();
    };
    void load();
    const timer = setInterval(revalidate, 30_000);
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [date, preferredId, browsingId, refreshCount]);

  const summary = selectSummary(state.list, date, preferredId, browsingId);
  return {
    list: state.list,
    summary,
    schedule:
      state.loaded?.id === summary?.id
        ? (state.loaded?.schedule ?? null)
        : null,
    error: state.error,
    loading: !state.settled,
    refresh,
  };
}
