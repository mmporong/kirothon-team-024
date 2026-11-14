import { useEffect, useState } from 'react';
import { BRAND } from '../brand';
import type { DeskItem } from '../domain/serviceDesk';
import { SubscriptionDesk } from './SubscriptionDesk';
import { BotReplay } from './BotReplay';
import { Calculator } from './Calculator';
import { ChannelCheck } from './ChannelCheck';
import { FamilySim } from './FamilySim';
import { HowBuilt } from './HowBuilt';
import { KiroMascot } from './KiroMascot';

const TABS = [
  { id: 'home', label: '내 구독', icon: '▦' },
  { id: 'channel', label: '가격 비교', icon: '↗' },
  { id: 'family', label: '가족 의견 체험', icon: '♧' },
  { id: 'calc', label: '재가입 계산', icon: '＋' },
] as const;
type TabId = (typeof TABS)[number]['id'] | 'bot' | 'kiro';
const validTab = (value: string): value is TabId => [...TABS.map((tab) => tab.id), 'bot', 'kiro'].includes(value);

export function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const hash = window.location.hash.slice(1);
    return validTab(hash) ? hash : 'home';
  });
  const [comparison, setComparison] = useState<DeskItem | null>(null);
  const go = (id: TabId) => {
    setTab(id);
    window.history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => {
    const syncHash = () => {
      const id = window.location.hash.slice(1);
      setTab(validTab(id) ? id : 'home');
    };
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);
  return (
    <div className="shell service-shell">
      <a className="skip-link" href="#main-content">본문으로 이동</a>
      <header className="top service-top">
        <div className="brand">
          <span className="brand-symbol" aria-hidden><img src="./kiro/mascot-still.png" width={28} height={34} alt="" /></span>
          <div><h1>{BRAND.name}</h1><p className="tagline">구독을 놓치지 않는 나의 작업실</p></div>
        </div>
        <span className="device-label"><span className="status-dot" />이 기기에 저장</span>
        {tab !== 'bot' && <div className="workspace-pet workspace-pet-inline"><KiroMascot /></div>}
      </header>
      <div className="workspace">
        <aside className="workspace-side">
          <nav className="service-nav" aria-label="주요 기능">
            {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'workspace-tab on' : 'workspace-tab'} onClick={() => go(item.id)} aria-current={tab === item.id ? 'page' : undefined}><span aria-hidden>{item.icon}</span>{item.label}</button>)}
          </nav>
          <nav className="workspace-utility" aria-label="도움말과 기록">
            <button type="button" onClick={() => go('bot')} aria-current={tab === 'bot' ? 'page' : undefined}>똑이 점검 기록 ↗</button>
            <button type="button" onClick={() => go('kiro')} aria-current={tab === 'kiro' ? 'page' : undefined}>사용 방식·도움말 ↗</button>
          </nav>
        </aside>
        <main id="main-content" tabIndex={-1}>
          {tab === 'home' && <SubscriptionDesk onCompare={(item) => { setComparison(item); go('channel'); }} />}
          {tab === 'bot' && <BotReplay />}
          {tab === 'channel' && <ChannelCheck initialServiceId={comparison?.serviceId} initialPlanId={comparison?.planId} initialChannel={comparison?.channel ?? undefined} initialMonthlyWon={comparison?.monthlyWon ?? undefined} />}
          {tab === 'calc' && <Calculator />}
          {tab === 'family' && <FamilySim />}
          {tab === 'kiro' && <HowBuilt />}
        </main>
      </div>
      <footer className="foot service-foot"><span>등록한 정보는 이 브라우저에 저장돼요. 결제·해지는 공식 서비스에서 처리해 주세요.</span><a href={BRAND.repo} target="_blank" rel="noreferrer">GitHub</a></footer>
    </div>
  );
}
