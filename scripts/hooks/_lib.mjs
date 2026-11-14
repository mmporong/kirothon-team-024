// Kiro 훅 공통 도우미. stdin JSON을 읽고 docs/evidence/*.jsonl 에 한 줄씩 남긴다.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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

export function gitSha() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return { sha, dirtyFiles: dirty ? dirty.split('\n').length : 0 };
  } catch {
    return { sha: null, dirtyFiles: null };
  }
}

export function appendEvidence(file, record) {
  const path = join(ROOT, 'docs', 'evidence', file);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(record) + '\n');
}

export function rel(p) {
  if (!p) return null;
  const real = String(p).replace(/^\/private\//, '/');
  return real.startsWith(ROOT) ? real.slice(ROOT.length + 1) : real.split('/').slice(-2).join('/');
}
