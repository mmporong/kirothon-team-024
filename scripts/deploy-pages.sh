#!/bin/sh
# GitHub Pages 배포: dist/ 를 gh-pages 브랜치에 커밋해 push 한다(강제 push 없음).
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WT=$(mktemp -d /tmp/kt-pages.XXXXXX)
cd "$ROOT"
npm run build >/dev/null
SHA=$(git rev-parse --short HEAD)
if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch -q origin gh-pages
  git worktree add -q -B gh-pages "$WT" origin/gh-pages
else
  git worktree add -q --orphan -b gh-pages "$WT"
fi
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WT/"
touch "$WT/.nojekyll"
cd "$WT"
git add -A
git commit -q -m "deploy: main ${SHA} 빌드 배포" || echo "변경 없음"
git push -q origin gh-pages
cd "$ROOT"
git worktree remove --force "$WT"
echo "배포 완료: main ${SHA} → gh-pages"
