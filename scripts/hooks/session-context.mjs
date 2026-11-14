// SessionStart: 남은 spec 작업과 핵심 규칙을 에이전트 문맥에 주입한다(stdout).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readStdinJson, appendEvidence, kstNow, gitSha } from './_lib.mjs';

const input = readStdinJson();
const tasks = readFileSync(join(ROOT, '.kiro/specs/subscription-closure/tasks.md'), 'utf8');
const open = tasks.split('\n').filter((l) => l.startsWith('- [ ]')).map((l) => l.slice(6));
const done = tasks.split('\n').filter((l) => l.startsWith('- [x]')).length;
appendEvidence('hook-log.jsonl', { at: kstNow(), hook: 'session-context', event: input.hook_event_name ?? 'SessionStart', session: input.session_id ?? null, openTasks: open.length, doneTasks: done, ...gitSha() });
console.log(`TTOKPAY-CONTEXT: spec(subscription-closure) 작업 완료 ${done}개, 남은 ${open.length}개.`);
if (open.length) console.log(`다음 작업: ${open[0]}`);
console.log('규칙: domain 함수는 순수 함수(now 인자), 모르는 값은 null, 상태 변경은 policy.evaluateAction, 원문 문자 저장 금지, "0원 보장" 표현 금지.');
