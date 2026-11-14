// [R11][R12][R13] 해지 사건: 요청≠완료, 범위 한정 확인, 재청구 재개방(P7), 원문 제외(P8)
import fc from 'fast-check';
import { buildSummary, summaryMarkdown } from '../../src/domain/evidence';
import { evaluateAction, newCase, type CaseState } from '../../src/domain/policy';
import type { Subscription } from '../../src/domain/types';
import { closureStatus, EMPTY_CLOSURE } from '../../src/domain/verification';

const sub: Subscription = { id: 'sub-disney', serviceId: 'disney_plus_kr', planId: 'standard', name: '디즈니+ 스탠다드', monthlyWon: 9900, nextChargeDate: '2026-11-17', channel: 'web', ownerId: 'me', sharedWith: [], sourceKind: 'demo', usage: null };

function cancelled(): CaseState {
  let s = newCase('c1', sub);
  s = evaluateAction(s, { type: 'prepare_owner_handoff', actor: 'bot' }, '2026-11-14T18:00:00+09:00').next;
  s = evaluateAction(s, { type: 'record_cancel_request', actor: 'me' }, '2026-11-14T18:30:00+09:00').next;
  return s;
}

describe('R11 해지 요청 ≠ 해지 완료', () => {
  it('요청만 있으면 requested_unconfirmed', () => {
    const s = cancelled();
    expect(s.stage).toBe('cancel_requested');
    expect(closureStatus(s.closure, '2026-11-20').status).toBe('requested_unconfirmed');
  });
});

describe('R12 범위 한정 확인', () => {
  it('결제 예정일+3일 전이면 보류, 지나고 경로를 확인했으면 no_charge_observed_scoped', () => {
    let s = cancelled();
    s = evaluateAction(s, { type: 'record_provider_confirmation', actor: 'me' }, '2026-11-14T18:40:00+09:00').next;
    const early = evaluateAction(s, { type: 'check_next_cycle', actor: 'bot' }, '2026-11-18T09:00:00+09:00');
    expect(early.allowed).toBe(false);
    expect(early.reasons).toContain('before_expected_date');
    const noChannel = evaluateAction(s, { type: 'check_next_cycle', actor: 'bot' }, '2026-11-21T09:00:00+09:00');
    expect(noChannel.reasons).toContain('no_channel_checked');
    s = evaluateAction(s, { type: 'mark_channel_checked', actor: 'me', channel: 'web' }, '2026-11-21T09:00:00+09:00').next;
    const ok = evaluateAction(s, { type: 'check_next_cycle', actor: 'bot' }, '2026-11-21T09:00:00+09:00');
    expect(ok.allowed).toBe(true);
    expect(ok.next.stage).toBe('no_charge_observed_scoped');
  });
});

describe('P7 재청구 재개방', () => {
  it('해지 요청 뒤 Google Play 청구가 관측되면 같은 사건이 reopened', () => {
    const s = cancelled();
    const d = evaluateAction(s, { type: 'observe_charge', actor: 'bot', charge: { date: '2026-11-17', amountWon: 9900, channel: 'google_play', synthetic: true } }, '2026-11-17T09:00:00+09:00');
    expect(d.next.stage).toBe('reopened');
    expect(d.reasons).toContain('charge_after_cancel');
    expect(d.next.caseId).toBe('c1');
  });
  it('속성: 요청 이후 청구가 하나라도 있으면 어떤 날짜에도 no_charge_observed_scoped가 아니다', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 90 }), fc.integer({ min: 1, max: 100000 }), (chargeOffset, todayOffset, amt) => {
      const day = (n: number) => new Date(Date.parse('2026-11-14T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
      const rec = { ...EMPTY_CLOSURE, requestedAt: '2026-11-14T18:30:00+09:00', providerConfirmedAt: '2026-11-14T18:40:00+09:00', expectedNextCharge: '2026-11-17', checkedChannels: ['web' as const], observedCharges: [{ date: day(chargeOffset), amountWon: amt, channel: null, synthetic: true }] };
      expect(closureStatus(rec, day(todayOffset)).status).toBe('reopened');
    }));
  });
});

describe('P8 원문 제외', () => {
  it('요약에 결제 문자 원문(canary)이 들어가지 않는다', () => {
    const CANARY = 'CANARY-RAW-SMS-7f3a 홍길동 010-1234-5678';
    let s = cancelled();
    s = { ...s, subscription: { ...s.subscription } };
    const d = evaluateAction(s, { type: 'observe_charge', actor: 'bot', charge: { date: '2026-11-17', amountWon: 9900, channel: 'google_play', synthetic: true } }, '2026-11-17T09:00:00+09:00');
    const md = summaryMarkdown(buildSummary(d.next, null, '2026-11-17T09:05:00+09:00'));
    expect(md).not.toContain(CANARY);
    expect(md).not.toMatch(/010-\d{4}-\d{4}/);
    expect(md).toContain('사건 다시 열림');
  });
});
