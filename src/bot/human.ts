// 사람(결제자·가족)의 행동. 봇 도구가 아니라 앱 화면·데모 실행기에서만 부른다. 같은 정책 관문을 거친다. [R16][R23]
import { tally, type VoteValue } from '../domain/consent';
import { evaluateAction, REASON_TEXT, type Reason } from '../domain/policy';
import { labelOf, memberOf, nextId, replaceCase, type BotState } from './state';

export interface HumanResult {
  allowed: boolean;
  reasons: string[];
  text: string;
}

const VOTE_LABEL: Record<VoteValue, string> = { agree: '동의', object: '반대', abstain: '보류' };

export function setClock(s: BotState, iso: string): BotState {
  return { ...structuredClone(s), clock: iso };
}

export function addSms(state: BotState, text: string, receivedAt: string): BotState {
  const s = structuredClone(state);
  s.inbox.push({ id: nextId(s, 'sms'), receivedAt, text, processed: false, synthetic: true });
  return s;
}

/** 구성원이 봇에게 답장한다. 그 사람의 대기 중 결정 질문은 답한 것으로 바뀐다. */
export function humanReply(state: BotState, from: string, text: string, subscriptionId: string | null = null): { state: BotState; result: HumanResult } {
  const s = structuredClone(state);
  const m = memberOf(s, from);
  if (!m) return { state, result: { allowed: false, reasons: ['unknown_member'], text: '구성원을 찾지 못했어요' } };
  const q = s.questions.filter((x) => x.to === m.id && x.status === 'pending' && x.topic === 'decide' && (!subscriptionId || x.subscriptionId === subscriptionId)).at(-1);
  if (q) q.status = 'answered';
  s.messages.push({ id: nextId(s, 'msg'), at: s.clock, from: m.id, to: 'bot', kind: 'reply', text, subscriptionId: q?.subscriptionId ?? subscriptionId, caseId: q?.caseId ?? null, questionId: q?.id, readByBot: false, patrolId: null });
  return { state: s, result: { allowed: true, reasons: [], text: `${m.label}: ${text}` } };
}

/** 가족 제안에 응답한다. version을 주지 않으면 현재 버전. 이전 버전 응답은 정책 관문이 거부한다. */
export function humanVote(state: BotState, from: string, value: VoteValue, opts: { comment?: string; version?: number; caseId?: string } = {}): { state: BotState; result: HumanResult } {
  const s = structuredClone(state);
  const m = memberOf(s, from);
  const c = s.cases.find((x) => (opts.caseId ? x.caseId === opts.caseId : x.proposal?.requiredMembers.includes(m?.id ?? '')));
  if (!m || !c?.proposal) return { state, result: { allowed: false, reasons: ['no_proposal'], text: '응답할 가족 제안이 없어요' } };
  const version = opts.version ?? c.proposal.version;
  const d = evaluateAction(c, { type: 'cast_vote', actor: m.id, version, value, comment: opts.comment }, s.clock);
  replaceCase(s, d.next);
  if (!d.allowed) return { state: s, result: { allowed: false, reasons: d.reasons, text: `${m.label}의 v${version} ${VOTE_LABEL[value]} 응답 거부: ${d.reasons.map((r) => REASON_TEXT[r as Reason]).join(' / ')}` } };
  for (const q of s.questions) if (q.to === m.id && q.caseId === c.caseId && q.topic === 'vote' && q.version === version && q.status === 'pending') q.status = 'answered';
  const t = tally(d.next.proposal!);
  const text = `${VOTE_LABEL[value]} (제안 v${version})${opts.comment ? ` — "${opts.comment}"` : ''}`;
  s.messages.push({ id: nextId(s, 'msg'), at: s.clock, from: m.id, to: 'bot', kind: 'vote', text, subscriptionId: c.subscription.id, caseId: c.caseId, version, readByBot: false, patrolId: null });
  return { state: s, result: { allowed: true, reasons: d.reasons, text: `${m.label}: ${text} · 현재 동의 ${t.agree.length}/${d.next.proposal!.requiredMembers.length}` } };
}

/** 결제자가 실제 서비스에서 해지를 신청한 뒤 앱에 기록한다. 결제자만 가능. */
export function humanRecordCancel(state: BotState, from: string, caseId?: string): { state: BotState; result: HumanResult } {
  const s = structuredClone(state);
  const m = memberOf(s, from);
  const c = s.cases.find((x) => (caseId ? x.caseId === caseId : x.stage === 'handoff_ready'));
  if (!m || !c) return { state, result: { allowed: false, reasons: ['no_case'], text: '해지 신청을 기록할 사건이 없어요' } };
  const d = evaluateAction(c, { type: 'record_cancel_request', actor: m.id }, s.clock);
  replaceCase(s, d.next);
  if (!d.allowed) return { state: s, result: { allowed: false, reasons: d.reasons, text: `${m.label}의 해지 신청 기록 거부: ${d.reasons.map((r) => REASON_TEXT[r as Reason]).join(' / ')}` } };
  s.messages.push({ id: nextId(s, 'msg'), at: s.clock, from: m.id, to: 'bot', kind: 'action', text: `${c.subscription.name} 해지 신청함 (사업자 확인은 아직)`, subscriptionId: c.subscription.id, caseId: c.caseId, readByBot: false, patrolId: null });
  return { state: s, result: { allowed: true, reasons: d.reasons, text: `${labelOf(s, m.id)}: 해지 신청함 기록 — ${REASON_TEXT.provider_unconfirmed}` } };
}
