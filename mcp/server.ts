// household MCP 서버 (stdio, 줄 단위 JSON-RPC 2.0). 마침표 봇과 개발 중 Kiro 세션이 같은 도구를 쓴다. [R22][R27]
// 외부 네트워크·리스닝 포트 없음. 상태 파일은 bot-state/runtime/state.json (git 제외).
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { BotState } from '../src/bot/state';
import { runTool, TOOLS } from '../src/bot/tools';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = process.env.SUBS_STATE_PATH ?? join(ROOT, 'bot-state', 'runtime', 'state.json');
const SEED = join(ROOT, 'bot-state', 'seed', 'household.json');
const LOG = join(ROOT, 'bot-state', 'runtime', 'mcp-server.log');

function log(msg: string): void {
  try {
    mkdirSync(dirname(LOG), { recursive: true });
    appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`);
  } catch {
    /* 로그 실패는 무시 */
  }
}

function load(): BotState {
  if (!existsSync(STATE)) {
    mkdirSync(dirname(STATE), { recursive: true });
    copyFileSync(SEED, STATE);
  }
  return JSON.parse(readFileSync(STATE, 'utf8')) as BotState;
}

function save(s: BotState): void {
  const tmp = `${STATE}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 1));
  renameSync(tmp, STATE);
}

function reply(id: unknown, result?: unknown, error?: { code: number; message: string }): void {
  process.stdout.write(`${JSON.stringify(error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result })}\n`);
}

log(`start pid=${process.pid} state=${STATE}`);
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const text = line.trim();
  if (!text) return;
  let req: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    req = JSON.parse(text);
  } catch {
    log('bad json');
    return;
  }
  const { id, method, params } = req;
  if (id === undefined || id === null) return; // notification
  try {
    if (method === 'initialize') {
      reply(id, {
        protocolVersion: (params?.protocolVersion as string) ?? '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'household', version: '0.2.0' },
        instructions: '합성 데모 가구의 구독 점검 도구. 상태 변경은 정책 관문(evaluateAction)을 거친다. 결제 문자 원문은 돌려주지 않는다.',
      });
    } else if (method === 'tools/list') {
      reply(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
    } else if (method === 'tools/call') {
      const name = String(params?.name ?? '');
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      const { state, outcome } = runTool(load(), name, args);
      save(state);
      log(`call ${name} ok=${outcome.ok} reasons=${outcome.reasons.join(',')}`);
      reply(id, { content: [{ type: 'text', text: JSON.stringify(outcome) }], isError: false });
    } else if (method === 'ping') reply(id, {});
    else if (method === 'prompts/list') reply(id, { prompts: [] });
    else if (method === 'resources/list') reply(id, { resources: [] });
    else if (method === 'resources/templates/list') reply(id, { resourceTemplates: [] });
    else reply(id, undefined, { code: -32601, message: `method not found: ${method}` });
  } catch (e) {
    log(`error ${method}: ${(e as Error).message}`);
    reply(id, undefined, { code: -32603, message: 'internal error' });
  }
});
rl.on('close', () => log('stdin closed'));
