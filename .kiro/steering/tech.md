---
inclusion: always
---
# 기술 규칙

- 스택: Vite + React 18+ + TypeScript(strict), 테스트는 vitest + fast-check, 저장은 IndexedDB.
- 배포: 정적 파일(GitHub Pages). 서버·로그인·유료 API 없음. 런타임 외부 CDN·분석 SDK 금지.
- `src/domain/*`는 순수 함수다. `Date.now()`·`Math.random()`·DOM·저장소를 직접 부르지 않고 `now`를 인자로 받는다. 같은 입력이면 같은 결과.
- 금액은 원 단위 정수(number, Number.isSafeInteger). 소수·NaN·음수는 입력 단계에서 거부한다.
- 날짜는 `YYYY-MM-DD` 문자열(Asia/Seoul 기준 달력 날짜)로 다룬다. 시각이 필요하면 ISO 8601 + `+09:00`.
- 모르는 값은 `null`이다. `0`·빈 문자열로 대신하지 않는다.
- 상태 변경은 `src/domain/policy.ts`의 `evaluateAction` 하나만 거친다. UI는 결과의 `allowed`·`reasons`만 보여 준다.
- 새 도메인 함수에는 같은 커밋에 테스트를 붙인다. 불변식은 fast-check 속성 테스트로 쓴다.
- 커밋 메시지: Conventional Commits, 한글 설명, 끝에 `[T0x][Rxx]`.
