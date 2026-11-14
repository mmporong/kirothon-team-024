// 마침표 봇 점검 1회: Kiro CLI 헤드리스로 subs-bot 에이전트를 실행하고 실행 영수증을 남긴다. [R22][R26]
// 사용: npm run bot:patrol  (Kiro CLI 로그인 필요. 앱의 재생 화면은 로그인 없이 기록만 보여 준다)
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BotState, Receipt } from '../src/bot/state';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STATE = process.env.SUBS_STATE_PATH ?? join(ROOT, 'bot-state', 'runtime', 'state.json');
export const SEED = join(ROOT, 'bot-state', 'seed', 'household.json');
const RUNS = join(ROOT, 'docs', 'evidence', 'bot-runs');

export function loadState(): BotState {
  if (!existsSync(STATE)) {
    mkdirSync(dirname(STATE), { recursive: true });
    copyFileSync(SEED, STATE);
  }
  return JSON.parse(readFileSync(STATE, 'utf8')) as BotState;
}

export function saveState(s: BotState): void {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(`${STATE}.tmp`, JSON.stringify(s, null, 1));
  renameSync(`${STATE}.tmp`, STATE);
}

export function resetState(): BotState {
  mkdirSync(dirname(STATE), { recursive: true });
  copyFileSync(SEED, STATE);
  return loadState();
}

const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace('Z', '+09:00');

export async function runPatrol(opts: { model?: string; timeoutMs?: number; tag?: string } = {}): Promise<{ patrolId: string; receipt: Receipt }> {
  const model = opts.model ?? process.env.SUBS_BOT_MODEL ?? 'claude-opus-5.5';
  let s = loadState();
  const patrolId = `P${s.patrols.length + 1}`;
  const startedAtReal = kst();
  s.patrols.push({ id: patrolId, clock: s.clock, startedAtReal, report: null, receipt: null });
  s.activePatrolId = patrolId;
  saveState(s);

  const prompt = `점검을 시작하세요. 데모 시계: ${s.clock}`;
  const args = ['chat', '--no-interactive', '--v3', '--agent', 'subs-bot', '--model', model, '--trust-tools=@household', '--trust-workspace', '--require-mcp-startup', '--output-format', 'stream-json', prompt];
  const t0 = Date.now();
  const lines: string[] = [];
  const exitCode: number | null = await new Promise((res) => {
    const child = spawn('kiro-cli', args, { cwd: ROOT, env: process.env });
    let buf = '';
    child.stdout.on('data', (d: Buffer) => {
      buf += d.toString('utf8');
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        lines.push(line);
        progress(line);
      }
    });
    child.stderr.on('data', () => {});
    const timer = setTimeout(() => child.kill('SIGTERM'), opts.timeoutMs ?? 300000);
    child.on('close', (code) => {
      clearTimeout(timer);
      res(code);
    });
  });

  let modelSeen: string | null = null;
  let engine: string | null = null;
  let credits: number | null = null;
  let finalText = '';
  let fallback = false;
  const tools: string[] = [];
  const hooks: { name: string; status: string }[] = [];
  const kept: unknown[] = [];
  for (const line of lines) {
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (/model_fallback|modelFallback/.test(line)) fallback = true;
    if (ev.type === 'runStarted') engine = ev.data?.engine ?? null;
    if (ev.type === 'runFinished') finalText = ev.data?.finalText ?? '';
    const u = ev.data?.update;
    if (!u) {
      kept.push(ev);
      continue;
    }
    const su = u.sessionUpdate;
    if (su === 'config_option_update') {
      const m = (u.configOptions ?? []).find((o: any) => o.id === 'model');
      if (m?.currentValue) modelSeen = m.currentValue;
      continue;
    }
    if (su === 'agent_thought_chunk' || su === 'agent_message_chunk' || su === 'available_commands_update') continue;
    if (su === 'tool_call' && typeof u.title === 'string' && u.title.startsWith('@household/')) tools.push(u.title.replace('@household/', ''));
    const meta = u._meta?.kiro;
    if (meta?.kind === 'hook_update') hooks.push({ name: meta.hook?.name, status: meta.hook?.status });
    if (meta?.kind === 'session_usage') credits = meta.credits?.[0]?.usage ?? credits;
    if (su === 'tool_call' || su === 'tool_call_update' || meta?.kind === 'hook_update' || meta?.kind === 'turn_completion' || meta?.kind === 'session_usage') kept.push({ su, title: u.title ?? null, status: u.status ?? null, toolCallId: u.toolCallId ?? null, meta: meta?.kind ? { kind: meta.kind, hook: meta.hook?.name ?? null, credits: meta.credits ?? meta.promptTurnSummaries ?? null } : null });
  }

  s = loadState();
  const denied = s.toolLog.filter((t) => t.patrolId === patrolId && !t.ok).length;
  const receipt: Receipt = { model: modelSeen ?? model, engine, ms: Date.now() - t0, toolCalls: tools.length, tools, denied, hooks, credits: credits === null ? null : Math.round(credits * 1000) / 1000, fallback, exitCode, finalText, startedAtReal, finishedAtReal: kst() };
  const p = s.patrols.find((x) => x.id === patrolId)!;
  p.receipt = receipt;
  s.activePatrolId = null;
  saveState(s);

  mkdirSync(RUNS, { recursive: true });
  const stamp = startedAtReal.slice(0, 19).replace(/[-:T]/g, '');
  const tag = opts.tag ? `-${opts.tag}` : '';
  writeFileSync(join(RUNS, `${stamp}-${patrolId}${tag}.receipt.json`), JSON.stringify({ patrolId, clock: p.clock, report: p.report, receipt, toolLog: s.toolLog.filter((t) => t.patrolId === patrolId) }, null, 2));
  writeFileSync(join(RUNS, `${stamp}-${patrolId}${tag}.events.jsonl`), kept.map((k) => JSON.stringify(k)).join('\n') + '\n');
  return { patrolId, receipt };
}

function progress(line: string): void {
  if (!process.stdout.isTTY && !process.env.SUBS_VERBOSE) return;
  try {
    const ev = JSON.parse(line);
    const u = ev.data?.update;
    if (u?.sessionUpdate === 'tool_call' && String(u.title ?? '').startsWith('@household/')) process.stdout.write(`  · ${u.title}\n`);
  } catch {
    /* ignore */
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--reset')) resetState();
  if (process.argv.includes('--dry')) {
    console.log(`상태 초기화: ${STATE}`);
    process.exit(0);
  }
  runPatrol({ tag: process.argv.find((a) => a.startsWith('--tag='))?.slice(6) }).then(({ patrolId, receipt }) => {
    console.log(`${patrolId} 완료: 모델 ${receipt.model}, ${Math.round(receipt.ms / 1000)}초, 도구 ${receipt.toolCalls}회(거부 ${receipt.denied}), 크레딧 ${receipt.credits ?? '?'}`);
    console.log(receipt.finalText);
  });
}
