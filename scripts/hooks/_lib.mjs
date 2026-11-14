// Kiro 훅 공통 도우미. stdin JSON을 읽고 docs/evidence/*.jsonl 에 한 줄씩 남긴다.
import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function readStdinJson() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function kstNow() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().replace('Z', '+09:00');
}

// Git 명령 없이 저장소 메타데이터를 읽는다. dirty 여부는 검사하지 않는다.
export function gitSha() {
  try {
    const entry = join(ROOT, '.git');
    const gitDir = statSync(entry).isFile()
      ? resolve(ROOT, readFileSync(entry, 'utf8').trim().replace(/^gitdir:\s*/, ''))
      : entry;
    let commonDir = gitDir;
    try { commonDir = resolve(gitDir, readFileSync(join(gitDir, 'commondir'), 'utf8').trim()); } catch {}
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    let sha = head;
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5);
      sha = null;
      for (const dir of [gitDir, commonDir]) {
        try { sha = readFileSync(join(dir, ref), 'utf8').trim(); break; } catch {}
      }
      if (!sha) {
        const packed = readFileSync(join(commonDir, 'packed-refs'), 'utf8');
        sha = packed.split('\n').find((line) => line.endsWith(` ${ref}`))?.split(' ')[0] ?? null;
      }
    }
    return { sha: /^[0-9a-f]{40,64}$/.test(sha ?? '') ? sha : null, dirtyFiles: null, shaSource: 'git-metadata-readonly' };
  } catch {
    return { sha: null, dirtyFiles: null, shaSource: 'unavailable' };
  }
}

export function appendEvidence(file, record) {
  const evidenceDir = process.env.TTOKPAY_HOOK_EVIDENCE_DIR
    ? resolve(ROOT, process.env.TTOKPAY_HOOK_EVIDENCE_DIR)
    : join(ROOT, 'docs', 'evidence');
  const path = join(evidenceDir, file);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(record) + '\n');
}

export function rel(p) {
  if (!p) return null;
  const real = String(p).replace(/^\/private\//, '/');
  return real.startsWith(ROOT) ? real.slice(ROOT.length + 1) : real.split('/').slice(-2).join('/');
}
