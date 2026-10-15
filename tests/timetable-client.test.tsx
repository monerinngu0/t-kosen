// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from '../src/features/home/client/Home';
import { Timetable } from '../src/features/timetable/client/Timetable';
import type {
  Schedule,
  ScheduleSummary,
} from '../src/features/timetable/shared/model';

const previous: ScheduleSummary = {
  id: 'I1-2026-first',
  classId: 'I1',
  className: '情報1年',
  year: 2026,
  term: 'first',
  start: '2026-04-01',
  end: '2026-09-30',
  revision: 1,
};
const current = {
  ...previous,
  id: 'I1-2026-second',
  term: 'second',
  start: '2026-10-01',
  end: '2027-03-31',
};
const other = {
  ...current,
  id: 'E1-2026-second',
  classId: 'E1',
  className: '電子1年',
};
let list: ScheduleSummary[];
let subject: string;
let hidden: boolean;
let fail: boolean;
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

function schedule(summary: ScheduleSummary): Schedule {
  return {
    ...summary,
    term: summary.term as Schedule['term'],
    lessons: [
      {
        id: 'a24e9c22-3ecb-4a11-9150-70789c5df2e8',
        weekday: 4,
        period: 1,
        subject: summary.classId === 'I1' ? subject : '電子の授業',
        teacher: '',
        room: '',
      },
    ],
    changes: [],
  };
}
async function render(View: typeof Home | typeof Timetable) {
  await act(async () => {
    root.render(<View />);
  });
}
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
}
function requestedDetails() {
  return fetchMock.mock.calls
    .map(([path]) => path as string)
    .filter((path) => path !== '/api/timetables');
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-15T03:00:00Z'));
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  hidden = false;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    hidden ? 'hidden' : 'visible',
  );
  localStorage.clear();
  localStorage.setItem('tk:schedule', previous.id);
  list = [other, previous, current];
  subject = '数学';
  fail = false;
  fetchMock = vi.fn(async (path: string) => {
    if (fail) throw new Error('offline');
    if (path === '/api/timetables') return Response.json(list);
    const summary = list.find((item) => path === '/api/timetables/' + item.id);
    return summary
      ? Response.json(schedule(summary))
      : Response.json({ error: 'missing' }, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

for (const [name, View] of [
  ['Home', Home],
  ['時間割', Timetable],
] as const) {
  describe(name, () => {
    it('古い学期の設定でも同じクラスの現学期を表示し、30秒後に更新を反映する', async () => {
      await render(View);
      expect(container.textContent).toContain('数学');
      expect(requestedDetails()).toEqual(['/api/timetables/' + current.id]);
      subject = '変更後の英語';
      await tick();
      expect(container.textContent).toContain(subject);
      expect(container.textContent).not.toContain('数学');
      for (const [, options] of fetchMock.mock.calls)
        expect(options.cache).toBe('no-store');
    });
    it('希望クラスの現学期がなければ他クラスを取得せず、新規登録後に再取得する', async () => {
      list = [other, previous];
      await render(View);
      expect(container.textContent).toContain('未登録または学期の期間外');
      expect(requestedDetails()).toEqual([]);
      list.push(current);
      await tick();
      expect(container.textContent).toContain('数学');
      expect(requestedDetails()).toEqual(['/api/timetables/' + current.id]);
    });
    it('保存されたIDが見つからない場合も他クラスへ切り替えない', async () => {
      localStorage.setItem('tk:schedule', 'removed');
      await render(View);
      expect(container.textContent).toContain('未登録または学期の期間外');
      expect(requestedDetails()).toEqual([]);
    });
    it('非表示中はポーリングを止め、復帰・フォーカス時に再取得する', async () => {
      await render(View);
      hidden = true;
      fetchMock.mockClear();
      await tick();
      expect(fetchMock).not.toHaveBeenCalled();
      subject = '復帰後の授業';
      hidden = false;
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(container.textContent).toContain(subject);
      subject = 'フォーカス後の授業';
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(container.textContent).toContain(subject);
    });
    it('通信失敗を表示し、更新ボタンから回復する', async () => {
      fail = true;
      await render(View);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        '再試行',
      );
      fail = false;
      await act(async () => {
        container.querySelector('button')!.click();
      });
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(container.textContent).toContain('数学');
    });
    it('画面を離れたらタイマーと復帰時の取得を止める', async () => {
      await render(View);
      await act(async () => {
        root.render(null);
      });
      fetchMock.mockClear();
      await tick();
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
}

it('過去の学期を手動選択でき、Homeへ移ると同じクラスの現学期を表示する', async () => {
  await render(Timetable);
  const select = container.querySelector('select')!;
  expect(select.value).toBe(current.id);
  await act(async () => {
    select.value = previous.id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(select.value).toBe(previous.id);
  expect(container.textContent).toContain('学期の期間外');
  await render(Home);
  expect(container.textContent).toContain('数学');
  expect(requestedDetails().at(-1)).toBe('/api/timetables/' + current.id);
});
