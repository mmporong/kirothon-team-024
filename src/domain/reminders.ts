// 결제 전 검토함: D-3·D-1·당일·지난 기한. now는 인자로 받는다. [R05][R06][R03]
import { daysBetween, type Subscription } from './types';

export type ReviewStatus = 'no_date' | 'later' | 'd3' | 'd2' | 'd1' | 'today' | 'overdue';

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  no_date: '결제일 확인 필요',
  later: '여유 있음',
  d3: 'D-3',
  d2: 'D-2',
  d1: 'D-1',
  today: '오늘 결제',
  overdue: '결제일 지남',
};

export function reviewStatus(sub: Pick<Subscription, 'nextChargeDate'>, todayYmd: string): { status: ReviewStatus; days: number | null } {
  if (!sub.nextChargeDate) return { status: 'no_date', days: null };
  const d = daysBetween(todayYmd, sub.nextChargeDate);
  if (d < 0) return { status: 'overdue', days: d };
  if (d === 0) return { status: 'today', days: 0 };
  if (d === 1) return { status: 'd1', days: 1 };
  if (d === 2) return { status: 'd2', days: 2 };
  if (d === 3) return { status: 'd3', days: 3 };
  return { status: 'later', days: d };
}

export interface InboxItem {
  subscriptionId: string;
  status: ReviewStatus;
  days: number | null;
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
    items.push({ subscriptionId: s.id, status: r.status, days: r.days });
  }
  const rank = (i: InboxItem) => (i.days === null ? 99 : i.days);
  return items.sort((a, b) => rank(a) - rank(b));
}
