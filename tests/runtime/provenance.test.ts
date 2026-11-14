import { afterEach, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, sourceSnapshot } from '../../scripts/bot-patrol';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function repo() {
  const root = mkdtempSync(join(ROOT, 'tests/runtime/.tmp-source-')); roots.push(root);
  mkdirSync(join(root, '.git/refs/heads'), { recursive: true }); mkdirSync(join(root, 'src'));
  function object(kind: string, content: Uint8Array) {
    const bytes = Buffer.concat([Buffer.from(`${kind} ${content.length}\0`), content]);
    const hash = createHash('sha1').update(bytes).digest('hex'), path = join(root, '.git/objects', hash.slice(0, 2), hash.slice(2));
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, deflateSync(bytes)); return hash;
  }
  const input = 'export const value = 1;\n';
  const blob = object('blob', Buffer.from(input));
  const srcTree = object('tree', Buffer.concat([Buffer.from('100644 input.ts\0'), Buffer.from(blob, 'hex')]));
  const tree = object('tree', Buffer.concat([Buffer.from('40000 src\0'), Buffer.from(srcTree, 'hex')]));
  const head = object('commit', Buffer.from(`tree ${tree}\nauthor Fixture <fixture@example.invalid> 1 +0000\ncommitter Fixture <fixture@example.invalid> 1 +0000\n\nfixture\n`));
  writeFileSync(join(root, '.git/HEAD'), 'ref: refs/heads/main\n'); writeFileSync(join(root, '.git/refs/heads/main'), head + '\n');
  writeFileSync(join(root, 'src/input.ts'), input); return { root, head };
}
it('Git 실행 없이 loose HEAD와 실행 입력이 같으면 scope 내 clean을 확인한다', () => {
  const { root, head } = repo();
  expect(sourceSnapshot(root)).toMatchObject({ sourceSha: head, sourceDirty: false, sourceDirtyFiles: [], sourceDirtyScope: 'runtime-inputs-vs-head', sourceCheck: 'loose-git-objects' });
});
it('변경·삭제·미추적 실행 입력을 dirty로 기록한다', () => {
  const { root } = repo(); writeFileSync(join(root, 'src/input.ts'), 'changed'); writeFileSync(join(root, 'src/new.ts'), 'new');
  expect(sourceSnapshot(root).sourceDirtyFiles).toEqual(['src/input.ts', 'src/new.ts']);
  rmSync(join(root, 'src/input.ts')); expect(sourceSnapshot(root).sourceDirty).toBe(true);
});
it('영수증·상태 파일은 실행 입력 digest를 흔들지 않는다', () => {
  const { root } = repo(), before = sourceSnapshot(root);
  mkdirSync(join(root, 'docs/evidence'), { recursive: true }); writeFileSync(join(root, 'docs/evidence/new.json'), 'evidence');
  mkdirSync(join(root, 'bot-state/runtime'), { recursive: true }); writeFileSync(join(root, 'bot-state/runtime/state.json'), '{}');
  expect(sourceSnapshot(root)).toEqual(before);
});
it('HEAD는 읽히지만 object가 없으면 dirty를 미확인으로 둔다', () => {
  const { root, head } = repo(); rmSync(join(root, '.git/objects'), { recursive: true });
  expect(sourceSnapshot(root)).toMatchObject({ sourceSha: head, sourceDirty: null, sourceCheck: 'unavailable' });
});
