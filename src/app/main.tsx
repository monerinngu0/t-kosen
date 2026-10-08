import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clientFeatures } from '../core/client/features';
import './styles.css';
function App() {
  const [page, setPage] = useState(location.hash.slice(1) || 'home');
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handle = () => {
      setPage(location.hash.slice(1) || 'home');
      setMenuOpen(false);
    };
    addEventListener('hashchange', handle);
    return () => removeEventListener('hashchange', handle);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node))
        setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
  const feature = clientFeatures.find((f) => f.id === page);
  const View = feature?.component;
  return (
    <>
      <header ref={headerRef} className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" onClick={() => setMenuOpen(false)}>
            t-kosen
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
        {menuOpen && (
          <nav id="site-menu" className="site-menu" aria-label="メインメニュー">
            {clientFeatures.map((f) => (
              <a
                key={f.id}
                href={'#' + f.id}
                aria-current={page === f.id ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {f.label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main>
        {View ? (
          <View />
        ) : (
          <section className="panel">
            <h2>ページが見つかりません</h2>
            <a href="#home">ホームへ戻る</a>
          </section>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
