// [R09][R10][R04] 결제 채널별 공식 해지 경로, 경로 불명 보류, 사용량 미확인
import seed from '../../bot-state/seed/household.json';
import type { BotState } from '../../src/bot/state';
import { runTool } from '../../src/bot/tools';
import { routeFor } from '../../src/domain/guides';

describe('R09 결제 채널별 공식 해지 경로', () => {
  it('디즈니+ 웹 결제: https 공식 주소와 확인 시각이 있다', () => {
    const r = routeFor('disney_plus_kr', 'web');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.route.official_url).toMatch(/^https:\/\//);
      expect(r.route.checked_at).toMatch(/^2026-11-14T/);
    }
  });
  it('Google Play 결제는 서비스와 무관하게 Play 스토어 정기 결제 경로와 단계를 쓴다', () => {
    const r = routeFor('disney_plus_kr', 'google_play');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.route.official_url).toBe('https://play.google.com/store/account/subscriptions');
      expect(r.route.steps).toContain('정기 결제 취소');
    }
  });
});

describe('R10 경로 불명 보류', () => {
  it('결제 채널을 모르면 channel_unknown', () => {
    expect(routeFor('disney_plus_kr', null).status).toBe('channel_unknown');
  });
  it('가이드 자료가 없는 채널이면 no_guide', () => {
    expect(routeFor('disney_plus_kr', 'carrier').status).toBe('no_guide');
  });
});

describe('R04 사용량 미확인', () => {
  it('사용량 자료가 없으면 0회가 아니라 미확인으로 보여 준다', () => {
    const r = runTool(structuredClone(seed) as unknown as BotState, 'get_status');
    const subs = r.outcome.result.subscriptions as { usage: string }[];
    expect(subs.every((s) => s.usage.startsWith('미확인'))).toBe(true);
    expect(subs.some((s) => s.usage.includes('0회'))).toBe(true); // "0회로 보지 않음" 문구
  });
});
