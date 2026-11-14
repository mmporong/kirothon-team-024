import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runPatrol, runtimePaths, RuntimeRunError, ROOT, type ProcessRun } from '../../scripts/bot-patrol';
import { runDemo } from '../../scripts/demo-scenario';
import { runReview } from '../../scripts/kiro-review';

const fixture = join(ROOT, 'tests/runtime/fixtures/kiro-child.cjs');
const roots: string[] = [];
function setup() {
  const root = mkdtempSync(join(ROOT, 'tests/runtime/.tmp-runner-')); roots.push(root);
  const paths = runtimePaths(root);
  mkdirSync(join(root, 'bot-state/seed'), { recursive: true });
  copyFileSync(join(ROOT, 'bot-state/seed/household.json'), paths.seed);
  return paths;
}
const child = (mode: string) => ({ file: process.execPath, args: [fixture, mode], kind: 'fixture' as const });
async function failed(mode: string, options: { timeoutMs?: number; killGraceMs?: number } = {}) {
  const paths = setup();
  try { await runPatrol({ paths, child: child(mode), ...options }); } catch (e) {
    expect(e).toBeInstanceOf(RuntimeRunError);
    const error = e as RuntimeRunError;
    const saved = JSON.parse(readFileSync(error.receiptPath, 'utf8')) as { receipt: ProcessRun };
    expect(saved.receipt.status).toBe('failed');
    expect(JSON.parse(readFileSync(paths.state, 'utf8')).activePatrolId).toBeNull();
    return { error, paths };
  }
  throw new Error(`반례 ${mode}가 정상 반환됨`);
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('실행기 실패 경계', () => {
  it('보존된 실제 runFinished는 data.status/stopReason을 쓰며 success/result 키는 없다', () => {
    const events = readFileSync(join(ROOT, 'docs/evidence/bot-runs/20261114151505-P1-smoke.events.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const end = events.find((ev) => ev.type === 'runFinished').data;
    expect(end).toMatchObject({ status: 'success', stopReason: 'end_turn' });
    expect(end).not.toHaveProperty('success'); expect(end).not.toHaveProperty('result');
  });
  it('exit 0 + 성공 완료 + finish_patrol만 정상 반환하고 실행/소스 단서를 저장한다', async () => {
    const paths = setup();
    const { receipt } = await runPatrol({ paths, child: child('success') });
    expect(receipt).toMatchObject({ status: 'success', exitCode: 0, execution: 'fixture', sessionId: 'fixture-session', runFinished: { status: 'success', stopReason: 'end_turn' }, sourceDirty: null });
    expect(receipt.runId).toMatch(/^[0-9a-f-]{36}$/); expect(receipt.sourceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.tools).toEqual(['finish_patrol']); expect(readdirSync(paths.runs)).toHaveLength(2);
  });
  it.each([
    ['exit-nonzero', 'exit_nonzero'], ['run-failed', 'run_finished_failed'],
    ['no-run-finished', 'run_finished_missing'], ['no-finish-patrol', 'finish_patrol_missing'],
    ['report-only', 'finish_patrol_missing'], ['no-stop', 'run_finished_failed'], ['truncated-final', 'run_finished_failed'], ['success-key-only', 'run_finished_failed'], ['signal', 'signal'],
  ])('%s이면 실패 영수증을 저장하고 reject한다', async (mode, reason) => {
    const { error } = await failed(mode); expect(error.receipt.failureReasons).toContain(reason);
  });
  it('실행 파일이 없어도 error를 수용하고 실패 영수증을 남긴다', async () => {
    const paths = setup();
    await expect(runPatrol({ paths, child: { file: join(paths.root, 'missing-executable'), args: [], kind: 'fixture' } })).rejects.toMatchObject({ receipt: { status: 'failed', spawnError: 'ENOENT' } });
    expect(readdirSync(paths.runs).filter((name) => name.endsWith('.receipt.json'))).toHaveLength(1);
  });
  it.each(['timeout', 'timeout-ignore-term'])('%s: 시간 초과를 기록하고 종료 후 reject한다', async (mode) => {
    const start = Date.now();
    const { error } = await failed(mode, { timeoutMs: 500, killGraceMs: 80 });
    expect(error.receipt.timedOut).toBe(true); expect(error.receipt.failureReasons).toContain('timeout');
    if (mode === 'timeout-ignore-term') expect(error.receipt.signal).toBe('SIGKILL');
    expect(Date.now() - start).toBeLessThan(5000);
  });
  it('시간 초과는 동일 그룹의 MCP 형태 후손까지 종료한다', async () => {
    const { error, paths } = await failed('timeout-descendant', { timeoutMs: 500, killGraceMs: 80 });
    expect(error.receipt.terminationScope).toBe('process_group');
    const pid = Number(readFileSync(join(paths.root, 'descendant.pid'), 'utf8'));
    let alive = true;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { process.kill(pid, 0); } catch { alive = false; break; }
      await new Promise((done) => setTimeout(done, 20));
    }
    expect(alive).toBe(false);
  });
  it('마지막 JSON 행에 개행이 없어도 runFinished를 보존한다', async () => {
    const { receipt } = await runPatrol({ paths: setup(), child: child('no-newline') });
    expect(receipt.status).toBe('success'); expect(receipt.sessionId).toBe('fixture-session');
  });
  it('stderr를 소비하되 토큰·개인정보·원문을 영수증에 복사하지 않는다', async () => {
    const { receipt } = await runPatrol({ paths: setup(), child: child('stderr') });
    expect(receipt.stderrSummary).toContain('error'); expect(receipt.stderrSummary).toContain('raw content omitted');
    expect(JSON.stringify(receipt)).not.toMatch(/TOP_SECRET_TOKEN|user@example|password=secret|x{30}/);
    expect(receipt.stderrSummary.length).toBeLessThan(200);
  });
  it('실행 도중 소스 변경을 시작·종료 스냅샷으로 표시한다', async () => {
    const paths = setup(); mkdirSync(join(paths.root, 'src')); writeFileSync(join(paths.root, 'src/input.ts'), 'export const changed = false;\n');
    const { receipt } = await runPatrol({ paths, child: child('mutate-source') });
    expect(receipt.sourceChangedDuringRun).toBe(true); expect(receipt.sourceDigest).not.toBe(receipt.sourceAtEnd.sourceDigest);
  });
  it('같은 시점의 새 영수증이 과거 파일을 덮지 않는다', async () => {
    const paths = setup(); mkdirSync(paths.runs, { recursive: true }); writeFileSync(join(paths.runs, 'past.receipt.json'), 'past');
    const a = await runPatrol({ paths, child: child('success') }); const b = await runPatrol({ paths, child: child('success') });
    expect(a.receipt.runId).not.toBe(b.receipt.runId); expect(readFileSync(join(paths.runs, 'past.receipt.json'), 'utf8')).toBe('past');
    expect(readdirSync(paths.runs).filter((name) => name.endsWith('.receipt.json'))).toHaveLength(3);
  });
});

describe('데모·reviewer 성공 승격', () => {
  it.each(['exit-nonzero', 'fail-second', 'no-run-finished', 'no-finish-patrol'])('%s: 공개 replay와 과거 증거를 보존한다', async (mode) => {
    const paths = setup(), output = join(paths.root, 'public/replay/demo.json');
    mkdirSync(join(paths.root, 'public/replay'), { recursive: true }); writeFileSync(output, 'old public replay');
    mkdirSync(paths.runs, { recursive: true }); writeFileSync(join(paths.runs, 'past.json'), 'past evidence');
    await expect(runDemo({ paths, child: child(mode) })).rejects.toBeInstanceOf(RuntimeRunError);
    expect(readFileSync(output, 'utf8')).toBe('old public replay'); expect(readFileSync(join(paths.runs, 'past.json'), 'utf8')).toBe('past evidence');
    expect(readdirSync(paths.runs).some((name) => name.endsWith('-demo-replay.json'))).toBe(false);
  });
  it('프로세스와 업무가 모두 성공한 뒤 replay를 교체하고 이전 대표 파일도 보존한다', async () => {
    const paths = setup(), output = join(paths.root, 'public/replay/demo.json');
    mkdirSync(join(paths.root, 'public/replay'), { recursive: true }); writeFileSync(output, 'old public replay');
    const replay = await runDemo({ paths, child: child('business-success') });
    expect(replay.execution).toBe('fixture'); expect(replay.final.patrols).toHaveLength(5);
    expect(JSON.parse(readFileSync(output, 'utf8')).execution).toBe('fixture');
    const previous = readdirSync(paths.runs).find((name) => name.endsWith('.previous-public.json'))!;
    expect(readFileSync(join(paths.runs, previous), 'utf8')).toBe('old public replay');
  });
  it.each(['exit-nonzero', 'no-run-finished', 'run-failed', 'empty-final'])('reviewer %s: 기존 성공 문서를 건드리지 않는다', async (mode) => {
    const paths = setup(), output = join(paths.root, 'docs/evidence/review.md');
    mkdirSync(join(paths.root, 'docs/evidence'), { recursive: true }); writeFileSync(output, 'past successful review');
    await expect(runReview({ root: paths.root, child: child(mode) })).rejects.toBeInstanceOf(RuntimeRunError);
    expect(readFileSync(output, 'utf8')).toBe('past successful review');
    expect(readdirSync(join(paths.root, 'docs/evidence/reviewer-runs')).filter((name) => name.endsWith('.receipt.json'))).toHaveLength(1);
  });
  it('reviewer 성공은 별도 영수증·실행별 문서·이전 문서를 남긴 뒤 승격한다', async () => {
    const paths = setup(), output = join(paths.root, 'docs/evidence/review.md');
    mkdirSync(join(paths.root, 'docs/evidence'), { recursive: true }); writeFileSync(output, 'past successful review');
    const receipt = await runReview({ root: paths.root, child: child('success') });
    expect(receipt.status).toBe('success'); expect(readFileSync(output, 'utf8')).toContain('fixture review / report');
    const dir = join(paths.root, 'docs/evidence/reviewer-runs'); const previous = readdirSync(dir).find((name) => name.endsWith('.previous.md'))!;
    expect(readFileSync(join(dir, previous), 'utf8')).toBe('past successful review');
  });
});
