// [R28][R29][R30] 결제 경로 가격 비교, 무료체험·App Store 결정 마감, 경로 이동 중 청구 구분
import fc from 'fast-check';
import { compareChannels, listDifferences, type PriceTable } from '../../src/domain/channelPrice';
import { evaluateAction, newCase } from '../../src/domain/policy';
import { decisionDeadline, reviewStatus } from '../../src/domain/reminders';
import type { Subscription } from '../../src/domain/types';

// 시험용 합성 가격표(실제 데이터는 src/data/channel_prices.json)
const T: PriceTable = {
  generated_at: 'test',
  services: [
    {
      id: 'svc_a', name: '합성 서비스A', plan: 'individual', plan_label: '개인',
      prices: [
        { channel: 'web', status: 'verified', monthly: 10000, annual: null, source_url: 'https://example.com/web', source_kind: 'official', checked_at: 't' },
        { channel: 'google_play', status: 'verified', monthly: 10000, annual: null, source_url: 'https://example.com/gp', source_kind: 'store_listing', checked_at: 't' },
        { channel: 'app_store', status: 'verified', monthly: 13000, annual: null, source_url: 'https://example.com/as', source_kind: 'store_listing', checked_at: 't' },
      ],
    },
    {
      id: 'svc_b', name: '합성 서비스B', plan: 'basic', plan_label: '베이직',
      prices: [
        { channel: 'web', status: 'verified', monthly: 9000, annual: null, source_url: 'https://example.com/b', source_kind: 'official', checked_at: 't' },
        { channel: 'app_store', status: 'reported', monthly: 12000, annual: null, source_url: 'https://news.example.com', source_kind: 'news', checked_at: 't' },
      ],
    },
  ],
};

describe('R28 결제 경로 가격 차이', () => {
  it('App Store 13,000원 vs 웹 10,000원 → 월 3,000원·연 36,000원 차이', () => {
    const c = compareChannels(T, 'svc_a', 'individual', 'app_store');
    expect(c.status).toBe('cheaper_available');
    expect(c.monthlyDiff).toBe(3000);
    expect(c.annualDiff).toBe(36000);
    expect(['web', 'google_play']).toContain(c.cheapest!.channel);
  });
  it('실제 청구액이 있으면 그 값을 현재 가격으로 쓴다', () => {
    const c = compareChannels(T, 'svc_a', 'individual', 'app_store', 12500);
    expect(c.currentBasis).toBe('charge');
    expect(c.monthlyDiff).toBe(2500);
  });
  it('이미 가장 싼 경로면 already_cheapest', () => {
    expect(compareChannels(T, 'svc_a', 'individual', 'web').status).toBe('already_cheapest');
  });
  it('보도 기준 가격만 있으면 차액을 계산하지 않는다', () => {
    const c = compareChannels(T, 'svc_b', 'basic', 'app_store');
    expect(c.status).toBe('not_comparable');
    expect(c.reasons).toContain('current_price_unknown');
    expect(c.reported).toHaveLength(1);
  });
  it('결제 경로를 모르면 비교하지 않는다', () => {
    expect(compareChannels(T, 'svc_a', 'individual', null).reasons).toContain('channel_unknown');
  });
  it('디즈니+처럼 기존 요금 자격이 있는 서비스는 경로를 옮기면 경고한다', () => {
    const t: PriceTable = { generated_at: 't', services: [{ ...T.services[0]!, id: 'disney_plus_kr', plan: 'standard' }] };
    expect(compareChannels(t, 'disney_plus_kr', 'standard', 'app_store').legacyWarning).toBe(true);
    expect(compareChannels(T, 'svc_a', 'individual', 'app_store').legacyWarning).toBe(false);
  });
  it('속성: 차액은 0 이상이고, 차액 > 0 이면 더 싼 경로의 가격 + 차액 = 현재 가격', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200000 }), fc.integer({ min: 1, max: 200000 }), (web, app) => {
        const t: PriceTable = { generated_at: 't', services: [{ id: 's', name: 's', plan: 'p', plan_label: 'p', prices: [
          { channel: 'web', status: 'verified', monthly: web, annual: null, source_url: 'https://x', source_kind: 'official', checked_at: 't' },
          { channel: 'app_store', status: 'verified', monthly: app, annual: null, source_url: 'https://y', source_kind: 'store_listing', checked_at: 't' },
        ] }] };
        const c = compareChannels(t, 's', 'p', 'app_store');
        expect(c.monthlyDiff).toBeGreaterThanOrEqual(0);
        if (c.status === 'cheaper_available') expect((c.cheapest!.monthly as number) + (c.monthlyDiff as number)).toBe(app);
        else expect(app).toBeLessThanOrEqual(web);
      }),
    );
  });
  it('차이가 있는 요금제만, 차액이 큰 순서로 나열한다', () => {
    const d = listDifferences(T);
    expect(d.map((x) => x.service.id)).toEqual(['svc_a']);
    expect(d[0]!.monthlyDiff).toBe(3000);
  });
});

const base: Subscription = { id: 'sub-yt', serviceId: 'youtube_premium_kr', planId: 'individual', name: '유튜브 프리미엄', monthlyWon: null, nextChargeDate: '2026-11-15', channel: 'app_store', ownerId: 'me', sharedWith: [], sourceKind: 'demo', usage: null, trialEndsAt: '2026-11-15' };

describe('R29 무료체험·결제 경로별 결정 마감', () => {
  it('App Store 무료체험은 종료 하루 전이 결정 마감이다(24시간 전 갱신)', () => {
    const d = decisionDeadline(base);
    expect(d.kind).toBe('trial_end');
    expect(d.cancelBy).toBe('2026-11-14');
    expect(reviewStatus(base, '2026-11-14').status).toBe('today');
  });
  it('웹 결제는 결제일 당일이 마감', () => {
    expect(decisionDeadline({ ...base, channel: 'web', trialEndsAt: null, nextChargeDate: '2026-11-17' }).cancelBy).toBe('2026-11-17');
  });
});

describe('R30 경로를 옮기는 사건의 청구 구분', () => {
  it('새 경로(웹) 청구는 예상된 청구, 이전 경로(App Store) 청구는 사건 재개방', () => {
    let s = newCase('c-yt', base);
    let d = evaluateAction(s, { type: 'prepare_owner_handoff', actor: 'bot', switchTo: 'web' }, '2026-11-14T09:30:00+09:00');
    expect(d.allowed).toBe(true);
    s = evaluateAction(d.next, { type: 'record_cancel_request', actor: 'me' }, '2026-11-14T10:00:00+09:00').next;
    d = evaluateAction(s, { type: 'observe_charge', actor: 'bot', charge: { date: '2026-11-15', amountWon: 14900, channel: 'web', synthetic: true } }, '2026-11-15T09:00:00+09:00');
    expect(d.reasons).toContain('charge_on_new_channel');
    expect(d.next.stage).toBe('cancel_requested');
    d = evaluateAction(d.next, { type: 'observe_charge', actor: 'bot', charge: { date: '2026-11-15', amountWon: 14000, channel: 'app_store', synthetic: true } }, '2026-11-15T09:01:00+09:00');
    expect(d.reasons).toContain('charge_after_cancel');
    expect(d.next.stage).toBe('reopened');
  });
  it('지금과 같은 경로로 옮기는 인계는 거부', () => {
    const d = evaluateAction(newCase('c', base), { type: 'prepare_owner_handoff', actor: 'bot', switchTo: 'app_store' }, '2026-11-14T09:30:00+09:00');
    expect(d.reasons).toContain('same_channel');
  });
});
