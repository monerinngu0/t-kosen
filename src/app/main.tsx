import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clientFeatures } from '../core/client/features';
import './styles.css';
function App() {
  const [page, setPage] = useState(location.hash.slice(1) || 'timetable');
  useEffect(() => {
    const handle = () => setPage(location.hash.slice(1) || 'timetable');
    addEventListener('hashchange', handle);
    return () => removeEventListener('hashchange', handle);
  }, []);
  const feature = clientFeatures.find((f) => f.id === page);
  const View = feature?.component;
  return (
    <>
      <header>
        <a className="brand" href="#timetable">
          t-kosen<span>学校生活を、ひとつに。</span>
        </a>
        <span className="header-tag">CAMPUS COMPANION</span>
      </header>
      <main>
        <div className="intro">
          <p className="eyebrow">EVERYDAY, A LITTLE EASIER</p>
          <h1>
            今日の授業。
            <br />
            帰りのバス。
          </h1>
          <p>必要な情報を、すぐ手元に。</p>
        </div>
        {View ? (
          <View />
        ) : (
          <section className="panel">
            <h2>ページが見つかりません</h2>
            <a href="#timetable">時間割へ戻る</a>
          </section>
        )}
        <footer>
          t-kosen · クラスとバスの検索条件は、この端末に保存されます。
        </footer>
      </main>
      <nav aria-label="メインナビゲーション">
        {clientFeatures.map((f) => (
          <a
            key={f.id}
            href={'#' + f.id}
            aria-current={page === f.id ? 'page' : undefined}
          >
            {f.label}
          </a>
        ))}
      </nav>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
