// reviewer 실패 기록은 보존하고, 성공한 비어 있지 않은 검토만 대표 문서로 승격한다. [R18]
import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactStem, ROOT, runKiroProcess, RuntimeRunError, saveArtifacts, type ChildCommand, type ProcessRun } from './bot-patrol';

export interface ReviewOptions { root?: string; child?: ChildCommand; timeoutMs?: number; killGraceMs?: number }
export async function runReview(opts: ReviewOptions = {}): Promise<ProcessRun> {
  const root = opts.root ?? ROOT;
  const prompt = [
    '요구사항 R07·R08·R12·R16·R19~R21·R28~R30 기준으로 src/domain/*.ts, src/bot/tools.ts 와 tests/ 를 읽고 검토하라.',
    '형식: (1) 요구별 표 | 요구 | 판정(충족/부분/누락) | 근거 파일:줄 | (2) 결함·위험 목록: 각 항목에 심각도, 파일:줄, 재현 입력, 고칠 방향.',
    '추측은 "추론"으로 표시하고, 실제로 읽은 코드만 근거로 쓴다. 파일은 수정하지 않는다.',
  ].join('\n');
  const args = ['chat', '--no-interactive', '--v3', '--agent', 'reviewer', '--model', 'claude-opus-5.5', '--trust-tools=read,grep,glob', '--trust-workspace', '--output-format', 'stream-json', prompt];
  const { receipt, events } = await runKiroProcess({ root, args, child: opts.child, timeoutMs: opts.timeoutMs, killGraceMs: opts.killGraceMs });
  if (!receipt.finalText.trim()) receipt.failureReasons.push('review_text_missing');
  receipt.status = receipt.failureReasons.length ? 'failed' : 'success';
  const evidence = join(root, 'docs/evidence'), dir = join(evidence, 'reviewer-runs'), stem = artifactStem(receipt, 'reviewer');
  const path = saveArtifacts(dir, stem, { receipt }, events);
  if (receipt.status !== 'success') throw new RuntimeRunError(receipt, path);
  const heading = [
    '# Kiro reviewer 에이전트 검토 기록', '',
    `- 실행 종류: ${receipt.execution} · 실행: ${receipt.startedAtReal}`,
    `- 결과: ${receipt.status} · 모델: ${receipt.model ?? '미확인'} · ${Math.round(receipt.ms / 1000)}초 · 도구 ${receipt.toolCalls}회 · exit ${receipt.exitCode}`,
    `- 소스: ${receipt.sourceSha ?? '미확인'} · dirty(${receipt.sourceDirtyScope}): ${receipt.sourceDirty ?? '미확인'}`,
    `- 실행 ID: ${receipt.runId} · 세션: ${receipt.sessionId ?? '미확인'}`,
    `- 영수증: reviewer-runs/${stem}.receipt.json`, '', '---', '',
  ].join('\n');
  const markdown = heading + receipt.finalText + '\n';
  // 실행별 성공본과 이전 대표 문서를 모두 보존한 뒤 atomic rename한다.
  writeFileSync(join(dir, `${stem}.md`), markdown, { flag: 'wx' });
  const output = join(evidence, 'review.md');
  if (existsSync(output)) copyFileSync(output, join(dir, `${stem}.previous.md`));
  mkdirSync(dirname(output), { recursive: true });
  const tmp = `${output}.${receipt.runId}.tmp`;
  writeFileSync(tmp, markdown, { flag: 'wx' }); renameSync(tmp, output);
  return receipt;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runReview().then((r) => console.log(`review 완료: ${Math.round(r.ms / 1000)}초, 도구 ${r.toolCalls}회, exit ${r.exitCode}`))
    .catch((e: unknown) => { console.error(e instanceof Error ? e.message : 'review 실패'); process.exitCode = 1; });
}
