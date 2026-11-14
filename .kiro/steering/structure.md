---
inclusion: always
---
# 폴더 구조

```
src/domain/     순수 도메인 함수 (계산·정책·상태 전이)
src/adapters/   브라우저 경계 (IndexedDB, ICS 파일, 파일 다운로드)
src/data/       공개 요금 정책·공식 해지 경로 (확인 시각·출처 포함)
src/ui/         React 화면. 도메인 결과를 그리기만 한다
tests/domain/   도메인 단위·속성 테스트
tests/fixtures/ 합성 시험 자료 (실제 개인 자료 금지)
docs/evidence/  Kiro 개발 기록(훅 로그·리뷰·실행 요약)
scripts/hooks/  Kiro 훅이 실행하는 셸 스크립트
mcp/            로컬 MCP 서버(합성 사례·공개 경로 조회 전용)
.kiro/          steering · specs · hooks · agents · settings
```

- 파일 하나에 모듈 하나. 도메인 파일 이름은 design.md의 모듈 표와 같게 한다.
- UI에서 도메인 계산을 다시 구현하지 않는다.
