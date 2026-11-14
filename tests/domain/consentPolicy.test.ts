// [R07][R08][R16] 가족 동의 버전·철회와 단일 정책 관문. 속성 P5·P6
import fc from 'fast-check';
import { tally, type Terms } from '../../src/domain/consent';
import { evaluateAction, newCase, type CaseState } from '../../src/domain/policy';
import type { Subscription } from '../../src/domain/types';

const NOW = '2026-11-14T09:00:00+09:00';
const sub: Subscription = { id: 'sub-disney', serviceId: 'disney_plus_kr', planId: 'standard', name: '디즈니+ 스탠다드', monthlyWon: 9900, nextChargeDate: '2026-11-17', channel: 'web', ownerId: 'me', sharedWith: ['mom', 'bro'], sourceKind: 'demo', usage: null };
const terms = (k: number): Terms => ({ resultId: `r-k${k}`, horizon: 12, pauseMonths: k, choice: 'pause', needs: [], sentence: `${k}개월 쉬기` });

function run(state: CaseState, ...actions: Parameters<typeof evaluateAction>[1][]) {
  let s = state;
  const out: ReturnType<typeof evaluateAction>[] = [];
  for (const a of actions) {
    const d = evaluateAction(s, a, NOW);
    out.push(d);
    s = d.next;
  }
  return { s, out };
}

describe('R07 동의 전 잠금', () => {
  it('제안 v1 직후 인계는 consent_missing으로 거부', () => {
    const { out } = run(newCase('c1', sub), { type: 'request_family_review', actor: 'bot', terms: terms(2) }, { type: 'prepare_owner_handoff', actor: 'bot' });
    expect(out[1]!.allowed).toBe(false);
    expect(out[1]!.reasons).toContain('consent_missing');
  });
  it('반대가 있으면 objection_present', () => {
    const { out } = run(newCase('c1', sub),
      { type: 'request_family_review', actor: 'bot', terms: terms(2) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' },
      { type: 'cast_vote', actor: 'bro', version: 1, value: 'object', comment: '3개월 쉬자' },
      { type: 'prepare_owner_handoff', actor: 'bot' });
    expect(out[3]!.allowed).toBe(false);
    expect(out[3]!.reasons).toContain('objection_present');
  });
  it('전원 동의하면 인계 준비 허용', () => {
    const { out, s } = run(newCase('c1', sub),
      { type: 'request_family_review', actor: 'bot', terms: terms(3) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' },
      { type: 'cast_vote', actor: 'bro', version: 1, value: 'agree' },
      { type: 'prepare_owner_handoff', actor: 'bot' });
    expect(out[3]!.allowed).toBe(true);
    expect(s.stage).toBe('handoff_ready');
  });
});

describe('R08 동의 무효화', () => {
  it('조건이 바뀌면 v2, v1 동의는 집계에서 빠지고 v1 응답 제출은 stale_version', () => {
    const { s, out } = run(newCase('c1', sub),
      { type: 'request_family_review', actor: 'bot', terms: terms(2) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' },
      { type: 'revise_terms', actor: 'bot', terms: terms(3) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' });
    expect(out[2]!.reasons).toContain('version_bumped');
    expect(s.proposal!.version).toBe(2);
    expect(out[3]!.allowed).toBe(false);
    expect(out[3]!.reasons).toContain('stale_version');
    expect(tally(s.proposal!).agree).toEqual([]);
    expect(tally(s.proposal!).staleIgnored).toBe(1);
  });
  it('동의 철회는 인계 준비를 풀고 다시 잠근다', () => {
    const { s, out } = run(newCase('c1', sub),
      { type: 'request_family_review', actor: 'bot', terms: terms(3) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' },
      { type: 'cast_vote', actor: 'bro', version: 1, value: 'agree' },
      { type: 'prepare_owner_handoff', actor: 'bot' },
      { type: 'revoke_vote', actor: 'bro' },
      { type: 'prepare_owner_handoff', actor: 'bot' });
    expect(out[4]!.reasons).toContain('consent_withdrawn');
    expect(s.stage).toBe('family_review');
    expect(out[5]!.allowed).toBe(false);
  });
  it('같은 조건으로 다시 제안하면 버전이 오르지 않는다', () => {
    const { s } = run(newCase('c1', sub), { type: 'request_family_review', actor: 'bot', terms: terms(2) }, { type: 'revise_terms', actor: 'bot', terms: terms(2) });
    expect(s.proposal!.version).toBe(1);
  });
});

describe('R16 단일 정책 관문', () => {
  it('가족 동의가 완료돼도 지원하지 않는 경로 변경 인계는 보류한다', () => {
    const agreed = run(newCase('c1', sub),
      { type: 'request_family_review', actor: 'bot', terms: terms(2) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' },
      { type: 'cast_vote', actor: 'bro', version: 1, value: 'agree' }).s;
    const d = evaluateAction(agreed, { type: 'prepare_owner_handoff', actor: 'bot', switchTo: 'app_store' }, NOW);
    expect(d.allowed).toBe(false);
    expect(d.reasons).toContain('family_switch_not_supported');
    expect(d.next.stage).toBe('family_review');
    expect(d.next.closure.switchTo).toBeNull();
    expect(tally(d.next.proposal!).allAgreed).toBe(true);
  });

  it('해지 요청 기록은 결제자만 할 수 있다', () => {
    const { out } = run(newCase('c1', sub),
      { type: 'request_family_review', actor: 'bot', terms: terms(3) },
      { type: 'cast_vote', actor: 'mom', version: 1, value: 'agree' },
      { type: 'cast_vote', actor: 'bro', version: 1, value: 'agree' },
      { type: 'prepare_owner_handoff', actor: 'bot' },
      { type: 'record_cancel_request', actor: 'bot' },
      { type: 'record_cancel_request', actor: 'me' });
    expect(out[4]!.allowed).toBe(false);
    expect(out[4]!.reasons).toContain('not_owner');
    expect(out[5]!.allowed).toBe(true);
  });
  it('구성원이 아닌 사람의 투표는 거부, 거부도 감사 기록에 남는다', () => {
    const { s, out } = run(newCase('c1', sub), { type: 'request_family_review', actor: 'bot', terms: terms(2) }, { type: 'cast_vote', actor: 'stranger', version: 1, value: 'agree' });
    expect(out[1]!.reasons).toContain('not_member');
    expect(s.audit.at(-1)!.allowed).toBe(false);
  });
  it('결제 채널을 모르면 인계 준비를 보류한다 [R10]', () => {
    const { out } = run(newCase('c1', { ...sub, sharedWith: [], channel: null }), { type: 'prepare_owner_handoff', actor: 'bot' });
    expect(out[0]!.reasons).toContain('channel_unknown');
  });
});

describe('정확성 속성', () => {
  const vote = fc.record({ who: fc.constantFrom('mom', 'bro'), value: fc.constantFrom('agree' as const, 'object' as const, 'abstain' as const), revise: fc.boolean(), revoke: fc.boolean() });
  it('P6 인계 잠금: 현재 버전에서 전원 agree일 때만 인계가 허용된다', () => {
    fc.assert(fc.property(fc.array(vote, { maxLength: 12 }), (steps) => {
      let s = run(newCase('c1', sub), { type: 'request_family_review', actor: 'bot', terms: terms(2) }).s;
      let k = 2;
      for (const st of steps) {
        if (st.revise) s = evaluateAction(s, { type: 'revise_terms', actor: 'bot', terms: terms(++k) }, NOW).next;
        s = evaluateAction(s, st.revoke ? { type: 'revoke_vote', actor: st.who } : { type: 'cast_vote', actor: st.who, version: s.proposal!.version, value: st.value }, NOW).next;
      }
      if (s.stage === 'handoff_ready') return;
      const d = evaluateAction(s, { type: 'prepare_owner_handoff', actor: 'bot' }, NOW);
      expect(d.allowed).toBe(tally(s.proposal!).allAgreed);
    }));
  });
  it('P5 버전 무효화: 개정 직후 현재 버전 agree 수는 0', () => {
    fc.assert(fc.property(fc.array(vote, { maxLength: 8 }), (steps) => {
      let s = run(newCase('c1', sub), { type: 'request_family_review', actor: 'bot', terms: terms(2) }).s;
      for (const st of steps) s = evaluateAction(s, { type: 'cast_vote', actor: st.who, version: 1, value: st.value }, NOW).next;
      s = evaluateAction(s, { type: 'revise_terms', actor: 'bot', terms: terms(9) }, NOW).next;
      expect(tally(s.proposal!).agree.length).toBe(0);
    }));
  });
  it('같은 상태·행동·시각이면 같은 결과 (결정적)', () => {
    const s0 = run(newCase('c1', sub), { type: 'request_family_review', actor: 'bot', terms: terms(2) }).s;
    const a = evaluateAction(s0, { type: 'prepare_owner_handoff', actor: 'bot' }, NOW);
    const b = evaluateAction(s0, { type: 'prepare_owner_handoff', actor: 'bot' }, NOW);
    expect(a).toEqual(b);
  });
});
