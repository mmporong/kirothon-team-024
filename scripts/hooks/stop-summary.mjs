// Stop: 턴이 끝날 때 현재 SHA·변경 파일 수·테스트 결과를 한 줄로 남긴다. [R18]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readStdinJson, appendEvidence, kstNow, gitSha } from './_lib.mjs';

const HOOK_NAME = 'stop-summary';
const input = readStdinJson();
const vitest = join(ROOT, 'node_modules', '.bin', 'vitest');
if (!existsSync(vitest)) {
  // 의존성이 설치되지 않은 클론(심사·리뷰 환경 등)에서는 테스트를 건너뛰고 그 사실만 남긴다.
  appendEvidence('hook-log.jsonl', { at: kstNow(), hook: HOOK_NAME, event: input.hook_event_name ?? null, skipped: 'node_modules 없음 (npm ci 후 동작)' });
  process.exit(0);
}
const r = spawnSync(vitest, ['run', '--reporter=dot'], { cwd: ROOT, encoding: 'utf8', timeout: 80000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '');
const m = out.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed/);
appendEvidence('hook-log.jsonl', {
  at: kstNow(),
  hook: 'stop-summary',
  event: input.hook_event_name ?? 'Stop',
  session: input.session_id ?? null,
  testsExit: r.status,
  passed: m ? Number(m[2]) : null,
  failed: m && m[1] ? Number(m[1]) : r.status === 0 ? 0 : null,
  ...gitSha(),
});
