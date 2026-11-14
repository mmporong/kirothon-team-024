// 읽기 전용 reviewer 에이전트(Kiro CLI)로 요구사항 대비 코드를 검토하고 docs/evidence/review.md 에 남긴다. [R18]
// 사용: npx tsx scripts/kiro-review.ts   (Kiro CLI 로그인 필요)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './bot-patrol';

const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace('Z', '+09:00');
const prompt = [
  '요구사항 R07·R08·R12·R16·R19~R21·R28~R30 기준으로 src/domain/*.ts, src/bot/tools.ts 와 tests/ 를 읽고 검토하라.',
  '형식: (1) 요구별 표 | 요구 | 판정(충족/부분/누락) | 근거 파일:줄 | (2) 결함·위험 목록: 각 항목에 심각도(높음/중간/낮음), 파일:줄, 재현 입력, 고칠 방향.',
  '추측은 "추론"으로 표시하고, 실제로 읽은 코드만 근거로 쓴다. 파일은 수정하지 않는다.',
].join('\n');
const args = ['chat', '--no-interactive', '--v3', '--agent', 'reviewer', '--model', 'claude-opus-5.5', '--trust-tools=read,grep,glob', '--trust-workspace', '--output-format', 'stream-json', prompt];
const t0 = Date.now();
const started = kst();
const lines: string[] = [];
const code: number | null = await new Promise((res) => {
  const c = spawn('kiro-cli', args, { cwd: ROOT, env: process.env });
  let buf = '';
  c.stdout.on('data', (d: Buffer) => {
    buf += d.toString('utf8');
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      lines.push(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  });
  c.on('close', (x) => res(x));
});
let finalText = '';
let model: string | null = null;
let credits: number | null = null;
const tools: string[] = [];
const hooks: string[] = [];
for (const l of lines) {
  try {
    const ev = JSON.parse(l);
    if (ev.type === 'runFinished') finalText = ev.data?.finalText ?? '';
    const u = ev.data?.update;
    if (u?.sessionUpdate === 'config_option_update') model = (u.configOptions ?? []).find((o: any) => o.id === 'model')?.currentValue ?? model;
    if (u?.sessionUpdate === 'tool_call' && u.title) tools.push(u.title);
    const m = u?._meta?.kiro;
    if (m?.kind === 'hook_update') hooks.push(m.hook?.name);
    if (m?.kind === 'session_usage') credits = m.credits?.[0]?.usage ?? credits;
  } catch {
    /* ignore */
  }
}
const ms = Date.now() - t0;
mkdirSync(join(ROOT, 'docs/evidence'), { recursive: true });
const head = [
  '# Kiro reviewer 에이전트 검토 기록',
  '',
  `- 실행: ${started} · \`kiro-cli chat --no-interactive --v3 --agent reviewer --trust-tools=read,grep,glob\``,
  `- 모델: ${model ?? '미확인'} · 걸린 시간: ${Math.round(ms / 1000)}초 · 도구 호출: ${tools.length}회 · 크레딧: ${credits === null ? '미확인' : Math.round(credits * 1000) / 1000} · exit ${code}`,
  `- 실행된 훅: ${[...new Set(hooks)].join(', ') || '없음'}`,
  '- 에이전트 권한: `.kiro/agents/reviewer.json` (fs_read만 allow, fs_write·shell deny)',
  '',
  '---',
  '',
];
writeFileSync(join(ROOT, 'docs/evidence/review.md'), head.join('\n') + finalText + '\n');
console.log(`review 완료: ${Math.round(ms / 1000)}초, 도구 ${tools.length}회, exit ${code}`);
