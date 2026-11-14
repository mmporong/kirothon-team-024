// 공통 데이터 모델. 모르는 값은 null. [tech.md]

export type Channel = 'web' | 'app_store' | 'google_play' | 'carrier' | 'partner';

export const CHANNEL_LABEL: Record<Channel, string> = {
  web: '서비스 웹·앱에서 직접 결제',
  app_store: 'App Store(애플) 결제',
  google_play: 'Google Play 결제',
  carrier: '통신사 부가서비스 결제',
  partner: '제휴(카드·멤버십) 결제',
};

export interface Member {
  id: string;
  label: string;
  role: 'owner' | 'member';
}

export interface Subscription {
  id: string;
  serviceId: string;
  planId: string;
  name: string;
  monthlyWon: number | null;
  nextChargeDate: string | null; // YYYY-MM-DD
  channel: Channel | null;
  ownerId: string;
  sharedWith: string[]; // member ids (결제자 제외)
  sourceKind: 'demo' | 'manual' | 'sms_paste';
  usage: { observed: number | null; unit: string; period: string } | null; // null = 미확인 [R04]
}

/** ISO 시각(+09:00) → KST 달력 날짜 YYYY-MM-DD */
export function kstDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new RangeError('잘못된 시각');
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** a → b 까지 남은 일수(달력 기준). */
export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function addDays(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
