// [R19][R20] 재가입 손익: Python 참조 golden 벡터와 동치 + 정확성 속성 P1~P3
import fc from 'fast-check';
import golden from '../fixtures/golden-resub.json';
import { adviceSentence, breakEvenMonths, computeScenario, keepCost, pauseCost, pauseDelta, validateCalcInput, verdictSentence } from '../../src/domain/resubBreakeven';

type G = { id: string; group: string; name: string; p_old: number; p_new: number; horizon: number; k: number; keep_cost: number | null; pause_cost: number | null; pause_delta: number | null; break_even_months: number | null; advice: string | null; error: unknown; invalid_input?: boolean; effective?: string };
const cases = (golden as unknown as { cases: G[] }).cases;
const valid = cases.filter((c) => c.group !== 'invalid' && !c.invalid_input && !c.error);
const invalid = cases.filter((c) => c.group === 'invalid' || c.invalid_input);

describe('R19 디즈니+ 인수 기준', () => {
  it('스탠다드 9,900→11,500, 12개월: 1개월 −7,700 / 2개월 +3,800 / 3개월 +15,300 / 손익분기 2개월', () => {
    expect(pauseDelta(9900, 11500, 12, 1)).toBe(-7700);
    expect(pauseDelta(9900, 11500, 12, 2)).toBe(3800);
    expect(pauseDelta(9900, 11500, 12, 3)).toBe(15300);
    expect(breakEvenMonths(9900, 11500, 12)).toBe(2);
  });
  it('프리미엄 13,900→16,500: 1개월 −14,700 / 2개월 +1,800', () => {
    expect(pauseDelta(13900, 16500, 12, 1)).toBe(-14700);
    expect(pauseDelta(13900, 16500, 12, 2)).toBe(1800);
  });
  it('조언 문장이 Python 참조와 글자까지 같다', () => {
    expect(adviceSentence('디즈니+ 스탠다드', 9900, 11500, 12, '2026-11-10')).toBe(
      '디즈니+ 스탠다드: 지금 해지하고 다시 가입하면 월 11,500원(2026-11-10 이후 신규 요금)이에요. 12개월 기준으로 1개월만 쉬면 7,700원 더 들고, 2개월 이상 안 볼 거면 해지가 이득이에요(2개월 3,800원, 3개월 15,300원 아낌).',
    );
  });
  it('판정 문장: 손해·이득·동률', () => {
    expect(verdictSentence(9900, 11500, 12, 1)).toBe('1개월 쉬었다가 돌아오면 12개월 기준 7,700원 더 들어요.');
    expect(verdictSentence(9900, 11500, 12, 2)).toBe('2개월 쉬었다가 돌아오면 12개월 기준 3,800원 아껴요.');
  });
});

describe(`P4 Python golden 동치 (${valid.length}건)`, () => {
  it.each(valid.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    expect(keepCost(c.p_old, c.horizon)).toBe(c.keep_cost);
    expect(pauseCost(c.p_new, c.horizon, c.k)).toBe(c.pause_cost);
    expect(pauseDelta(c.p_old, c.p_new, c.horizon, c.k)).toBe(c.pause_delta);
    if (c.break_even_months !== null) expect(breakEvenMonths(c.p_old, c.p_new, c.horizon)).toBe(c.break_even_months);
    if (c.advice !== null) expect(adviceSentence(c.name, c.p_old, c.p_new, c.horizon, c.effective ?? '')).toBe(c.advice);
  });
});

describe(`잘못된 입력은 계산 전에 거부한다 (${invalid.length}건)`, () => {
  it.each(invalid.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    expect(validateCalcInput({ oldWon: c.p_old, newWon: c.p_new, horizon: c.horizon, pauseMonths: c.k })).not.toBeNull();
  });
  it('소수·NaN·음수·k>H·H=0', () => {
    expect(validateCalcInput({ oldWon: 9900.5, newWon: 11500, horizon: 12, pauseMonths: 1 })?.error).toBe('not_integer');
    expect(validateCalcInput({ oldWon: Number.NaN, newWon: 11500, horizon: 12 })?.error).toBe('not_integer');
    expect(validateCalcInput({ oldWon: -1, newWon: 11500, horizon: 12 })?.error).toBe('negative');
    expect(validateCalcInput({ oldWon: 9900, newWon: 11500, horizon: 12, pauseMonths: 13 })?.error).toBe('k_out_of_range');
    expect(validateCalcInput({ oldWon: 9900, newWon: 11500, horizon: 0 })?.error).toBe('horizon_invalid');
  });
});

const price = fc.integer({ min: 1, max: 1_000_000 });
const hk = fc.integer({ min: 1, max: 60 }).chain((h) => fc.tuple(fc.constant(h), fc.integer({ min: 0, max: h })));

describe('정확성 속성', () => {
  it('P1 손익 항등식: delta = keep − pause', () => {
    fc.assert(fc.property(price, price, hk, (o, n, [h, k]) => {
      expect(pauseDelta(o, n, h, k)).toBe(keepCost(o, h) - pauseCost(n, h, k));
      expect(keepCost(o, h)).toBe(h * o);
      expect(pauseCost(n, h, k)).toBe((h - k) * n);
    }));
  });
  it('P2 단조성: k가 1 늘면 손익이 정확히 신규가만큼 늘어난다', () => {
    fc.assert(fc.property(price, price, fc.integer({ min: 1, max: 60 }).chain((h) => fc.tuple(fc.constant(h), fc.integer({ min: 0, max: h - 1 }))), (o, n, [h, k]) => {
      expect(pauseDelta(o, n, h, k + 1) - pauseDelta(o, n, h, k)).toBe(n);
    }));
  });
  it('P3 손익분기 엄밀성: b에서 처음으로 손익 > 0 (동률 0은 이득 아님)', () => {
    fc.assert(fc.property(price, price, fc.integer({ min: 1, max: 60 }), (o, n, h) => {
      const b = breakEvenMonths(o, n, h);
      const firstPositive = Array.from({ length: h }, (_, i) => i + 1).find((k) => pauseDelta(o, n, h, k) > 0);
      if (firstPositive === undefined) expect(b).toBe(h);
      else expect(b).toBe(firstPositive);
    }));
  });
  it('R20 같은 입력이면 같은 resultId, 조건이 바뀌면 다른 resultId', () => {
    const base = { oldWon: 9900, newWon: 11500, horizon: 12, pauseMonths: 2, serviceId: 'disney_plus_kr', planId: 'standard', serviceName: '디즈니+', effectiveDate: '2026-11-10', policyCheckedAt: '2026-11-14T14:27:59+09:00', sourceUrl: 'https://www.disney.co.kr/notice/update-20261030', inputKind: 'example' as const };
    const a = computeScenario(base);
    const b = computeScenario(base);
    const c = computeScenario({ ...base, pauseMonths: 3 });
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (a.ok && b.ok && c.ok) {
      expect(a.value.resultId).toBe(b.value.resultId);
      expect(a.value.resultId).not.toBe(c.value.resultId);
      expect(a.value.assumptions[0]).toContain('예시 계산');
      expect(a.value.assumptions.some((s) => s.includes('실제 절감액이나 환불액이 아니에요'))).toBe(true);
    }
  });
});
