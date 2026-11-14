// 단일 정책 관문. UI·도메인 명령의 모든 상태 변경은 evaluateAction 을 거친다. [R16][R07][R08][R11][R12]
import { castVote, createProposal, reviseProposal, revokeVote, tally, type Proposal, type Terms, type VoteValue } from './consent';
import { routeFor } from './guides';
import { kstDate, type Channel, type Subscription } from './types';
import { closureStatus, EMPTY_CLOSURE, type Charge, type ClosureRecord } from './verification';

export type Stage =
  | 'reviewing'
  | 'kept'
  | 'family_review'
  | 'handoff_ready'
  | 'cancel_requested'
  | 'awaiting_next_cycle'
  | 'no_charge_observed_scoped'
  | 'reopened';

export const STAGE_LABEL: Record<Stage, string> = {
  reviewing: '결제 전 검토',
  kept: '유지하기로 함',
  family_review: '가족 검토 중',
  handoff_ready: '결제자 인계 준비 완료',
  cancel_requested: '해지 요청 기록됨',
  awaiting_next_cycle: '다음 청구 확인 대기',
  no_charge_observed_scoped: '추가 청구 관측 없음(범위 한정)',
  reopened: '사건 다시 열림',
};

export interface AuditEvent {
  at: string;
  actor: string;
  action: Action['type'];
  allowed: boolean;
  reasons: Reason[];
  stage: Stage;
}

export interface CaseState {
  caseId: string;
  subscription: Subscription;
  stage: Stage;
  proposal: Proposal | null;
  closure: ClosureRecord;
  audit: AuditEvent[];
}

export type Action =
  | { type: 'keep'; actor: string }
  | { type: 'request_family_review'; actor: string; terms: Terms }
  | { type: 'revise_terms'; actor: string; terms: Terms }
  | { type: 'cast_vote'; actor: string; version: number; value: VoteValue; comment?: string }
  | { type: 'revoke_vote'; actor: string }
  | { type: 'prepare_owner_handoff'; actor: string; terms?: Terms; switchTo?: Channel }
  | { type: 'record_cancel_request'; actor: string }
  | { type: 'record_provider_confirmation'; actor: string }
  | { type: 'record_payment_method'; actor: string; state: ClosureRecord['paymentMethod'] }
  | { type: 'record_refund'; actor: string; state: ClosureRecord['refund'] }
  | { type: 'mark_channel_checked'; actor: string; channel: Channel }
  | { type: 'observe_charge'; actor: string; charge: Charge }
  | { type: 'check_next_cycle'; actor: string };

export type Reason =
  | 'consent_missing'
  | 'objection_present'
  | 'abstain_present'
  | 'stale_version'
  | 'future_version'
  | 'not_member'
  | 'not_owner'
  | 'not_shared'
  | 'channel_unknown'
  | 'no_guide'
  | 'wrong_stage'
  | 'choice_is_keep'
  | 'no_proposal'
  | 'version_bumped'
  | 'consent_withdrawn'
  | 'charge_after_cancel'
  | 'charge_before_cancel'
  | 'before_expected_date'
  | 'expected_date_unknown'
  | 'no_channel_checked'
  | 'provider_unconfirmed'
  | 'invalid_amount'
  | 'charge_on_new_channel'
  | 'same_channel';

export const REASON_TEXT: Record<Reason, string> = {
  consent_missing: '아직 응답하지 않은 가족이 있어요',
  objection_present: '반대한 가족이 있어요',
  abstain_present: '보류한 가족이 있어요',
  stale_version: '이전 버전 제안에 대한 응답이라 받을 수 없어요. 현재 버전에 다시 응답해 주세요',
  future_version: '없는 버전에 대한 응답이에요',
  not_member: '이 제안의 검토 대상이 아니에요',
  not_owner: '해지는 결제한 사람(청구 계정 소유자)만 할 수 있어요',
  not_shared: '함께 쓰는 가족이 없는 구독이에요',
  channel_unknown: '결제 채널을 먼저 확인해야 해요',
  no_guide: '이 결제 채널의 공식 해지 경로 자료가 없어 확인이 필요해요',
  wrong_stage: '지금 단계에서는 할 수 없어요',
  choice_is_keep: '유지로 정한 제안은 인계할 해지가 없어요',
  no_proposal: '가족 제안이 아직 없어요',
  version_bumped: '조건이 바뀌어 새 버전이 만들어졌어요. 이전 응답은 무효예요',
  consent_withdrawn: '동의가 철회되어 인계 준비가 풀렸어요',
  charge_after_cancel: '해지 요청 뒤 청구가 관측돼 사건을 다시 열었어요',
  charge_before_cancel: '해지 요청 전 청구라 기록만 했어요',
  before_expected_date: '다음 결제 예정일(+3일 여유)이 아직 지나지 않았어요',
  expected_date_unknown: '다음 결제 예정일을 몰라 확인을 보류해요',
  no_channel_checked: '확인한 결제 경로가 없어 판단을 보류해요',
  provider_unconfirmed: '사업자 해지 확인이 아직 없어요(요청만 기록됨)',
  invalid_amount: '청구 금액이 올바르지 않아요',
  charge_on_new_channel: '옮긴 결제 경로의 청구라 예상된 청구로 기록했어요',
  same_channel: '지금과 같은 결제 경로로는 옮길 수 없어요',
};

export function newCase(caseId: string, subscription: Subscription): CaseState {
  return { caseId, subscription, stage: 'reviewing', proposal: null, closure: { ...EMPTY_CLOSURE, expectedNextCharge: subscription.nextChargeDate }, audit: [] };
}

export interface Decision {
  allowed: boolean;
  reasons: Reason[];
  next: CaseState;
}

const CLOSED_STAGES: Stage[] = ['cancel_requested', 'awaiting_next_cycle', 'no_charge_observed_scoped', 'reopened'];

function consentReasons(p: Proposal | null): Reason[] {
  if (!p) return ['no_proposal'];
  const t = tally(p);
  const r: Reason[] = [];
  if (t.object.length) r.push('objection_present');
  if (t.abstain.length) r.push('abstain_present');
  if (t.pending.length) r.push('consent_missing');
  return r;
}

function decide(state: CaseState, action: Action, now: string): { allowed: boolean; reasons: Reason[]; patch: Partial<CaseState> } {
  const sub = state.subscription;
  const shared = sub.sharedWith.length > 0;
  const deny = (...reasons: Reason[]) => ({ allowed: false, reasons, patch: {} });

  switch (action.type) {
    case 'keep':
      if (CLOSED_STAGES.includes(state.stage) && state.stage !== 'reopened') return deny('wrong_stage');
      return { allowed: true, reasons: [], patch: { stage: 'kept' } };

    case 'request_family_review': {
      if (!shared) return deny('not_shared');
      if (!['reviewing', 'kept', 'reopened', 'family_review'].includes(state.stage)) return deny('wrong_stage');
      if (state.proposal) {
        const p = reviseProposal(state.proposal, action.terms, now);
        return { allowed: true, reasons: p.version !== state.proposal.version ? ['version_bumped'] : [], patch: { proposal: p, stage: 'family_review' } };
      }
      return { allowed: true, reasons: [], patch: { proposal: createProposal(`${state.caseId}-p`, action.terms, sub.sharedWith, now), stage: 'family_review' } };
    }

    case 'revise_terms': {
      if (!state.proposal) return deny('no_proposal');
      if (!['family_review', 'handoff_ready'].includes(state.stage)) return deny('wrong_stage');
      const p = reviseProposal(state.proposal, action.terms, now);
      const bumped = p.version !== state.proposal.version;
      return { allowed: true, reasons: bumped ? ['version_bumped'] : [], patch: { proposal: p, stage: bumped ? 'family_review' : state.stage } };
    }

    case 'cast_vote': {
      if (!state.proposal) return deny('no_proposal');
      if (!['family_review', 'handoff_ready'].includes(state.stage)) return deny('wrong_stage');
      const r = castVote(state.proposal, action.actor, action.version, action.value, now, action.comment);
      if (!r.ok) return deny(r.error);
      const stage = state.stage === 'handoff_ready' && action.value !== 'agree' ? 'family_review' : state.stage;
      return { allowed: true, reasons: stage !== state.stage ? ['consent_withdrawn'] : [], patch: { proposal: r.proposal, stage } };
    }

    case 'revoke_vote': {
      if (!state.proposal) return deny('no_proposal');
      if (!state.proposal.requiredMembers.includes(action.actor)) return deny('not_member');
      if (!['family_review', 'handoff_ready'].includes(state.stage)) return deny('wrong_stage');
      const p = revokeVote(state.proposal, action.actor);
      return { allowed: true, reasons: state.stage === 'handoff_ready' ? ['consent_withdrawn'] : [], patch: { proposal: p, stage: 'family_review' } };
    }

    case 'prepare_owner_handoff': {
      const reasons: Reason[] = [];
      if (shared) {
        if (state.stage !== 'family_review') return deny(state.proposal ? 'wrong_stage' : 'no_proposal');
        reasons.push(...consentReasons(state.proposal));
        if (state.proposal?.terms.choice === 'keep') reasons.push('choice_is_keep');
      } else if (!['reviewing', 'reopened', 'kept'].includes(state.stage)) {
        return deny('wrong_stage');
      }
      const route = routeFor(sub.serviceId, sub.channel);
      if (route.status === 'channel_unknown') reasons.push('channel_unknown');
      if (action.switchTo && action.switchTo === sub.channel) reasons.push('same_channel');
      if (reasons.length) return deny(...reasons);
      return { allowed: true, reasons: route.status === 'no_guide' ? ['no_guide'] : [], patch: { stage: 'handoff_ready', closure: { ...state.closure, switchTo: action.switchTo ?? null } } };
    }

    case 'record_cancel_request':
      if (action.actor !== sub.ownerId) return deny('not_owner');
      if (state.stage !== 'handoff_ready') return deny('wrong_stage');
      return { allowed: true, reasons: ['provider_unconfirmed'], patch: { stage: 'cancel_requested', closure: { ...state.closure, requestedAt: now } } };

    case 'record_provider_confirmation':
      if (action.actor !== sub.ownerId) return deny('not_owner');
      if (!['cancel_requested', 'awaiting_next_cycle'].includes(state.stage)) return deny('wrong_stage');
      return { allowed: true, reasons: [], patch: { stage: 'awaiting_next_cycle', closure: { ...state.closure, providerConfirmedAt: now } } };

    case 'record_payment_method':
      if (!CLOSED_STAGES.includes(state.stage)) return deny('wrong_stage');
      return { allowed: true, reasons: [], patch: { closure: { ...state.closure, paymentMethod: action.state } } };

    case 'record_refund':
      if (!CLOSED_STAGES.includes(state.stage)) return deny('wrong_stage');
      return { allowed: true, reasons: [], patch: { closure: { ...state.closure, refund: action.state } } };

    case 'mark_channel_checked': {
      if (!CLOSED_STAGES.includes(state.stage)) return deny('wrong_stage');
      const set = new Set(state.closure.checkedChannels);
      set.add(action.channel);
      return { allowed: true, reasons: [], patch: { closure: { ...state.closure, checkedChannels: [...set] } } };
    }

    case 'observe_charge': {
      const c = action.charge;
      if (!Number.isSafeInteger(c.amountWon) || c.amountWon <= 0) return deny('invalid_amount');
      const closure = { ...state.closure, observedCharges: [...state.closure.observedCharges, c] };
      const after = !!closure.requestedAt && c.date >= closure.requestedAt.slice(0, 10);
      if (after && closure.switchTo && c.channel === closure.switchTo) return { allowed: true, reasons: ['charge_on_new_channel'], patch: { closure } };
      if (after) return { allowed: true, reasons: ['charge_after_cancel'], patch: { closure, stage: 'reopened' } };
      return { allowed: true, reasons: ['charge_before_cancel'], patch: { closure } };
    }

    case 'check_next_cycle': {
      if (!CLOSED_STAGES.includes(state.stage)) return deny('wrong_stage');
      const s = closureStatus(state.closure, kstDate(now));
      if (s.status === 'no_charge_observed_scoped') return { allowed: true, reasons: [], patch: { stage: 'no_charge_observed_scoped' } };
      if (s.status === 'reopened') return { allowed: true, reasons: ['charge_after_cancel'], patch: { stage: 'reopened' } };
      return deny(...(s.reasons as Reason[]));
    }
  }
}

/** 같은 상태·행동·시각이면 같은 결과. 허용되지 않으면 next는 감사 기록만 늘어난 원래 상태다. */
export function evaluateAction(state: CaseState, action: Action, now: string): Decision {
  const d = decide(state, action, now);
  const base = d.allowed ? { ...state, ...d.patch } : state;
  const event: AuditEvent = { at: now, actor: action.actor, action: action.type, allowed: d.allowed, reasons: d.reasons, stage: base.stage };
  return { allowed: d.allowed, reasons: d.reasons, next: { ...base, audit: [...state.audit, event] } };
}
