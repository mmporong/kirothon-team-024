// Stop: 턴이 끝날 때 현재 SHA·변경 파일 수·테스트 결과를 한 줄로 남긴다. [R18]
import { spawnSync } from 'node:child_process';
import { ROOT, readStdinJson, appendEvidence, kstNow, gitSha } from './_lib.mjs';

const input = readStdinJson();
const r = spawnSync('npx', ['vitest', 'run', '--reporter=dot'], { cwd: ROOT, encoding: 'utf8', timeout: 80000 });
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
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
