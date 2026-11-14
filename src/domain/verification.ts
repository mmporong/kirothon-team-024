// 해지 사건 확인: 요청 ≠ 사업자 확인 ≠ 결제수단 ≠ 환불, 다음 청구 관찰과 재개방. [R11][R12]
import { addDays, CHANNEL_LABEL, type Channel } from './types';

export interface Charge {
  date: string; // YYYY-MM-DD
  amountWon: number;
  channel: Channel | null;
  synthetic: boolean;
}

export interface ClosureRecord {
  requestedAt: string | null; // ISO
  providerConfirmedAt: string | null; // ISO
  paymentMethod: 'unknown' | 'active' | 'removed';
  refund: 'none' | 'requested' | 'received' | 'unknown';
  expectedNextCharge: string | null; // YYYY-MM-DD
  observedCharges: Charge[];
  checkedChannels: Channel[];
}

export const EMPTY_CLOSURE: ClosureRecord = {
  requestedAt: null,
  providerConfirmedAt: null,
  paymentMethod: 'unknown',
  refund: 'unknown',
  expectedNextCharge: null,
  observedCharges: [],
  checkedChannels: [],
};

export type ClosureStatus = 'not_requested' | 'requested_unconfirmed' | 'awaiting_next_cycle' | 'no_charge_observed_scoped' | 'reopened';

export const CLOSURE_LABEL: Record<ClosureStatus, string> = {
  not_requested: '해지 요청 전',
  requested_unconfirmed: '해지 요청만 기록됨 (종료 확인 아님)',
  awaiting_next_cycle: '다음 결제일 확인 대기',
  no_charge_observed_scoped: '확인한 기간·경로에서 추가 청구 관측 없음',
  reopened: '예상 밖 청구 — 사건 다시 열림',
};

/** 해지 요청일(KST 날짜) 이후의 청구만 '해지 후 청구'로 본다. */
export function chargesAfterRequest(rec: ClosureRecord): Charge[] {
  if (!rec.requestedAt) return [];
  const reqDate = rec.requestedAt.slice(0, 10);
  return rec.observedCharges.filter((c) => c.date >= reqDate);
}

export function closureStatus(rec: ClosureRecord, todayYmd: string, graceDays = 3): { status: ClosureStatus; reasons: string[]; scope: string | null } {
  if (!rec.requestedAt) return { status: 'not_requested', reasons: [], scope: null };
  const after = chargesAfterRequest(rec);
  if (after.length) return { status: 'reopened', reasons: ['charge_after_cancel'], scope: null };
  if (!rec.providerConfirmedAt) return { status: 'requested_unconfirmed', reasons: ['provider_unconfirmed'], scope: null };
  if (!rec.expectedNextCharge) return { status: 'awaiting_next_cycle', reasons: ['expected_date_unknown'], scope: null };
  const due = addDays(rec.expectedNextCharge, graceDays);
  if (todayYmd <= due) return { status: 'awaiting_next_cycle', reasons: ['before_expected_date'], scope: null };
  if (!rec.checkedChannels.length) return { status: 'awaiting_next_cycle', reasons: ['no_channel_checked'], scope: null };
  const scope = `${rec.expectedNextCharge} 결제 예정일 ~ ${todayYmd}, 확인 경로: ${rec.checkedChannels.map((c) => CHANNEL_LABEL[c]).join(', ')}`;
  return { status: 'no_charge_observed_scoped', reasons: [], scope };
}
