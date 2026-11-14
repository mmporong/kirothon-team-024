import { useState } from 'react';
import { BRAND } from '../brand';
import { BotReplay } from './BotReplay';
import { Calculator } from './Calculator';
import { ChannelCheck } from './ChannelCheck';
import { FamilySim } from './FamilySim';
import { HowBuilt } from './HowBuilt';

const TABS = [
  { id: 'bot', label: '봇 점검 기록' },
  { id: 'channel', label: '결제 경로 비교' },
  { id: 'family', label: '가족 동의 체험' },
  { id: 'calc', label: '재가입 손익(보조)' },
  { id: 'kiro', label: 'Kiro로 만든 방법' },
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
  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="dot" aria-hidden />
          <div>
            <h1>{BRAND.name}</h1>
            <p className="tagline">{BRAND.tagline}</p>
          </div>
        </div>
        <nav className="tabs" aria-label="화면">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab on' : 'tab'} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'bot' && <BotReplay />}
        {tab === 'channel' && <ChannelCheck />}
        {tab === 'calc' && <Calculator />}
        {tab === 'family' && <FamilySim />}
        {tab === 'kiro' && <HowBuilt />}
      </main>
      <footer className="foot">
        로그인·서버 없이 이 브라우저 안에서만 계산해요. 모든 가구·문자·응답은 합성 데이터예요. 계산상 차이는 실제 절감액이 아니에요. ·{' '}
        <a href={BRAND.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
