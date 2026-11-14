// [R01][R02][R03][R05] 결제 전 검토함과 결제 문자 규칙 추출
import sms from '../fixtures/sms-payments.json';
import { parsePaymentText } from '../../src/domain/parsePayment';
import { reviewInbox, reviewStatus } from '../../src/domain/reminders';
import type { Subscription } from '../../src/domain/types';

const mk = (id: string, date: string | null): Subscription => ({ id, serviceId: 'disney_plus_kr', planId: 'standard', name: id, monthlyWon: 9900, nextChargeDate: date, channel: 'web', ownerId: 'me', sharedWith: [], sourceKind: 'demo', usage: null });

describe('R05 결제 전 검토함', () => {
  it('D-3·D-1·오늘·지남·결제일 미확인을 구분한다', () => {
    expect(reviewStatus(mk('a', '2026-11-17'), '2026-11-14').status).toBe('d3');
    expect(reviewStatus(mk('a', '2026-11-15'), '2026-11-14').status).toBe('d1');
    expect(reviewStatus(mk('a', '2026-11-14'), '2026-11-14').status).toBe('today');
    expect(reviewStatus(mk('a', '2026-11-10'), '2026-11-14').status).toBe('overdue');
    expect(reviewStatus(mk('a', null), '2026-11-14').status).toBe('no_date');
    expect(reviewStatus(mk('a', '2026-12-05'), '2026-11-14').status).toBe('later');
  });
  it('R03 같은 구독이 두 번 들어와도 검토함에는 한 번만', () => {
    const inbox = reviewInbox([mk('a', '2026-11-17'), mk('a', '2026-11-17'), mk('b', '2026-12-30')], '2026-11-14');
    expect(inbox.map((i) => i.subscriptionId)).toEqual(['a']);
  });
});

describe('R01·R02 결제 문자 추출', () => {
  const text = '[합성]\nGoogle Play 디즈니+ 9,900원 승인\n2026-11-17 09:00 KST';
  it('서비스·금액·날짜·채널과 원문 안의 근거 위치를 돌려준다', () => {
    const p = parsePaymentText(text)!;
    expect(p.eventType).toBe('approval');
    expect(p.serviceId).toBe('disney_plus_kr');
    expect(p.amountWon).toBe(9900);
    expect(p.date).toBe('2026-11-17');
    expect(p.channel).toBe('google_play');
    expect(text.slice(p.spans.amount!.start, p.spans.amount!.end)).toBe('9,900원');
    expect(text.slice(p.spans.service!.start, p.spans.service!.end)).toBe('디즈니+');
    expect(p.isCharge).toBe(true);
  });
  it('날짜가 본문에 없으면 null로 두고 추정하지 않는다', () => {
    const p = parsePaymentText('디즈니+ 9,900원 승인')!;
    expect(p.date).toBeNull();
    expect(p.unknownFields).toContain('date');
  });
  it('광고·인증번호·0원 유효성 확인은 청구가 아니다', () => {
    expect(parsePaymentText('(광고) 넷플릭스 멤버십 특가 7,000원')!.isCharge).toBe(false);
    expect(parsePaymentText('[합성] 인증번호 123456. 결제 아님')!.eventType).toBe('otp');
    expect(parsePaymentText('카드 승인 0원 2026-11-14 Apple 유효성 확인')!.eventType).toBe('zero_authorization');
  });

  type Case = { id: string; input: { text: string | null }; expected: { event_type: string; amount: { value: number | null; currency?: string | null } | null } };
  const cases = (sms as unknown as { cases: Case[] }).cases;
  it(`합성 fixture ${cases.length}건: 광고·인증·입력 오류를 청구로 잘못 세지 않는다`, () => {
    for (const c of cases) {
      const p = parsePaymentText(c.input.text);
      if (['advertisement', 'otp', 'input_error'].includes(c.expected.event_type)) expect(p?.isCharge ?? false).toBe(false);
    }
  });
  it('합성 fixture 원화 승인 문자는 금액이 모두 일치한다', () => {
    const krw = cases.filter((c) => c.expected.event_type === 'approval' && c.expected.amount?.value != null && (c.expected.amount.currency ?? 'KRW') === 'KRW');
    expect(krw.length).toBeGreaterThan(20);
    for (const c of krw) expect(parsePaymentText(c.input.text)?.amountWon, c.id).toBe(c.expected.amount!.value);
  });
  it('외화 승인은 원화로 바꿔 쓰지 않는다(amountWon=null, 외화 값만 보존) [R02]', () => {
    const fx = cases.filter((c) => c.expected.event_type === 'approval' && c.expected.amount?.currency && c.expected.amount.currency !== 'KRW');
    expect(fx.length).toBeGreaterThan(0);
    for (const c of fx) {
      const p = parsePaymentText(c.input.text)!;
      expect(p.amountWon, c.id).toBeNull();
      expect(p.foreignAmount, c.id).toEqual({ currency: c.expected.amount!.currency, value: c.expected.amount!.value });
    }
  });
});
