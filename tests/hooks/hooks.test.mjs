import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gitSha } from '../../scripts/hooks/_lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RECEIPT = join(ROOT, 'docs/evidence/hook-check.json');
const initial = existsSync(RECEIPT) ? JSON.parse(readFileSync(RECEIPT, 'utf8')) : {};
const RUN_PROJECT_TESTS = process.env.TTOKPAY_HOOK_RUN_PROJECT_TESTS === '1';
const CORE_RELEASE = process.env.TTOKPAY_HOOK_CORE_RELEASE || null;
const FRONT_RELEASE = process.env.TTOKPAY_HOOK_FRONT_RELEASE || null;
if (RUN_PROJECT_TESTS && (!CORE_RELEASE || !FRONT_RELEASE)) throw new Error('Confirmed FINAL-CORE and final FRONT release references are required for the project test gate');
const OWNER = join(ROOT, 'tests/hooks/.runtime');
mkdirSync(OWNER, { recursive: true });
const WORK = mkdtempSync(join(OWNER, 'run-'));
mkdirSync(join(WORK, 'tmp'), { recursive: true });
const cases = [];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fileHash = (path) => existsSync(path) ? sha256(readFileSync(path)) : null;
const kst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace('Z', '+09:00');
const revisionBefore = gitSha().sha;
const fileMap = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? fileMap(join(dir, e.name)) : [join(dir, e.name)]);
};
const manifest = () => {
  const sourceFiles = [...fileMap(join(ROOT, 'src')), ...fileMap(join(ROOT, 'mcp')), ...fileMap(join(ROOT, 'tests')).filter((f) => !f.includes('/.runtime/')), ...fileMap(join(ROOT, 'scripts/hooks')), ...['package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json'].map((f) => join(ROOT, f))].sort();
  return Object.fromEntries(sourceFiles.map((f) => [f.slice(ROOT.length + 1), fileHash(f)]));
};
const sourceBefore = manifest();
const readonlyFiles = [...fileMap(join(ROOT, '.kiro/hooks')), join(ROOT, 'docs/evidence/hook-log.jsonl'), join(ROOT, 'docs/evidence/policy-denials.jsonl')];
const readonlyBefore = Object.fromEntries(readonlyFiles.map((f) => [f.slice(ROOT.length + 1), fileHash(f)]));
const env = {
  ...process.env,
  TTOKPAY_HOOK_EVIDENCE_DIR: WORK,
  npm_config_cache: join(WORK, 'npm-cache'), npm_config_logs_max: '0',
  npm_config_update_notifier: 'false', npm_config_audit: 'false', npm_config_fund: 'false',
  NODE_COMPILE_CACHE: join(WORK, 'node-cache'),
  TMPDIR: join(WORK, 'tmp'), TMP: join(WORK, 'tmp'), TEMP: join(WORK, 'tmp'),
  CI: '1', NO_COLOR: '1',
};
delete env.FORCE_COLOR;
delete env.TTOKPAY_HOOK_TEST_ACTIVE;
const records = (name) => {
  const path = join(WORK, name);
  return existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];
};
function invoke(id, script, input, args = [], extraEnv = {}) {
  const started = kst();
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT, input: JSON.stringify(input), encoding: 'utf8',
    timeout: 100000, maxBuffer: 4 * 1024 * 1024, env: { ...env, ...extraEnv },
  });
  const item = { id, synthetic: true, command: [process.execPath, script, ...args], cwd: ROOT, stdin: input, started_at: started, finished_at: kst(), exit: result.status, signal: result.signal, child_pid: result.pid, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.code ?? null, passed: false };
  cases.push(item);
  return item;
}

for (const [id, toolInput, expected, rule] of [
  ['messages_db_read_denied', { path: '/Users/synthetic/Library/Messages/chat.db' }, 2, 'G1-raw-messages'],
  ['messages_attachment_read_denied', { path: '/Users/synthetic/Library/Messages/Attachments/synthetic.txt' }, 2, 'G1-raw-messages'],
  ['ordinary_read_allowed', { path: '/synthetic/project/src/domain/policy.ts' }, 0, null],
  ['secret_file_read_denied', { path: '/synthetic/project/.env' }, 2, 'G5-secrets'],
]) {
  test(id, () => {
    const input = { synthetic: true, hook_event_name: 'PreToolUse', session_id: `synthetic-${id}`, tool_name: 'read_file', tool_input: toolInput };
    const result = invoke(id, 'scripts/hooks/pretool-guard.mjs', input);
    result.expected_exit = expected;
    result.tool_executed = false;
    assert.equal(result.exit, expected);
    assert.equal(result.error, null);
    if (rule) {
      assert.match(result.stderr, new RegExp(rule));
      const denial = records('policy-denials.jsonl').find((r) => r.session === input.session_id);
      assert.equal(denial?.blocked, true);
      assert.equal(denial?.rule, rule);
      assert.equal(JSON.stringify(denial).includes(toolInput.path), false);
      result.denial = denial;
    } else assert.equal(result.stderr, '');
    result.passed = true;
  });
}

const payload = (id) => ({ synthetic: true, hook_event_name: 'PostFileSave', session_id: id, file_path: join(ROOT, 'tests/hooks/synthetic-trigger.ts') });
const commonArgs = ['--config', 'tests/hooks/vitest-hook.config.mjs', '--configLoader', 'native', '--no-cache', '--no-fsModuleCache'];

if (RUN_PROJECT_TESTS) test('test_on_save_records_actual_project_npm_test_and_propagates_its_exit', () => {
  const input = payload('synthetic-hook-project-npm');
  const result = invoke('project_npm_test', 'scripts/hooks/test-on-save.mjs', input, commonArgs);
  result.expected_exit = 'same as actual npm test exit, including product failures';
  assert.equal(result.error, null);
  assert.ok(result.exit === 0 || result.exit === 1, result.stdout + result.stderr);
  const record = records('hook-log.jsonl').find((r) => r.session === input.session_id);
  result.evidence = record;
  assert.equal(record?.testsExecuted, true);
  assert.equal(record?.command?.[1], 'test');
  assert.equal(record?.exit, result.exit);
  assert.ok(Number.isInteger(record?.failed) && record.failed >= 0);
  assert.ok(Number.isInteger(record?.passed) && record.passed >= 0);
  assert.ok(record.passed + record.failed > 0);
  assert.equal(record.failed === 0, result.exit === 0);
  result.project_tests_status = result.exit === 0 ? 'pass' : 'fail';
  result.passed = true;
});

test('final_front_release_reference_is_required_before_project_tests', () => {
  const result = invoke('missing_release_reference_denied', 'tests/hooks/hooks.test.mjs', { synthetic: true, probe: 'release gate' }, [], { TTOKPAY_HOOK_RUN_PROJECT_TESTS: '1', TTOKPAY_HOOK_CORE_RELEASE: 'synthetic-core-release-for-barrier-test', TTOKPAY_HOOK_FRONT_RELEASE: '' });
  result.expected_exit = 1;
  assert.equal(result.exit, 1);
  assert.match(result.stderr, /Confirmed FINAL-CORE and final FRONT release references are required/);
  result.passed = true;
});

test('npm_failure_propagates_and_nested_hook_does_not_recurse', () => {
  const input = payload('synthetic-hook-fault-injection');
  const args = ['--config', 'tests/hooks/fixtures/failure.config.mjs', '--configLoader', 'native', '--no-cache', '--no-fsModuleCache'];
  const result = invoke('expected_npm_failure', 'scripts/hooks/test-on-save.mjs', input, args);
  result.expected_exit = 1;
  result.scope = 'isolated deliberate failure fixture; not a product test failure';
  assert.equal(result.error, null);
  assert.equal(result.exit, 1, result.stdout + result.stderr);
  const logs = records('hook-log.jsonl');
  const record = logs.find((r) => r.session === input.session_id);
  const nested = logs.find((r) => r.session === 'synthetic-hook-nested');
  result.evidence = record;
  result.nested_evidence = nested;
  assert.equal(record?.testsExecuted, true);
  assert.equal(record?.exit, 1);
  assert.equal(record?.failed, 1);
  assert.equal(record?.passed, 1);
  assert.equal(nested?.testsExecuted, false);
  assert.equal(nested?.skipped, 'reentrant');
  assert.equal(logs.filter((r) => r.testsExecuted).length, RUN_PROJECT_TESTS ? 2 : 1);
  result.passed = true;
});

after(() => {
  const sourceAfter = manifest();
  const readonlyAfter = Object.fromEntries(readonlyFiles.map((f) => [f.slice(ROOT.length + 1), fileHash(f)]));
  const stable = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  const relevant = (manifest) => Object.fromEntries(Object.entries(manifest).filter(([file]) => /^(scripts\/hooks\/|tests\/hooks\/|package(?:-lock)?\.json$|vite\.config\.ts$|tsconfig\.json$)/.test(file)));
  const relevantStable = JSON.stringify(relevant(sourceBefore)) === JSON.stringify(relevant(sourceAfter));
  const readonlyStable = JSON.stringify(readonlyBefore) === JSON.stringify(readonlyAfter);
  const pidEnded = (pid) => { try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; } };
  const childEnded = cases.every((c) => !c.child_pid || pidEnded(c.child_pid));
  const logs = records('hook-log.jsonl');
  const npmEnded = logs.filter((r) => r.testsExecuted).every((r) => !r.childPid || pidEnded(r.childPid));
  const projectRun = cases.find((c) => c.id === 'project_npm_test');
  const harnessPassed = cases.length === (RUN_PROJECT_TESTS ? 7 : 6) && cases.every((c) => c.passed) && (RUN_PROJECT_TESTS ? stable : relevantStable) && readonlyStable && childEnded && npmEnded;
  rmSync(WORK, { recursive: true, force: true });
  if (readdirSync(OWNER).length === 0) rmdirSync(OWNER);
  const receipt = {
    schema_version: 1, task_id: 'FINAL-HOOKS', attempt: 1,
    status: !harnessPassed ? 'fail' : !RUN_PROJECT_TESTS ? 'hooks_ready_awaiting_final_front_release' : projectRun?.exit === 0 ? 'pass' : 'harness_pass_project_tests_fail',
    phase: RUN_PROJECT_TESTS ? 'post_FINAL_CORE_and_final_FRONT_release_gate' : 'hook_only_verification',
    core_release: CORE_RELEASE, front_release: FRONT_RELEASE,
    harness_status: harnessPassed ? 'pass' : 'fail',
    project_tests_status: !RUN_PROJECT_TESTS ? 'deferred_until_final_FRONT_release' : projectRun?.exit === 0 ? 'pass' : 'fail',
    initial_failure_capture: initial.initial_failure_capture ?? null,
    run_history: [...(initial.run_history ?? []), ...(initial.cases ? [{ phase: initial.phase ?? 'pre_release_observation', finished_at: initial.finished_at, source_sha: initial.source_sha, source_tree_sha256: initial.source_tree_sha256, status: initial.status, cases: initial.cases, npm_runs: initial.npm_runs }] : [])],
    evidence_kind: 'Synthetic hook harness; not Kiro execution evidence',
    kiro_execution_verified: false, kiro_invocations: 0, git_commands_executed: 0,
    synthetic_inputs_only: true, private_files_read: false,
    base_sha: initial.base_sha ?? revisionBefore,
    source_sha: revisionBefore, final_head_sha: gitSha().sha,
    started_at: initial.started_at ?? cases[0]?.started_at, finished_at: kst(),
    command: ['node', '--test', 'tests/hooks/hooks.test.mjs'],
    invocation_environment: { TTOKPAY_HOOK_RUN_PROJECT_TESTS: RUN_PROJECT_TESTS ? '1' : '0', TTOKPAY_HOOK_CORE_RELEASE: CORE_RELEASE, TTOKPAY_HOOK_FRONT_RELEASE: FRONT_RELEASE },
    baseline_file_sha256: initial.baseline_file_sha256 ?? {},
    baseline_inspection_findings: initial.baseline_inspection_findings ?? initial.inspection_findings ?? [],
    source_before_sha256: sourceBefore, source_after_sha256: sourceAfter,
    source_tree_sha256: sha256(JSON.stringify(sourceBefore)), source_stable_during_run: stable, relevant_hook_sources_stable: relevantStable,
    readonly_before_sha256: readonlyBefore, readonly_after_sha256: readonlyAfter, readonly_paths_unchanged: readonlyStable,
    cases,
    npm_runs: logs.filter((r) => r.testsExecuted),
    recursion_skips: logs.filter((r) => r.skipped === 'reentrant'),
    cleanup: { scratch_directory: WORK.slice(ROOT.length + 1), removed: !existsSync(WORK), spawned_hook_processes_exited: childEnded, npm_processes_exited: npmEnded, daemons_started: false },
    limitations: ['No Kiro CLI or IDE hook dispatch was executed.', 'Allow means a hook decision; the requested read tool was never executed.', 'The failing npm fixture is deliberate and separate from the actual project npm test.', 'Working tree provenance is captured as file SHA-256, not claimed to be a committed source tree.'],
  };
  writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + '\n');
  assert.equal(RUN_PROJECT_TESTS ? stable : relevantStable, true, 'Relevant source changed during the test; rerun against a stable snapshot');
  assert.equal(readonlyStable, true, 'Read-only hook configs or shared evidence changed');
  assert.equal(childEnded, true, 'A spawned hook process remains alive');
  assert.equal(npmEnded, true, 'An npm test process remains alive');
  if (RUN_PROJECT_TESTS) assert.equal(projectRun?.exit, 0, 'Final CORE/FRONT release project npm test failed');
});
