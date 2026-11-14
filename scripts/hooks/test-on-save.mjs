// PostFileSave: .ts/.tsx 저장 후 vitest 를 돌려 결과를 docs/evidence/hook-log.jsonl 에 남긴다.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readStdinJson, appendEvidence, kstNow, gitSha, rel } from './_lib.mjs';

const HOOK_NAME = 'test-on-save';
const input = readStdinJson();
const started = Date.now();
const vitest = join(ROOT, 'node_modules', '.bin', 'vitest');
if (!existsSync(vitest)) {
  // 의존성이 설치되지 않은 클론(심사·리뷰 환경 등)에서는 테스트를 건너뛰고 그 사실만 남긴다.
  appendEvidence('hook-log.jsonl', { at: kstNow(), hook: HOOK_NAME, event: input.hook_event_name ?? null, skipped: 'node_modules 없음 (npm ci 후 동작)' });
  process.exit(0);
}
const r = spawnSync(vitest, ['run', '--reporter=dot'], { cwd: ROOT, encoding: 'utf8', timeout: 80000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '');
const m = out.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed/);
const record = {
  at: kstNow(),
  hook: 'test-on-save',
  event: input.hook_event_name ?? 'PostFileSave',
  session: input.session_id ?? null,
  file: rel(input.file_path),
  exit: r.status,
  failed: m && m[1] ? Number(m[1]) : r.status === 0 ? 0 : null,
  passed: m ? Number(m[2]) : null,
  ms: Date.now() - started,
  ...gitSha(),
};
appendEvidence('hook-log.jsonl', record);
if (r.status !== 0) {
  console.log(`TEST-ON-SAVE: 실패 (exit ${r.status}). 실패한 테스트를 고친 뒤 다시 저장하라.`);
  console.log(out.split('\n').filter((l) => /FAIL|AssertionError|Error:|expected/.test(l)).slice(0, 12).join('\n'));
} else {
  console.log(`TEST-ON-SAVE: 통과 ${record.passed ?? '?'}개 (${record.ms}ms)`);
}
