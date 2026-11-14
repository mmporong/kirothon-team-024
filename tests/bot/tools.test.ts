// [R22]~[R27] 봇 도구를 Kiro 없이 결정적으로 재현한다. 실제 Kiro 실행 기록은 docs/evidence/bot-runs/
import seed from '../../bot-state/seed/household.json';
import { addSms, humanRecordCancel, humanReply, humanVote, setClock } from '../../src/bot/human';
import type { BotState } from '../../src/bot/state';
import { runTool, TOOL_NAMES, unverifiedNumbers } from '../../src/bot/tools';

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
  it('결정 마감 3일 안의 구독(유튜브 체험 D-1·디즈니+ D-3)을 찾고, 계산한 숫자로만 질문한다', () => {
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

describe('R28·R29·R30 결제 경로 갈아타기: App Store 체험 → 웹, 이중 결제 감지', () => {
  it('App Store 19,500원 vs 웹 14,900원 → 월 4,600원 차이, 옮긴 뒤 App Store 청구가 오면 재개방·환불 경로', () => {
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
