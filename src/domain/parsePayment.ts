// 결제 문자 규칙 추출. 원문 안의 근거 위치(start·end)를 함께 돌려준다. 모르는 값은 null. [R01][R02][R27]
import type { Channel } from './types';

export type EventType =
  | 'approval'
  | 'cancellation'
  | 'partial_cancellation'
  | 'refund'
  | 'failed'
  | 'notice'
  | 'otp'
  | 'advertisement'
  | 'zero_authorization'
  | 'unknown';

export const EVENT_LABEL: Record<EventType, string> = {
  approval: '결제 승인',
  cancellation: '승인 취소',
  partial_cancellation: '부분 취소',
  refund: '환불',
  failed: '결제 실패',
  notice: '결제 예정 안내',
  otp: '인증번호(결제 아님)',
  advertisement: '광고(결제 아님)',
  zero_authorization: '0원 유효성 확인(청구 아님)',
  unknown: '분류 불가',
};

export interface Span {
  start: number;
  end: number;
}

export interface ParsedPayment {
  eventType: EventType;
  serviceId: string | null;
  serviceName: string | null;
  amountWon: number | null; // 원화만. 외화는 null로 두고 foreignAmount에 따로 둔다
  foreignAmount: { currency: string; value: number } | null;
  date: string | null; // YYYY-MM-DD, 본문에 연도까지 있을 때만
  channel: Channel | null;
  spans: { service?: Span; amount?: Span; date?: Span; channel?: Span };
  isCharge: boolean; // 실제 청구로 볼 수 있는 승인만 true
  needsReview: boolean;
  unknownFields: ('service' | 'amount' | 'date' | 'channel')[];
}

const SERVICES: { id: string; name: string; re: RegExp }[] = [
  { id: 'disney_plus_kr', name: '디즈니+', re: /디즈니\s?\+|디즈니플러스|Disney\s?\+|DisneyPlus/i },
  { id: 'netflix_kr', name: '넷플릭스', re: /넷플릭스|Netflix/i },
  { id: 'youtube_premium_kr', name: '유튜브 프리미엄', re: /유튜브\s?프리미엄|YouTube\s?Premium|유튜브/i },
  { id: 'tving_kr', name: '티빙', re: /티빙|TVING/i },
  { id: 'wavve_kr', name: '웨이브', re: /웨이브|wavve/i },
  { id: 'coupang_play_kr', name: '쿠팡플레이', re: /쿠팡\s?플레이|Coupang\s?Play/i },
  { id: 'coupang_wow_kr', name: '쿠팡 와우', re: /와우\s?멤버십|쿠팡\s?와우|로켓와우/i },
  { id: 'spotify_kr', name: '스포티파이', re: /스포티파이|Spotify/i },
  { id: 'naver_plus_kr', name: '네이버플러스 멤버십', re: /네이버\s?플러스|네이버\s?멤버십/i },
  { id: 'watcha_kr', name: '왓챠', re: /왓챠|WATCHA/i },
  { id: 'millie_kr', name: '밀리의서재', re: /밀리의\s?서재/i },
  { id: 'baemin_club_kr', name: '배민클럽', re: /배민\s?클럽/i },
  { id: 'apple_one_kr', name: 'Apple One', re: /Apple\s?One/i },
  { id: 'icloud_plus_kr', name: 'iCloud+', re: /iCloud/i },
];

const CHANNELS: { channel: Channel; re: RegExp }[] = [
  { channel: 'google_play', re: /Google\s?Play|구글\s?플레이/i },
  { channel: 'app_store', re: /App\s?Store|앱스토어|APPLE\.COM\/BILL|애플\s?결제/i },
  { channel: 'carrier', re: /통신\s?요금|휴대폰\s?결제|소액\s?결제|SKT|KT\s|LG\s?U\+|U\+/ },
];

const AMOUNT_RE = /(\d{1,3}(?:,\d{3})+|\d+)\s?원/;
const FOREIGN_RE = /\b(USD|JPY|EUR|GBP|CNY)\s?([\d,]+(?:\.\d+)?)/;
const DATE_RE = /(20\d{2})[-./년]\s?(\d{1,2})[-./월]\s?(\d{1,2})/;

function classify(text: string): EventType {
  if (/\(광고\)|\[광고\]/.test(text)) return 'advertisement';
  if (/인증\s?번호/.test(text)) return 'otp';
  if (/승인\s?거절|결제\s?실패|거절/.test(text)) return 'failed';
  if (/부분\s?취소/.test(text)) return 'partial_cancellation';
  if (/승인\s?취소|결제\s?취소|취소\s?승인/.test(text)) return 'cancellation';
  if (/환불/.test(text)) return 'refund';
  if (/결제\s?안내|결제\s?예정|청구\s?예정/.test(text)) return 'notice';
  if (/승인|결제\s?완료|결제되었|청구/.test(text)) return 'approval';
  return 'unknown';
}

function spanOf(text: string, re: RegExp): { m: RegExpExecArray; span: Span } | null {
  const m = re.exec(text);
  if (!m) return null;
  return { m, span: { start: m.index, end: m.index + m[0].length } };
}

export function parsePaymentText(text: string | null | undefined): ParsedPayment | null {
  if (typeof text !== 'string' || !text.trim()) return null;
  const eventType0 = classify(text);
  const spans: ParsedPayment['spans'] = {};

  let serviceId: string | null = null;
  let serviceName: string | null = null;
  let bestIdx = Number.POSITIVE_INFINITY;
  for (const s of SERVICES) {
    const hit = spanOf(text, s.re);
    if (hit && hit.span.start < bestIdx) {
      bestIdx = hit.span.start;
      serviceId = s.id;
      serviceName = s.name;
      spans.service = hit.span;
    }
  }

  let amountWon: number | null = null;
  const a = spanOf(text, AMOUNT_RE);
  if (a) {
    amountWon = Number(a.m[1]!.replace(/,/g, ''));
    spans.amount = { start: a.span.start, end: a.span.start + a.m[0].length };
  }

  let foreignAmount: ParsedPayment['foreignAmount'] = null;
  if (amountWon === null) {
    const f = spanOf(text, FOREIGN_RE);
    if (f) foreignAmount = { currency: f.m[1]!, value: Number(f.m[2]!.replace(/,/g, '')) };
  }

  let date: string | null = null;
  const d = spanOf(text, DATE_RE);
  if (d) {
    const y = Number(d.m[1]);
    const mo = Number(d.m[2]);
    const da = Number(d.m[3]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      date = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
      spans.date = d.span;
    }
  }

  let channel: Channel | null = null;
  for (const c of CHANNELS) {
    const hit = spanOf(text, c.re);
    if (hit) {
      channel = c.channel;
      spans.channel = hit.span;
      break;
    }
  }

  let eventType = eventType0;
  if (eventType === 'approval' && amountWon === 0) eventType = 'zero_authorization';
  if (eventType === 'advertisement' || eventType === 'otp') {
    // 광고·인증 문자의 금액·날짜는 결제 근거가 아니다.
    amountWon = null;
    foreignAmount = null;
    date = null;
    delete spans.amount;
    delete spans.date;
  }

  const unknownFields: ParsedPayment['unknownFields'] = [];
  if (!serviceId) unknownFields.push('service');
  if (amountWon === null && foreignAmount === null) unknownFields.push('amount');
  if (!date) unknownFields.push('date');
  if (!channel) unknownFields.push('channel');

  const isCharge = eventType === 'approval' && ((amountWon !== null && amountWon > 0) || (foreignAmount !== null && foreignAmount.value > 0));
  return {
    eventType,
    serviceId,
    serviceName,
    amountWon,
    foreignAmount,
    date,
    channel,
    spans,
    isCharge,
    needsReview: eventType !== 'advertisement' && eventType !== 'otp',
    unknownFields,
  };
}
