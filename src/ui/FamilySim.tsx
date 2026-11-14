// [R07][R08][R12][R16] 가족 동의 체험: 모든 상태 변경은 기존 정책 규칙을 거친다.
import { useState } from 'react';
import { currentVote, tally, type Terms, type VoteValue } from '../domain/consent';
import { formatSignedWon, formatWon } from '../domain/money';
import { evaluateAction, newCase, REASON_TEXT, STAGE_LABEL, type Action, type CaseState } from '../domain/policy';
import { pauseDelta, verdictSentence } from '../domain/resubBreakeven';
import type { Subscription } from '../domain/types';
import { CLOSURE_LABEL, closureStatus } from '../domain/verification';

const SUB: Subscription = { id: 'sub-disney', serviceId: 'disney_plus_kr', planId: 'standard', name: '디즈니+ 스탠다드', monthlyWon: 9900, nextChargeDate: '2026-11-17', channel: 'web', ownerId: 'me', sharedWith: ['mom', 'bro'], sourceKind: 'demo', usage: null };
const WHO: Record<string, string> = { me: '나(결제자)', mom: '엄마', bro: '동생', bot: '봇' };
const ACTION_LABEL: Partial<Record<Action['type'], string>> = {
  request_family_review: '가족에게 제안',
  revise_terms: '조건 변경',
  cast_vote: '응답',
  revoke_vote: '응답 철회',
  prepare_owner_handoff: '결제자에게 인계',
  record_cancel_request: '해지 요청 기록',
  observe_charge: '다음 청구 확인',
};
const VOTES: { value: VoteValue; label: string }[] = [
  { value: 'agree', label: '동의' },
  { value: 'object', label: '반대' },
  { value: 'abstain', label: '보류' },
];
const terms = (k: number): Terms => ({ resultId: `sim-k${k}`, horizon: 12, pauseMonths: k, choice: 'pause', needs: [], sentence: verdictSentence(9900, 11500, 12, k) });

export function FamilySim() {
  const [state, setState] = useState<CaseState>(() => newCase('sim-1', SUB));
  const [k, setK] = useState(2);
  const [now, setNow] = useState('2026-11-14T09:00:00+09:00');
  const [last, setLast] = useState<{ allowed: boolean; text: string } | null>(null);
  const act = (action: Action, at = now) => {
    const decision = evaluateAction(state, action, at);
    setState(decision.next);
    setLast({
      allowed: decision.allowed,
      text: `${WHO[action.actor] ?? '참여자'} · ${ACTION_LABEL[action.type] ?? '상태 확인'}: ${decision.allowed ? '처리했어요.' : '진행할 수 없어요.'}${decision.reasons.length ? ` ${decision.reasons.map((reason) => REASON_TEXT[reason]).join(' / ')}` : ''}`,
    });
  };
  const p = state.proposal;
  const t = p ? tally(p) : null;
  const vote = (member: string, value: VoteValue) => act({ type: 'cast_vote', actor: member, version: p?.version ?? 1, value });
  const reset = () => {
    setState(newCase('sim-1', SUB));
    setK(2);
    setNow('2026-11-14T09:00:00+09:00');
    setLast(null);
  };
  const closure = closureStatus(state.closure, now.slice(0, 10));

  return (
    <section className="grid2" aria-label="가족 동의 체험">
      <div className="card">
        <div className="section-head">
          <p className="eyebrow">같은 기기에서 결제자·가족 역할 체험</p>
          <h2>함께 쓰는 구독, 함께 결정해요</h2>
        </div>
        <p className="small">{SUB.name} · 월 <strong>{formatWon(SUB.monthlyWon!)}</strong> · 다음 결제 <strong>{SUB.nextChargeDate}</strong></p>
        <p className="muted small">조건이 바뀌거나 동의를 철회하면 다시 확인해요. 이 체험의 동의는 법적 위임이나 실제 해지가 아니에요.</p>

        <h3>1. 쉬는 기간을 제안하세요</h3>
        <label className="field">
          쉬었다 돌아올 기간 (12개월 기준 손익)
          <select value={k} onChange={(e) => setK(Number(e.target.value))}>
            {[1, 2, 3, 4, 6].map((months) => (
              <option key={months} value={months}>{months}개월 ({formatSignedWon(pauseDelta(9900, 11500, 12, months))})</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn primary" onClick={() => act(p ? { type: 'revise_terms', actor: 'bot', terms: terms(k) } : { type: 'request_family_review', actor: 'bot', terms: terms(k) })}>
          {p ? '바뀐 조건으로 다시 제안' : '가족에게 제안'}
        </button>
        {p && <p className="small"><b>현재 제안</b> · {p.terms.sentence}</p>}

        <h3>2. 각자의 응답을 골라 주세요</h3>
        {(['mom', 'bro'] as const).map((member) => {
          const selectedVote = p ? currentVote(p, member) : null;
          return (
            <div key={member}>
              <p className="small"><b>{WHO[member]}</b> · {selectedVote ? VOTES.find((item) => item.value === selectedVote.value)?.label : '응답 전'}</p>
              <div className="action-row row wrap" role="group" aria-label={`${WHO[member]}의 응답`}>
                {VOTES.map((item) => (
                  <button type="button" key={item.value} className={selectedVote?.value === item.value ? 'btn primary' : 'btn'} aria-pressed={selectedVote?.value === item.value} onClick={() => vote(member, item.value)}>
                    {item.label}
                  </button>
                ))}
                <button type="button" className="btn" onClick={() => act({ type: 'revoke_vote', actor: member })}>응답 철회</button>
              </div>
            </div>
          );
        })}

        <h3>3. 결제자에게 넘기고 신청을 기록하세요</h3>
        <div className="action-row row wrap">
          <button type="button" className="btn primary" onClick={() => act({ type: 'prepare_owner_handoff', actor: 'bot' })}>결제자에게 해지 안내 넘기기</button>
          <button type="button" className="btn" onClick={() => act({ type: 'record_cancel_request', actor: 'me' }, '2026-11-14T18:30:00+09:00')}>결제자가 해지 요청 기록</button>
        </div>
        <p className="muted small">모두 동의해야 인계할 수 있어요. 신청 기록만으로 해지가 끝난 것은 아니에요.</p>
        <button type="button" className="btn" onClick={() => {
          setNow('2026-11-17T09:00:00+09:00');
          act({ type: 'observe_charge', actor: 'bot', charge: { date: '2026-11-17', amountWon: 9900, channel: 'google_play', synthetic: true } }, '2026-11-17T09:00:00+09:00');
        }}>다음 청구 확인 · 11/17 Google Play 9,900원 (합성)</button>
        <div className="action-row"><button type="button" className="link" onClick={reset}>체험 처음부터 다시</button></div>
      </div>

      <div className="card">
        <h2>지금 진행 상태</h2>
        <p><span className="badge">{STAGE_LABEL[state.stage]}</span></p>
        {last && <p className={`verdict ${last.allowed ? 'good' : 'bad'}`} role="status" aria-live="polite">{last.text}</p>}
        {p && t && (
          <ul className="compact-list small">
            <li>동의 <strong>{t.agree.length}/{p.requiredMembers.length}명</strong> · {t.agree.map((member) => WHO[member]).join('·') || '아직 없음'}</li>
            <li>반대 {t.object.map((member) => WHO[member]).join('·') || '없음'} · 보류 {t.abstain.map((member) => WHO[member]).join('·') || '없음'}</li>
            <li>응답 전 {t.pending.map((member) => WHO[member]).join('·') || '없음'}</li>
          </ul>
        )}
        <p className="small">해지 확인: <strong>{CLOSURE_LABEL[closure.status]}</strong></p>

        <details className="disclosure">
          <summary>처리 기록과 규칙 확인</summary>
          <p className="small muted">기본 흐름과 같은 정책 규칙으로 이전 조건의 응답과 봇의 기록 권한을 확인해요.</p>
          <div className="action-row row wrap">
            <button type="button" className="btn" onClick={() => act({ type: 'record_cancel_request', actor: 'bot' })}>봇의 해지 기록 시도</button>
            {p && p.version > 1 && (['mom', 'bro'] as const).map((member) => (
              <button type="button" key={member} className="btn" onClick={() => act({ type: 'cast_vote', actor: member, version: p.version - 1, value: 'agree' })}>
                {WHO[member]}의 이전 조건에 동의 보내기 (v{p.version - 1})
              </button>
            ))}
          </div>
          {p && <p className="small">현재 제안 v{p.version} · 이전 버전 응답 {t?.staleIgnored ?? 0}건은 집계에서 제외했어요.</p>}
          <div className="table-scroll" tabIndex={0} role="region" aria-label="가족 동의와 해지 처리 기록">
            <table className="tbl small">
              <thead><tr><th scope="col">누가</th><th scope="col">행동</th><th scope="col">결과</th><th scope="col">사유</th></tr></thead>
              <tbody>
                {[...state.audit].reverse().map((entry, index) => (
                  <tr key={index}>
                    <td>{WHO[entry.actor] ?? entry.actor}</td>
                    <td><code>{entry.action}</code></td>
                    <td className={entry.allowed ? 'pos' : 'neg'}>{entry.allowed ? '허용' : '거부'}</td>
                    <td>{entry.reasons.map((reason) => REASON_TEXT[reason]).join(' / ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.audit.length === 0 && <p className="muted small">제안이나 응답을 보내면 처리 기록이 쌓여요.</p>}
        </details>
      </div>
    </section>
  );
}
