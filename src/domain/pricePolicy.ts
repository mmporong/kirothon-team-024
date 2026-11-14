// 공개 요금 정책 조회. 값이 null이면 미확인이며 0원과 다르다. [R20]
import policies from '../data/price_policies.json';
import rights from '../data/plan_rights.json';

export interface PlanPrice {
  legacy_monthly: number | null;
  new_monthly: number | null;
  new_annual: number | null;
}

export interface PlanRights {
  ads: boolean | null;
  uhd: boolean | null;
  streams: number | null;
  verified: boolean;
}

export interface ServicePolicy {
  id: string;
  name: string;
  currency: string;
  change_effective_date: string | null;
  sources: string[];
  checked_at: string | null;
  valid_for: string;
  legacy_rule?: string;
  plans: Record<string, PlanPrice>;
}

const table = policies as unknown as Record<string, Omit<ServicePolicy, 'id'> | string>;
const rightsTable = rights as unknown as Record<string, Record<string, PlanRights> | string>;

export function listServiceIds(): string[] {
  return Object.keys(table).filter((k) => !k.startsWith('_'));
}

export function getPolicy(serviceId: string): ServicePolicy | null {
  const p = table[serviceId];
  if (!p || typeof p === 'string') return null;
  return { id: serviceId, ...p };
}

export function getPlan(serviceId: string, planId: string): PlanPrice | null {
  return getPolicy(serviceId)?.plans[planId] ?? null;
}

export function getRights(serviceId: string, planId: string): PlanRights | null {
  const s = rightsTable[serviceId];
  if (!s || typeof s === 'string') return null;
  return s[planId] ?? null;
}

export const PLAN_LABEL: Record<string, string> = {
  standard: '스탠다드',
  premium: '프리미엄',
  ad_standard: '광고형 스탠다드',
  basic: '베이직',
  individual: '개인',
  lite: '라이트',
  family: '가족',
  monthly: '월간',
  membership: '멤버십',
};

/** 기존가·신규가가 모두 확인된 요금제만 손익 계산을 허용한다. */
export function canComputeResub(serviceId: string, planId: string): { ok: true; oldWon: number; newWon: number } | { ok: false; reason: string } {
  const plan = getPlan(serviceId, planId);
  if (!plan) return { ok: false, reason: '요금 정책 데이터가 없어요' };
  if (plan.new_monthly === null) return { ok: false, reason: '재가입(신규) 요금이 확인되지 않아 계산을 보류해요' };
  if (plan.new_monthly === 0) return { ok: false, reason: '무료 요금제는 손익분기 계산 대상이 아니에요' };
  if (plan.legacy_monthly === null) return { ok: false, reason: '내가 내는 기존 요금을 입력하면 계산할 수 있어요' };
  return { ok: true, oldWon: plan.legacy_monthly, newWon: plan.new_monthly };
}
