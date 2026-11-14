// [R21] 대안 비교: 같은 기간 총액·요구 부적합
import { cheapestFit, compareAlternatives } from '../../src/domain/alternatives';
import { canComputeResub } from '../../src/domain/pricePolicy';

const base = { serviceId: 'disney_plus_kr', planId: 'standard', oldWon: 9900, horizon: 12, pauseMonths: 2, pauseTotal: 115000 };

describe('R21 대안 비교', () => {
  it('연간권 115,000원 < 월 유지 118,800원 (3,800원 차)', () => {
    const opts = compareAlternatives({ ...base, needs: [] });
    const keep = opts.find((o) => o.kind === 'keep')!;
    const annual = opts.find((o) => o.kind === 'annual')!;
    expect(keep.total).toBe(118800);
    expect(annual.total).toBe(115000);
    expect(keep.total! - annual.total!).toBe(3800);
    expect(annual.losesLegacyPrice).toBe(true);
    expect(annual.constraints.join(' ')).toContain('선결제');
  });
  it('광고형 7,000원×12=84,000원이지만 "광고 없이" 요구가 있으면 부적합으로 순위에서 빠진다', () => {
    const opts = compareAlternatives({ ...base, needs: ['no_ads'] });
    const ad = opts.find((o) => o.kind === 'ad')!;
    expect(ad.total).toBe(84000);
    expect(ad.fit).toBe('unfit');
    expect(cheapestFit(opts)?.kind).not.toBe('ad');
  });
  it('선결제 안 함 요구면 연간권도 부적합', () => {
    const opts = compareAlternatives({ ...base, needs: ['no_prepay'] });
    expect(opts.find((o) => o.kind === 'annual')!.fit).toBe('unfit');
  });
  it('권리 정보가 미확인이면 fit이 아니라 unknown — 추천 순위에 넣지 않는다', () => {
    const opts = compareAlternatives({ ...base, serviceId: 'wavve_kr', planId: 'standard', oldWon: 10900, needs: ['no_ads'] });
    expect(opts.every((o) => o.fit !== 'fit')).toBe(true);
    expect(cheapestFit(opts)).toBeNull();
  });
  it('R20 기존가·신규가가 확인되지 않은 요금제는 계산을 보류한다', () => {
    expect(canComputeResub('disney_plus_kr', 'standard')).toEqual({ ok: true, oldWon: 9900, newWon: 11500 });
    expect(canComputeResub('tving_kr', 'standard').ok).toBe(false);
    expect(canComputeResub('coupang_play_kr', 'basic_limited_free').ok).toBe(false);
  });
});
