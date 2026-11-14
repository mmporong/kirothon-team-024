// PostFileSave: .ts/.tsx 저장 후 vitest 를 돌려 결과를 docs/evidence/hook-log.jsonl 에 남긴다.
import { spawnSync } from 'node:child_process';
import { ROOT, readStdinJson, appendEvidence, kstNow, gitSha, rel } from './_lib.mjs';

const input = readStdinJson();
const started = Date.now();
const r = spawnSync('npx', ['vitest', 'run', '--reporter=dot'], { cwd: ROOT, encoding: 'utf8', timeout: 80000 });
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
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
