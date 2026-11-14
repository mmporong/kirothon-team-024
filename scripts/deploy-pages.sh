#!/bin/sh
# GitHub Pages 배포: dist/ 를 gh-pages 브랜치에 커밋해 push 한다(강제 push 없음).
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WT=$(mktemp -d /tmp/kt-pages.XXXXXX)
cleanup() {
  git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || rmdir "$WT" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM
cd "$ROOT"
npm run build >/dev/null
SHA=$(git rev-parse --short HEAD)
if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch -q origin gh-pages
  git worktree add -q --detach "$WT" origin/gh-pages
else
  git worktree add -q --orphan -b gh-pages "$WT"
fi
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WT/"
touch "$WT/.nojekyll"
cd "$WT"
python3 - <<'PY'
import os, subprocess

# 이 스크립트가 교체한 배포 파일과 삭제된 추적 파일만 경로별로 스테이징한다.
changed = subprocess.check_output(['git', 'ls-files', '--modified', '--deleted', '-z']).split(b'\0')
new = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z']).split(b'\0')
paths = sorted({os.fsdecode(p) for p in changed + new if p})
if paths:
    subprocess.run(['git', 'add', '--', *paths], check=True)
PY
git diff --cached --stat
if ! git diff --cached --quiet; then
  git commit -q -m "chore(pages): 검증한 ${SHA} 빌드 배포"
fi
git push -q origin HEAD:gh-pages
cd "$ROOT"
cleanup
trap - EXIT HUP INT TERM
echo "배포 완료: main ${SHA} → gh-pages"
