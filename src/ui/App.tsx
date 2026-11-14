import { useEffect, useState } from 'react';
import { BRAND } from '../brand';
import { BotReplay } from './BotReplay';
import { Calculator } from './Calculator';
import { ChannelCheck } from './ChannelCheck';
import { FamilySim } from './FamilySim';
import { HowBuilt } from './HowBuilt';

const TABS = [
  { id: 'bot', label: '점검 데모' },
  { id: 'channel', label: '가격 비교' },
  { id: 'family', label: '가족과 결정' },
  { id: 'calc', label: '쉬었다 돌아오기' },
  { id: 'kiro', label: '작동 원리' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const h = window.location.hash.replace('#', '') as TabId;
    return TABS.some((t) => t.id === h) ? h : 'bot';
  });
  const go = (id: TabId) => {
    setTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };
  useEffect(() => {
    const syncHash = () => {
      const id = window.location.hash.slice(1) as TabId;
      if (TABS.some((t) => t.id === id)) setTab(id);
    };
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">본문으로 이동</a>
      <header className="top">
        <div className="brand">
          <span className="brand-symbol" aria-hidden><img src="./kiro/mascot-still.png" width={28} height={34} alt="" /></span>
          <div>
            <h1>{BRAND.name}</h1>
            <p className="tagline">{BRAND.slogan}</p>
          </div>
        </div>
        <nav className="tabs" aria-label="주요 기능">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab on' : 'tab'} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {tab === 'bot' && <BotReplay />}
        {tab === 'channel' && <ChannelCheck />}
        {tab === 'calc' && <Calculator />}
        {tab === 'family' && <FamilySim />}
        {tab === 'kiro' && <HowBuilt />}
      </main>
      <footer className="foot">
        <span>합성 데이터로 체험하는 데모 · 실제 결제나 해지를 실행하지 않아요.</span>{' '}
        <a href={BRAND.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
