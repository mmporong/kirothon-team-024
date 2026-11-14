import { CHANNEL_PRICES } from './channelPrice';
import { addDays, daysBetween, type Channel, type Subscription } from './types';

export type DeskStatus = 'active' | 'cancel_planned' | 'cancel_requested' | 'charge_reappeared';

export interface DeskItem extends Omit<Subscription, 'monthlyWon' | 'nextChargeDate' | 'channel' | 'sourceKind'> {
  monthlyWon: number;
  nextChargeDate: string;
  channel: Channel;
  sourceKind: 'demo' | 'manual';
  deskStatus: DeskStatus;
  statusRecordedAt: string | null;
}

export type DeskFilter = 'all' | 'due_soon' | 'cancellation';
export type DeskInput = Pick<DeskItem, 'serviceId' | 'planId' | 'name' | 'monthlyWon' | 'nextChargeDate' | 'channel'>;

export interface DeskSummary {
  monthlyTotal: number;
  dueSoonCount: number;
  cancellationCount: number;
}

export interface DeskStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DESK_STORAGE_KEY = 'ddokpay.subscription-desk.v1';
const CHANNELS: Channel[] = ['web', 'app_store', 'google_play', 'carrier', 'partner'];
const STATUSES: DeskStatus[] = ['active', 'cancel_planned', 'cancel_requested', 'charge_reappeared'];

export function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateDeskInput(input: DeskInput): string[] {
  const errors: string[] = [];
  const plan = CHANNEL_PRICES.services.find((item) => item.id === input.serviceId && item.plan === input.planId);
  if (!plan || plan.name !== input.name) errors.push('서비스와 요금제를 다시 선택해 주세요.');
  if (!Number.isSafeInteger(input.monthlyWon) || input.monthlyWon <= 0) errors.push('월 결제액은 1원 이상의 원 단위 숫자로 입력해 주세요.');
  if (!isValidYmd(input.nextChargeDate)) errors.push('다음 결제일을 올바른 날짜로 입력해 주세요.');
  if (!CHANNELS.includes(input.channel)) errors.push('결제 경로를 다시 선택해 주세요.');
  return errors;
}

export function createDeskItem(input: DeskInput, id: string, sourceKind: DeskItem['sourceKind'] = 'manual'): DeskItem {
  const errors = validateDeskInput(input);
  if (errors.length) throw new Error(errors.join(' '));
  return {
    id,
    ...input,
    ownerId: 'local-user',
    sharedWith: [],
    sourceKind,
    usage: null,
    deskStatus: 'active',
    statusRecordedAt: null,
  };
}

export function upsertDeskItem(items: DeskItem[], item: DeskItem): DeskItem[] {
  if (!isDeskItem(item)) throw new Error('저장할 구독 정보가 올바르지 않습니다.');
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index < 0) return [...items, item];
  return items.map((candidate, candidateIndex) => candidateIndex === index ? item : candidate);
}

export function removeDeskItem(items: DeskItem[], id: string): DeskItem[] {
  return items.filter((item) => item.id !== id);
}

export function recordDeskStatus(item: DeskItem, deskStatus: DeskStatus, recordedAt: string): DeskItem {
  if (!STATUSES.includes(deskStatus) || Number.isNaN(Date.parse(recordedAt))) throw new Error('상태 기록이 올바르지 않습니다.');
  return { ...item, deskStatus, statusRecordedAt: recordedAt };
}

export function filterDeskItems(items: DeskItem[], filter: DeskFilter, today: string): DeskItem[] {
  if (filter === 'due_soon') return items.filter((item) => {
    const days = daysBetween(today, item.nextChargeDate);
    return days >= 0 && days <= 7;
  });
  if (filter === 'cancellation') return items.filter((item) => item.deskStatus !== 'active');
  return items;
}

export function summarizeDesk(items: DeskItem[], today: string): DeskSummary {
  return {
    monthlyTotal: items.reduce((sum, item) => sum + item.monthlyWon, 0),
    dueSoonCount: filterDeskItems(items, 'due_soon', today).length,
    cancellationCount: filterDeskItems(items, 'cancellation', today).length,
  };
}

export function loadDeskItems(storage: DeskStorage): { items: DeskItem[]; warning: string | null } {
  try {
    const raw = storage.getItem(DESK_STORAGE_KEY);
    if (raw === null) return { items: [], warning: null };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.items) || !parsed.items.every(isDeskItem)) {
      return { items: [], warning: '저장된 구독 정보를 읽지 못해 빈 목록으로 시작했어요.' };
    }
    return { items: parsed.items, warning: null };
  } catch {
    return { items: [], warning: '이 기기의 저장소를 읽지 못해 빈 목록으로 시작했어요.' };
  }
}

export function saveDeskItems(storage: DeskStorage, items: DeskItem[]): void {
  if (!items.every(isDeskItem)) throw new Error('저장할 구독 정보가 올바르지 않습니다.');
  storage.setItem(DESK_STORAGE_KEY, JSON.stringify({ version: 1, items }));
}

export function exampleDeskItems(today: string): DeskItem[] {
  const samples: Array<[DeskInput, string]> = [
    [{ serviceId: 'youtube_premium_kr', planId: 'individual', name: '유튜브 프리미엄', monthlyWon: 14900, nextChargeDate: addDays(today, 3), channel: 'web' }, 'sample-youtube'],
    [{ serviceId: 'tving_kr', planId: 'premium', name: '티빙', monthlyWon: 17000, nextChargeDate: addDays(today, 9), channel: 'app_store' }, 'sample-tving'],
    [{ serviceId: 'disney_plus_kr', planId: 'standard', name: '디즈니+', monthlyWon: 9900, nextChargeDate: addDays(today, 18), channel: 'google_play' }, 'sample-disney'],
  ];
  return samples.map(([input, id]) => createDeskItem(input, id, 'demo'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDeskItem(value: unknown): value is DeskItem {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<DeskItem>;
  return typeof candidate.id === 'string' && candidate.id.length > 0
    && typeof candidate.serviceId === 'string'
    && typeof candidate.planId === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.monthlyWon === 'number'
    && typeof candidate.nextChargeDate === 'string'
    && typeof candidate.channel === 'string'
    && typeof candidate.sourceKind === 'string'
    && typeof candidate.deskStatus === 'string'
    && candidate.ownerId === 'local-user'
    && Array.isArray(candidate.sharedWith) && candidate.sharedWith.every((id) => typeof id === 'string')
    && candidate.usage === null
    && (candidate.statusRecordedAt === null || (typeof candidate.statusRecordedAt === 'string' && !Number.isNaN(Date.parse(candidate.statusRecordedAt))))
    && (candidate.sourceKind === 'demo' || candidate.sourceKind === 'manual')
    && STATUSES.includes(candidate.deskStatus as DeskStatus)
    && validateDeskInput(candidate as DeskInput).length === 0;
}
