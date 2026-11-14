// 봇이 다루는 가구 상태. MCP 서버가 파일로 저장하고, 앱은 기록된 실행을 재생한다. [R22][R26]
import type { ParsedPayment } from '../domain/parsePayment';
import type { CaseState } from '../domain/policy';
import type { Scenario } from '../domain/resubBreakeven';
import { kstDate, type Channel, type Subscription } from '../domain/types';

export interface MemberInfo {
  id: string;
  label: string;
  role: 'owner' | 'member';
}

export interface SmsItem {
  id: string;
  receivedAt: string;
  text: string; // 합성 문자. 봇(모델)에는 돌려주지 않는다 [R27]
  processed: boolean;
  synthetic: boolean;
}

export type TxEffect = 'ignored_not_charge' | 'matches_subscription' | 'amount_differs' | 'unlinked' | 'charge_after_cancel' | 'charge_recorded' | 'expected_new_channel';

export const TX_EFFECT_LABEL: Record<TxEffect, string> = {
  ignored_not_charge: '청구 아님(광고·인증·유효성 확인 등)',
  matches_subscription: '등록된 구독 금액과 일치',
  amount_differs: '등록된 금액과 달라 확인 필요',
  unlinked: '등록된 구독과 연결되지 않음',
  charge_after_cancel: '해지 요청 뒤 청구 — 사건 다시 열림',
  charge_recorded: '청구 기록',
  expected_new_channel: '옮긴 결제 경로의 예상된 청구',
};

export interface TxRecord {
  smsId: string;
  receivedAt: string;
  eventType: ParsedPayment['eventType'];
  serviceId: string | null;
  amountWon: number | null;
  foreignAmount: ParsedPayment['foreignAmount'];
  date: string | null;
  channel: Channel | null;
  spans: ParsedPayment['spans'];
  linkedSubscriptionId: string | null;
  effect: TxEffect;
}

export type MessageKind = 'question' | 'vote_request' | 'reminder' | 'route' | 'info' | 'reply' | 'vote' | 'action';

export interface Message {
  id: string;
  at: string;
  from: string; // member id 또는 'bot'
  to: string;
  kind: MessageKind;
  text: string;
  subscriptionId: string | null;
  caseId: string | null;
  choices?: string[];
  version?: number;
  questionId?: string;
  readByBot: boolean;
  patrolId: string | null;
}

export interface Question {
  id: string;
  at: string;
  to: string;
  subscriptionId: string;
  caseId: string | null;
  topic: 'decide' | 'vote';
  version: number | null;
  status: 'pending' | 'answered' | 'superseded';
  patrolId: string | null;
}

export interface ToolLog {
  seq: number;
  at: string;
  patrolId: string | null;
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  reasons: string[];
  summary: string;
}

export interface Receipt {
  model: string | null;
  engine: string | null;
  ms: number;
  toolCalls: number;
  tools: string[];
  denied: number;
  hooks: { name: string; status: string }[];
  credits: number | null;
  fallback: boolean;
  exitCode: number | null;
  finalText: string;
  startedAtReal: string;
  finishedAtReal: string;
}

export interface PatrolRecord {
  id: string;
  clock: string;
  startedAtReal: string;
  report: { summary: string; waitingFor: string[] } | null;
  receipt: Receipt | null;
}

export interface BotState {
  schema: 1;
  clock: string; // 데모 시계(ISO +09:00). 시나리오 실행기만 바꾼다
  household: { name: string; members: MemberInfo[] };
  subscriptions: Subscription[];
  cases: CaseState[];
  inbox: SmsItem[];
  transactions: TxRecord[];
  messages: Message[];
  questions: Question[];
  scenarios: Record<string, Scenario & { subscriptionId: string }>;
  optionBook: Record<string, number[]>; // 구독별 대안 총액(숫자 검증용)
  toolLog: ToolLog[];
  patrols: PatrolRecord[];
  activePatrolId: string | null;
  seq: number;
}

export function nextId(s: BotState, prefix: string): string {
  s.seq += 1;
  return `${prefix}-${s.seq}`;
}

export function todayOf(s: BotState): string {
  return kstDate(s.clock);
}

export function memberOf(s: BotState, idOrLabel: string): MemberInfo | null {
  const key = String(idOrLabel ?? '').trim();
  return s.household.members.find((m) => m.id === key || m.label === key) ?? null;
}

export function labelOf(s: BotState, id: string): string {
  if (id === 'bot') return '봇';
  return s.household.members.find((m) => m.id === id)?.label ?? id;
}

export function openCaseFor(s: BotState, subscriptionId: string): CaseState | null {
  const list = s.cases.filter((c) => c.subscription.id === subscriptionId);
  return list.at(-1) ?? null;
}

export function replaceCase(s: BotState, next: CaseState): void {
  const i = s.cases.findIndex((c) => c.caseId === next.caseId);
  if (i >= 0) s.cases[i] = next;
  else s.cases.push(next);
}

export function hoursBetween(aIso: string, bIso: string): number {
  return (Date.parse(bIso) - Date.parse(aIso)) / 3600000;
}
