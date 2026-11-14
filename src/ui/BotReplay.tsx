// [R26] 실제 Kiro 녹화를 사용자 흐름별로 탐색한다. 원본은 상세 기록에 보존한다.
import { useEffect, useState } from 'react';
import { KiroMascot } from './KiroMascot';

type Msg = { id: string; at: string; from: string; to: string; kind: string; text: string; choices?: string[]; version?: number };
type Tool = { seq: number; tool: string; ok: boolean; reasons: string[]; summary: string };
type Receipt = { model: string | null; engine: string | null; ms: number; toolCalls: number; denied: number; credits: number | null; fallback: boolean; hooks: { name: string; status: string }[]; finalText: string };
type CaseView = { caseId: string; service: string; stageLabel: string; closure: string; proposal: null | { version: number; choice: string; pauseMonths: number; sentence: string; agree: string[]; object: { member: string; comment: string | null }[]; pending: string[]; invalidatedOldVotes: number } };
type Step =
  | { kind: 'patrol'; id: string; clock: string; receipt: Receipt; report: { summary: string; waitingFor: string[] } | null; tools: Tool[]; messages: Msg[]; cases: CaseView[] }
  | { kind: 'human'; clock: string; actor: string; action: string; text: string; allowed: boolean; reasons: string[]; cases: CaseView[] }
  | { kind: 'event'; clock: string; text: string; sms?: string };
type Patrol = Extract<Step, { kind: 'patrol' }>;
type Replay = { title: string; recordedAt: string; note: string; household: { members: { id: string; label: string; role: string }[] }; steps: Step[] };

const PHASES = ['결제 전 질문', '가족 의견 모으기', '조건 다시 제안', '결제자에게 안내', '다음 청구 확인'];
const TITLES = ['결제 전에, 똑이가 먼저 물어요.', '함께 쓰는 구독은 함께 정해요.', '반대 의견도 새 제안에 담아요.', '동의가 모이면 다음 방법을 알려요.', '해지 뒤에 또 청구됐는지 살펴요.'];
const DESCRIPTIONS = ['무료체험 종료와 다음 결제일을 확인해 이용 여부를 물었어요.', '결제자의 답에 따라 가족에게 같은 조건으로 의견을 물었어요.', '가족의 반대를 읽고, 조건을 바꿔 다시 동의를 구했어요.', '현재 제안에 모두 동의한 구독만 결제자에게 안내했어요.', '예상 밖 청구를 발견해 같은 사건을 다시 열었어요.'];
const KIND: Record<string, string> = { question: '똑이의 질문', vote_request: '가족 동의 요청', reminder: '응답 알림', route: '다음 처리 방법', info: '안내', reply: '답장', vote: '가족의 응답', action: '처리 기록' };
const hhmm = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)} ${iso.slice(11, 16)}`;
const preview = (text: string) => text.length > 110 ? `${text.slice(0, 110).trim()}…` : text;

export function BotReplay() {
  const [data, setData] = useState<Replay | null>(null);
  const [err, setErr] = useState(false);
  const [upto, setUpto] = useState(0);
  const [memberId, setMemberId] = useState('me');
  useEffect(() => {
    const controller = new AbortController();
    fetch('./replay/demo.json', { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('replay unavailable'); return r.json(); })
      .then((d: Replay) => {
        if (!Array.isArray(d.steps) || !d.steps.length || !d.household?.members?.length) throw new Error('invalid replay');
        setData(d);
        const q = new URLSearchParams(window.location.search).get('step');
        const first = Math.max(0, d.steps.findIndex((s) => s.kind === 'patrol'));
        setUpto(q === 'all' ? d.steps.length - 1 : q && /^\d+$/.test(q) ? Math.min(Number(q), d.steps.length - 1) : first);
      })
      .catch((e: unknown) => { if (!(e instanceof Error && e.name === 'AbortError')) setErr(true); });
    return () => controller.abort();
  }, []);

  if (err) return <section className="card empty-state"><h2>시연 기록을 불러오지 못했어요.</h2><p className="muted">연결을 확인하고 다시 열어 주세요.</p><button className="btn primary" onClick={() => window.location.reload()}>다시 불러오기</button></section>;
  if (!data) return <section className="card empty-state" role="status">똑이의 점검 기록을 준비하고 있어요…</section>;

  const visible = data.steps.slice(0, upto + 1);
  const patrols = data.steps.filter((s): s is Patrol => s.kind === 'patrol');
  const current = [...visible].reverse().find((s): s is Patrol => s.kind === 'patrol');
  const phase = current ? Math.max(0, patrols.findIndex((p) => p.id === current.id)) : 0;
  const currentStep = data.steps[upto]!;
  const latestCases = [...visible].reverse().find((s): s is Extract<Step, { cases: CaseView[] }> => s.kind !== 'event')?.cases ?? [];
  const members = data.household.members;
  const selected = members.find((m) => m.id === memberId) ?? members[0]!;
  const allMessages = visible.flatMap((s) => s.kind === 'patrol' ? s.messages : []).filter((m) => m.to === selected.id);
  const currentMessages = current?.messages.filter((m) => m.to === selected.id) ?? [];
  const messages = [...currentMessages, ...allMessages.filter((m) => !currentMessages.includes(m)).reverse()];
  const first = Math.max(0, data.steps.findIndex((s) => s.kind === 'patrol'));
  const tools = patrols.reduce((n, p) => n + p.tools.length, 0);
  const denied = patrols.reduce((n, p) => n + p.tools.filter((t) => !t.ok).length, 0);

  return (
    <section className="replay-page">
      <div className="page-heading with-mascot">
        <div><p className="eyebrow">우리집 구독 점검 · 합성 시연</p><h2>결제 전에, 똑똑.</h2><p className="muted">가족에게 먼저 묻고, 다음 청구까지 확인해요.</p></div>
        <KiroMascot />
      </div>
      <nav className="journey" aria-label="시연 장면 선택">
        {patrols.map((p, i) => <button key={p.id} className={`journey-step${current?.id === p.id ? ' active' : ''}${i < phase ? ' visited' : ''}`} aria-current={current?.id === p.id ? 'step' : undefined} onClick={() => setUpto(data.steps.indexOf(p))}><span className="journey-number">{String(i + 1).padStart(2, '0')}</span><span>{PHASES[i] ?? `점검 ${i + 1}`}</span></button>)}
      </nav>
      <div className="replay-layout">
        <div className="replay-story">
          <article className="card scene-card">
            <div className="section-head"><span className="eyebrow">{current ? `장면 ${phase + 1} · ${hhmm(current.clock)}` : '시연 준비'}</span><span className="badge kiro">Kiro 실행 녹화</span></div>
            <h3 className="scene-title">{current ? TITLES[phase] ?? '구독 점검 기록' : '우리집 구독을 살펴볼까요?'}</h3>
            <p className="scene-description">{current ? DESCRIPTIONS[phase] : '아래 버튼으로 첫 점검을 확인하세요.'}</p>
            {currentStep.kind !== 'patrol' && <div className="event-note"><span className="eyebrow">{currentStep.kind === 'human' ? `${currentStep.actor}의 응답` : '새로운 상황'}</span><p>{currentStep.text}</p></div>}
            <div className="subscription-stack">
              {latestCases.map((c) => <div key={c.caseId} className="subscription-row"><span className="service-mark" aria-hidden>{c.service.slice(0, 1)}</span><div className="subscription-copy"><strong>{c.service}</strong><span className="muted small">{c.closure}</span>{c.proposal && <span className="small">제안 {c.proposal.version} · 동의 {c.proposal.agree.length}명 / 미응답 {c.proposal.pending.length}명{c.proposal.object.length ? ` / 반대 ${c.proposal.object.length}명` : ''}</span>}</div><span className={`badge ${c.stageLabel.includes('다시') ? 'bad' : ''}`}>{c.stageLabel}</span></div>)}
            </div>
            <div className="scene-controls"><button className="btn" onClick={() => setUpto(data.steps.indexOf(patrols[Math.max(0, phase - 1)]!))} disabled={phase === 0}>이전</button><span className="small muted" aria-live="polite">{phase + 1} / {patrols.length} 장면</span><button className="btn primary" onClick={() => setUpto(data.steps.indexOf(patrols[Math.min(patrols.length - 1, phase + 1)]!))} disabled={phase >= patrols.length - 1}>다음 장면 <span aria-hidden>→</span></button></div>
          </article>
          {current?.report && current.report.waitingFor.length > 0 && <section className="next-action"><span className="action-mark" aria-hidden>↗</span><div><h3>이제 사람이 확인할 일</h3><ul className="compact-list">{current.report.waitingFor.map((item) => <li key={item}>{item.replace(/,\s*질문 q-\d+/g, '')}</li>)}</ul></div></section>}
          <div className="record-actions"><button className="link" onClick={() => setUpto(first)}>첫 점검으로 돌아가기</button><button className="link" onClick={() => setUpto(data.steps.length - 1)}>마지막 결과 보기</button></div>
        </div>
        <aside className="card conversation-panel" aria-label="가족이 받은 메시지">
          <div className="section-head"><h3>똑이가 보낸 메시지</h3><span className="small muted">녹화 내용</span></div>
          <div className="member-switch" role="group" aria-label="메시지를 볼 가족">{members.map((m) => <button key={m.id} className={selected.id === m.id ? 'member-button active' : 'member-button'} aria-pressed={selected.id === m.id} onClick={() => setMemberId(m.id)}>{m.label}<span>{m.role === 'owner' ? '결제자' : '가족'}</span></button>)}</div>
          <div className="message-thread">{messages.length ? messages.map((m) => <article key={m.id} className={`message ${m.kind}`}><div className="message-meta"><strong>{KIND[m.kind] ?? '안내'}</strong><time>{hhmm(m.at)}{m.version ? ` · 제안 ${m.version}` : ''}</time></div>{m.text.length > 110 ? <details className="message-details"><summary><span>{preview(m.text)}</span><span className="detail-link">전체 메시지</span></summary><p>{m.text}</p></details> : <p>{m.text}</p>}{m.choices?.length ? <div className="recorded-choices" aria-label="녹화된 선택지">{m.choices.map((choice) => <span key={choice}>{choice}</span>)}</div> : null}</article>) : <div className="conversation-empty"><span aria-hidden>…</span><p>아직 받은 메시지가 없어요.</p><p className="small muted">다음 장면에서 가족의 답을 확인해 보세요.</p></div>}</div>
        </aside>
      </div>
      <details className="disclosure full-record"><summary>전체 점검·실행 근거 <span className="small muted">{patrols.length}회 점검 · 도구 {tools}회 · 거부 {denied}회</span></summary><div className="disclosure-body"><p className="small muted">가구·문자·가격 조건은 시연용입니다. 아래 원문은 당시 기록이며, 현재 가격은 가격 비교에서 확인해 주세요. 수정 후 Kiro 재실행은 사용 한도로 수행하지 못했습니다.</p><p className="small muted">{data.note}</p><ol className="timeline">{data.steps.map((s, i) => <li key={i} className="record-step"><time>{hhmm(s.clock)}</time>{s.kind === 'patrol' ? <PatrolDetails p={s} /> : <details><summary>{s.kind === 'human' ? `${s.actor} · 응답 기록` : '상황 기록'}</summary><p>{s.text}</p>{s.kind === 'event' && s.sms && <pre className="sms">{s.sms}</pre>}</details>}</li>)}</ol></div></details>
    </section>
  );
}

function PatrolDetails({ p }: { p: Patrol }) {
  return <details><summary>점검 {p.id} · 도구 {p.tools.length}회{p.tools.some((t) => !t.ok) ? ` · 거부 ${p.tools.filter((t) => !t.ok).length}회` : ''}</summary><div className="record-detail">{p.report && <p>{p.report.summary}</p>}<ul className="tools">{p.tools.map((t) => <li key={t.seq} className={t.ok ? '' : 'denied'}><code>{t.tool}</code> {t.summary}</li>)}</ul><p className="small muted">{p.receipt.model} · {Math.round(p.receipt.ms / 1000)}초 · 엔진 {p.receipt.engine} · 훅 {p.receipt.hooks.length}회{p.receipt.credits !== null ? ` · ${p.receipt.credits} 크레딧` : ''}{p.receipt.fallback ? ' · 모델 전환 있음' : ''}</p><details className="disclosure"><summary>모델 응답 원문</summary><pre className="receipt-text">{p.receipt.finalText}</pre></details></div></details>;
}
