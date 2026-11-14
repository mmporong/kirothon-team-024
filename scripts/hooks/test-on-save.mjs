// PostFileSave: 실제 npm test의 결과와 exit를 전달한다. [R18]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readStdinJson, appendEvidence, kstNow, gitSha, rel } from './_lib.mjs';

const HOOK_NAME = 'test-on-save';
const input = readStdinJson();
const context = { at: kstNow(), hook: HOOK_NAME, event: input.hook_event_name ?? 'PostFileSave', session: input.session_id ?? null, file: rel(input.file_path) };
if (process.env.TTOKPAY_HOOK_TEST_ACTIVE === '1') {
  appendEvidence('hook-log.jsonl', { ...context, skipped: 'reentrant', testsExecuted: false });
  console.log('TEST-ON-SAVE: skipped reentrant');
  process.exit(0);
}
if (!existsSync(join(ROOT, 'node_modules', '.bin', 'vitest'))) {
  appendEvidence('hook-log.jsonl', { ...context, skipped: 'node_modules missing', testsExecuted: false });
  console.log('TEST-ON-SAVE: skipped node_modules missing');
  process.exit(0);
}
const started = Date.now();
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['test', '--', '--reporter=dot', ...process.argv.slice(2)];
const env = { ...process.env, TTOKPAY_HOOK_TEST_ACTIVE: '1', NO_COLOR: '1' };
delete env.FORCE_COLOR;
const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', timeout: 80000, maxBuffer: 4 * 1024 * 1024, env });
const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '');
const match = out.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed/);
const exit = result.status ?? 1;
const record = {
  ...context,
  command: [command, ...args],
  testsExecuted: Boolean(result.pid),
  childPid: result.pid ?? null,
  exit, signal: result.signal, error: result.error?.code ?? null,
  failed: match && match[1] ? Number(match[1]) : exit === 0 ? 0 : null,
  passed: match ? Number(match[2]) : null,
  ms: Date.now() - started,
  ...gitSha(),
};
appendEvidence('hook-log.jsonl', record);
if (exit !== 0) {
  console.log(`TEST-ON-SAVE: 실패 (exit ${exit}). 실패한 시험을 확인하세요.`);
  console.log(out.split('\n').filter((line) => /FAIL|AssertionError|Error:|expected/.test(line)).slice(0, 12).join('\n'));
} else {
  console.log(`TEST-ON-SAVE: 통과 ${record.passed ?? '?'}개 (${record.ms}ms)`);
}
process.exitCode = exit;
