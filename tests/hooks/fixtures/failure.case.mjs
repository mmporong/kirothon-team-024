import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// 실제 npm/vitest 실패를 주입한다. 정상 제품 시험의 실패로 집계하지 않는다.
test('synthetic recursion inherits the running marker', () => {
  expect(process.env.TTOKPAY_HOOK_TEST_ACTIVE).toBe('1');
  const result = spawnSync(process.execPath, ['scripts/hooks/test-on-save.mjs'], {
    cwd: process.cwd(),
    input: JSON.stringify({ synthetic: true, hook_event_name: 'PostFileSave', session_id: 'codex-hook-nested', file_path: join(process.cwd(), 'tests/hooks/fixtures/failure.case.mjs') }),
    encoding: 'utf8', timeout: 5000, env: process.env,
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('reentrant');
});

test('synthetic npm failure for exit propagation', () => {
  throw new Error('SYNTHETIC_EXPECTED_FAILURE_FINAL_HOOKS');
});
