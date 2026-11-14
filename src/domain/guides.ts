// 공식 해지 경로 안내. 결제 채널별로 다르다. 채널을 모르면 보류한다. [R09][R10]
import guides from '../data/cancel_guides.json';
import type { Channel } from './types';

export interface GuideChannel {
  channel: Channel;
  label: string;
  steps: string[] | null;
  official_url: string | null;
  login_required: boolean | null;
  checked_at: string | null;
  notes?: string | null;
}

interface GuideService {
  id: string;
  name: string;
  category: string;
  channels: GuideChannel[];
  refund_note: string | null;
  source_urls: string[];
}

const data = guides as unknown as { services: GuideService[]; platform_channels: Record<string, GuideChannel>; generated_at: string };

const ALIAS: Record<string, string> = {
  tving_kr: 'tving',
  wavve_kr: 'wavve',
  coupang_play_kr: 'coupang_play',
  coupang_wow_kr: 'coupang_wow',
  spotify_kr: 'spotify_premium_kr',
  naver_plus_kr: 'naver_plus_membership',
  watcha_kr: 'watcha',
  millie_kr: 'millie',
  baemin_club_kr: 'baemin_club',
  apple_one_kr: 'apple_one_icloud_plus',
  icloud_plus_kr: 'apple_one_icloud_plus',
};

export function findService(serviceId: string): GuideService | null {
  const id = ALIAS[serviceId] ?? serviceId;
  return data.services.find((s) => s.id === id) ?? null;
}

export type RouteResult =
  | { status: 'ok'; route: GuideChannel; serviceName: string; refundNote: string | null; stepsVerified: boolean }
  | { status: 'channel_unknown'; options: Channel[] }
  | { status: 'no_guide'; channel: Channel };

function isHttps(url: string | null): boolean {
  return !!url && url.startsWith('https://');
}

export function routeFor(serviceId: string, channel: Channel | null): RouteResult {
  const svc = findService(serviceId);
  const options: Channel[] = ['web', 'app_store', 'google_play', 'carrier', 'partner'];
  if (!channel) return { status: 'channel_unknown', options };
  if (channel === 'app_store' || channel === 'google_play') {
    const p = data.platform_channels[channel];
    if (p && isHttps(p.official_url)) return { status: 'ok', route: p, serviceName: svc?.name ?? serviceId, refundNote: svc?.refund_note ?? null, stepsVerified: !!p.steps?.length };
  }
  const ch = svc?.channels.find((c) => c.channel === channel);
  if (!ch || !isHttps(ch.official_url)) return { status: 'no_guide', channel };
  return { status: 'ok', route: ch, serviceName: svc!.name, refundNote: svc!.refund_note, stepsVerified: !!ch.steps?.length };
}

export const GUIDES_GENERATED_AT = data.generated_at;
