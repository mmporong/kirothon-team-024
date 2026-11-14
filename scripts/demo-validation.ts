// 점검 프로세스의 성공과 시연 업무의 완결을 별도로 검사한다.
import type { BotState } from '../src/bot/state';
import { refundRoute } from '../src/domain/channelPrice';
import { tally } from '../src/domain/consent';
import { routeFor } from '../src/domain/guides';
import { chargesAfterRequest, chargesOnNewChannel } from '../src/domain/verification';

export const DEMO_HUMAN_EXPECTATIONS = {
  owner_reply: { actor: '나', action: 'reply', allowed: true, reasons: [] },
  youtube_cancel: { actor: '나', action: 'cancel', allowed: true, reasons: ['provider_unconfirmed'] },
  disney_mom_v1: { actor: '엄마', action: 'vote', allowed: true, reasons: [] },
  disney_bro_object: { actor: '동생', action: 'vote', allowed: true, reasons: [] },
  disney_mom_stale: { actor: '엄마', action: 'vote-stale', allowed: false, reasons: ['stale_version'] },
  disney_mom_v2: { actor: '엄마', action: 'vote', allowed: true, reasons: [] },
  disney_bro_v2: { actor: '동생', action: 'vote', allowed: true, reasons: [] },
  disney_cancel: { actor: '나', action: 'cancel', allowed: true, reasons: ['provider_unconfirmed'] },
} as const;
export type DemoHumanId = keyof typeof DEMO_HUMAN_EXPECTATIONS;
export interface DemoHumanObservation { id: string; actor: string; action: string; allowed: boolean; reasons: readonly string[] }
export interface DemoIssue { code: string; detail: string; stepId?: string }
export class DemoBusinessError extends Error {
  receiptPath: string | null = null;
  constructor(public readonly issues: DemoIssue[]) { super(`시연 업무 검사 실패: ${issues.map((issue) => issue.code).join(', ')}`); this.name = 'DemoBusinessError'; }
}
export function humanIssues(step: DemoHumanObservation): DemoIssue[] {
  const expected = DEMO_HUMAN_EXPECTATIONS[step.id as DemoHumanId];
  const problem = (detail: string) => [{ code: 'human_outcome_mismatch', stepId: step.id, detail }];
  if (!expected) return problem('정의되지 않은 사람 단계');
  if (step.actor !== expected.actor || step.action !== expected.action || step.allowed !== expected.allowed || JSON.stringify([...step.reasons].sort()) !== JSON.stringify([...expected.reasons].sort())) {
    return problem(`기대 ${JSON.stringify(expected)} / 관측 ${JSON.stringify(step)}`);
  }
  return [];
}
export function assertDemoHuman(step: DemoHumanObservation): void {
  const issues = humanIssues(step); if (issues.length) throw new DemoBusinessError(issues);
}

export function demoBusinessIssues(s: BotState, humans: readonly DemoHumanObservation[]): DemoIssue[] {
  const issues = humans.flatMap(humanIssues);
  const check = (condition: unknown, code: string, detail: string) => { if (!condition) issues.push({ code, detail }); };
  const expectedIds = Object.keys(DEMO_HUMAN_EXPECTATIONS);
  check(JSON.stringify(humans.map((step) => step.id)) === JSON.stringify(expectedIds), 'human_steps_incomplete', '필수 사람 단계 8개가 정의된 순서로 한 번씩 필요함');
  const ytCases = s.cases.filter((c) => c.subscription.id === 'sub-youtube');
  const disneyCases = s.cases.filter((c) => c.subscription.id === 'sub-disney');
  check(ytCases.length === 1, 'youtube_case_missing_or_duplicate', 'YouTube의 동일 사건 한 개 필요');
  check(disneyCases.length === 1, 'disney_case_missing_or_duplicate', 'Disney+의 동일 사건 한 개 필요');
  const yt = ytCases[0], disney = disneyCases[0];
  const tool = (name: string, caseId: string) => s.toolLog.some((t) => t.ok && t.tool === name && t.args.caseId === caseId);
  const ownerRoutes = (caseId: string, owner: string) => s.messages.filter((m) => m.from === 'bot' && m.kind === 'route' && m.caseId === caseId && m.to === owner && m.text.trim());
  for (const id of ['sub-youtube', 'sub-disney']) {
    check(s.questions.some((q) => q.subscriptionId === id && q.to === 'me' && q.topic === 'decide' && q.status === 'answered'), 'owner_question_missing', `${id}: 결제 전 질문과 답변 기록 필요`);
  }
  if (yt) {
    check(yt.stage === 'reopened' && yt.subscription.channel === 'app_store' && yt.closure.switchTo === 'web' && !!yt.closure.requestedAt, 'youtube_final_state', 'App Store→웹 이동 요청 후 같은 사건이 재개방돼야 함');
    check(s.toolLog.some((t) => t.ok && t.tool === 'request_handoff' && t.args.caseId === yt.caseId && t.args.switchTo === 'web'), 'youtube_switch_handoff_missing', 'YouTube 웹 이동 인계의 성공 기록 필요');
    const routes = ownerRoutes(yt.caseId, yt.subscription.ownerId);
    check(routes.some((m) => !!yt.closure.requestedAt && m.at < yt.closure.requestedAt), 'youtube_switch_route_missing', '해지 요청 전에 결제자에게 이동 경로 안내 필요');
    check(chargesOnNewChannel(yt.closure).some((c) => c.channel === 'web' && c.synthetic && c.amountWon === 14900), 'new_channel_charge_missing', '합성 웹 청구가 정상 신규 경로 청구로 보존돼야 함');
    check(chargesAfterRequest(yt.closure).some((c) => c.channel === 'app_store' && c.synthetic && c.amountWon === 19500), 'old_channel_charge_missing', '합성 기존 App Store 문제 청구가 보존돼야 함');
    check(yt.audit.some((a) => a.allowed && a.action === 'observe_charge' && a.reasons.includes('charge_after_cancel') && a.stage === 'reopened'), 'charge_reopen_audit_missing', '기존 경로 청구로 같은 사건이 열린 감사 기록 필요');
    for (const [channel, effect] of [['web', 'expected_new_channel'], ['app_store', 'charge_after_cancel']] as const) {
      check(s.transactions.some((t) => t.linkedSubscriptionId === 'sub-youtube' && t.channel === channel && t.effect === effect), 'charge_classification_missing', `${channel}: ${effect} 분류 필요`);
    }
    const refund = refundRoute('app_store');
    check(!!refund?.url && routes.some((m) => !!yt.closure.requestedAt && m.at >= yt.closure.requestedAt && m.text.includes(refund.url!)), 'apple_refund_route_missing', '예상 밖 App Store 청구의 환불 경로 안내 필요');
    check(s.toolLog.some((t) => t.ok && t.tool === 'send_cancel_route' && t.args.subscriptionId === 'sub-youtube'), 'problem_charge_route_missing', '문제 청구 해지·환불 안내 도구의 성공 기록 필요');
  }
  if (disney) {
    check(disney.stage === 'cancel_requested' && !!disney.closure.requestedAt && !disney.closure.providerConfirmedAt, 'disney_final_state', 'Disney+는 인계 뒤 해지 요청만 기록된 단계여야 함');
    const p = disney.proposal;
    check(p?.version === 2 && p.terms.choice === 'pause' && p.terms.pauseMonths === 2, 'family_revision_missing', '반대 뒤 2개월 휴지 제안 v2가 필요함');
    if (p) {
      const votes = tally(p);
      check(p.requiredMembers.length === 2 && ['mom', 'bro'].every((id) => votes.agree.includes(id)) && !votes.object.length && !votes.pending.length && !votes.abstain.length, 'family_current_consent_missing', '현재 제안에 엄마·동생 모두 동의해야 함');
      check(p.votes.some((v) => v.memberId === 'bro' && v.version === 1 && v.value === 'object'), 'family_objection_missing', 'v1 반대 기록을 보존해야 함');
    }
    check(disney.audit.some((a) => a.action === 'cast_vote' && !a.allowed && a.reasons.length === 1 && a.reasons[0] === 'stale_version'), 'stale_vote_audit_missing', '의도된 v1 투표 거부는 stale_version 한 가지여야 함');
    check(tool('request_handoff', disney.caseId), 'disney_handoff_missing', '가족 동의 후 결제자 인계 성공 필요');
    const route = routeFor(disney.subscription.serviceId, disney.subscription.channel);
    const url = route.status === 'ok' ? route.route.official_url : null;
    check(!!url && ownerRoutes(disney.caseId, disney.subscription.ownerId).some((m) => m.text.includes(url)), 'disney_cancel_route_missing', '결제자에게 Disney+ 공식 해지 경로 안내 필요');
  }
  check(s.inbox.every((sms) => sms.processed), 'unprocessed_demo_sms', '합성 청구 문자 처리 완료 필요');
  return issues;
}
export function assertDemoBusiness(s: BotState, humans: readonly DemoHumanObservation[]): void {
  const issues = demoBusinessIssues(s, humans); if (issues.length) throw new DemoBusinessError(issues);
}
