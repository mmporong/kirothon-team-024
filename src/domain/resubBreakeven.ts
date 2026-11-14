// 해지·재가입 손익 계산. Python 참조(research/L1/calc/resub_breakeven.py)와 같은 식. [R19][R20]
//
// 같은 기간 H(개월) 안에서
//   유지 = H × 기존가
//   쉬기 = (H − k) × 신규가   (k개월 쉬고 신규가로 복귀)
//   손익 = 유지 − 쉬기          (양수 = 쉬는 쪽이 아끼는 돈, 음수 = 쉬는 쪽이 더 드는 돈)

import { canonicalJson, fnv1a, formatWon, isWon } from './money';

export type CalcError = 'not_integer' | 'negative' | 'zero_old_price' | 'zero_new_price' | 'horizon_invalid' | 'k_out_of_range';
export type CalcResult<T> = { ok: true; value: T } | { ok: false; error: CalcError; field: string };

export const CALC_ERROR_TEXT: Record<CalcError, string> = {
  not_integer: '원 단위 정수로 입력해 주세요',
  negative: '0원 이상으로 입력해 주세요',
  zero_old_price: '지금 내는 요금이 0원이면 재가입 손익을 계산할 대상이 아니에요',
  zero_new_price: '재가입 요금이 0원이면 손익분기를 계산할 수 없어요',
  horizon_invalid: '비교 기간은 1~60개월 정수여야 해요',
  k_out_of_range: '쉬는 개월은 0 이상, 비교 기간 이하여야 해요',
};

export interface CalcInput {
  oldWon: number;
  newWon: number;
  horizon: number;
  pauseMonths?: number;
}

/** 입력 검증. 통과하면 null. */
export function validateCalcInput(input: CalcInput): { error: CalcError; field: string } | null {
  for (const field of ['oldWon', 'newWon'] as const) {
    const v = input[field];
    if (typeof v !== 'number' || !Number.isSafeInteger(v)) return { error: 'not_integer', field };
    if (v < 0) return { error: 'negative', field };
  }
  if (input.oldWon === 0) return { error: 'zero_old_price', field: 'oldWon' };
  if (input.newWon === 0) return { error: 'zero_new_price', field: 'newWon' };
  if (!Number.isSafeInteger(input.horizon) || input.horizon < 1 || input.horizon > 60) {
    return { error: 'horizon_invalid', field: 'horizon' };
  }
  if (input.pauseMonths !== undefined) {
    const k = input.pauseMonths;
    if (!Number.isSafeInteger(k) || k < 0 || k > input.horizon) return { error: 'k_out_of_range', field: 'pauseMonths' };
  }
  return null;
}

export function keepCost(oldWon: number, horizon: number): number {
  return oldWon * horizon;
}

export function pauseCost(newWon: number, horizon: number, k: number): number {
  if (!(k >= 0 && k <= horizon)) throw new RangeError('k는 0 이상 horizon 이하');
  return newWon * (horizon - k);
}

export function pauseDelta(oldWon: number, newWon: number, horizon: number, k: number): number {
  return keepCost(oldWon, horizon) - pauseCost(newWon, horizon, k);
}

/** 쉬는 편이 이득(손익 > 0)이 되기 시작하는 최소 개월 수. 1 이상 horizon 이하. 동률 0은 이득이 아니다. */
export function breakEvenMonths(oldWon: number, newWon: number, horizon: number): number {
  if (newWon <= 0) throw new RangeError('신규 요금은 0보다 커야 함');
  const diff = Math.max(0, newWon - oldWon);
  const k = Math.floor((horizon * diff) / newWon) + 1;
  return Math.max(1, Math.min(k, horizon));
}

export interface TableRow {
  pauseMonths: number;
  keep: number;
  pause: number;
  delta: number;
}

export function buildTable(oldWon: number, newWon: number, horizon: number): TableRow[] {
  const rows: TableRow[] = [];
  for (let k = 0; k <= horizon; k++) {
    rows.push({ pauseMonths: k, keep: keepCost(oldWon, horizon), pause: pauseCost(newWon, horizon, k), delta: pauseDelta(oldWon, newWon, horizon, k) });
  }
  return rows;
}

/** 사용자에게 보여 줄 한 문단. Python advice()와 글자까지 같다. */
export function adviceSentence(name: string, oldWon: number, newWon: number, horizon: number, effective = ''): string {
  const k = breakEvenMonths(oldWon, newWon, horizon);
  const eff = effective ? `(${effective} 이후 신규 요금)` : '';
  if (newWon <= oldWon) return `${name}: 다시 가입해도 월 ${formatWon(newWon)}${eff}이라 쉬는 달만큼 그대로 아껴요.`;
  const lose: string[] = [];
  for (let m = 1; m < k; m++) lose.push(`${m}개월만 쉬면 ${formatWon(-pauseDelta(oldWon, newWon, horizon, m))} 더 들고`);
  const gain = [k, k + 1]
    .filter((m) => m <= horizon)
    .map((m) => `${m}개월 ${formatWon(pauseDelta(oldWon, newWon, horizon, m))}`)
    .join(', ');
  const head = `${name}: 지금 해지하고 다시 가입하면 월 ${formatWon(newWon)}${eff}이에요. ${horizon}개월 기준으로 `;
  return head + (lose.length ? `${lose.join(', ')}, ` : '') + `${k}개월 이상 안 볼 거면 해지가 이득이에요(${gain} 아낌).`;
}

/** 지금 고른 k에 대한 짧은 판정 문장. 세 화면(검토함·가족 요청·해지)에 같은 문장을 쓴다. [R20] */
export function verdictSentence(oldWon: number, newWon: number, horizon: number, k: number): string {
  const d = pauseDelta(oldWon, newWon, horizon, k);
  if (k === 0) return `${horizon}개월 동안 계속 유지하면 ${formatWon(keepCost(oldWon, horizon))}이에요.`;
  if (d > 0) return `${k}개월 쉬었다가 돌아오면 ${horizon}개월 기준 ${formatWon(d)} 아껴요.`;
  if (d < 0) return `${k}개월 쉬었다가 돌아오면 ${horizon}개월 기준 ${formatWon(-d)} 더 들어요.`;
  return `${k}개월 쉬어도 ${horizon}개월 기준 손익이 같아요(0원).`;
}

export type InputKind = 'example' | 'confirmed';

export interface ScenarioInput extends CalcInput {
  pauseMonths: number;
  serviceId: string;
  planId: string;
  serviceName: string;
  effectiveDate: string | null;
  policyCheckedAt: string | null;
  sourceUrl: string | null;
  inputKind: InputKind;
}

export interface Scenario extends ScenarioInput {
  resultId: string;
  keep: number;
  pause: number;
  delta: number;
  breakEven: number;
  table: TableRow[];
  advice: string;
  verdict: string;
  assumptions: string[];
}

/** 계산 전제 목록. 숫자와 항상 함께 보여 준다. [R20] */
export function assumptionsFor(input: ScenarioInput): string[] {
  const list = [
    `가격 출처: ${input.sourceUrl ?? '미확인'} (확인 ${input.policyCheckedAt ? input.policyCheckedAt.slice(0, 16).replace('T', ' ') : '미확인'})`,
    input.effectiveDate ? `${input.effectiveDate}부터 해지 후 재가입·멤버십 변경은 신규 요금이 적용돼요.` : '신규 요금 적용일은 확인되지 않았어요.',
    '기존 요금은 해지 없이 계속 유지할 때만 적용돼요. 내 계정의 실제 청구액을 확인해 주세요.',
    `비교 기간 ${input.horizon}개월 동안 기존 요금과 신규 요금이 바뀌지 않는다고 가정해요(기존 요금 유지 종료일은 공지되지 않음).`,
    '쉬는 동안은 0원이고, 해지는 다음 결제일 전에 해서 이미 낸 기간은 끝까지 쓴다고 가정해요.',
    '프로모션·환불·제휴 결제·연간권 중도 해지 규정은 넣지 않았어요.',
    '이 숫자는 계산상 차이예요. 실제 절감액이나 환불액이 아니에요.',
  ];
  if (input.inputKind === 'example') list.unshift('예시 계산: 공개 요금 정책으로 만든 값이에요. 내 계정 요금을 확인하면 "확인한 값"으로 바뀌어요.');
  return list;
}

export function computeScenario(input: ScenarioInput): CalcResult<Scenario> {
  const bad = validateCalcInput(input);
  if (bad) return { ok: false, ...bad };
  const { oldWon, newWon, horizon, pauseMonths: k } = input;
  const resultId = fnv1a(
    canonicalJson({ s: input.serviceId, p: input.planId, o: oldWon, n: newWon, h: horizon, k, e: input.effectiveDate, c: input.policyCheckedAt, i: input.inputKind }),
  );
  return {
    ok: true,
    value: {
      ...input,
      resultId,
      keep: keepCost(oldWon, horizon),
      pause: pauseCost(newWon, horizon, k),
      delta: pauseDelta(oldWon, newWon, horizon, k),
      breakEven: breakEvenMonths(oldWon, newWon, horizon),
      table: buildTable(oldWon, newWon, horizon),
      advice: adviceSentence(input.serviceName, oldWon, newWon, horizon, input.effectiveDate ?? ''),
      verdict: verdictSentence(oldWon, newWon, horizon, k),
      assumptions: assumptionsFor(input),
    },
  };
}

export { isWon };
