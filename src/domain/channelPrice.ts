// 결제 경로별 가격 비교. 같은 요금제도 웹·App Store·Google Play 중 어디서 결제하느냐에 따라 값이 다를 수 있다. [R28]
// 차액은 양쪽 가격이 모두 검증(공식·스토어 목록)됐거나 실제 청구액으로 확인됐을 때만 계산한다.
import prices from '../data/channel_prices.json';
import procedures from '../data/store_procedures.json';
import { getPlan } from './pricePolicy';
import { CHANNEL_SHORT, withRo, type Channel } from './types';

export type PriceStatus = 'verified' | 'reported' | 'not_offered' | 'unknown';

export interface ChannelPrice {
  channel: Channel;
  status: PriceStatus;
  monthly: number | null;
  annual: number | null;
  currency?: string;
  source_url: string | null;
  source_kind: string | null;
  checked_at: string | null;
  evidence?: string | null;
  comparable?: boolean;
  comparison_note?: string | null;
}

export interface ServicePrices {
  id: string;
  name: string;
  plan: string;
  plan_label: string;
  prices: ChannelPrice[];
  note?: string | null;
}

export interface PriceTable {
  generated_at: string | null;
  services: ServicePrices[];
}

export const CHANNEL_PRICES = prices as unknown as PriceTable;

export const PRICE_STATUS_LABEL: Record<PriceStatus, string> = {
  verified: '공식 확인',
  reported: '보도 기준(확인 필요)',
  not_offered: '이 경로로는 판매 안 함',
  unknown: '미확인',
};

export function findPrices(table: PriceTable, serviceId: string, planId: string): ServicePrices | null {
  return table.services.find((s) => s.id === serviceId && s.plan === planId) ?? null;
}

export interface ChannelComparison {
  status: 'cheaper_available' | 'already_cheapest' | 'not_comparable';
  current: ChannelPrice | null;
  currentMonthly: number | null;
  currentBasis: 'charge' | 'listed' | null;
  cheapest: ChannelPrice | null;
  monthlyDiff: number | null;
  annualDiff: number | null;
  reported: ChannelPrice[];
  legacyWarning: boolean;
  reasons: string[];
}

const usable = (p: ChannelPrice): boolean => p.status === 'verified' && p.comparable !== false && (p.currency ?? 'KRW') === 'KRW' && typeof p.monthly === 'number' && Number.isSafeInteger(p.monthly) && p.monthly > 0;

/**
 * 지금 결제 경로와 다른 검증된 경로의 월 가격을 비교한다.
 * chargedMonthly(실제 청구액)가 있으면 그 값을 현재 가격으로 쓴다.
 */
export function compareChannels(table: PriceTable, serviceId: string, planId: string, currentChannel: Channel | null, chargedMonthly: number | null = null): ChannelComparison {
  const empty: ChannelComparison = { status: 'not_comparable', current: null, currentMonthly: null, currentBasis: null, cheapest: null, monthlyDiff: null, annualDiff: null, reported: [], legacyWarning: false, reasons: [] };
  const sp = findPrices(table, serviceId, planId);
  if (!sp) return { ...empty, reasons: ['no_price_data'] };
  const reported = sp.prices.filter((p) => p.status === 'reported');
  const legacyWarning = (getPlan(serviceId, planId)?.legacy_monthly ?? null) !== null;
  if (!currentChannel) return { ...empty, reported, legacyWarning, reasons: ['channel_unknown'] };
  const current = sp.prices.find((p) => p.channel === currentChannel) ?? null;
  const validCharge = typeof chargedMonthly === 'number' && Number.isSafeInteger(chargedMonthly) && chargedMonthly > 0;
  const currentMonthly = validCharge ? chargedMonthly : current && usable(current) ? current.monthly : null;
  const currentBasis = validCharge ? 'charge' : currentMonthly !== null ? 'listed' : null;
  if (currentMonthly === null) return { ...empty, current, reported, legacyWarning, reasons: ['current_price_unknown'] };
  const others = sp.prices.filter((p) => p.channel !== currentChannel && usable(p));
  if (!others.length) return { ...empty, current, currentMonthly, currentBasis, reported, legacyWarning, reasons: ['no_verified_alternative'] };
  const cheapest = others.reduce((a, b) => ((b.monthly as number) < (a.monthly as number) ? b : a));
  const diff = currentMonthly - (cheapest.monthly as number);
  if (diff <= 0) return { ...empty, status: 'already_cheapest', current, currentMonthly, currentBasis, cheapest, monthlyDiff: 0, annualDiff: 0, reported, legacyWarning };
  return { status: 'cheaper_available', current, currentMonthly, currentBasis, cheapest, monthlyDiff: diff, annualDiff: diff * 12, reported, legacyWarning, reasons: [] };
}

/** 검증된 가격 기준으로 경로 간 차이가 있는 요금제 목록(화면용). */
export function listDifferences(table: PriceTable): { service: ServicePrices; max: ChannelPrice; min: ChannelPrice; monthlyDiff: number }[] {
  const out: { service: ServicePrices; max: ChannelPrice; min: ChannelPrice; monthlyDiff: number }[] = [];
  for (const s of table.services) {
    const ok = s.prices.filter(usable);
    if (ok.length < 2) continue;
    const max = ok.reduce((a, b) => ((b.monthly as number) > (a.monthly as number) ? b : a));
    const min = ok.reduce((a, b) => ((b.monthly as number) < (a.monthly as number) ? b : a));
    const d = (max.monthly as number) - (min.monthly as number);
    if (d > 0) out.push({ service: s, max, min, monthlyDiff: d });
  }
  return out.sort((a, b) => b.monthlyDiff - a.monthlyDiff);
}

interface StoreProc {
  cancel_steps?: string[] | null;
  cancel_url?: string | null;
  trial_cancel_note?: string | null;
  period_end_note?: string | null;
  refund_url?: string | null;
  refund_steps?: string[] | null;
  checked_at?: string | null;
}
interface Procedures {
  apple: StoreProc | null;
  google_play: StoreProc | null;
  switch_steps_generic: string[];
  service_specific: { service_id: string; from: string; to: string; steps: string[]; source_url: string | null }[];
}
const PROC = procedures as unknown as Procedures;

function storeOf(channel: Channel): StoreProc | null {
  if (channel === 'app_store') return PROC.apple;
  if (channel === 'google_play') return PROC.google_play;
  return null;
}

/** 경로 갈아타기 단계: 지금 경로 해지 → 기간 종료 확인 → 새 경로 가입 → 다음 청구 확인. 공식 절차 데이터가 없으면 일반 문장만. */
export function switchSteps(serviceId: string, from: Channel, to: Channel, signupUrl: string | null, opts: { trial?: boolean } = {}): string[] {
  const specific = PROC.service_specific.find((x) => x.service_id === serviceId && x.from === from && x.to === to);
  if (specific?.steps?.length) return [...specific.steps, '다음 청구 문자에서 이전 경로 청구가 없는지 확인할게요.'];
  const st = storeOf(from);
  const steps: string[] = [];
  steps.push(`${CHANNEL_SHORT[from]}에서 자동 갱신을 꺼요${st?.cancel_steps?.length ? `: ${st.cancel_steps.join(' → ')}` : ''}.`);
  if (opts.trial && st?.trial_cancel_note) steps.push(st.trial_cancel_note);
  else if (st?.period_end_note) steps.push(st.period_end_note);
  steps.push(`이용 기간이 끝난 뒤 ${withRo(CHANNEL_SHORT[to])} 새로 가입해요${signupUrl ? `: ${signupUrl}` : ''}.`);
  steps.push('다음 청구 문자에서 이전 경로 청구가 없는지 확인할게요.');
  return steps;
}

export function refundRoute(channel: Channel): { url: string | null; steps: string[] } | null {
  const st = storeOf(channel);
  if (!st || (!st.refund_url && !st.refund_steps?.length)) return null;
  return { url: st.refund_url ?? null, steps: st.refund_steps ?? [] };
}
