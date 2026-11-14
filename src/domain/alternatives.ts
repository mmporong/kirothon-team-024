// 같은 기간 대안 비교: 계속 유지·k개월 쉬기·연간권·광고형·낮은 등급. [R21]
import { formatWon } from './money';
import { getPlan, getRights, PLAN_LABEL, type PlanRights } from './pricePolicy';

export type Need = 'no_ads' | 'uhd' | 'streams4' | 'no_prepay';

export const NEED_LABEL: Record<Need, string> = {
  no_ads: '광고 없이 보기',
  uhd: '4K 화질',
  streams4: '동시에 4명 시청',
  no_prepay: '한 번에 큰돈 선결제 안 함',
};

export type OptionKind = 'keep' | 'pause' | 'annual' | 'ad' | 'downgrade';

export interface AltOption {
  kind: OptionKind;
  title: string;
  total: number | null;
  detail: string;
  constraints: string[];
  rights: PlanRights | null;
  fit: 'fit' | 'unfit' | 'unknown';
  unfitReasons: string[];
  losesLegacyPrice: boolean;
}

export interface AltInput {
  serviceId: string;
  planId: string;
  oldWon: number;
  horizon: number;
  pauseMonths: number;
  pauseTotal: number;
  needs: Need[];
}

function judge(rights: PlanRights | null, needs: Need[], prepaid: boolean): { fit: AltOption['fit']; reasons: string[] } {
  const reasons: string[] = [];
  let unknown = false;
  for (const need of needs) {
    if (need === 'no_prepay') {
      if (prepaid) reasons.push('선결제가 필요해요');
      continue;
    }
    const v = need === 'no_ads' ? rights?.ads : need === 'uhd' ? rights?.uhd : rights?.streams;
    if (v === null || v === undefined) {
      unknown = true;
      continue;
    }
    if (need === 'no_ads' && v === true) reasons.push('광고가 나와요');
    if (need === 'uhd' && v === false) reasons.push('4K를 지원하지 않아요');
    if (need === 'streams4' && typeof v === 'number' && v < 4) reasons.push(`동시 시청이 ${v}명까지예요`);
  }
  if (reasons.length) return { fit: 'unfit', reasons };
  return { fit: unknown ? 'unknown' : 'fit', reasons: unknown ? ['권리 정보 확인 필요'] : [] };
}

export function compareAlternatives(input: AltInput): AltOption[] {
  const { serviceId, planId, oldWon, horizon, pauseMonths, pauseTotal, needs } = input;
  const plan = getPlan(serviceId, planId);
  const curRights = getRights(serviceId, planId);
  const label = PLAN_LABEL[planId] ?? planId;
  const out: AltOption[] = [];

  const keep = judge(curRights, needs, false);
  out.push({
    kind: 'keep', title: `${label} 계속 유지`, total: oldWon * horizon,
    detail: `월 ${formatWon(oldWon)} × ${horizon}개월`, constraints: ['해지하지 않으면 기존 요금 유지'],
    rights: curRights, fit: keep.fit, unfitReasons: keep.reasons, losesLegacyPrice: false,
  });

  const pause = judge(curRights, needs, false);
  out.push({
    kind: 'pause', title: `${pauseMonths}개월 쉬고 ${label}로 복귀`, total: pauseTotal,
    detail: `쉬는 ${pauseMonths}개월 0원 + 신규 요금 × ${horizon - pauseMonths}개월`, constraints: ['복귀하면 신규 요금', '쉬는 동안 시청 불가'],
    rights: curRights, fit: pause.fit, unfitReasons: pause.reasons, losesLegacyPrice: true,
  });

  if (plan?.new_annual != null) {
    const years = Math.ceil(horizon / 12);
    const j = judge(curRights, needs, true);
    out.push({
      kind: 'annual', title: `${label} 연간권`, total: plan.new_annual * years,
      detail: `연 ${formatWon(plan.new_annual)} × ${years}년`, constraints: ['한 번에 선결제', '중도 해지 환불 규정 확인 필요', '전환하면 기존 월 요금 자격을 잃어요'],
      rights: curRights, fit: j.fit, unfitReasons: j.reasons, losesLegacyPrice: true,
    });
  } else {
    out.push({
      kind: 'annual', title: `${label} 연간권`, total: null, detail: '연간권 가격이 확인되지 않았어요',
      constraints: ['계산 보류'], rights: curRights, fit: 'unknown', unfitReasons: ['가격 미확인'], losesLegacyPrice: true,
    });
  }

  const ad = getPlan(serviceId, 'ad_standard');
  if (planId !== 'ad_standard' && ad?.new_monthly != null) {
    const r = getRights(serviceId, 'ad_standard');
    const j = judge(r, needs, false);
    out.push({
      kind: 'ad', title: '광고형 스탠다드로 변경', total: ad.new_monthly * horizon,
      detail: `월 ${formatWon(ad.new_monthly)} × ${horizon}개월`, constraints: ['광고 포함', '요금제를 바꾸면 기존 요금 자격을 잃어요', '계정별 제공 여부 확인'],
      rights: r, fit: j.fit, unfitReasons: j.reasons, losesLegacyPrice: true,
    });
  }

  if (planId === 'premium') {
    const std = getPlan(serviceId, 'standard');
    if (std?.new_monthly != null) {
      const r = getRights(serviceId, 'standard');
      const j = judge(r, needs, false);
      out.push({
        kind: 'downgrade', title: '스탠다드로 낮추기', total: std.new_monthly * horizon,
        detail: `월 ${formatWon(std.new_monthly)}(신규 요금) × ${horizon}개월`, constraints: ['요금제 변경은 신규 요금', '4K·동시 4명 혜택이 줄어요'],
        rights: r, fit: j.fit, unfitReasons: j.reasons, losesLegacyPrice: true,
      });
    }
  }
  return out;
}

/** 요구를 충족하고 금액이 확인된 대안 중 가장 싼 것. 없으면 null. */
export function cheapestFit(options: AltOption[]): AltOption | null {
  const ok = options.filter((o) => o.fit === 'fit' && o.total !== null);
  if (!ok.length) return null;
  return ok.reduce((a, b) => ((b.total as number) < (a.total as number) ? b : a));
}
