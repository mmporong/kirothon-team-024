# 요구사항 추적표 (자동 생성)

생성: `node scripts/trace-check.mjs` · 요구 30개 · 테스트로 직접 검사하는 요구 24개

테스트 대신 다른 증거로 확인하는 요구: R06(화면 문구), R14(PreToolUse 훅 → `docs/evidence/policy-denials.jsonl`), R15(오류 처리 코드), R17(배포 주소), R18(훅·봇 영수증), R26(`docs/evidence/bot-runs/`).

| 요구 | spec | 제목 | 코드 | 테스트 |
|---|---|---|---|---|
| R01 | subscription-closure | 결제 문자에서 후보 찾기 | `src/domain/parsePayment.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/remindersParse.test.ts` |
| R02 | subscription-closure | 모르는 값은 비워 두기 | `src/domain/parsePayment.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/remindersParse.test.ts` |
| R03 | subscription-closure | 중복 방지 | `src/domain/reminders.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/remindersParse.test.ts` |
| R04 | subscription-closure | 사용량 미확인 | `src/domain/types.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/guides.test.ts` |
| R05 | subscription-closure | 결제 전에 먼저 묻기 | `src/domain/reminders.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/remindersParse.test.ts` |
| R06 | subscription-closure | 알림 한계 표시 | `scripts/trace-check.mjs`<br>`src/domain/reminders.ts`<br>`src/ui/HowBuilt.tsx` | - |
| R07 | subscription-closure | 동의 전 잠금 | `src/domain/consent.ts`<br>`src/domain/policy.ts`<br>`src/ui/FamilySim.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/consentPolicy.test.ts` |
| R08 | subscription-closure | 조건이 바뀌면 다시 동의 | `src/domain/consent.ts`<br>`src/domain/policy.ts`<br>`src/ui/FamilySim.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/consentPolicy.test.ts` |
| R09 | subscription-closure | 결제 채널별 공식 해지 경로 | `src/domain/guides.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/guides.test.ts` |
| R10 | subscription-closure | 경로 불명 보류 | `src/domain/guides.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/consentPolicy.test.ts`<br>`tests/domain/guides.test.ts` |
| R11 | subscription-closure | 요청과 완료 구분 | `src/domain/policy.ts`<br>`src/domain/verification.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/verificationEvidence.test.ts` |
| R12 | subscription-closure | 다음 청구 확인과 재개방 | `src/domain/policy.ts`<br>`src/domain/verification.ts`<br>`src/ui/FamilySim.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/verificationEvidence.test.ts` |
| R13 | subscription-closure | 원문 최소화 | `scripts/hooks/pretool-guard.mjs`<br>`src/domain/evidence.ts`<br>`src/ui/HowBuilt.tsx` | `tests/domain/verificationEvidence.test.ts` |
| R14 | subscription-closure | 개발 도구 경계 | `scripts/hooks/pretool-guard.mjs`<br>`scripts/trace-check.mjs`<br>`src/ui/HowBuilt.tsx` | - |
| R15 | subscription-closure | 실패 보존 | `scripts/trace-check.mjs`<br>`src/ui/HowBuilt.tsx` | - |
| R16 | subscription-closure | 단일 정책 관문 | `src/bot/human.ts`<br>`src/bot/tools.ts`<br>`src/domain/policy.ts`<br>`src/ui/FamilySim.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/consentPolicy.test.ts` |
| R17 | subscription-closure | 무로그인 재현 | `scripts/demo-scenario.ts`<br>`scripts/trace-check.mjs`<br>`src/ui/HowBuilt.tsx` | - |
| R18 | subscription-closure | 검증 기록 | `scripts/hooks/stop-summary.mjs`<br>`scripts/trace-check.mjs`<br>`src/domain/evidence.ts`<br>`src/ui/HowBuilt.tsx` | - |
| R19 | subscription-closure | 재가입 손익 계산 | `src/domain/money.ts`<br>`src/domain/resubBreakeven.ts`<br>`src/ui/Calculator.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/resubBreakeven.test.ts` |
| R20 | subscription-closure | 계산 전제 표시 | `src/domain/pricePolicy.ts`<br>`src/domain/resubBreakeven.ts`<br>`src/ui/Calculator.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/alternatives.test.ts`<br>`tests/domain/resubBreakeven.test.ts` |
| R21 | subscription-closure | 대안 비교 | `src/domain/alternatives.ts`<br>`src/ui/Calculator.tsx`<br>`src/ui/HowBuilt.tsx` | `tests/domain/alternatives.test.ts` |
| R28 | subscription-closure | 결제 경로별 가격 차이 | `src/domain/channelPrice.ts`<br>`src/domain/verification.ts` | `tests/bot/tools.test.ts`<br>`tests/domain/channelPrice.test.ts` |
| R29 | subscription-closure | 무료체험·결제 경로별 결정 마감 | `src/domain/reminders.ts` | `tests/bot/tools.test.ts`<br>`tests/domain/channelPrice.test.ts` |
| R30 | subscription-closure | 경로를 옮기는 중의 청구 구분 | - | `tests/bot/tools.test.ts`<br>`tests/domain/channelPrice.test.ts` |
| R22 | subs-bot | 스스로 점검 | `mcp/server.ts`<br>`scripts/bot-patrol.ts`<br>`src/bot/state.ts`<br>`src/bot/tools.ts`<br>`src/ui/HowBuilt.tsx` | `tests/bot/tools.test.ts` |
| R23 | subs-bot | 사람 결정 분리 | `src/bot/human.ts`<br>`src/bot/tools.ts`<br>`src/ui/HowBuilt.tsx` | `tests/bot/tools.test.ts` |
| R24 | subs-bot | 거부되면 다시 계획 | `src/bot/tools.ts`<br>`src/ui/HowBuilt.tsx` | `tests/bot/tools.test.ts` |
| R25 | subs-bot | 해지 후 재청구 추적 | `scripts/demo-scenario.ts`<br>`src/bot/tools.ts`<br>`src/ui/HowBuilt.tsx` | `tests/bot/tools.test.ts` |
| R26 | subs-bot | 실행 영수증 | `scripts/bot-patrol.ts`<br>`scripts/demo-scenario.ts`<br>`scripts/trace-check.mjs`<br>`src/bot/state.ts`<br>`src/ui/BotReplay.tsx`<br>`src/ui/HowBuilt.tsx` | - |
| R27 | subs-bot | 원문 비노출과 숫자 검증 | `mcp/server.ts`<br>`src/bot/state.ts`<br>`src/bot/tools.ts`<br>`src/domain/parsePayment.ts`<br>`src/ui/HowBuilt.tsx` | `tests/bot/tools.test.ts` |
