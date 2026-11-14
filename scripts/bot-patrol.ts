// 똑이 점검 실행기. 실패 기록과 성공 재생 자료를 구분한다. [R22][R26]
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { setTimeout, clearTimeout } from 'node:timers';
import type { BotState, Receipt } from '../src/bot/state';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STATE = process.env.SUBS_STATE_PATH ?? join(ROOT, 'bot-state', 'runtime', 'state.json');
export interface RuntimePaths { root: string; state: string; seed: string; runs: string }
export function runtimePaths(root = ROOT): RuntimePaths {
  return { root, state: root === ROOT ? STATE : join(root, 'bot-state/runtime/state.json'), seed: join(root, 'bot-state/seed/household.json'), runs: join(root, 'docs/evidence/bot-runs') };
}
export function loadState(paths = runtimePaths()): BotState {
  if (!existsSync(paths.state)) { mkdirSync(dirname(paths.state), { recursive: true }); copyFileSync(paths.seed, paths.state); }
  return JSON.parse(readFileSync(paths.state, 'utf8')) as BotState;
}
export function saveState(s: BotState, paths = runtimePaths()): void {
  mkdirSync(dirname(paths.state), { recursive: true });
  const tmp = `${paths.state}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 1), { flag: 'wx' });
  renameSync(tmp, paths.state);
}
export function resetState(paths = runtimePaths()): BotState {
  mkdirSync(dirname(paths.state), { recursive: true }); copyFileSync(paths.seed, paths.state); return loadState(paths);
}
export const kstNow = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace('Z', '+09:00');
const record = (x: unknown): Record<string, unknown> => x !== null && typeof x === 'object' ? x as Record<string, unknown> : {};
const text = (x: unknown): string | null => typeof x === 'string' ? x : null;
const digest = (algorithm: string, value: string | Uint8Array) => createHash(algorithm).update(value).digest('hex');

export interface SourceSnapshot {
  sourceSha: string | null;
  sourceDirty: boolean | null;
  sourceDirtyFiles: string[];
  sourceDirtyScope: 'runtime-inputs-vs-head';
  sourceDigest: string;
  sourceCheck: 'loose-git-objects' | 'unavailable';
}
// Git 명령 없이 실행 입력을 HEAD와 비교한다. packed object 등 미지원 상태는 clean으로 추정하지 않는다.
export function sourceSnapshot(root: string): SourceSnapshot {
  const files = new Map<string, Uint8Array>();
  function collect(rel: string): void {
    const p = join(root, rel);
    if (!existsSync(p)) return;
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      if (entry.name.startsWith('.tmp-') || entry.name.startsWith('.runs-') || entry.isSymbolicLink()) continue;
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) collect(next);
      else if (entry.isFile()) files.set(next, readFileSync(join(root, next)));
    }
  }
  for (const rel of ['src', 'scripts', 'mcp', 'tests', '.kiro', 'bot-state/seed']) collect(rel);
  for (const name of readdirSync(root)) {
    if (/^(package(-lock)?\.json|tsconfig(?:\.[\w-]+)?\.json|vite\.config\.ts)$/.test(name)) files.set(name, readFileSync(join(root, name)));
  }
  const manifest = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => `${name}\0${digest('sha256', bytes)}\n`).join('');
  const result: SourceSnapshot = { sourceSha: null, sourceDirty: null, sourceDirtyFiles: [], sourceDirtyScope: 'runtime-inputs-vs-head', sourceDigest: digest('sha256', manifest), sourceCheck: 'unavailable' };
  try {
    let gitDir = join(root, '.git');
    try { const pointer = readFileSync(gitDir, 'utf8').trim(); if (pointer.startsWith('gitdir: ')) gitDir = resolve(root, pointer.slice(8)); } catch { /* 일반 .git 디렉터리이면 이 읽기가 실패한다. */ }
    const common = existsSync(join(gitDir, 'commondir')) ? resolve(gitDir, readFileSync(join(gitDir, 'commondir'), 'utf8').trim()) : gitDir;
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    let sha = head;
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5);
      const refPath = [join(gitDir, ref), join(common, ref)].find(existsSync);
      sha = refPath ? readFileSync(refPath, 'utf8').trim() : readFileSync(join(common, 'packed-refs'), 'utf8').split('\n').find((line) => line.endsWith(` ${ref}`))?.split(' ')[0] ?? '';
    }
    if (!/^[0-9a-f]{40}$/.test(sha)) return result;
    result.sourceSha = sha;
    const object = (id: string) => { const raw = inflateSync(readFileSync(join(common, 'objects', id.slice(0, 2), id.slice(2)))); return raw.subarray(raw.indexOf(0) + 1); };
    const treeId = object(sha).toString('utf8').match(/^tree ([0-9a-f]{40})\n/)?.[1];
    if (!treeId) return result;
    const tracked = new Map<string, string>();
    function walkTree(id: string, prefix = ''): void {
      const b = object(id);
      let at = 0;
      while (at < b.length) {
        const space = b.indexOf(32, at), nul = b.indexOf(0, space);
        if (space < 0 || nul < 0 || nul + 21 > b.length) throw new Error('invalid tree');
        const mode = b.subarray(at, space).toString('utf8');
        const name = prefix + b.subarray(space + 1, nul).toString('utf8');
        const oid = b.subarray(nul + 1, nul + 21).toString('hex');
        if (mode === '40000') walkTree(oid, `${name}/`); else tracked.set(name, oid);
        at = nul + 21;
      }
    }
    walkTree(treeId);
    const inScope = (name: string) => /^(src|scripts|mcp|tests|\.kiro|bot-state\/seed)\//.test(name) || /^(package(-lock)?\.json|tsconfig(?:\.[\w-]+)?\.json|vite\.config\.ts)$/.test(name);
    const names = new Set([...files.keys(), ...[...tracked.keys()].filter(inScope)]);
    result.sourceDirtyFiles = [...names].filter((name) => {
      const b = files.get(name);
      if (!b) return true;
      return digest('sha1', Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])) !== tracked.get(name);
    }).sort();
    result.sourceDirty = result.sourceDirtyFiles.length > 0;
    result.sourceCheck = 'loose-git-objects';
  } catch { /* SHA만 읽힌 경우에도 dirty는 미확인으로 남긴다. */ }
  return result;
}

export interface ChildCommand { file: string; args: string[]; kind: 'fixture' }
export interface ProcessOptions { root: string; args: string[]; timeoutMs?: number; killGraceMs?: number; child?: ChildCommand; env?: Record<string, string | undefined> }
export interface ProcessRun extends Receipt, SourceSnapshot {
  runId: string; sessionId: string | null; kiroRunId: string | null;
  execution: 'kiro' | 'fixture'; status: 'success' | 'failed'; failureReasons: string[];
  timedOut: boolean; signal: string | null; spawnError: string | null; stderrSummary: string;
  runFinished: { status: string | null; stopReason: string | null; finalTextTruncated: boolean | null } | null;
  childPid: number | null; terminationScope: 'process_group' | 'child';
  sourceAtEnd: SourceSnapshot; sourceChangedDuringRun: boolean;
}
export interface ProcessResult { receipt: ProcessRun; events: unknown[] }

export function stderrSummary(sample: string, bytes: number): string {
  if (!bytes) return '';
  // 원문·인자·토큰·개인정보를 복사하지 않고 고정된 진단 분류만 보존한다.
  const indicators = [/ENOENT/i, /EACCES/i, /429|rate.?limit/i, /timeout|timed out/i, /auth|credential|login/i, /error|failed/i]
    .flatMap((pattern, i) => pattern.test(sample) ? [['not_found', 'permission', 'rate_limit', 'timeout', 'authentication', 'error'][i]!] : []);
  return `stderr ${bytes} bytes; ${indicators.join(', ') || 'unclassified'}; raw content omitted`;
}

export async function runKiroProcess(opts: ProcessOptions): Promise<ProcessResult> {
  const source = sourceSnapshot(opts.root), startedAtReal = kstNow(), t0 = Date.now();
  const runId = randomUUID();
  const lines: string[] = [];
  let childPid: number | null = null;
  const processGroup = process.platform !== 'win32';
  let stderrSample = '', stderrBytes = 0, timedOut = false, spawnError: string | null = null, signal: string | null = null;
  const exitCode = await new Promise<number | null>((done) => {
    let settled = false, timer: ReturnType<typeof setTimeout> | undefined, force: ReturnType<typeof setTimeout> | undefined;
    let buf = '';
    const finish = (code: number | null, sig: string | null = null) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearTimeout(force); signal = sig;
      if (buf.trim()) lines.push(buf.trim());
      done(code);
    };
    try {
      const child = spawn(opts.child?.file ?? 'kiro-cli', opts.child?.args ?? opts.args, { cwd: opts.root, env: opts.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: processGroup });
      childPid = child.pid ?? null;
      const terminate = (sig: string) => {
        try { if (processGroup && child.pid) process.kill(-child.pid, sig); else child.kill(sig); } catch { /* 종료 직후 사라진 프로세스 그룹일 수 있다. */ }
      };
      child.stdout?.on('data', (d: Buffer) => {
        buf += d.toString('utf8');
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) lines.push(line); }
      });
      child.stderr?.on('data', (d: Buffer) => { stderrBytes += d.length; if (stderrSample.length < 8192) stderrSample += d.toString('utf8').slice(0, 8192 - stderrSample.length); });
      child.on('error', (e: Error & { code?: string }) => { spawnError = e.code ?? e.name; finish(null); });
      child.on('close', (code: number | null, sig: string | null) => {
        if (timedOut || code !== 0 || sig) terminate('SIGKILL');
        finish(code, sig);
      });
      timer = setTimeout(() => { timedOut = true; terminate('SIGTERM'); force = setTimeout(() => terminate('SIGKILL'), opts.killGraceMs ?? 1000); }, opts.timeoutMs ?? 300000);
    } catch (e) { spawnError = e instanceof Error ? e.name : 'spawn_error'; finish(null); }
  });
  let model: string | null = null, engine: string | null = null, credits: number | null = null, finalText = '', fallback = false;
  let sessionId: string | null = null, kiroRunId: string | null = null;
  let runFinished: ProcessRun['runFinished'] = null;
  const tools: string[] = [], hooks: Receipt['hooks'] = [], events: unknown[] = [];
  for (const line of lines) {
    let ev: Record<string, unknown>;
    try { ev = record(JSON.parse(line)); } catch { continue; }
    const d = record(ev.data), u = record(d.update), meta = record(record(u._meta).kiro);
    sessionId = text(d.sessionId) ?? sessionId;
    kiroRunId = text(d.runId) ?? text(ev.runId) ?? kiroRunId;
    if (/model_fallback|modelFallback/.test(line)) fallback = true;
    if (ev.type === 'runStarted') engine = text(d.engine);
    if (ev.type === 'runFinished') { finalText = text(d.finalText) ?? ''; runFinished = { status: text(d.status), stopReason: text(d.stopReason), finalTextTruncated: typeof d.finalTextTruncated === 'boolean' ? d.finalTextTruncated : null }; }
    const su = u.sessionUpdate;
    if (su === 'config_option_update' && Array.isArray(u.configOptions)) {
      model = text(record(u.configOptions.find((option) => record(option).id === 'model')).currentValue) ?? model;
    }
    if (su === 'tool_call' && typeof u.title === 'string') tools.push(u.title);
    if (meta.kind === 'hook_update') { const h = record(meta.hook); hooks.push({ name: text(h.name) ?? 'unknown', status: text(h.status) ?? 'unknown' }); }
    if (meta.kind === 'session_usage' && Array.isArray(meta.credits)) { const usage = record(meta.credits[0]).usage; if (typeof usage === 'number') credits = usage; }
    if (['agent_thought_chunk', 'agent_message_chunk', 'available_commands_update', 'config_option_update'].includes(String(su))) continue;
    if (!su) events.push(ev);
    else if (su === 'tool_call' || su === 'tool_call_update' || ['hook_update', 'turn_completion', 'session_usage'].includes(String(meta.kind))) {
      events.push({ su, title: u.title ?? null, status: u.status ?? null, toolCallId: u.toolCallId ?? null, sessionId, meta: meta.kind ? { kind: meta.kind, hook: record(meta.hook).name ?? null, credits: meta.credits ?? meta.promptTurnSummaries ?? null } : null });
    }
  }
  const failureReasons: string[] = [];
  if (spawnError) failureReasons.push('spawn_error');
  if (timedOut) failureReasons.push('timeout');
  if (exitCode !== 0) failureReasons.push('exit_nonzero');
  if (signal) failureReasons.push('signal');
  if (!runFinished) failureReasons.push('run_finished_missing');
  // 보존된 실제 v3 이벤트: data.status=success, data.stopReason=end_turn. success/result 키는 없었다.
  else if (runFinished.status !== 'success' || runFinished.stopReason !== 'end_turn' || runFinished.finalTextTruncated === true) failureReasons.push('run_finished_failed');
  const sourceAtEnd = sourceSnapshot(opts.root);
  return { events, receipt: {
    ...source, sourceAtEnd, sourceChangedDuringRun: source.sourceDigest !== sourceAtEnd.sourceDigest || source.sourceSha !== sourceAtEnd.sourceSha,
    runId, sessionId, kiroRunId, childPid, terminationScope: processGroup ? 'process_group' : 'child', execution: opts.child ? 'fixture' : 'kiro', status: failureReasons.length ? 'failed' : 'success', failureReasons,
    model, engine, ms: Date.now() - t0, tools, toolCalls: tools.length, denied: 0, hooks, credits: credits === null ? null : Math.round(credits * 1000) / 1000,
    fallback, exitCode, finalText, startedAtReal, finishedAtReal: kstNow(), timedOut, signal, spawnError, stderrSummary: stderrSummary(stderrSample, stderrBytes), runFinished,
  } };
}

export class RuntimeRunError extends Error {
  constructor(public readonly receipt: ProcessRun, public readonly receiptPath: string) { super(`실행 실패: ${receipt.failureReasons.join(', ')}; 영수증: ${receiptPath}`); this.name = 'RuntimeRunError'; }
}
export function artifactStem(receipt: ProcessRun, label: string): string {
  return `${receipt.startedAtReal.slice(0, 23).replace(/[-:T.]/g, '')}-${label.replace(/[^a-zA-Z0-9_-]/g, '_')}-${receipt.runId}`;
}
export function saveArtifacts(dir: string, stem: string, receipt: unknown, events: unknown[]): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${stem}.receipt.json`);
  writeFileSync(path, JSON.stringify(receipt, null, 2), { flag: 'wx' });
  writeFileSync(join(dir, `${stem}.events.jsonl`), events.map((ev) => JSON.stringify(ev)).join('\n') + '\n', { flag: 'wx' });
  return path;
}
export interface PatrolOptions { model?: string; timeoutMs?: number; killGraceMs?: number; tag?: string; paths?: RuntimePaths; child?: ChildCommand }
export async function runPatrol(opts: PatrolOptions = {}): Promise<{ patrolId: string; receipt: ProcessRun }> {
  const paths = opts.paths ?? runtimePaths(), model = opts.model ?? process.env.SUBS_BOT_MODEL ?? 'claude-opus-5.5';
  let s = loadState(paths);
  const patrolId = `P${s.patrols.length + 1}`;
  s.patrols.push({ id: patrolId, clock: s.clock, startedAtReal: kstNow(), report: null, receipt: null });
  s.activePatrolId = patrolId; saveState(s, paths);
  const args = ['chat', '--no-interactive', '--v3', '--agent', 'subs-bot', '--model', model, '--trust-tools=@household', '--trust-workspace', '--require-mcp-startup', '--output-format', 'stream-json', `점검을 시작하세요. 데모 시계: ${s.clock}`];
  const result = await runKiroProcess({ root: paths.root, args, timeoutMs: opts.timeoutMs, killGraceMs: opts.killGraceMs, child: opts.child, env: { ...process.env, SUBS_STATE_PATH: paths.state } });
  const r = result.receipt;
  let stateReadable = true;
  try { s = loadState(paths); } catch { stateReadable = false; r.failureReasons.push('state_unreadable'); }
  const p = s.patrols.find((x) => x.id === patrolId);
  if (!p?.report?.summary.trim() || !s.toolLog.some((t) => t.patrolId === patrolId && t.tool === 'finish_patrol' && t.ok)) r.failureReasons.push('finish_patrol_missing');
  r.tools = r.tools.filter((name) => name.startsWith('@household/')).map((name) => name.slice('@household/'.length));
  r.toolCalls = r.tools.length; r.denied = s.toolLog.filter((t) => t.patrolId === patrolId && !t.ok).length; r.model ??= model;
  r.status = r.failureReasons.length ? 'failed' : 'success';
  if (p) p.receipt = r;
  if (s.activePatrolId === patrolId) s.activePatrolId = null;
  if (stateReadable) saveState(s, paths);
  const receiptPath = saveArtifacts(paths.runs, artifactStem(r, `${patrolId}${opts.tag ? `-${opts.tag}` : ''}`), { patrolId, clock: p?.clock ?? s.clock, report: p?.report ?? null, receipt: r, toolLog: s.toolLog.filter((t) => t.patrolId === patrolId) }, result.events);
  if (r.status !== 'success') throw new RuntimeRunError(r, receiptPath);
  return { patrolId, receipt: r };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--reset')) resetState();
  if (process.argv.includes('--dry')) console.log(`상태 초기화: ${STATE}`);
  else runPatrol({ tag: process.argv.find((a) => a.startsWith('--tag='))?.slice(6) }).then(({ patrolId, receipt }) => {
    console.log(`${patrolId} 완료: 모델 ${receipt.model}, ${Math.round(receipt.ms / 1000)}초, 도구 ${receipt.toolCalls}회(거부 ${receipt.denied})`);
    console.log(receipt.finalText);
  }).catch((e: unknown) => { console.error(e instanceof Error ? e.message : '점검 실패'); process.exitCode = 1; });
}
