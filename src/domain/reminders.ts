// 결제 전 검토함: D-3·D-1·당일·지난 기한. now는 인자로 받는다. [R05][R06][R03]
import { addDays, daysBetween, type Channel, type Subscription } from './types';

/** 결제 경로별 '자동 갱신을 꺼야 하는 마감' 여유(일). App Store는 결제 24시간 전까지 꺼야 갱신되지 않는다. [R29] */
export const CANCEL_LEAD_DAYS: Partial<Record<Channel, number>> = { app_store: 1 };

export interface Deadline {
  base: string | null; // 무료체험 종료일 또는 다음 결제일
  kind: 'trial_end' | 'charge';
  leadDays: number;
  cancelBy: string | null; // 이 날짜까지 결정해야 한다
}

export function decisionDeadline(sub: Pick<Subscription, 'nextChargeDate' | 'trialEndsAt' | 'channel'>): Deadline {
  const trial = sub.trialEndsAt ?? null;
  const base = trial ?? sub.nextChargeDate;
  const leadDays = (sub.channel && CANCEL_LEAD_DAYS[sub.channel]) || 0;
  return { base, kind: trial ? 'trial_end' : 'charge', leadDays, cancelBy: base ? addDays(base, -leadDays) : null };
}

export type ReviewStatus = 'no_date' | 'later' | 'd3' | 'd2' | 'd1' | 'today' | 'overdue';

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  no_date: '결제일 확인 필요',
  later: '여유 있음',
  d3: 'D-3',
  d2: 'D-2',
  d1: 'D-1',
  today: '오늘이 결정 마감',
  overdue: '결정 마감 지남',
};

export interface ReviewResult {
  status: ReviewStatus;
  /** 이전 호출자 호환: 취소 결정 마감까지 남은 일수. */
  days: number | null;
  daysToDecision: number | null;
  daysToChargeOrTrialEnd: number | null;
}

/** 결정 마감(cancelBy)까지 남은 일수로 검토 상태를 정한다. 무료체험·결제 경로 여유를 반영한다. [R05][R29] */
export function reviewStatus(sub: Pick<Subscription, 'nextChargeDate'> & Partial<Pick<Subscription, 'trialEndsAt' | 'channel'>>, todayYmd: string): ReviewResult {
  const dl = decisionDeadline({ nextChargeDate: sub.nextChargeDate, trialEndsAt: sub.trialEndsAt ?? null, channel: sub.channel ?? null });
  if (!dl.base || !dl.cancelBy) return { status: 'no_date', days: null, daysToDecision: null, daysToChargeOrTrialEnd: null };
  const daysToDecision = daysBetween(todayYmd, dl.cancelBy);
  const daysToChargeOrTrialEnd = daysBetween(todayYmd, dl.base);
  const result = (status: ReviewStatus): ReviewResult => ({ status, days: daysToDecision, daysToDecision, daysToChargeOrTrialEnd });
  if (daysToDecision < 0) return result('overdue');
  if (daysToDecision === 0) return result('today');
  if (daysToDecision === 1) return result('d1');
  if (daysToDecision === 2) return result('d2');
  if (daysToDecision === 3) return result('d3');
  return result('later');
}

export interface InboxItem {
  subscriptionId: string;
  status: ReviewStatus;
  days: number | null;
  daysToDecision: number | null;
  daysToChargeOrTrialEnd: number | null;
}

/** 검토함: 결제 3일 이내·오늘·지난 기한·결제일 미확인만 올린다. 같은 구독은 한 번만. */
export function reviewInbox(subs: Subscription[], todayYmd: string): InboxItem[] {
  const seen = new Set<string>();
  const items: InboxItem[] = [];
  for (const s of subs) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const r = reviewStatus(s, todayYmd);
    if (r.status === 'later') continue;
    items.push({
      subscriptionId: s.id,
      status: r.status,
      days: r.days,
      daysToDecision: r.daysToDecision,
      daysToChargeOrTrialEnd: r.daysToChargeOrTrialEnd,
    });
  }
  const rank = (i: InboxItem) => (i.days === null ? 99 : i.days);
  return items.sort((a, b) => rank(a) - rank(b));
}
