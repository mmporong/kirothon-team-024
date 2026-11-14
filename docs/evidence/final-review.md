> 검수 보고서 사본입니다. 원문의 판정과 이력을 보존하고 저장소 내부 링크만 상대 경로로 바꿨습니다. 원문 SHA-256: 0f86c7b6baf3b156cf14a6a9cc18b40e80caa122c658a9263ae56319fafa038f

# FINAL-REVIEW: A-P1-01 수정본 재검수 PASS

**최신 판정: PASS — A-P1-01 해소, 현재 알려진 P0/P1 차단 0건.** 기존 승인 범위를 유지하고 지정된 5파일의 이 결함만 재검수했다. 아래에 보존된 REQUEST_CHANGES는 수정 전 버전의 이력이다.

- 실행·지문 확인: 2026-11-14T16:59:11.028531+09:00.
- 대상 동결: source-manifest.json **73파일**, 집계 SHA-256 **dd0b6f84983e9643e24a50eb41520da2ca19a317218cc54736bf143417c9ffe5**. 현재 파일 불일치 0개, 시험 전후 변경 0개.
- 이전 71파일 동결본과 비교한 변경은 아래 5파일뿐이다(신규 2개 포함, 삭제 0개). UI·가격 데이터의 기존 파일 지문은 그대로다. 원본 녹화·공개 replay·seed도 불변이다.
- 영구 변경: 이 final-review.md 한 개. 구현·공유 실행 증거·README·덱은 수정하지 않았다.

## 수정본 핵심 재검수

| 항목 | 실제 결과 | 판정 |
|---|---|---|
| 기존 report-only 성공 fixture 반례 | 사건 0개에서 두 번째 점검 후 youtube_cancel의 allowed=false/no_case를 human_outcome_mismatch로 거부. DemoBusinessError와 실패 영수증 생성. promoted=false, publicReplayUnchanged=true | PASS |
| 사람 행동의 기대 allowed/reason | 8단계의 행위자·행동·허용·사유 일치와 단계 순서/중복 누락 검사. 허용 해지의 provider_unconfirmed와 의도된 stale_version 거부를 구분 | PASS |
| 이전 버전 투표 | 제안 미개정·엉뚱한 거부 사유는 즉시 실패. 정상 시나리오에서는 disney_mom_stale만 allowed=false, reasons=[stale_version] | PASS |
| 최종 사건·경로·재개방 | 같은 YouTube 사건의 App Store→웹 요청·정상 웹 청구·기존 App Store 문제 청구·재개방 감사·Apple 환불 경로, Disney+의 v2 2개월 휴지·현재 동의·해지 요청과 공식 경로를 검사 | PASS |
| 업무 결함의 성공 승격 차단 | 재개방/기존 청구/새 청구 분류/현재 동의/경로/이동 목적지/Disney 해지/사건/결제 전 질문 누락 및 잘못된 환불 URL fixture를 거부. 5회 프로세스와 사람 단계가 성공해도 이전 replay 보존 | PASS |
| 정상 승격 대조 | 업무 성공 fixture가 5회 점검·사람 8단계(허용 7, stale_version 거부 1)를 마쳤을 때만 businessValidation.status=passed로 승격. YouTube=reopened, Disney+=cancel_requested. 이전 대표 replay도 별도 백업과 바이트 일치 | PASS |

실행 시 YouTube 월 19,500원은 synthetic_demo_charge로 주입한다. 공식 App Store 가격 검증을 뜻하지 않는다는 note가 있으며 저장된 seed의 monthlyWon=null은 그대로였다. 정상 fixture 자료도 execution=fixture로 표시하며 실제 Kiro 녹화로 분류하지 않는다.

## 이번 검증 명령·집계

검수자가 설치된 Vitest와 합성 Node 자식만 사용했다. 임시 config/guard/검사 파일은 종료 후 삭제했으며 관측값은 이 보고서에 보존했다.

| 검사 | 결과 |
|---|---|
| tests/runtime/demoBusiness.test.ts | **24/24 PASS**, exit 0 |
| tests/runtime/runner.test.ts의 공개 replay 보존 4건·정상 승격 1건만 선택 | **5/5 PASS**, exit 0. 기존 범위의 다른 24건은 CLI 선택에서 제외했으며 이번 통과 수에 합산하지 않음 |
| 검수자 보충: 원래 반례 재실행·정상 승격 대조 | **2/2 PASS**, exit 0 |
| tsc -p tsconfig.node.json --noEmit --incremental false | PASS, exit 0 |

이번 검수자의 합계는 **관련 31/31 PASS**다. 전체 402개를 다시 실행한 것으로 표현하지 않는다. 실제 사용한 명령의 공통 환경은 NODE_DISABLE_COMPILE_CACHE=1, TSX_DISABLE_CACHE=1, 임시 spawn-guard preload였다.

    cd "$HOME/kirothon-team-024"
    node node_modules/vitest/vitest.mjs run tests/runtime/demoBusiness.test.ts --config <검수임시경로>/vitest.config.mjs --configLoader native --no-cache --no-fsModuleCache --silent --reporter=json --outputFile <검수임시경로>/business-results.json
    node node_modules/vitest/vitest.mjs run tests/runtime/runner.test.ts --testNamePattern '공개 replay와 과거 증거를 보존한다|프로세스와 업무가 모두 성공한 뒤 replay를 교체' --config <검수임시경로>/vitest.config.mjs --configLoader native --no-cache --no-fsModuleCache --silent --reporter=json --outputFile <검수임시경로>/runner-results.json
    node node_modules/vitest/vitest.mjs run --config <검수임시경로>/independent.config.mjs --configLoader native --no-cache --no-fsModuleCache --silent --reporter=json --outputFile <검수임시경로>/independent-results.json
    node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --incremental false

검수임시경로의 실행 당시 값은 /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-p1-wxrlspvu였다. 임시 guard는 Git/Kiro 실행을 차단하고 자식 PID만 기록했다.

총괄의 후속 기록도 읽어 대조했다. validation.json에는 같은 73파일 집계, 전체 프로젝트 **402/402**, 합성 훅 **7/7**, build/typecheck PASS와 source_files_unchanged=true가 기록돼 있다. status=checks_pass_review_pending은 이 재검수 결과를 기다리는 상태이며 실패 기록이 아니다. clean-install.json은 같은 집계와 source_files_copied_match=true, npm ci/build exit 0, 임시 복사본 삭제를 기록한다. 이 전체 gate·clean install은 총괄의 실행 근거를 확인한 것이며 이번 검수자가 반복 실행하지 않았다.

## 실제 대상 지문

| 파일 | SHA-256 |
|---|---|
| scripts/demo-scenario.ts | 994e80dca3d57ecdcc684f8889892a47ed31e4e95a15e0ff4ddaae53b13ecc4d |
| scripts/demo-validation.ts | 0c71a00cb5e6f28b1afa73008859624666aee7d8d7743aad34c9586fb4b7106e |
| tests/runtime/demoBusiness.test.ts | e0c0ea635c3d1ebeb78298f11bc1e8cfa45d19bc64ab32e81d0eced7a61b0c95 |
| tests/runtime/runner.test.ts | 01a2b6e2b805420e863226635b494c4ca5402164a970f68e80cdec569e5f929f |
| tests/runtime/fixtures/kiro-child.cjs | dd084e36c9f06ebc1b2f40667cd41ac6a485812878fc9a5d3ea6d56bc929f2a1 |

- 파일별 소스 원장: [source-manifest.json](../../docs/evidence/source-manifest.json), 원장 파일 SHA-256 **3259fdfd426a2f50c9c119c2a3177eae00f3d72b512c0e98ae9da058abb0d07e**.
- 소스 73파일 집계: **dd0b6f84983e9643e24a50eb41520da2ca19a317218cc54736bf143417c9ffe5**.
- 공개 replay와 보존된 원본 재생 파일: 모두 **82dfac5efb1b05a6e82ebf59cc4ac3291a175c9ae394be13b5a4cb07e0113607**로 이전과 같다.
- seed: **e7345f4098c89b99865b8967032b9dfcc9fa52a06beb1d115446086946ad931a**로 이전과 같다.
- 이번에 읽은 validation.json SHA-256: 6be71b1b06e565df6eb136aa249efc25eabb59905ab53601cbe90b3124effdcb; hook-check.json: 746e7710f5b516b9093b4c175a58f63e451bb0d72fc9b4de187c49366872681a; clean-install.json: 9e6e5236849933be603d762c8bfe3f00f30562a31a384c2a2d554e1384df2283. 총괄이 승인 상태를 반영해 검증 문서만 갱신하면 그 문서 지문은 바뀔 수 있다.

## 제약·정리·완료

기존 UI·가격·원본 녹화의 승인 범위를 재탐색하지 않았다. 새 Kiro/Crew·Git 명령·외부 전송·새 에이전트 실행은 0회다. 녹화는 수정 후 새 모델 실행으로 소급하지 않는다. 합성 fixture 실행 결과와 실제 모델 실행 근거를 구분했다.

검수자의 guard 기록에서 금지 실행 시도 0건, 기록된 자식 PID 165개 모두 종료, runtime 임시 폴더 잔여 0개를 확인했다. 검수 임시 폴더도 삭제·부재를 확인했다. 서버·daemon은 시작하지 않았다. **A-P1-01은 닫으며 현재 알려진 차단 0건으로 PASS를 반환한다.**

---

## 이하 수정 전 검수 기록

# FINAL-REVIEW attempt1: 최종 판정(수정 전 기록)

**REQUEST_CHANGES — 승인 보류, 미해결 P1 1건(A-P1-01).** 소스·프론트·제출 자료의 최종 동결 검수를 마쳤다. 총괄의 검증 PASS와 별개로, 데모의 업무 성공을 검사하지 않는 반례가 같은 동결 소스에 남아 있다. 새 범위를 추가하지 않았으며, 구현 파일을 수정하지 않았다.

- 최종 자료 확인 기준: 2026-11-14T16:45:31.272928+09:00. README 후속 갱신을 반영했고, 보고서 저장 시 파일 지문·문서 상태를 한 번 더 대조한다.
- 변경 파일: /Users/lim/hackathon-specialist/reports/kirothon-2026/submission/final-review.md 한 개.
- 현재 구현의 다른 차단 결함은 이번 검수에서 확정하지 않았다. 아래 단계A와 준비 기록은 당시 관측을 보존한 이력이며, 현재 판정은 이 최종 절을 따른다.

## F1. 승인 보류 사유와 종료 조건

[A-P1-01 상세 재현](#a1-새-p1-업무가-실패해도-데모-재생-자료를-성공으로-승격): [scripts/demo-scenario.ts:47](../../scripts/demo-scenario.ts#L47)은 사람 행동의 예상 밖 거부도 기록하고 진행한다. [104행](../../scripts/demo-scenario.ts#L104)의 승격 조건에는 필수 사람 행동의 기대 결과나 필요한 구독 사건·상태가 없다. [126행](../../scripts/demo-scenario.ts#L126)은 그 상태로 대표 재생 파일을 교체한다.

동결 실행기의 SHA-256은 **9069d610dce7113ce471ade222611d3fda50472b0ccb9addaeb057a0afcd204c**로 단계A와 같다. 기존 성공 fixture 자식을 주입한 실행에서 필수 일반 행동 여섯 건이 거부되고 사건이 0개였으나, 5회 점검 성공만으로 임시 대표 재생 파일이 승격됐다. 의도된 이전 버전 투표 거부도 기대한 stale_version 대신 no_proposal이었다. 별도 반례 검사는 실패했다.

이 결과는 합성 자식으로 재현한 업무 성공 관문 누락이다. **보존된 실제 Kiro 녹화의 실패를 뜻하지 않는다.** 실제 Kiro 모드에도 같은 승격 조건이 적용되므로 잘못된 업무 결과가 승격될 가능성은 코드에서 추론할 수 있지만, 수정 후 Kiro 실행을 새로 관측한 것은 아니다.

승인 보류 해소에 필요한 범위는 이 한 건이다. 각 필수 사람 행동의 allowed/reason 및 최종 시나리오 상태를 검사하고, 예상 밖 결과일 때 이전 대표 재생 파일을 유지하도록 수정한 버전에서 관련 반례를 통과시켜야 한다. 의도된 stale_version 거부는 허용 결과와 구분해 검사한다. 변경과 재검증 권한은 구현 담당·총괄에 있으며, 검수자는 구현을 바꾸지 않았다.

## F2. 최종 동결 버전과 검수 파일 지문

[파일별 동결 원장](../../docs/evidence/source-manifest.json)의 **71파일 모두 현재 SHA-256과 일치**했다. 단계A에서 겹치는 핵심 파일의 변경도 0개였다.

| 항목 | 값 |
|---|---|
| 원장 기록 시각 | 2026-11-14T07:36:58.581845+00:00 |
| 최종 소스 집계 SHA-256 | 7bf575a84c116ac6cc1649f64991ef101bf23a058454f929223ae0a43667d5a4 |
| source-manifest.json 파일 SHA-256 | 9739a044da85d7df48c9430f0cce8df224c8d65d962f9e30ffe2a72f1e30f143 |
| 계산 확인 | files 객체를 json.dumps(files, sort_keys=True, separators=(',', ':'))로 직렬화한 바이트의 SHA-256과 일치 |
| Git 기준 | 명령을 실행하지 않음. validation.json의 base_commit은 제출 기록의 값이며 원격/커밋 대조로 검증하지 않음 |

이 원장의 71개 파일별 SHA가 최종 소스 검수 버전이다. 원장에 포함되지 않은 제출 자료·실행 증거는 아래 별도 지문으로 고정한다. 단계A의 56파일 집계는 다른 집합·직렬화 방식이며 최종 집계와 혼동하지 않는다.

| 별도 검수 파일 | SHA-256 |
|---|---|
| README.md | 3c4d5717ca1154e1f959f6a535f9264668eb9453d1d2a49602b884a52119205e |
| BUILD_REPORT.md | 61f30fb08314770264245cc244edf206b2a885c83f5b6e5d6818bc2ae847e817 |
| PRESENTATION.pdf | 84e3e56a06042934203d6b123ce6c59c89a72529b5ce13e404c86d848ceda25d |
| docs/evidence/validation.json | f2da9e835fa19ef8e2a9d16db88f464b2a8a12d95f42d9307e69dd627ba1e78c |
| docs/evidence/front-qa.json | 82068bc289f32189827c5fd10c1bb2601538b02ed5df9d64af83448a67119b79 |
| docs/evidence/hook-check.json | 48ec1f3e57e69f6d0e534b2eff2143fd5930bf2b75cea566c2e7b02de7b3d3b5 |
| public/replay/demo.json | 82dfac5efb1b05a6e82ebf59cc4ac3291a175c9ae394be13b5a4cb07e0113607 |
| docs/evidence/bot-runs/20261114154741-demo-replay.json | 82dfac5efb1b05a6e82ebf59cc4ac3291a175c9ae394be13b5a4cb07e0113607 |
| bot-state/seed/household.json | e7345f4098c89b99865b8967032b9dfcc9fa52a06beb1d115446086946ad931a |

## F3. 검증 명령·결과와 증거의 범위

| 검증 | 수행·대조 방식 | 결과 |
|---|---|---|
| 도메인·봇·runtime 프로젝트 시험 | 설치된 node_modules/vitest/vitest.mjs, 임시 설정·native config loader·캐시 비활성화. A4에 실제 명령 기록 | 10파일, **378/378 PASS**, exit 0 |
| 보충 반례 | 같은 설치 Vitest, 기존 자식 fixture와 임시 root | **1 FAIL / 1 PASS**. FAIL은 A-P1-01, PASS는 실제 보류 가격의 인계 거부 |
| 훅 합성 검사 | pretool-guard/test-on-save를 임시 증거 경로·합성 stdin으로 실행 | **7/7 PASS**. 고의 실패의 exit 전파도 확인. 실제 Kiro 훅 dispatch 증거는 아님 |
| Node 실행기·MCP 타입 | 설치 tsc, tsconfig.node.json, noEmit·incremental false | PASS, exit 0 |
| 앱·시험 타입 | 설치 tsc, tsconfig.json, noEmit·incremental false | PASS, exit 0 |
| 제품 빌드 | 설치 Vite, native config loader, 검수 임시 outDir | PASS, exit 0, 38모듈 |
| 총괄 최종 검증 기록 | validation.json의 시각·명령·exit·소스 일치·PDF 지문 대조 | status=pass, source_files_unchanged=true. 기록의 검사에는 검수자의 A-P1-01 반례가 포함되지 않음 |
| 총괄 훅 기록 | hook-check.json의 상태·동결·정리 필드 대조 | status/harness_status/project_tests_status=pass, source_stable_during_run=true, 관련 소스·읽기 전용 경로 유지=true |
| 프론트 브라우저 | 기존 front-qa.json의 항목·오류·정리와 최종 캡처·해당 화면 소스 대조 | **37/37 PASS, 오류 0건**이라는 실행 기록을 확인. 검수자가 37항목을 새로 실행한 것은 아님 |
| 요구 추적 | validation.json에 기재된 trace-check의 exit와 수치 확인 | 요구 30개, 시험 연결 24개, 미설명 누락 0개라는 실행 기록 확인 |

최종 프론트 동결 후 추가로 실행한 명령은 다음과 같다. outDir은 검수자가 만든 임시 폴더이며 결과 확인 후 삭제했다.

    cd "$HOME/kirothon-team-024"
    NODE_DISABLE_COMPILE_CACHE=1 node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit --incremental false
    NODE_DISABLE_COMPILE_CACHE=1 node node_modules/vite/bin/vite.js build --configLoader native --outDir /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/final-dist --emptyOutDir

378개 통과와 반례 1개 실패는 서로 다른 검사 집합이다. 총괄의 PASS를 부정하거나 378개 중 하나가 실패한 것으로 합치지 않는다. 다만 업무 성공 검사 누락은 그 통과 결과만으로 해소되지 않는다.

## F4. 보존된 실제 Kiro 실행과 공개 재생 대조

공개 [demo.json](../../public/replay/demo.json)은 보존된 [실행 재생 파일](../../docs/evidence/bot-runs/20261114154741-demo-replay.json)과 바이트 SHA-256이 같다. 5회 점검의 영수증과 원시 이벤트를 대조했다.

- 점검 5회, 도구 호출 34회, 도구 거부 5회, 영수증 소요 합계 711,908ms.
- 모두 프로세스 exit 0, 모델 claude-opus-5.5, V3, fallback=false. 원시 runFinished의 status=success, stopReason=end_turn도 일치.
- 합성 사람 입력 8건은 허용 7건·stale_version 거부 1건이다. 최종 사건은 YouTube reopened, Disney+ cancel_requested다.
- 따라서 이 보존 녹화에는 A-P1-01 반례의 사건 0개/필수 행동 거부 상태가 관측되지 않았다.
- 녹화 당시 소스·가격은 최종 동결본보다 앞선다. 최종 가격 보류 정책까지 적용한 새 Kiro 실행 증거로 소급하지 않는다. UI·문서도 녹화 가격과 현재 검증 표를 구분한다.

기존 P1-1/4의 가격·문제 청구 방어 및 P1-5의 두 D-day 필드는 현재 소스·시험에서 재검수했다. P1-3은 가족 경로 이동을 family_switch_not_supported로 거부하는 범위 축소로 방어하며, 가족의 경로/가격 결합 기능 완성을 뜻하지 않는다. 기존 P1-6의 공개 재생·원본 연결은 위 대조로 확인했으나, 실행기 승격 관문은 A-P1-01이 남는다.

## F5. 프론트·필수 제출 자료

[README](../../README.md), [BUILD_REPORT](../../BUILD_REPORT.md), 루트 [PRESENTATION.pdf](../../PRESENTATION.pdf), 동결 원장·검증 기록·공개 재생·원본 실행 증거의 존재와 참조를 확인했다. 문서의 로컬 Markdown 참조 누락은 0개였다. README와 BUILD_REPORT의 TESTS_TBD 두 곳은 16:41:54 확인 때 모두 실제 수치로 바뀌었다. 미해결 문서 자리표시자로 남겨 두지 않는다.

프론트 5화면의 관련 소스와 최종 홈 1440/820/390, 가격 비교, 200% 상당 reflow 캡처를 확인했다. 새 차단 수준의 겹침·문자 잘림은 확인하지 못했다. 가족 동의/철회/재청구, 금액 오류, 키보드, 축소 동작·애니메이션은 기존 브라우저 실행 기록의 성공 항목으로 확인했다. reflow 기록은 CSS 폭 720·deviceScaleFactor 2 방식이며 실제 브라우저 확대율 조작의 독립 재현으로 확대하지 않는다.

최종 PDF는 **10쪽, SHA-256 84e3e56a06042934203d6b123ce6c59c89a72529b5ce13e404c86d848ceda25d**로 총괄 전달 지문과 같다. 제목·작성자 metadata가 교정됐다. 이전 PDF 10쪽 렌더를 모두 확인한 뒤, 최종본에서 교체된 4쪽을 새로 렌더해 UI 캡처·가격/녹화 시점 설명을 확인했다. 최종본 10쪽을 다시 모두 렌더했다고 주장하지 않는다. 제출 자료에서 새 차단 지적은 추가하지 않았다.

## F6. 권한·정리·남은 제약

- 실제 Kiro CLI/Crew, Git 명령, 새 에이전트/세션, 로그인·가입·결제, 배포·push·외부 전송은 수행하지 않았다. 위험 명령 문자열은 합성 guard 입력으로만 검사했다.
- 테스트·빌드는 검수자의 임시 경로를 사용했고, 임시 폴더 삭제와 부재를 확인했다. 자식 PID 6개 종료, runtime 임시 폴더 잔여 0개를 확인했으며 개발 서버·daemon은 시작하지 않았다.
- 공유 source/시험/실행 증거/덱/README는 변경하지 않았다. 영구 변경은 이 보고서 한 개다.
- 브라우저 37항목은 담당자의 저장된 실행 근거와 캡처를 검수했으며 별도 재실행하지 않았다. 실제 금융 서비스·사용자 성과·외부 가격 원문·원격 배포 URL/원격 SHA는 이번 검수의 새 실증 대상이 아니다.
- **남은 차단: A-P1-01 한 건.** 현재 동결 SHA에 대한 최종 판정은 REQUEST_CHANGES다. 관련 수정·반례 재검증 후에만 PASS로 바꿀 수 있다.

---

# 보존 기록: 단계A

- 현재 판정: **PARTIAL. 핵심의 기존 P1 방어는 개선됐지만, 데모의 업무 성공 검사에 새 P1 한 건이 남는다.**
- 검수 범위: core freeze 통지의 핵심·실행기·가격 통합 데이터·runtime/hook/domain/bot 시험 및 그 실행 의존 파일. 아래 56개만 지문을 고정했다. UI 5화면·제출물·최종 승인은 후속 동결 단계다.
- 최초 고정: 2026-11-14T16:28:36.725063+09:00. 재확인: 2026-11-14T16:34:25.913951+09:00. **56파일 내용 변경 0개.**
- 파일군 SHA-256: **a3ed2e5cc7d5049355610f7d054001b79657484ea6fc4d78c88f01eaf8be06a5**. Git 커밋 SHA가 아니다. 지문 계산 방식은 뒤의 준비 기록과 같고 파일 집합은 A7에 고정했다.
- 변경 파일: 이 보고서 한 개. 합성 시험용 임시 파일·fixture 결과만 별도로 생성했다. 구현·덱·README·공유 실행 증거 파일은 변경하지 않았다.
- 실제 Kiro/Crew·Git 실행·새 agent·로그인·외부 전송 없음. 금지 실행 파일을 차단하는 임시 preload도 사용했고 차단 시도 기록은 0건이었다.

## A1. 새 P1: 업무가 실패해도 데모 재생 자료를 성공으로 승격

**A-P1-01 / 재현됨 / 수정 필요.** [demo-scenario.ts:47](../../scripts/demo-scenario.ts#L47)의 human은 allowed=false를 기록하고 계속 진행한다. [104행](../../scripts/demo-scenario.ts#L104)의 승격 검사는 점검 5개·보고 존재·프로세스 성공만 검사한다. 필수 사람 행동의 성공이나 필요한 사건/상태는 검사하지 않은 채 [126행](../../scripts/demo-scenario.ts#L126)에서 대표 replay를 교체한다.

검수한 실행기 SHA-256: 9069d610dce7113ce471ade222611d3fda50472b0ccb9addaeb057a0afcd204c.

재현은 기존 tests/runtime/fixtures/kiro-child.cjs의 success 모드를 자식으로 주입했다. 이 fixture는 finish_patrol 보고만 성공시키고 실제 구독 사건은 만들지 않는다. Kiro 호출은 없었으며 public/replay 경로도 임시 root 안이다. 관측값:

    execution: fixture
    patrol_count: 5
    rejected: false
    humanRejections: 7
    caseCount: 0
    promoted: true

사람 답장 한 건만 허용됐고, 일반 해지/투표 여섯 건은 no_case/no_proposal로 거부됐다. 의도적으로 거부돼야 하는 vote-stale 한 건도 기대한 stale_version이 아니라 no_proposal였다. **일부 데모의 의도된 거부를 전부 실패 취급하자는 지적이 아니다.** 필수 행동은 성공, 의도된 이전 버전 반례는 지정된 사유로 거부돼야 한다.

별도 검사 2개 중 업무 승격 검사 1개가 FAIL, 실제 보류 가격의 인계 검사 1개는 PASS였다. 예상된 합성 자식의 성공만으로 업무 성공이 입증되지 않는다는 반례다. 이미 보존된 실제 Kiro 실행이나 최종 공개 replay가 실제로 실패했다는 판정은 하지 않았다.

수정 방향:
1. 각 사람 단계의 기대 allowed/reason을 검사하고, 예상 밖 거부면 승격을 중단한다. 이전 버전 거부는 stale_version인지 확인한다.
2. 대표 replay 교체 전, 시나리오에 필요한 구독 사건·단계·경로 안내·문제 청구 재개방이 실제로 존재하는지 검사한다. 가격 보류로 줄거리가 달라지면 기대 결과도 명시한다.
3. 실패 기록은 보존하되 이전 대표 replay는 유지한다. 런타임 프로세스 성공과 시나리오 성공을 별도 상태로 둔다.

최소 재현 핵심(주변 임시 설정·seed 복사는 기존 runtime 시험 setup과 같은 방식):

    const paths = runtimePaths(temporaryRoot);
    // temporaryRoot/bot-state/seed/household.json에 합성 seed를 복사한다.
    const replay = await runDemo({
      paths,
      child: {
        file: process.execPath,
        args: [join(repo, 'tests/runtime/fixtures/kiro-child.cjs'), 'success'],
        kind: 'fixture'
      }
    });
    // 실제 관측: replay.final.cases.length === 0,
    // 필수 사람 행동도 거부됐지만 임시 public/replay/demo.json이 만들어진다.

## A2. 기존 P1 재검수

| 기존 지적 | 단계A 판정 | 현재 근거와 남은 범위 |
|---|---|---|
| P1-1 정상 신규 청구를 환불 대상으로 선택 | 수정 확인 | tools.ts:476은 chargesAfterRequest로 문제 청구만 고른다. 명시 경로 불일치·새 경로 정상 청구만 있는 경우도 보류한다. 관련 역순 회귀를 포함한 프로젝트 시험 PASS |
| P1-2 실패/timeout 실행의 정상 승격 | 프로세스 수준 수정 확인, 업무 수준 A-P1-01 잔존 | 비정상 exit·signal·spawn 오류·timeout·runFinished 실패/누락·finish_patrol 누락 시 실패 영수증과 reject. 실제 runFinished 형식의 status/stopReason 검사, 개행 없는 마지막 행·프로세스 그룹 종료·stderr 비노출 시험 PASS |
| P1-3 가족 동의와 경로/가격 미결합 | 안전한 범위 축소로 방어 확인 | policy.ts:193이 가족의 switchTo를 family_switch_not_supported로 거부. 경로/가격까지 묶는 가족 이동 기능을 구현 완료한 것은 아니다. 최종 UI·설명도 비지원 범위와 맞아야 함 |
| P1-4 미검증/더 비싼 경로로 절약 인계 | 수정 확인 | policy.ts:205~211에서 목적지 verified·comparable·KRW·정수 양수·공식 종류, 비교 가능성과 현재보다 싼지 확인. invalid switchTo를 일반 해지로 바꾸지 않음 |
| P1-5 D-day 기준 혼동 | 도메인/봇 필드 수정 확인, UI는 후속 | 종료까지 daysToChargeOrTrialEnd와 결정 마감까지 daysToDecision/Decide를 분리. 종료 D-2·결정 D-1 경계 시험 PASS. 실제 화면·발표 문구의 구분은 UI 동결 때 판정 |
| P1-6 새 메인 공개 재생의 완료 근거 | 후속 단계 대기 | 최종 공개 replay·제출물과 실제 이벤트 대조는 아직 승인하지 않음. runner의 업무 성공 관문은 A-P1-01 때문에 수정 필요 |

## A3. 가격 판정과 통합 데이터

- channel_price_review.json의 보류 규칙 7개가 통합 channel_prices.json의 해당 28셀에 모두 comparable=false로 반영됐다. 반영 누락 0개.
- 46개 서비스/요금제 행, verified 표시 58셀을 읽었다. verified의 공식 출처 종류·HTTPS URL·확인 시각 필드 누락은 0개다. 이 숫자는 새로운 외부 가격 검증 실적이나 46개 시험 PASS가 아니다.
- 합성 시험은 실제 판매 가격·SKU 증거와 구분한다. 기존 도구 시험의 YT 월간 가격은 vi.mock의 합성 가정으로 명시돼 있다.
- 독립 보충 검사에서 **실제 통합 표의 보류된 YouTube App Store와 실제 합성 seed**를 그대로 사용했다. comparable=false, seedMonthlyWon=null인 체험 구독의 웹 인계는 switch_comparison_unavailable로 거부됐다(PASS).
- 목적지 comparable=false와 USD 같은 비KRW 통화의 거부가 정책 인계까지 연결된 코드를 확인했고 관련 프로젝트 회귀가 통과했다.
- 가격 원문을 외부 사이트에서 다시 열지는 않았다. 이번 판정은 총괄이 확정한 가격 보류 정책·통합 반영·비교/인계 동작의 일관성에 한정한다.

## A4. 실제 검증 명령과 결과

실행 cwd: /Users/lim/kirothon-team-024. 설치·npx·실제 Kiro는 사용하지 않았다.

1. 프로젝트 관련 시험, 16:30:07 KST 시작, 2.54초, exit 0:

    NODE_DISABLE_COMPILE_CACHE=1 FINAL_REVIEW_GUARD_LOG=/var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/blocked-executions.jsonl NODE_OPTIONS='--require /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/spawn-guard.cjs' node node_modules/vitest/vitest.mjs run --config /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/vitest.config.mjs --configLoader native --no-cache --no-fsModuleCache --reporter=dot

    Test Files 10 passed (10)
    Tests 378 passed (378)

2. Node 실행기/MCP 타입 검사, 단계A 중 실행, exit 0·출력 없음:

    NODE_DISABLE_COMPILE_CACHE=1 node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --incremental false

tsconfig.node.json은 scripts/**/*.ts와 mcp/**/*.ts 및 그 의존 코드를 검사한다. src UI까지 포함하는 전체 typecheck를 수행한 것으로 확대하지 않는다.

3. 독립 반례 2개, 16:32:27 KST, 247ms, exit 1:

    NODE_DISABLE_COMPILE_CACHE=1 FINAL_REVIEW_GUARD_LOG=/var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/blocked-executions.jsonl NODE_OPTIONS='--require /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/spawn-guard.cjs' node node_modules/vitest/vitest.mjs run --config /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj/edges.config.mjs --configLoader native --no-cache --no-fsModuleCache --reporter=dot

    Tests 1 failed | 1 passed (2)

FAIL은 A-P1-01의 기대 거부와 실제 성공 반환의 불일치다. PASS는 보류 YT 가격의 인계 거부다. 위 378개 프로젝트 시험을 실패한 것으로 합치지 않는다.

4. Hook 합성 검사, 2026-11-14T16:33:36.718497+09:00, **7/7 PASS**:

    node scripts/hooks/pretool-guard.mjs
    node scripts/hooks/test-on-save.mjs
    node scripts/hooks/test-on-save.mjs --config tests/hooks/fixtures/failure.config.mjs --configLoader native --no-cache --no-fsModuleCache

각 호출은 합성 stdin과 임시 TTOKPAY_HOOK_EVIDENCE_DIR, 재진입 표식 또는 고의 실패 fixture로 실행했다. 일반 읽기0·문자 DB 경로2·비밀 경로2·force-push 문자열2·삭제 문자열2·재진입 skip0·고의 시험 실패 전파1을 기대값과 대조했다. 경로 문자열의 실제 파일 읽기나 위험 명령은 실행하지 않았다. 고의 fixture의 1 FAIL/1 PASS와 npm exit1이 훅 기록·상위 exit로 전달되고 중첩 훅은 재진입을 건너뛰었다.

공유 hook-check.json을 덮는 기존 hook harness는 실행하지 않았다. 실제 Kiro의 훅 dispatch나 FRONT 동결 후 전체 프로젝트 hook gate 성공을 주장하지 않는다. 과거 준비 기록의 gitSha 관련 실행 위험은 현재 helper가 메타데이터 읽기로 바뀌어 해소됐다.

## A5. 권한·정리와 잔여 범위

- 새 에이전트·실제 Kiro/Crew·Git 명령 0회. fixture Node 자식과 로컬 npm test만 사용했다. 금지 실행 차단 preload의 차단 기록도 0건이다.
- 2026-11-14T16:35:25.777413+09:00에 이 보충 검사·훅의 자식 PID 6개가 종료됐고, runtime 시험의 임시 폴더 잔여 0개를 확인했다.
- 임시 설정·검사 코드·합성 증거 경로는 /var/folders/2_/7_zkj30x15lgn8w1vb05bmkr0000gn/T/kirothon-final-review-a-g1cp9grj였다. 최종 검수 종료 때 폴더 삭제와 부재를 확인했다. 명령에 적힌 임시 경로는 실행 당시 경로이며 영구 산출물이 아니다.
- 현재 검수는 단계A다. 새 P1 수정본 재확인, UI 5화면·전체 타입/빌드·루트 PDF/제출 문서·공개 replay의 실제 실행 근거 대조가 남았다. 최종 승인은 그 뒤다.
- 변경 파일은 /Users/lim/hackathon-specialist/reports/kirothon-2026/submission/final-review.md 한 개다. 구현·덱·README는 수정하지 않았다.

## A6. 단계A 결론

프로젝트 378 PASS, Node 타입 검사 PASS, Hook 합성7 PASS, 가격 통합 일관성 및 보류 인계 PASS다. **새 데모 업무 승격 반례 1 FAIL이 남아 단계A는 PARTIAL**이다. A-P1-01을 수정한 버전에서 관련 검사만 다시 수행하고, UI 동결 뒤 제출물·프론트·실제 증거를 추가 검수한다.

## A7. 단계A 파일군 지문

| 파일 | SHA-256 |
|---|---|
| bot-state/seed/household.json | e7345f4098c89b99865b8967032b9dfcc9fa52a06beb1d115446086946ad931a |
| mcp/server.ts | 7ae261af014f4cee6b266686cd50b2fa5f4393b3f82eb80a19b472f5ef881124 |
| package.json | bd6655b4a6eaae223085a3dc81047ea4249ff8672dabb8da1f96e2c4ee28b5c0 |
| scripts/bot-patrol.ts | f14a08bb27a7c28844911376f72bab753b90eea4970244306a85e9f7528456cd |
| scripts/demo-scenario.ts | 9069d610dce7113ce471ade222611d3fda50472b0ccb9addaeb057a0afcd204c |
| scripts/hooks/_lib.mjs | ab3b526f87fddefd24c3b13053185f4f701db8d54c44170c64dd9beee7ee1300 |
| scripts/hooks/pretool-guard.mjs | 1c92a6a3da79b055a35db9ac66a8b58066f44b0a81d9e81515a28e10ec52538b |
| scripts/hooks/session-context.mjs | 00bf56b1ea4cc00106365e14173766c55cac9a411742ac839231b5fc78c241f8 |
| scripts/hooks/stop-summary.mjs | a7ad9b1fcf3f1f1d6312e7fb1afce13cad85a1d93cb4288a0d3310db7d496b14 |
| scripts/hooks/test-on-save.mjs | e8f897e5a3f43cf5b50b24fdaa45963b68451b50ff87ab1a78a4f83e9109f580 |
| scripts/kiro-review.ts | ab35d6f75bb36338906b5767c32e6cc007c03ccfae163e4cb96d8a2e9051ae02 |
| scripts/node-runtime.d.ts | 92b93ae1717e9e521a5ceaccaa5ed567aa89998fdb8a61f2fcc72f8f8e985f07 |
| src/bot/human.ts | dd0616510bea535b42179794fd85bdc28bed91e80de6221021fbee6ec682dee0 |
| src/bot/state.ts | 42bde9b51ab19d314919a58fdc7b97065e987f181cb399f221a67428e7066699 |
| src/bot/tools.ts | 654e5fe513e6b74f4d50347bc6ff86124d7df5f49479f1f7478bbfd054a2df30 |
| src/data/cancel_guides.json | 7cebc31beaa7f3c64b313c2b9e5a2c97dfcf90b3d98f0b1dcb68855eacd788ca |
| src/data/channel_price_review.json | d81048bfb16b1a3dce4e581bfd95404564bb1b8ad0b04ad4a2d0ecd0d4745a45 |
| src/data/channel_prices.json | 2ba9b8e07694a68632dc8c36ed734a23317f24632d2a79d6b69ccc4b898b6244 |
| src/data/plan_rights.json | 71adadcd38bcc04e619224984db87bfd8e0c98cc7fd8f1afb5eaa2c0176f8dd6 |
| src/data/price_policies.json | fa30b774c53886a35e4e8a3495e80c2f2088e2cdb72a1b41aee9d054326f50a3 |
| src/data/store_procedures.json | 8e9d2ee69a6be7f0dff02bdb107cf95143fb92fd4d51cbdca5380d724359c7d9 |
| src/domain/alternatives.ts | fb8e7c35165fb094b070c94f7830a7d522ecf18ea1105ad5971207fa201650ca |
| src/domain/channelPrice.ts | 173ef40970119f6de5fbb54aa3a424ae043c8ec3ee044d2ed31137d6f0c8eadb |
| src/domain/consent.ts | 0f8f7852adb97507b887e1ee46eb654717c74f2a367b61fa5c0e859242ef0217 |
| src/domain/evidence.ts | 0327452570057a97db2b9631fdcd278b532672f6d7e6a850ee06c96954bffdc4 |
| src/domain/guides.ts | bd34b5bc24021b2bcf4df4c9f0a71722ca80fe88f071b238fc709d14078d5fbd |
| src/domain/money.ts | 83f1e27a719cdd59c562b4a430d55df8d0223ce086c04ec79ee8bdea76d4eb9d |
| src/domain/parsePayment.ts | c62bb9133b39eea762d1e3219f8106c91fb3e84cf59bbd360fbb7956c66c9b7b |
| src/domain/policy.ts | 382ed6d8220e002a11ba1e9ce14326aa9d8258389658249e15485096a1167c19 |
| src/domain/pricePolicy.ts | dafbd92fb5c05d90fb314547aedbf6ddc8a635d9432f98c99a44f135b10a8085 |
| src/domain/reminders.ts | 8bbdf14f13491b375a61167ebbeaf5e640a944395a2f0ce65bcba13a59682cef |
| src/domain/resubBreakeven.ts | e515cd95fd2f9ecaf5dff132e51e0eca9bb306a0bab0a5f9c6caaa638922b013 |
| src/domain/types.ts | f7367a97ea80cd61f781234d1d88158bf7ab08c761e8a578f24083df527eafc1 |
| src/domain/verification.ts | 04c7ef942631e820166ca1b12d4704f5fcebca0e956231388cf5b780868c6578 |
| tests/bot/tools.test.ts | cf9735d4cb5cebf42fc787ba1609547f339f2b8eb82d8529f7b8a7feffea476c |
| tests/domain/alternatives.test.ts | 77f81d868b37ce0fdc280dd93e64bb690a8bbee4a66960fb70f2e1391bfd5405 |
| tests/domain/channelPrice.test.ts | 52d1b2458a10696c1317b57bb88c639bfb973a88f9d80aefa3d32ad16770f886 |
| tests/domain/consentPolicy.test.ts | b2b2862c08934d8eea66402724011f9b572bb846eaa8ca2deaf1d0e274a479aa |
| tests/domain/guides.test.ts | 377cad1f4e170eeda8c5480b7c4a3d2976ce488388fcce173b1d78f9bd16a30c |
| tests/domain/remindersParse.test.ts | 3a090123b126693562c7e00676ac624bae7f954676ca48b1930793602e8544ed |
| tests/domain/resubBreakeven.test.ts | 3959fc9955d022823b9e9bd35a35c4767e5d9ed3133954bf45a7ef8d474f7963 |
| tests/domain/verificationEvidence.test.ts | f2ec0256f5f4a1c5cfba2237cd3b518b6225cfdb3a4f6df57d6b5fd7767be24c |
| tests/fixtures/closure-expected.json | 21f165cd1fa897ef4429fdae4315397f2c06fbb0122d609cd80a1ef6c41f1d5a |
| tests/fixtures/family-consent.json | 665d096f2d8b0622bcef440f04b75ed32adf5b23b07902f3df67e13fdf7975fa |
| tests/fixtures/golden-resub.json | da11e3f62ddfa1c98906fee9b3b1df44fcc92286460f20744bb469f2f3b07d70 |
| tests/fixtures/sms-payments.json | 37d5c12c0e5c985e47403ecf44d3a6fafb2f808a6dcc829b4d1b88d3f3656ece |
| tests/hooks/fixtures/failure.case.mjs | 00337bf33b1625b3bfe7dad4d507877d61fd66a237efba45c31fb6858af6046f |
| tests/hooks/fixtures/failure.config.mjs | 48d590cfca652e7be63fea52ae5f16f93d83b4c66be882c84d089f5da7c1e7b8 |
| tests/hooks/hooks.test.mjs | 38c26cd7b9321d897453c79067b7a3740d67cf6dfdf12a1a44ae4d328bf72c24 |
| tests/hooks/vitest-hook.config.mjs | 137bcb6e6ccaaf55922f627b53f26ec6da31716ff93742023540d6a85cc0336d |
| tests/runtime/fixtures/kiro-child.cjs | 06abfb2637da126c6d06b7a54cb5d9aaee6a44a74c112497864d1ac57e973f6a |
| tests/runtime/provenance.test.ts | dd8999f5358d7f32af1cda18089b9ab4252f83302f480e8f2ba52cf32c1011cf |
| tests/runtime/runner.test.ts | 486438c4184fef809aaac0dd5037de366d039f187149ae294894f16aa888bb6e |
| tsconfig.json | 909109540dae51b4e0c27d3a399b45b547165ebff1a6f7677be1da2b498b989f |
| tsconfig.node.json | 488a0637855f8da70ad20840ae4923cd2f23155b8562516629b72510e7ab59fd |
| vite.config.ts | ca5cf0e4a649a18307af3d5845ca47e4ccf32f590e8af45f0534f6645d343895 |

---

## 부록 B. 동결 전 준비 기록(과거 관측)

아래 내용은 16:08~16:10 준비 당시 기록이다. 현재 단계A 판정이나 현재 hook 구현 설명으로 사용하지 않는다.


# 동결 전 검수 준비

- 담당: NAMING-v2 이후 독립 최종검수자. 제품 구현·runner·hook 작성/수정에는 참여하지 않았다.
- 대상: /Users/lim/kirothon-team-024
- 쓰기 범위: /Users/lim/hackathon-specialist/reports/kirothon-2026/submission/final-review.md 한 파일.
- 현재 판정: **준비 완료, 동결 신호 미수신. 최종 PASS/FAIL을 내리지 않는다.**
- Git 명령, push, Kiro CLI·Crew, 새 세션/native agent, 로그인·가입·결제·외부 요청·메시지 발송을 실행하지 않았다. 기존 구현·덱·README를 수정하지 않았다.
- 기준 인계: board rev27의 FINAL-REVIEW attempt1. 임시 목표 시각까지 기다리지 않고 읽기 파악과 기준 기록을 마쳤다.

## 1. 읽은 범위와 버전

[judge-sim.md](/Users/lim/hackathon-specialist/reports/kirothon-2026/submission/judge-sim.md)의 1차 관측, P1-1~P1-6, 제출·타입 검사·증거 추적의 제한을 읽었다. 이 보고서의 과거 점수나 결함 판정을 현재 최종본으로 복사하지 않는다. 읽은 judge-sim 파일 SHA-256은 e75ff83a2e94b0827c597032f26795af0e297fa8e53aea44ad018c2e3358798d다.

src/tests/scripts/.kiro 파일 목록과 지문을 수집하고, 핵심 정책·봇 도구·실행기·훅·주요 시험·에이전트·Spec/Steering·UI 증거 표시 경로를 읽어 검수 지도를 만들었다. 전체 77개 파일의 모든 코드 행을 완전 감사했다는 뜻은 아니다.

| 구분 | 확인 시각 KST | 파일 수 | 범위 내용 지문 SHA-256 |
|---|---|---:|---|
| 초기 비교 기준 | 2026-11-14T16:08:09.039439+09:00 | 77 | 28568c85d93a6168fa6fc212c1d255422262c206f1e5761d300dfd34c68edf36 |
| 준비 종료 전 재확인 | 2026-11-14T16:10:09.568842+09:00 | 77 | 7199b47ef4d9e92a7fc29697d213c515d7b966021c59e3802b78954b8bfb9f05 |

지문은 src·tests·scripts·.kiro 파일을 경로순으로 정렬해 각 파일의 SHA-256을 계산하고, 경로 + NUL + 파일 지문을 줄바꿈으로 이어 다시 SHA-256한 값이다. Git 커밋 SHA가 아니며, 수정 중 파일을 순서대로 읽은 관측이라 원자적 동결 스냅샷도 아니다.

두 관측 사이 내용이 바뀐 파일 9개:

- .kiro/specs/subs-bot/design.md
- .kiro/specs/subs-bot/tasks.md
- scripts/deploy-pages.sh
- scripts/trace-check.mjs
- src/domain/reminders.ts
- src/ui/ChannelCheck.tsx
- src/ui/FamilySim.tsx
- src/ui/HowBuilt.tsx
- tests/domain/remindersParse.test.ts

이 변경을 결함 또는 수정 완료로 판정하지 않았다. 특히 날짜 계산·시험·UI·Spec이 움직이고 있으므로 judge-sim의 D-day 문제를 현재 최종 결함으로 확정하지 않는다.

준비 종료 관측의 주요 파일 지문:

| 파일 | SHA-256 |
|---|---|
| src/bot/tools.ts | c0a75af1e42623de31230857ae0f5bbf757618856e3d1d92d775cca18babcb9b |
| src/domain/consent.ts | 0f8f7852adb97507b887e1ee46eb654717c74f2a367b61fa5c0e859242ef0217 |
| src/domain/policy.ts | abda117b8734a8315a8f5415a047d2e0cb0c6879954543340649f85b3959a96c |
| src/domain/reminders.ts | 8bbdf14f13491b375a61167ebbeaf5e640a944395a2f0ce65bcba13a59682cef |
| scripts/bot-patrol.ts | 33c01093b40bd24cc29778894dc0692f7984f8e88580663e2f348a34a7186bf0 |
| scripts/demo-scenario.ts | 218b9624606eea1d679cc47cf40a57d481468e7af2219d9cdd134cefddc43dd4 |
| scripts/hooks/pretool-guard.mjs | 1c92a6a3da79b055a35db9ac66a8b58066f44b0a81d9e81515a28e10ec52538b |
| scripts/hooks/_lib.mjs | 8940b9298521a7ff9918659bf76312e1cc097dafe9267641c648d5cb0bea1b5e |
| tests/bot/tools.test.ts | de0731526e0916a52076da06ba542083a500a53156bde07f2701ca91853e14e9 |

## 2. 검수 지도

| 범위 | 확인한 연결 | 동결 후 확인할 증거 |
|---|---|---|
| 도메인 | [consent.ts](../../src/domain/consent.ts), [policy.ts](../../src/domain/policy.ts), [channelPrice.ts](../../src/domain/channelPrice.ts), [reminders.ts](../../src/domain/reminders.ts), [verification.ts](../../src/domain/verification.ts) | 경로·가격 조건 결합, 동의 철회/개정, 결정 마감과 유료 전환일, 신규 정상 청구와 문제 청구 분리 |
| 봇 | [tools.ts](../../src/bot/tools.ts), [state.ts](../../src/bot/state.ts), [human.ts](../../src/bot/human.ts) | 등록 13도구와 권한 대응, 가족·결제자 경계, 원문 제외, 환불 안내 대상 |
| 시험 | [tools.test.ts](../../tests/bot/tools.test.ts), [consentPolicy.test.ts](../../tests/domain/consentPolicy.test.ts), [channelPrice.test.ts](../../tests/domain/channelPrice.test.ts), [remindersParse.test.ts](../../tests/domain/remindersParse.test.ts), [verificationEvidence.test.ts](../../tests/domain/verificationEvidence.test.ts) | 역순 청구·이전 버전·조건만 변경·실패/시간초과·기준일 경계에 대한 시험의 실제 실행 결과 |
| runner | [bot-patrol.ts](../../scripts/bot-patrol.ts), [demo-scenario.ts](../../scripts/demo-scenario.ts) | 실패 실행의 승격 방지, report/종료 상태, 기존 영수증·공개 replay·최종 코드의 대응 |
| hook | [pretool-guard.mjs](../../scripts/hooks/pretool-guard.mjs), [_lib.mjs](../../scripts/hooks/_lib.mjs), 나머지 훅과 .kiro/hooks 설정 | 실제 차단 이벤트와 설정의 차이, 실패의 실패 표기, 원문·비밀 비노출 |
| Kiro 설정 | .kiro/agents, .kiro/settings/mcp.json, 두 Spec과 Steering | 실제 실행된 기능과 설정만 존재하는 기능 구분, 도구·요구 ID의 일관성 |
| UI | [BotReplay.tsx](../../src/ui/BotReplay.tsx), [HowBuilt.tsx](../../src/ui/HowBuilt.tsx), 변경 중인 가족/가격 화면 | 녹화·합성·실행 영수증의 표시, 새 메인 전체 범위, 파일·링크 유효성 |

## 3. 중요한 새 실행 제약

**검수 편의상 npm run verify 또는 훅을 실행하면 지정 경로 밖 쓰기나 금지된 Git/Kiro 호출이 생길 수 있다.** 제품 결함이라는 판정이 아니라 이 검수자의 실행 경계다.

- [package.json](../../package.json)의 verify는 build와 scripts/trace-check.mjs를 포함한다. Vite build는 산출물을 만들고, trace-check는 docs/evidence/traceability.md를 쓴다.
- [bot-patrol.ts:50](../../scripts/bot-patrol.ts#L50)는 Kiro를 호출하며, 상태·영수증을 저장한다. bot:reset의 dry 옵션도 reset이 먼저 상태 파일을 쓸 수 있어 안전한 읽기 명령으로 취급하지 않는다.
- [hooks/_lib.mjs:23](../../scripts/hooks/_lib.mjs#L23)의 gitSha는 Git 명령을 실행한다. SessionStart/Stop/저장 훅은 이 함수나 appendEvidence를 호출한다. 따라서 기존 훅을 실행해 검수 로그를 만들지 않는다.
- Kiro 재호출이 금지돼 수정 후 새 모델 통합 실행을 이 검수자가 추가 입증할 수는 없다. 동결 후 기존 실제 실행 기록의 원본·버전·성공 범위를 대조하고, 결정적 검증과 모델 실행 증거를 구분한다.

이 밖의 새 제품 P1을 이번 준비 단계에서 확정하지 않았다.

## 4. 동결 후 검수 순서

1. 총괄의 동결 신호와 대상 버전/파일 범위를 기록한다. 위 지문과 새 지문을 비교해 변경 목록을 고정한다. 신호가 오기 전에는 수정 중 코드에 최종 등급을 붙이지 않는다.
2. 필수 제출물과 데모·PDF·README·BUILD_REPORT·.kiro·증거의 포함/참조를 확인한다. judge-sim의 연구 체크리스트를 공식 탈락 기준이나 고정 배점으로 확대하지 않는다. 원격 제출·push 확인은 총괄의 증거와 분리한다.
3. judge-sim P1-1: 예상 밖 기존 경로 청구를 먼저, 정상 새 경로 청구를 나중에 둔 반례와 명시적 channel의 일관성을 확인한다.
4. P1-2: 실패·timeout·runFinished/report 누락이 성공 replay로 승격되지 않는지 확인한다.
5. P1-3·P1-4: 가족이 동의한 경로·가격·조건의 버전 결합, 목적지 검증 또는 다른 이유의 사용자 선택 확인을 본다.
6. P1-5: 무료체험 종료까지의 D-day와 취소 결정 마감까지의 D-day를 분리하고 Spec·화면·시험을 대조한다.
7. P1-6: 새 메인 전체의 공개 재생·영수증·이벤트·사람 행동과 이전 보존본을 구분한다. 실패 수정 후 같은 모델 실행을 새로 검증한 것으로 소급하지 않는다.
8. 변경에 맞는 검증 명령·실제 결과·검증 범위와 미해결을 이 파일에 갱신한다. 별도 쓰기가 생기는 테스트/빌드/훅은 무심코 실행하지 않고, 허용된 읽기 검사와 총괄의 실행 증거를 구분한다.

## 5. 이번 실행 명령과 결과

| 실제 수행 | 결과 | 의미 |
|---|---|---|
| pwd (대상 cwd 지정), rg --files --hidden src tests scripts .kiro | 대상 /Users/lim/kirothon-team-024 확인, 목록 수집 | Git 미실행 |
| cat / sed / nl / rg로 위 파일·judge-sim 읽기 | 핵심 경로와 수정 대상 파악 | 실행 성공/결함 재현 판정 아님 |
| Python pathlib/hashlib로 범위 두 차례 내용 지문 계산 | 77파일, 변경 9개, 삭제 0개 관측 | 최종 동결본이 아님 |
| Python json.loads로 .kiro의 *.json 읽기 | 7개 모두 문법 PASS | Kiro 런타임·훅 실제 차단 증거는 아님 |
| Python re로 도구명·시험 파일 목록 확인 | 도구 13개, 시험 파일 8개 | 시험 통과 개수 아님 |

후속 타입 검사 후보(아직 실행하지 않음):

    cd /Users/lim/kirothon-team-024
    NODE_DISABLE_COMPILE_CACHE=1 node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit --incremental false

현재 tsconfig의 include는 src·tests라 scripts/MCP까지 타입 검사했다고 설명하지 않는다. 최종 동결본에서 설정이 바뀌면 범위를 다시 확인한다. npm test/build/verify, 봇·MCP·hook, 배포·브라우저·외부 URL 검사는 이번 준비에서 실행하지 않았다.

## 6. 변경 파일·미해결

- 변경 파일: 이 final-review.md 한 개. 대상 저장소의 구현·시험·문서·덱은 변경하지 않았다.
- 준비 검증: 목록·지문·설정 JSON 문법·주요 실행 경계 확인 완료.
- 미해결: 동결 신호, 최종 P1 수정본, 최종 제출물·실행 기록의 버전 대응. 준비 완료를 제품 최종 승인으로 취급하지 않는다.

## 검수 종료 회수: 최종 판정

**REQUEST_CHANGES — 알려진 P0 없음, P1 1건(A-P1-01) 잔존.** 기존 검수 결과를 회수한 판정이며 새 조사·검사 범위를 추가하지 않았다. 아래 표가 준비 기록 이후의 최종 상태다.

### 핵심 재검수표

| 대상 | 최종 결과·근거 |
|---|---|
| A-P1-01 데모 업무 성공 검사 | **차단 잔존.** 성공 fixture 점검 5회·사건 0개·필수 일반 행동 6건 거부에도 임시 대표 replay 승격. 의도된 이전 버전 투표도 stale_version 대신 no_proposal. 별도 반례 FAIL. 실행기 지문이 동일해 판정 유지 |
| 정상 새 경로 청구·가격 보류·통화 거부 | PASS. 문제 청구 분리, comparable=false 및 비KRW 목적지 거부, 실제 보류 가격의 인계 거부 확인 |
| 실행기 프로세스 실패·timeout·영수증 | PASS. 비정상 종료·완료 이벤트/보고 누락 등은 실패 처리. 업무 성공 검사는 위 A-P1-01과 구분 |
| 가족 이동·D-day | 범위 내 PASS. 가족 경로 이동은 family_switch_not_supported로 거부하며 기능 완성으로 주장하지 않음. 종료일과 결정 마감 필드 분리 |
| 프로젝트·보충 시험 | 설치 Vitest로 378/378 PASS. 보충 2개는 1 FAIL(A-P1-01)/1 PASS(보류 가격 인계). 두 집합을 혼합하지 않음 |
| 훅·타입·빌드 | 검수자의 합성 훅 7/7 PASS, 설치 tsc의 앱/Node 두 설정 PASS, 설치 Vite 빌드 PASS. validation.json·hook-check.json의 PASS/소스 유지 기록 존재 확인 |
| 브라우저·공개 녹화 | front-qa.json 37/37 PASS·오류 0 기록과 캡처 확인. 실제 녹화 5회·34도구·5거부, 사람 허용 7/거부 1, 공개/보존 replay 지문 일치. 기존 녹화가 실패했다는 지적은 아님 |
| 깨끗한 복사본 설치·빌드 | clean-install.json의 status=pass, npm ci --no-audit --no-fund 및 npm run build 모두 exit 0. 대상 집계 SHA 일치, 임시 복사본 삭제=true. 이 검수자가 설치를 재실행한 것은 아님 |
| 문서·제출 PDF·동결 | README/BUILD_REPORT의 TESTS_TBD 잔여 0. 최종 PDF 10쪽 지문 일치. 소스 71개 현재 지문 불일치 0개 |

### 대상 해시

| 대상 | SHA-256 |
|---|---|
| 소스 71개 집계 | 7bf575a84c116ac6cc1649f64991ef101bf23a058454f929223ae0a43667d5a4 |
| scripts/demo-scenario.ts | 9069d610dce7113ce471ade222611d3fda50472b0ccb9addaeb057a0afcd204c |
| PRESENTATION.pdf | 84e3e56a06042934203d6b123ce6c59c89a72529b5ce13e404c86d848ceda25d |
| docs/evidence/clean-install.json | 067c61b7a4857680a1538b4f44928f694cc7c7c1a4dda942e24d47851f17495e |

파일별 소스 SHA는 [동결 원장](../../docs/evidence/source-manifest.json), 설치 기록은 [clean-install.json](../../docs/evidence/clean-install.json)에 있다. 그 밖의 검수 파일 지문·실행 명령은 앞선 F2/F3/A4에 보존했다.

### 제약·종료 조건

수정 후 새 Kiro 호출은 없으며, 브라우저 37항목과 clean install은 저장된 실행 근거를 대조했다. 기존 녹화는 최종 수정본의 새 모델 실행 증거가 아니다. 검수자는 Git·Kiro/Crew·새 에이전트·외부 전송을 실행하지 않았고, 구현·README·덱을 바꾸지 않았다. 영구 변경은 이 보고서뿐이다.

알려진 차단을 닫으려면 A-P1-01의 기대 행동/최종 상태 검사와 실패 시 이전 replay 보존을 수정한 뒤 관련 반례를 통과시켜야 한다. 현재 종료는 **검수 결과 회수 완료, 제품 승인 보류**다.

STATUS: ready_for_review
