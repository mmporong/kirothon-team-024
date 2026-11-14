// [R22]~[R27] 봇 도구를 Kiro 없이 결정적으로 재현한다. 실제 Kiro 실행 기록은 docs/evidence/bot-runs/
import seed from '../../bot-state/seed/household.json';
import { addSms, humanRecordCancel, humanReply, humanVote, setClock } from '../../src/bot/human';
import type { BotState } from '../../src/bot/state';
import { runTool, TOOL_NAMES, unverifiedNumbers } from '../../src/bot/tools';
import { CHANNEL_PRICES, findPrices, type ServicePrices } from '../../src/domain/channelPrice';

// 경로 정책 시험의 월간 가격은 합성 가정이다. 실제 YT 가격·기간 검증 실적이 아니다.
vi.mock('../../src/domain/channelPrice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/domain/channelPrice')>();
  const synthetic: ServicePrices = {
    id: 'youtube_premium_kr', name: '합성 YT 경로 정책 시험', plan: 'individual', plan_label: '합성 월간 개인',
    note: '정책 회귀시험용 합성 월간 가격이며 실제 판매 가격·기간 확인과 무관함',
    prices: [
      { channel: 'web', status: 'verified', monthly: 14900, annual: null, currency: 'KRW', source_url: 'https://example.invalid/synthetic/yt/web', source_kind: 'official', checked_at: 'synthetic-fixture' },
      { channel: 'app_store', status: 'verified', monthly: 19500, annual: null, currency: 'KRW', source_url: 'https://example.invalid/synthetic/yt/ios', source_kind: 'store_listing', checked_at: 'synthetic-fixture' },
      { channel: 'google_play', status: 'verified', monthly: 14900, annual: null, currency: 'KRW', source_url: 'https://example.invalid/synthetic/yt/android', source_kind: 'official', checked_at: 'synthetic-fixture' },
    ],
  };
  return {
    ...actual,
    CHANNEL_PRICES: { ...actual.CHANNEL_PRICES, services: [...actual.CHANNEL_PRICES.services.filter((s) => s.id !== synthetic.id || s.plan !== synthetic.plan), synthetic] },
  };
});

const fresh = () => structuredClone(seed) as unknown as BotState;
function call(s: BotState, name: string, args: Record<string, unknown> = {}) {
  const r = runTool(s, name, args);
  return { s: r.state, o: r.outcome };
}

describe('R23 사람만 할 수 있는 일은 도구가 없다', () => {
  it('투표·철회·해지 신청 기록·사업자 확인 도구가 없다', () => {
    for (const forbidden of ['cast_vote', 'revoke_vote', 'record_cancel_request', 'record_provider_confirmation', 'mark_channel_checked']) expect(TOOL_NAMES).not.toContain(forbidden);
    expect(TOOL_NAMES).toHaveLength(13);
  });
});

describe('R22 점검: 결제 3일 전 먼저 묻기', () => {
  it('결정 마감 3일 안의 구독(유튜브 취소 결정 D-1·디즈니+ D-3)을 찾고, 계산한 숫자로만 질문한다', () => {
    let s = fresh();
    let r = call(s, 'get_status');
    s = r.s;
    const subs = r.o.result.subscriptions as { id: string; dueWithin3Days: boolean }[];
    expect(subs.filter((x) => x.dueWithin3Days).map((x) => x.id)).toEqual(['sub-youtube', 'sub-disney']);
    r = call(s, 'ask_member', { to: '나', subscriptionId: 'sub-disney', text: '한 달 쉬면 5,000원 아껴요' });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toEqual(['unverified_number']);
    s = r.s;
    r = call(s, 'calc_resub', { subscriptionId: 'sub-disney', pauseMonths: 1 });
    s = r.s;
    expect(r.o.result.advice).toContain('1개월만 쉬면 7,700원 더 들고, 2개월 이상 안 볼 거면 해지가 이득이에요');
    r = call(s, 'ask_member', { to: '나', subscriptionId: 'sub-disney', text: `11월 17일에 디즈니+ 9,900원이 결제돼요. ${r.o.result.advice}`, choices: ['유지', '2개월 쉬기', '가족과 상의'] });
    expect(r.o.ok).toBe(true);
    s = r.s;
    r = call(s, 'ask_member', { to: '나', subscriptionId: 'sub-disney', text: '다시 묻기' });
    expect(r.o.reasons).toEqual(['duplicate_pending']);
  });
});

describe('R27 결제 문자 원문을 모델에 돌려주지 않는다', () => {
  it('ingest_sms 결과에 원문 조각(카드번호·이름)이 없다', () => {
    const r = call(fresh(), 'ingest_sms');
    const json = JSON.stringify(r.o);
    expect(json).not.toContain('홍*동');
    expect(json).not.toContain('카드(1234)');
    expect(r.o.result.rawTextReturned).toBe(false);
    expect(json).toContain('청구 아님');
  });
});

describe('R24·R25 전체 시나리오: 거부 → 재계획 → 동의 → 인계 → 재청구 재개방', () => {
  it('정책 관문의 거부 사유에 따라 다음 행동이 달라진다', () => {
    let s = fresh();
    s = call(s, 'calc_resub', { subscriptionId: 'sub-disney', pauseMonths: 2 }).s;
    s = call(s, 'ask_member', { to: 'me', subscriptionId: 'sub-disney', text: '11월 17일 결제 전에 여쭤요. 2개월 쉬면 3,800원 아껴요.' }).s;
    s = humanReply(s, 'me', '2개월 쉬는 걸로 엄마랑 동생한테 물어봐 줘').state;

    let r = call(s, 'propose_family_plan', { subscriptionId: 'sub-disney', choice: 'pause', pauseMonths: 2 });
    expect(r.o.result.version).toBe(1);
    expect(r.o.result.sentTo).toEqual(['엄마', '동생']);
    s = r.s;
    const caseId = r.o.result.caseId as string;
    r = call(s, 'request_handoff', { caseId });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toContain('consent_missing');
    s = r.s;
    r = call(s, 'remind_pending', { caseId });
    expect(r.o.result.remindedTo).toEqual([]); // 방금 물어봤으면 건너뜀
    s = r.s;

    s = humanVote(s, 'mom', 'agree').state;
    s = humanVote(s, 'bro', 'object', { comment: '2개월은 애매해요. 3개월 쉬어요.' }).state;
    r = call(s, 'request_handoff', { caseId });
    expect(r.o.reasons).toContain('objection_present');
    s = r.s;
    r = call(s, 'calc_resub', { subscriptionId: 'sub-disney', pauseMonths: 3 });
    expect(r.o.result.delta).toBe('+15,300원');
    s = r.s;
    r = call(s, 'propose_family_plan', { subscriptionId: 'sub-disney', choice: 'pause', pauseMonths: 3, note: '동생 의견 반영' });
    expect(r.o.result.version).toBe(2);
    expect(r.o.result.invalidatedOldVotes).toBe(2);
    s = r.s;

    const stale = humanVote(s, 'mom', 'agree', { version: 1 });
    expect(stale.result.allowed).toBe(false);
    expect(stale.result.reasons).toContain('stale_version');
    s = humanVote(stale.state, 'mom', 'agree').state;
    s = humanVote(s, 'bro', 'agree').state;
    r = call(setClock(s, '2026-11-14T18:00:00+09:00'), 'request_handoff', { caseId });
    expect(r.o.ok).toBe(true);
    s = r.s;
    expect(s.messages.at(-1)!.kind).toBe('route');
    expect(s.messages.at(-1)!.to).toBe('me');

    expect(humanRecordCancel(s, 'mom').result.allowed).toBe(false); // 결제자만
    s = humanRecordCancel(s, 'me').state;
    s = setClock(s, '2026-11-17T09:00:00+09:00');
    s = addSms(s, '[합성 데모]\nKB국민카드[합성] 카드(1234) 승인\n9,900원 일시불\n2026-11-17 09:00 KST\nGoogle Play 디즈니+', '2026-11-17T09:00:30+09:00');
    r = call(s, 'ingest_sms');
    expect(JSON.stringify(r.o.result)).toContain('해지 요청 뒤 청구');
    s = r.s;
    expect(s.cases[0]!.stage).toBe('reopened');
    r = call(s, 'send_cancel_route', { subscriptionId: 'sub-disney' });
    expect(r.o.result.channel).toBe('google_play');
    expect(r.s.messages.at(-1)!.text).toContain('Google Play');
    expect(call(r.s, 'send_cancel_route', { subscriptionId: 'sub-disney' }).o.reasons).toEqual(['duplicate_route']);
  });
});

describe('B2 숫자 검증', () => {
  it('원 단위 숫자만 검사하고 허용 목록에 없는 값을 돌려준다', () => {
    expect(unverifiedNumbers('7,700원 더 들고 3,800원 아껴요, 2개월', new Set([7700, 3800]))).toEqual([]);
    expect(unverifiedNumbers('5,000원 아껴요', new Set([7700]))).toEqual([5000]);
  });
});

function youtubeCase(state = fresh()) {
  const s = call(state, 'ask_member', { to: 'me', subscriptionId: 'sub-youtube', text: '다음 결제 전에 확인해 주세요.' }).s;
  return { s, caseId: s.cases.find((c) => c.subscription.id === 'sub-youtube')!.caseId };
}

function switchedYoutube() {
  const { s, caseId } = youtubeCase();
  const handoff = call(s, 'request_handoff', { caseId, switchTo: 'web' });
  expect(handoff.o.ok).toBe(true);
  return { s: setClock(humanRecordCancel(handoff.s, 'me', caseId).state, '2026-11-16T10:00:00+09:00'), caseId };
}

const oldAppleCharge = '[합성]\n19,500원 승인\n2026-11-16 00:12 KST\nAPPLE.COM/BILL';
const newWebCharge = '[합성]\n14,900원 승인\n2026-11-16 08:10 KST\n유튜브 프리미엄 웹결제';

describe('FINAL-CORE 문제 청구의 환불 경로', () => {
  it.each([[oldAppleCharge, newWebCharge], [newWebCharge, oldAppleCharge]])('수집 순서와 무관하게 기존 Apple 문제 청구만 안내한다', (...texts) => {
    let { s } = switchedYoutube();
    for (const text of texts) s = addSms(s, text, '2026-11-16T09:00:00+09:00');
    s = call(s, 'ingest_sms').s;
    const r = call(s, 'send_cancel_route', { subscriptionId: 'sub-youtube' });
    expect(r.o.ok).toBe(true);
    expect(r.o.result.channel).toBe('app_store');
    const message = r.s.messages.at(-1)!.text;
    expect(message).toContain('App Store로 19,500원이 청구됐어요');
    expect(message).toContain('reportaproblem.apple.com');
    expect(message).toContain('이중 결제');
  });
  it('정상 신규 경로를 환불 대상으로 지정하면 거부하고 안내를 보내지 않는다', () => {
    let { s } = switchedYoutube();
    s = call(addSms(addSms(s, oldAppleCharge, '2026-11-16T09:00:00+09:00'), newWebCharge, '2026-11-16T09:00:01+09:00'), 'ingest_sms').s;
    const r = call(s, 'send_cancel_route', { subscriptionId: 'sub-youtube', channel: 'web' });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toContain('problem_charge_channel_mismatch');
    expect(r.s.messages).toEqual(s.messages);
  });
  it('정상 새 경로 청구만 있으면 환불·해지 안내를 보류한다', () => {
    let { s } = switchedYoutube();
    s = call(addSms(s, newWebCharge, '2026-11-16T09:00:00+09:00'), 'ingest_sms').s;
    const r = call(s, 'send_cancel_route', { subscriptionId: 'sub-youtube' });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toContain('no_unexpected_charge');
    expect(r.s.messages).toEqual(s.messages);
  });
  it('문제 청구의 경로가 미확인이면 등록 경로로 추정하지 않는다', () => {
    const { s, caseId } = switchedYoutube();
    s.cases.find((c) => c.caseId === caseId)!.closure.observedCharges.push({ date: '2026-11-16', amountWon: 19500, channel: null, synthetic: true });
    const r = call(s, 'send_cancel_route', { subscriptionId: 'sub-youtube' });
    expect(r.o.result.channel).toBeNull();
    expect(r.o.result.routeStatus).toBe('channel_unknown');
    expect(r.s.messages.at(-1)!.text).not.toContain('reportaproblem.apple.com');
  });
});

describe('FINAL-CORE 절약 목적 인계의 가격·가족 조건', () => {
  it('현재 웹 가격보다 비싼 App Store 이동을 거부한다', () => {
    const state = fresh();
    Object.assign(state.subscriptions.find((s) => s.id === 'sub-youtube')!, { channel: 'web', monthlyWon: 14900, trialEndsAt: null });
    const { s, caseId } = youtubeCase(state);
    const r = call(s, 'request_handoff', { caseId, switchTo: 'app_store' });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toContain('switch_not_cheaper');
    expect(r.s.messages).toEqual(s.messages);
    expect(r.s.cases.find((c) => c.caseId === caseId)!.stage).toBe('reviewing');
  });
  it.each(['unknown', 'reported', 'not_offered'] as const)('%s 목적지는 다른 경로가 저렴해도 이동 대상으로 쓰지 않는다', (status) => {
    const target = findPrices(CHANNEL_PRICES, 'youtube_premium_kr', 'individual')!.prices.find((p) => p.channel === 'web')!;
    const previous = target.status;
    try {
      target.status = status;
      const { s, caseId } = youtubeCase();
      const r = call(s, 'request_handoff', { caseId, switchTo: 'web' });
      expect(r.o.ok).toBe(false);
      expect(r.o.reasons).toContain('switch_target_unverified');
      expect(r.s.messages).toEqual(s.messages);
      expect(r.s.cases.find((c) => c.caseId === caseId)!.closure.switchTo).toBeNull();
    } finally {
      target.status = previous;
    }
  });
  it('현재 가격·비교 자료를 확인할 수 없으면 이동을 보류한다', () => {
    const state = fresh();
    state.subscriptions.find((s) => s.id === 'sub-youtube')!.serviceId = 'unknown_service';
    const { s, caseId } = youtubeCase(state);
    const r = call(s, 'request_handoff', { caseId, switchTo: 'web' });
    expect(r.o.ok).toBe(false);
    expect(r.s.messages).toEqual(s.messages);
    expect(r.s.cases.find((c) => c.caseId === caseId)!.stage).toBe('reviewing');
  });
  it('잘못된 switchTo를 일반 해지 요청으로 바꾸지 않는다', () => {
    const { s, caseId } = youtubeCase();
    const r = call(s, 'request_handoff', { caseId, switchTo: 'unverified_store' });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toContain('invalid_switch_target');
    expect(r.s.messages).toEqual(s.messages);
  });
  it('가족의 해지·휴지 동의를 경로 변경 동의로 재사용하지 않는다', () => {
    let r = call(fresh(), 'propose_family_plan', { subscriptionId: 'sub-disney', choice: 'pause', pauseMonths: 2 });
    const s = humanVote(humanVote(r.s, 'mom', 'agree').state, 'bro', 'agree').state;
    r = call(s, 'request_handoff', { caseId: r.o.result.caseId, switchTo: 'app_store' });
    expect(r.o.ok).toBe(false);
    expect(r.o.reasons).toContain('family_switch_not_supported');
    expect(r.s.messages).toEqual(s.messages);
    expect(r.s.cases[0]!.stage).toBe('family_review');
    expect(r.s.cases[0]!.closure.switchTo).toBeNull();
  });
});

describe('FINAL-CORE 체험 종료와 취소 결정 마감', () => {
  it('체험 종료 D-2와 결정 마감 D-1을 별도로 전달한다', () => {
    const r = call(fresh(), 'get_status');
    const yt = (r.o.result.subscriptions as Record<string, unknown>[]).find((s) => s.id === 'sub-youtube')!;
    expect(yt.daysToChargeOrTrialEnd).toBe(2);
    expect(yt.daysToDecide).toBe(1);
    expect(yt.trialEndsAt).toBe('2026-11-16');
    expect(yt.decideBy).toBe('2026-11-15');
  });
});

describe('R28·R29·R30 합성 월간 가격의 경로 이동·이중 결제 감지', () => {
  it('합성 App Store 19,500원 vs 웹 14,900원 → 월 4,600원 차이, 기존 경로 청구면 재개방·환불 경로', () => {
    let s = fresh();
    let r = call(s, 'get_status');
    const yt = (r.o.result.subscriptions as { id: string; decideBy: string; cheaperChannel: string | null; deadline: string }[]).find((x) => x.id === 'sub-youtube')!;
    expect(yt.decideBy).toBe('2026-11-15');
    expect(yt.deadline).toContain('무료체험');
    expect(yt.cheaperChannel).toContain('4,600원');
    s = r.s;
    r = call(s, 'compare_channels', { subscriptionId: 'sub-youtube' });
    expect(r.o.result.monthlyDiff).toBe('4,600원');
    expect(r.o.result.annualDiff).toBe('55,200원');
    expect((r.o.result.cheapest as { channelId: string }).channelId).toBe('web');
    s = r.s;
    r = call(s, 'ask_member', { to: 'me', subscriptionId: 'sub-youtube', text: `무료체험이 11월 16일에 끝나요. ${r.o.result.sentence}`, choices: ['웹으로 옮기기', '해지', '그대로'] });
    expect(r.o.ok).toBe(true);
    s = humanReply(r.s, 'me', '웹으로 옮길게').state;
    const caseId = s.cases.find((c) => c.subscription.id === 'sub-youtube')!.caseId;
    r = call(s, 'request_handoff', { caseId, switchTo: 'web' });
    expect(r.o.ok).toBe(true);
    expect(r.s.messages.at(-1)!.text).toContain('App Store에서 웹으로 옮기는 방법');
    s = humanRecordCancel(r.s, 'me', caseId).state;
    s = setClock(s, '2026-11-16T09:00:00+09:00');
    s = addSms(s, '[합성]\nKB국민카드[합성] 카드(1234) 승인\n14,900원 일시불\n2026-11-16 08:10 KST\n유튜브 프리미엄 웹결제', '2026-11-16T08:10:20+09:00');
    s = addSms(s, '[합성]\nKB국민카드[합성] 카드(1234) 승인\n19,500원 일시불\n2026-11-16 00:12 KST\nAPPLE.COM/BILL', '2026-11-16T00:12:40+09:00');
    r = call(s, 'ingest_sms');
    const processed = (r.o.result.processed as { effect: string; linkedBy: string | null }[]).slice(-2); // 앞의 3건은 시드 문자
    expect(processed.map((x) => x.effect)).toEqual(['옮긴 결제 경로의 예상된 청구', '해지 요청 뒤 청구 — 사건 다시 열림']);
    expect(processed[1]!.linkedBy).toBe('청구처·금액');
    s = r.s;
    expect(s.cases.find((c) => c.caseId === caseId)!.stage).toBe('reopened');
    r = call(s, 'send_cancel_route', { subscriptionId: 'sub-youtube' });
    const text = r.s.messages.at(-1)!.text;
    expect(text).toContain('이중 결제');
    expect(text).toContain('reportaproblem.apple.com');
  });
});
