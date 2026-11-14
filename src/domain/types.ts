// 공통 데이터 모델. 모르는 값은 null. [tech.md]

export type Channel = 'web' | 'app_store' | 'google_play' | 'carrier' | 'partner';

export const CHANNEL_LABEL: Record<Channel, string> = {
  web: '서비스 웹·앱에서 직접 결제',
  app_store: 'App Store(애플) 결제',
  google_play: 'Google Play 결제',
  carrier: '통신사 부가서비스 결제',
  partner: '제휴(카드·멤버십) 결제',
};

export const CHANNEL_SHORT: Record<Channel, string> = {
  web: '웹',
  app_store: 'App Store',
  google_play: 'Google Play',
  carrier: '통신사',
  partner: '제휴',
};

function jongOf(word: string): number | null {
  const code = word.trim().slice(-1).charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : null;
}

/** 한국어 조사 '으로/로': 받침이 있으면(ㄹ 제외) '으로'. 영문 등은 '로'. */
export function withRo(word: string): string {
  const j = jongOf(word);
  return `${word}${j !== null && j !== 0 && j !== 8 ? '으로' : '로'}`;
}

/** 한국어 조사 '은/는', '이/가'. 받침이 있으면 앞쪽. 영문(App Store·Google Play)은 받침 없는 것으로 본다. */
export function josa(word: string, pair: '은/는' | '이/가'): string {
  const j = jongOf(word);
  const [withJong, without] = pair.split('/') as [string, string];
  return `${word}${j !== null && j !== 0 ? withJong : without}`;
}

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
  trialEndsAt?: string | null; // 무료체험 종료일 YYYY-MM-DD (없으면 정기결제)
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
