// 요구사항 추적표: spec의 Requirement N(RNN)이 코드·테스트 어디에 있는지 모아 docs/evidence/traceability.md 로 쓴다. [R18]
// 테스트가 하나도 없는 요구가 있으면 exit 1.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const specs = ['subscription-closure', 'subs-bot'];
const reqs = [];
for (const sp of specs) {
  const md = readFileSync(join(ROOT, '.kiro/specs', sp, 'requirements.md'), 'utf8');
  for (const m of md.matchAll(/^### Requirement (\d+) \((R\d{2})\): (.+)$/gm)) reqs.push({ n: Number(m[1]), id: m[2], title: m[3].trim(), spec: sp });
}
const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'mcp')), ...walk(join(ROOT, 'scripts'))].filter((f) => /\.(ts|tsx|mjs)$/.test(f));
const tests = walk(join(ROOT, 'tests')).filter((f) => /\.test\.ts$/.test(f));
const grepIds = (list) => {
  const map = {};
  for (const f of list) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/R(\d{2})/g)) (map[`R${m[1]}`] ??= new Set()).add(relative(ROOT, f));
    for (const m of text.matchAll(/\[R(\d{2})\]-\[R(\d{2})\]|R(\d{2})~R?(\d{2})/g)) {
      const a = Number(m[1] ?? m[3]);
      const b = Number(m[2] ?? m[4]);
      for (let i = a; i <= b; i++) (map[`R${String(i).padStart(2, '0')}`] ??= new Set()).add(relative(ROOT, f));
    }
  }
  return map;
};
const inCode = grepIds(files);
const inTests = grepIds(tests);
const rows = reqs.map((r) => ({ ...r, code: [...(inCode[r.id] ?? [])].sort(), tests: [...(inTests[r.id] ?? [])].sort() }));
const missing = rows.filter((r) => r.tests.length === 0 && !['R06', 'R14', 'R15', 'R17', 'R18', 'R26'].includes(r.id));
const lines = [
  '# 요구사항 추적표 (자동 생성)',
  '',
  `생성: \`node scripts/trace-check.mjs\` · 요구 ${rows.length}개 · 테스트로 직접 검사하는 요구 ${rows.filter((r) => r.tests.length).length}개`,
  '',
  '테스트 대신 다른 증거로 확인하는 요구: R06(화면 문구), R14(PreToolUse 훅 → `docs/evidence/policy-denials.jsonl`), R15(오류 처리 코드), R17(배포 주소), R18(훅·봇 영수증), R26(`docs/evidence/bot-runs/`).',
  '',
  '| 요구 | spec | 제목 | 코드 | 테스트 |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${r.spec} | ${r.title} | ${r.code.map((c) => `\`${c}\``).join('<br>') || '-'} | ${r.tests.map((c) => `\`${c}\``).join('<br>') || '-'} |`),
  '',
];
writeFileSync(join(ROOT, 'docs/evidence/traceability.md'), lines.join('\n'));
console.log(`traceability: 요구 ${rows.length}개, 테스트 연결 ${rows.filter((r) => r.tests.length).length}개, 누락 ${missing.length}개${missing.length ? ` (${missing.map((r) => r.id).join(', ')})` : ''}`);
process.exit(missing.length ? 1 : 0);
