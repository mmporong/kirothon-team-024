// 데모 시나리오: 실제 Kiro 봇 점검 5회 + 사이사이 사람 행동. 결과를 앱 재생 데이터로 저장한다. [R17][R25][R26]
// 사용: npm run bot:demo   (Kiro CLI 로그인 필요, 약 5~10분)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addSms, humanRecordCancel, humanReply, humanVote, setClock, type HumanResult } from '../src/bot/human';
import { labelOf, type BotState } from '../src/bot/state';
import { caseView } from '../src/bot/tools';
import { loadState, resetState, ROOT, runPatrol, saveState } from './bot-patrol';

type Step =
  | { kind: 'patrol'; id: string; clock: string; receipt: unknown; report: unknown; tools: unknown[]; messages: unknown[]; cases: unknown[] }
  | { kind: 'human'; clock: string; actor: string; action: string; text: string; allowed: boolean; reasons: string[]; cases: unknown[] }
  | { kind: 'event'; clock: string; text: string; sms?: string };

const steps: Step[] = [];
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace('Z', '+09:00');

function cases(s: BotState) {
  return s.cases.map((c) => caseView(s, c));
}

async function patrol(label: string) {
  const before = loadState();
  const seenMsgs = new Set(before.messages.map((m) => m.id));
  process.stdout.write(`\n[${label}] 점검 시작 (데모 시계 ${before.clock})\n`);
  const { patrolId, receipt } = await runPatrol({ tag: 'demo' });
  const s = loadState();
  const p = s.patrols.find((x) => x.id === patrolId)!;
  steps.push({
    kind: 'patrol',
    id: patrolId,
    clock: p.clock,
    receipt,
    report: p.report,
    tools: s.toolLog.filter((t) => t.patrolId === patrolId),
    messages: s.messages.filter((m) => !seenMsgs.has(m.id)).map((m) => ({ ...m, fromLabel: labelOf(s, m.from), toLabel: labelOf(s, m.to) })),
    cases: cases(s),
  });
  console.log(`  → ${patrolId}: ${Math.round(receipt.ms / 1000)}초, 도구 ${receipt.toolCalls}회, 거부 ${receipt.denied}회, 모델 ${receipt.model}`);
  if (p.report) console.log(`  보고: ${p.report.summary}`);
}

function human(actor: string, action: string, fn: (s: BotState) => { state: BotState; result: HumanResult }) {
  const r = fn(loadState());
  saveState(r.state);
  steps.push({ kind: 'human', clock: r.state.clock, actor, action, text: r.result.text, allowed: r.result.allowed, reasons: r.result.reasons, cases: cases(r.state) });
  console.log(`  [사람] ${r.result.text}${r.result.allowed ? '' : ' (거부)'}`);
}

function clock(iso: string, text: string) {
  saveState(setClock(loadState(), iso));
  steps.push({ kind: 'event', clock: iso, text });
}

function sms(text: string, receivedAt: string, label: string) {
  saveState(addSms(loadState(), text, receivedAt));
  steps.push({ kind: 'event', clock: loadState().clock, text: label, sms: text });
}

async function main() {
  const startedAt = kst();
  resetState();
  steps.push({ kind: 'event', clock: loadState().clock, text: '합성 데모 가구: 나(결제자)·엄마·동생. 디즈니+ 스탠다드 9,900원(기존 요금)을 셋이 함께 봐요. 결제일 11월 17일.' });

  await patrol('1');
  clock('2026-11-14T09:10:00+09:00', '10분 뒤');
  human('나', 'reply', (s) => humanReply(s, 'me', '2개월 쉬는 걸로 하고, 엄마랑 동생한테 물어봐 줘.', 'sub-disney'));

  clock('2026-11-14T09:30:00+09:00', '20분 뒤 다음 점검');
  await patrol('2');

  clock('2026-11-14T10:00:00+09:00', '30분 뒤');
  human('엄마', 'vote', (s) => humanVote(s, 'mom', 'agree'));
  clock('2026-11-14T10:05:00+09:00', '5분 뒤');
  human('동생', 'vote', (s) => humanVote(s, 'bro', 'object', { comment: '2개월은 애매해요. 어차피 2월까지는 볼 게 없으니까 3개월 쉬어요.' }));

  clock('2026-11-14T12:00:00+09:00', '점심 점검');
  await patrol('3');

  clock('2026-11-14T12:20:00+09:00', '20분 뒤');
  human('엄마', 'vote-stale', (s) => humanVote(s, 'mom', 'agree', { version: 1 }));
  human('엄마', 'vote', (s) => humanVote(s, 'mom', 'agree'));
  clock('2026-11-14T12:25:00+09:00', '5분 뒤');
  human('동생', 'vote', (s) => humanVote(s, 'bro', 'agree'));

  clock('2026-11-14T18:00:00+09:00', '저녁 점검');
  await patrol('4');

  clock('2026-11-14T18:30:00+09:00', '결제자가 디즈니+ 웹에서 해지 신청');
  human('나', 'cancel', (s) => humanRecordCancel(s, 'me'));

  clock('2026-11-17T09:00:00+09:00', '3일 뒤, 원래 결제일 아침');
  sms('[합성 데모]\nKB국민카드[합성] 카드(1234) 승인 홍*동\n9,900원 일시불\n2026-11-17 09:00 KST\nGoogle Play 디즈니+', '2026-11-17T09:00:30+09:00', '결제 문자 1건 도착(합성)');
  await patrol('5');

  const s = loadState();
  const replay = {
    schema: 1,
    title: '구독 점검 봇 — Kiro CLI 실제 실행 기록',
    recordedAt: startedAt,
    finishedAt: kst(),
    note: '각 점검은 Kiro CLI 헤드리스(--agent subs-bot, household MCP)로 실제 실행했고, 이 파일은 그 결과를 저장한 녹화 기록이다. 가구·문자·응답은 모두 합성 데이터다.',
    household: s.household,
    subscriptions: s.subscriptions,
    steps,
    final: { cases: cases(s), messages: s.messages.map((m) => ({ ...m, fromLabel: labelOf(s, m.from), toLabel: labelOf(s, m.to) })), toolLog: s.toolLog, patrols: s.patrols, transactions: s.transactions },
  };
  mkdirSync(join(ROOT, 'public', 'replay'), { recursive: true });
  writeFileSync(join(ROOT, 'public', 'replay', 'demo.json'), JSON.stringify(replay, null, 1));
  const stamp = startedAt.slice(0, 19).replace(/[-:T]/g, '');
  writeFileSync(join(ROOT, 'docs', 'evidence', 'bot-runs', `${stamp}-demo-replay.json`), JSON.stringify(replay, null, 1));
  const total = s.patrols.reduce((a, p) => a + (p.receipt?.ms ?? 0), 0);
  console.log(`\n완료: 점검 ${s.patrols.length}회, 총 ${Math.round(total / 1000)}초, 도구 호출 ${s.toolLog.length}회(거부 ${s.toolLog.filter((t) => !t.ok).length}회), 메시지 ${s.messages.length}개`);
  console.log(`재생 데이터: public/replay/demo.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
