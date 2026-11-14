import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runtimePaths } from '../../scripts/bot-patrol';
import { runDemo } from '../../scripts/demo-scenario';
import { DEMO_HUMAN_EXPECTATIONS, DemoBusinessError, demoBusinessIssues, humanIssues } from '../../scripts/demo-validation';
import type { BotState } from '../../src/bot/state';

const roots: string[] = [];
const fixture = join(ROOT, 'tests/runtime/fixtures/kiro-child.cjs');
function setup() {
  const root = mkdtempSync(join(ROOT, 'tests/runtime/.tmp-demo-business-')); roots.push(root);
  const paths = runtimePaths(root);
  mkdirSync(join(root, 'bot-state/seed'), { recursive: true });
  copyFileSync(join(ROOT, 'bot-state/seed/household.json'), paths.seed);
  mkdirSync(join(root, 'public/replay'), { recursive: true });
  writeFileSync(join(root, 'public/replay/demo.json'), 'previous public replay');
  return paths;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
it('A-P1-01: finish_patrol만 성공하고 사건이 없으면 대표 replay를 교체하지 않는다', async () => {
  const paths = setup();
  let rejected = false;
  let replay: Awaited<ReturnType<typeof runDemo>> | undefined;
  try { replay = await runDemo({ paths, child: { file: process.execPath, args: [fixture, 'success'], kind: 'fixture' } }); }
  catch { rejected = true; }
  const state = JSON.parse(readFileSync(paths.state, 'utf8'));
  const observed = { rejected, promoted: readFileSync(join(paths.root, 'public/replay/demo.json'), 'utf8') !== 'previous public replay', patrols: state.patrols.length, caseCount: state.cases.length, humanRejections: replay?.steps.filter((step) => step.kind === 'human' && !step.allowed).length ?? null };
  writeFileSync(join(paths.root, 'reproduction.json'), JSON.stringify(observed, null, 2));
  console.log('A-P1-01 reproduction', JSON.stringify(observed));
  expect(observed).toMatchObject({ rejected: true, promoted: false, caseCount: 0 });
  expect(existsSync(join(paths.root, 'public/replay/demo.json'))).toBe(true);
});

const command = (mode: string) => ({ file: process.execPath, args: [fixture, mode], kind: 'fixture' as const });
async function failure(mode: string) {
  const paths = setup();
  let error: unknown;
  try { await runDemo({ paths, child: command(mode) }); } catch (e) { error = e; }
  expect(error).toBeInstanceOf(DemoBusinessError);
  const businessError = error as DemoBusinessError;
  expect(businessError.receiptPath).toBeTruthy();
  const evidence = JSON.parse(readFileSync(businessError.receiptPath!, 'utf8'));
  expect(evidence).toMatchObject({ status: 'failed', businessStatus: 'failed', execution: 'fixture', publicReplayUnchanged: true });
  expect(evidence.reproduction.steps.some((step: { kind: string }) => step.kind === 'human')).toBe(true);
  expect(readFileSync(join(paths.root, 'public/replay/demo.json'), 'utf8')).toBe('previous public replay');
  expect(readdirSync(paths.runs).some((name) => name.endsWith('-demo-replay.json'))).toBe(false);
  return { error: businessError, evidence, paths };
}
describe('필수 사람 행동의 정확한 기대 결과', () => {
  it.each(Object.entries(DEMO_HUMAN_EXPECTATIONS))('%s의 allowed와 사유를 별도로 검사한다', (id, expected) => {
    const good = { id, ...expected };
    expect(humanIssues(good)).toEqual([]);
    expect(humanIssues({ ...good, allowed: !expected.allowed })).toHaveLength(1);
    expect(humanIssues({ ...good, reasons: ['no_proposal'] })).toHaveLength(1);
  });
  it.each([
    ['business-no-family', 'disney_mom_v1'],
    ['business-no-revision', 'disney_mom_stale'],
    ['business-wrong-stale-reason', 'disney_mom_stale'],
  ])('%s: 사람 행동이 예상과 다르면 즉시 중단하고 증거를 저장한다', async (mode, stepId) => {
    const { error, evidence } = await failure(mode);
    expect(error.issues).toContainEqual(expect.objectContaining({ code: 'human_outcome_mismatch', stepId }));
    expect(evidence.reproduction.steps.filter((step: { kind: string }) => step.kind === 'human').at(-1).id).toBe(stepId);
    expect(evidence.processes.every((p: { status: string }) => p.status === 'success')).toBe(true);
  });
});
describe('최종 업무 상태와 대표 replay 승격', () => {
  it('합성 청구 입력과 8개 사람 결과·동일 사건 재개방이 모두 맞을 때만 성공한다', async () => {
    const paths = setup();
    const replay = await runDemo({ paths, child: command('business-success') });
    const humans = replay.steps.filter((step) => step.kind === 'human');
    expect(humans).toHaveLength(8); expect(humans.filter((step) => step.allowed)).toHaveLength(7);
    expect(humans.filter((step) => !step.allowed)).toMatchObject([{ id: 'disney_mom_stale', reasons: ['stale_version'] }]);
    expect(replay).toMatchObject({ execution: 'fixture', businessValidation: { status: 'passed', humanSteps: 8 }, demoInputs: [{ basis: 'synthetic_demo_charge', monthlyWon: 19500 }] });
    expect(replay.demoInputs[0]!.note).toContain('공식 월 가격을 검증했다는 뜻이 아님');
    const s = JSON.parse(readFileSync(paths.state, 'utf8')) as BotState;
    expect(s.cases.map((c) => [c.subscription.id, c.stage])).toEqual([['sub-youtube', 'reopened'], ['sub-disney', 'cancel_requested']]);
    expect(demoBusinessIssues(s, humans)).toEqual([]);
    expect(JSON.parse(readFileSync(join(paths.root, 'public/replay/demo.json'), 'utf8')).businessValidation.status).toBe('passed');
    const seed = JSON.parse(readFileSync(paths.seed, 'utf8'));
    expect(seed.subscriptions.find((sub: { id: string }) => sub.id === 'sub-youtube').monthlyWon).toBeNull();
    expect(readdirSync(paths.runs).filter((name) => name.endsWith('.previous-public.json'))).toHaveLength(1);
    expect(demoBusinessIssues(s, humans.slice(1))).toContainEqual(expect.objectContaining({ code: 'human_steps_incomplete' }));
  });
  it.each([
    ['business-no-reopen', 'youtube_final_state'],
    ['business-no-old-charge', 'old_channel_charge_missing'],
    ['business-no-new-charge', 'charge_classification_missing'],
    ['business-no-consent', 'family_current_consent_missing'],
    ['business-no-route', 'apple_refund_route_missing'],
    ['business-wrong-switch', 'youtube_final_state'],
    ['business-no-disney-cancel', 'disney_final_state'],
    ['business-missing-case', 'disney_case_missing_or_duplicate'],
    ['business-no-owner-question', 'owner_question_missing'],
    ['business-no-switch-route', 'youtube_switch_route_missing'],
    ['business-wrong-refund', 'apple_refund_route_missing'],
  ])('%s: 모델 프로세스 5회와 사람 입력이 성공해도 업무 결함이면 승격하지 않는다', async (mode, code) => {
    const { error, evidence } = await failure(mode);
    expect(error.issues).toContainEqual(expect.objectContaining({ code }));
    expect(evidence.processes).toHaveLength(5);
    expect(evidence.processes.every((p: { status: string }) => p.status === 'success')).toBe(true);
    expect(evidence.reproduction.steps.filter((step: { kind: string }) => step.kind === 'human')).toHaveLength(8);
  });
});
