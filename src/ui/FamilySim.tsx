// [R07][R08][R12][R16] 가족 동의 체험: 브라우저 안에서 같은 정책 관문(evaluateAction)을 직접 눌러 본다.
import { useState } from 'react';
import { tally, type Terms, type VoteValue } from '../domain/consent';
import { formatSignedWon } from '../domain/money';
import { evaluateAction, newCase, REASON_TEXT, STAGE_LABEL, type Action, type CaseState } from '../domain/policy';
import { pauseDelta, verdictSentence } from '../domain/resubBreakeven';
import type { Subscription } from '../domain/types';
import { CLOSURE_LABEL, closureStatus } from '../domain/verification';

const SUB: Subscription = { id: 'sub-disney', serviceId: 'disney_plus_kr', planId: 'standard', name: '디즈니+ 스탠다드', monthlyWon: 9900, nextChargeDate: '2026-11-17', channel: 'web', ownerId: 'me', sharedWith: ['mom', 'bro'], sourceKind: 'demo', usage: null };
const WHO: Record<string, string> = { me: '나(결제자)', mom: '엄마', bro: '동생', bot: '봇' };
const terms = (k: number): Terms => ({ resultId: `sim-k${k}`, horizon: 12, pauseMonths: k, choice: 'pause', needs: [], sentence: verdictSentence(9900, 11500, 12, k) });

export function FamilySim() {
  const [state, setState] = useState<CaseState>(() => newCase('sim-1', SUB));
  const [k, setK] = useState(2);
  const [now, setNow] = useState('2026-11-14T09:00:00+09:00');
  const [last, setLast] = useState<{ allowed: boolean; text: string } | null>(null);
  const act = (a: Action, at = now) => {
    const d = evaluateAction(state, a, at);
    setState(d.next);
    setLast({ allowed: d.allowed, text: `${WHO[a.actor] ?? a.actor} · ${a.type} → ${d.allowed ? '허용' : '거부'}${d.reasons.length ? `: ${d.reasons.map((r) => REASON_TEXT[r]).join(' / ')}` : ''}` });
  };
  const p = state.proposal;
  const t = p ? tally(p) : null;
  const vote = (m: string, v: VoteValue) => act({ type: 'cast_vote', actor: m, version: p?.version ?? 1, value: v });
  const reset = () => {
    setState(newCase('sim-1', SUB));
    setNow('2026-11-14T09:00:00+09:00');
    setLast(null);
  };
  const closure = closureStatus(state.closure, now.slice(0, 10));

  return (
    <section className="grid2">
      <div className="card">
        <h2>가족 동의 체험 (같은 기기 3역할)</h2>
        <p className="muted small">봇이 쓰는 것과 같은 정책 함수 evaluateAction을 브라우저에서 직접 눌러 봐요. 앱 안의 동의는 법적 위임이 아니에요.</p>
        <ol className="sim">
          <li>
            <b>1. 제안</b> 쉬는 개월{' '}
            <select value={k} onChange={(e) => setK(Number(e.target.value))}>
              {[1, 2, 3, 4, 6].map((n) => (
                <option key={n} value={n}>
                  {n}개월 ({formatSignedWon(pauseDelta(9900, 11500, 12, n))})
                </option>
              ))}
            </select>{' '}
            <button className="btn" onClick={() => act(p ? { type: 'revise_terms', actor: 'bot', terms: terms(k) } : { type: 'request_family_review', actor: 'bot', terms: terms(k) })}>
              {p ? '조건 바꿔 다시 제안' : '가족에게 제안'}
            </button>
          </li>
          <li>
            <b>2. 응답</b>
            {(['mom', 'bro'] as const).map((m) => (
              <div key={m} className="row wrap">
                <span className="who">{WHO[m]}</span>
                <button className="chip" onClick={() => vote(m, 'agree')}>
                  동의
                </button>
                <button className="chip" onClick={() => vote(m, 'object')}>
                  반대
                </button>
                <button className="chip" onClick={() => vote(m, 'abstain')}>
                  보류
                </button>
                <button className="chip" onClick={() => act({ type: 'revoke_vote', actor: m })}>
                  철회
                </button>
                {p && p.version > 1 && (
                  <button className="chip" onClick={() => act({ type: 'cast_vote', actor: m, version: p.version - 1, value: 'agree' })}>
                    옛 버전 v{p.version - 1}에 동의 보내기
                  </button>
                )}
              </div>
            ))}
          </li>
          <li>
            <b>3. 결제자 인계</b>{' '}
            <button className="btn primary" onClick={() => act({ type: 'prepare_owner_handoff', actor: 'bot' })}>
              정책 관문에 요청
            </button>
          </li>
          <li>
            <b>4. 해지 신청 기록</b>{' '}
            <button className="btn" onClick={() => act({ type: 'record_cancel_request', actor: 'bot' })}>
              봇이 기록 시도
            </button>{' '}
            <button className="btn" onClick={() => act({ type: 'record_cancel_request', actor: 'me' }, '2026-11-14T18:30:00+09:00')}>
              결제자가 기록
            </button>
          </li>
          <li>
            <b>5. 다음 청구</b>{' '}
            <button
              className="btn"
              onClick={() => {
                setNow('2026-11-17T09:00:00+09:00');
                act({ type: 'observe_charge', actor: 'bot', charge: { date: '2026-11-17', amountWon: 9900, channel: 'google_play', synthetic: true } }, '2026-11-17T09:00:00+09:00');
              }}
            >
              11/17 Google Play 9,900원 청구 도착
            </button>
          </li>
        </ol>
        <button className="link" onClick={reset}>
          처음부터 다시
        </button>
      </div>
      <div className="card">
        <h3>
          지금 상태: <span className="badge">{STAGE_LABEL[state.stage]}</span>
        </h3>
        {last && <p className={`verdict ${last.allowed ? 'good' : 'bad'}`}>{last.text}</p>}
        {p && t && (
          <div className="small">
            <p>
              제안 <b>v{p.version}</b>: {p.terms.sentence}
            </p>
            <p>
              동의 {t.agree.map((m) => WHO[m]).join('·') || '-'} · 반대 {t.object.map((m) => WHO[m]).join('·') || '-'} · 보류 {t.abstain.map((m) => WHO[m]).join('·') || '-'} · 미응답 {t.pending.map((m) => WHO[m]).join('·') || '-'}
            </p>
            {t.staleIgnored > 0 && <p className="muted">이전 버전 응답 {t.staleIgnored}건은 집계에서 뺐어요.</p>}
          </div>
        )}
        <p className="small">해지 확인: {CLOSURE_LABEL[closure.status]}</p>
        <h3>감사 기록</h3>
        <table className="tbl small">
          <thead>
            <tr>
              <th>누가</th>
              <th>행동</th>
              <th>결과</th>
              <th>사유</th>
            </tr>
          </thead>
          <tbody>
            {[...state.audit].reverse().map((a, i) => (
              <tr key={i}>
                <td>{WHO[a.actor] ?? a.actor}</td>
                <td>
                  <code>{a.action}</code>
                </td>
                <td className={a.allowed ? 'pos' : 'neg'}>{a.allowed ? '허용' : '거부'}</td>
                <td>{a.reasons.map((r) => REASON_TEXT[r]).join(' / ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
