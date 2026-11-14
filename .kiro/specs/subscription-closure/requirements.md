# Requirements Document — subscription-closure

## Introduction

한국 가구의 구독 해지 불편을 줄이는 로컬 우선 웹앱이다. 정기결제·무료체험 종료 전에 계속 쓸지 먼저 묻고, 같은 구독을 더 싸게 내는 결제 경로(예: App Store 대신 웹)를 알려 주고, 결제 경로별 공식 해지 방법을 안내하고, 가족이 함께 쓰는 구독은 같은 조건으로 동의를 모아 결제자에게 넘기고, 해지·경로 변경 뒤 다음 청구까지 대조한다. 해지 후 재가입 손익(R19~R21)은 기존 요금 자격이 있는 경우에만 쓰는 보조 기능이다(2026-11-14 15:30 사용자 결정: 해당 사례가 적어 메인에서 제외). 제품 런타임은 서버·로그인·LLM 없이 동작하고, 에이전트 봇은 별도 spec(`.kiro/specs/subs-bot/`)이 다룬다.

요구사항 번호 N은 코드·테스트·커밋 메시지의 `RNN`과 같다(예: Requirement 19 = `R19`). 인수 기준은 `N.M`으로 참조한다.

## Glossary

- **System**: 이 저장소의 웹앱과 `src/domain` 정책 함수.
- **결제자(owner)**: 원 서비스 청구 계정의 소유자. 실제 해지 권한을 가진다.
- **가족 구성원(member)**: 결제자와 구독을 함께 쓰는 사람.
- **H**: 비교 기간(개월). **k**: 쉬는 개월 수(0 ≤ k ≤ H).
- **사건(case)**: 한 구독의 검토 → 동의 → 인계 → 해지 → 다음 청구 확인 묶음.
- **정책 관문**: `src/domain/policy.ts`의 `evaluateAction`. 모든 상태 변경이 거친다.

## Requirements

### Requirement 1 (R01): 결제 문자에서 후보 찾기

**User Story:** 결제자로서, 결제 문자를 붙여 넣으면 서비스·금액·날짜가 자동으로 정리되기를 원한다. 그래야 문자를 하나하나 옮겨 적지 않는다.

#### Acceptance Criteria

1. WHEN 사용자가 결제 문자를 제공하면 THE System SHALL 기기 안에서 서비스·금액·결제일 후보와 원문 안의 근거 위치(start, end)를 만든다.
2. WHEN 문자가 광고·인증번호·0원 유효성 확인이면 THE System SHALL 그 문자를 청구로 세지 않는다.
3. WHEN 금액이 외화이면 THE System SHALL 원화로 바꾸지 않고 통화와 값을 따로 보존한다.

### Requirement 2 (R02): 모르는 값은 비워 두기

**User Story:** 결제자로서, 문자에 없는 정보를 앱이 지어내지 않기를 원한다. 그래야 잘못된 날짜로 알림을 받지 않는다.

#### Acceptance Criteria

1. IF 금액·서비스·결제일이 근거에 없으면 THEN THE System SHALL 그 필드를 `null`로 두고 확인이 필요한 필드로 표시한다.
2. IF 본문에 연도가 없으면 THEN THE System SHALL 수신 시각으로 결제일을 추정하지 않는다.

### Requirement 3 (R03): 중복 방지

**User Story:** 결제자로서, 같은 구독 알림을 두 번 받지 않기를 원한다.

#### Acceptance Criteria

1. WHEN 같은 구독이 검토함에 두 번 들어오면 THE System SHALL 한 번만 올린다.

### Requirement 4 (R04): 사용량 미확인

**User Story:** 결제자로서, 사용 기록이 없다는 이유로 "안 쓰니까 해지"라는 잘못된 추천을 받지 않기를 원한다.

#### Acceptance Criteria

1. IF 사용량 관측 자료가 없으면 THEN THE System SHALL 사용량을 "미확인"으로 표시하고 0회로 바꾸지 않는다.

### Requirement 5 (R05): 결제 전에 먼저 묻기

**User Story:** 결제자로서, 자동결제 전에 계속 쓸지 결정할 기회를 갖고 싶다. 그래야 잊고 있다가 결제되는 일을 막는다.

#### Acceptance Criteria

1. WHEN 확인된 다음 결제일까지 3일 이하가 남으면 THE System SHALL 그 구독을 결제 전 검토함에 올린다.
2. THE System SHALL 주입된 현재 시각으로 D-3·D-2·D-1·당일·지난 기한을 구분한다.
3. IF 다음 결제일이 `null`이면 THEN THE System SHALL 검토함 대신 "결제일 확인 필요"로 표시한다.

### Requirement 6 (R06): 알림 한계 표시

**User Story:** 결제자로서, 앱이 닫혀 있을 때 알림이 보장되지 않는다는 사실을 알고 싶다.

#### Acceptance Criteria

1. WHILE 앱이 닫혀 있는 동안 THE System SHALL 정시 알림을 보장한다고 표시하지 않는다.

### Requirement 7 (R07): 동의 전 잠금

**User Story:** 가족 구성원으로서, 함께 쓰는 구독이 내 동의 없이 해지 절차로 넘어가지 않기를 원한다.

#### Acceptance Criteria

1. WHILE 공유 구독의 현재 제안 버전에 필수 구성원 전원의 동의가 없는 동안 THE System SHALL 결제자 인계 상태로 전이하지 않는다.
2. WHEN 반대·보류·미응답이 있으면 THE System SHALL 각각을 거부 사유(`objection_present`, `abstain_present`, `consent_missing`)로 돌려준다.

### Requirement 8 (R08): 조건이 바뀌면 다시 동의

**User Story:** 가족 구성원으로서, 내가 동의한 조건과 다른 조건으로 해지가 진행되지 않기를 원한다.

#### Acceptance Criteria

1. WHEN 제안 조건(H·k·선택 대안·필수 요구·계산 문장)이 바뀌면 THE System SHALL 제안 버전을 올리고 이전 버전의 응답을 집계에서 뺀다.
2. WHEN 이전 버전에 대한 응답이 제출되면 THE System SHALL `stale_version`으로 거부한다.
3. WHEN 구성원이 동의를 철회하면 THE System SHALL 인계 준비 상태를 풀고 가족 검토로 되돌린다.
4. WHEN 같은 조건으로 다시 제안하면 THE System SHALL 버전을 올리지 않는다.

### Requirement 9 (R09): 결제 채널별 공식 해지 경로

**User Story:** 결제자로서, 내가 결제한 경로(웹·App Store·Google Play·통신사)에 맞는 해지 방법을 바로 알고 싶다.

#### Acceptance Criteria

1. WHEN 서비스와 결제 채널이 확인되면 THE System SHALL 출처 URL(https)과 확인 시각이 있는 그 채널의 해지 경로를 보여 준다.

### Requirement 10 (R10): 경로 불명 보류

**User Story:** 결제자로서, 결제 채널을 모를 때 엉뚱한 곳에서 해지하지 않기를 원한다.

#### Acceptance Criteria

1. IF 결제 채널을 모르면 THEN THE System SHALL "결제 채널 확인 필요"로 인계를 보류한다.
2. IF 해당 채널의 가이드 자료가 없으면 THEN THE System SHALL 확인 필요를 표시한다.

### Requirement 11 (R11): 요청과 완료 구분

**User Story:** 결제자로서, 해지를 신청만 한 상태를 해지 완료로 착각하지 않기를 원한다.

#### Acceptance Criteria

1. WHEN 해지 요청 기록만 있으면 THE System SHALL 계약 종료로 표시하지 않는다.
2. THE System SHALL 해지 요청·사업자 확인·결제수단 상태·환불을 따로 기록한다.
3. THE System SHALL 해지 요청 기록을 결제자만 할 수 있게 한다.

### Requirement 12 (R12): 다음 청구 확인과 재개방

**User Story:** 결제자로서, 해지 뒤에도 돈이 빠져나가면 바로 알고 다시 처리하고 싶다.

#### Acceptance Criteria

1. WHEN 다음 결제 예정일(+3일)이 지나고 확인한 결제 경로에서 청구가 관측되지 않으면 THE System SHALL "확인한 기간·경로에서 추가 청구 관측 없음"만 표시한다.
2. IF 예정일 전이거나 확인한 경로가 없으면 THEN THE System SHALL 판단을 보류한다.
3. WHEN 해지 요청 뒤 청구가 관측되면 THE System SHALL 같은 사건을 `reopened`로 되돌린다.

### Requirement 13 (R13): 원문 최소화

**User Story:** 사용자로서, 결제 문자 원문이 저장·전송되지 않기를 원한다.

#### Acceptance Criteria

1. WHILE 데이터를 저장하거나 요약을 내보내는 동안 THE System SHALL 결제 문자 원문을 제외하고 확인된 필드와 근거 위치만 남긴다.

### Requirement 14 (R14): 개발 도구 경계

**User Story:** 개발자로서, 개발 에이전트가 실제 문자 DB나 비밀 파일에 접근하지 못하게 하고 싶다.

#### Acceptance Criteria

1. IF 개발 중 에이전트 도구 호출이 실제 문자 DB·비밀 파일·위험 명령을 포함하면 THEN THE System SHALL PreToolUse 훅에서 exit 2로 막고 payload 없이 규칙 ID만 기록한다.

### Requirement 15 (R15): 실패 보존

**User Story:** 사용자로서, 처리 실패가 성공으로 둔갑하지 않기를 원한다.

#### Acceptance Criteria

1. IF 추출·저장·가이드 조회가 실패하면 THEN THE System SHALL 미확인 상태를 보존한다.

### Requirement 16 (R16): 단일 정책 관문

**User Story:** 가족 구성원으로서, 화면 버튼을 숨기는 것만으로 규칙이 지켜진다고 믿지 않아도 되기를 원한다.

#### Acceptance Criteria

1. WHEN UI·봇 도구·도메인 명령이 상태 변경을 요청하면 THE System SHALL 같은 `evaluateAction`으로 역할·동의·버전·단계를 검사한다.
2. THE System SHALL 같은 상태·행동·시각에 같은 결과를 돌려준다.
3. THE System SHALL 거부된 요청도 감사 기록에 남긴다.

### Requirement 17 (R17): 무로그인 재현

**User Story:** 심사자로서, 설치·로그인 없이 핵심 흐름을 확인하고 싶다.

#### Acceptance Criteria

1. WHEN 배포 주소를 열면 THE System SHALL 로그인·서버·네트워크 모델 없이 손익 계산·가족 동의 체험·봇 실행 기록 재생을 보여 준다.

### Requirement 18 (R18): 검증 기록

**User Story:** 심사자로서, 테스트·훅 결과가 어느 코드 버전에서 나왔는지 알고 싶다.

#### Acceptance Criteria

1. WHEN 훅이나 봇 실행이 끝나면 THE System SHALL 실행 시각·소스 SHA·결과·수행 주체를 기록한다.

### Requirement 19 (R19): 재가입 손익 계산

**User Story:** 결제자로서, 구독을 잠시 해지했다가 다시 가입하면 손해인지 이득인지 숫자로 알고 싶다. 그래야 신규 요금 때문에 오히려 돈을 더 내는 실수를 피한다.

#### Acceptance Criteria

1. WHEN 기존 월 요금·신규 월 요금·H·k가 입력되면 THE System SHALL 유지 총액(H×기존), 쉬고 복귀 총액((H−k)×신규), 부호 있는 손익(유지−쉬기), 손익이 0보다 커지는 최소 k를 계산한다.
2. THE System SHALL 디즈니+ 스탠다드 9,900→11,500원, H=12에서 k=1 −7,700원, k=2 +3,800원, k=3 +15,300원, 손익분기 2개월을 낸다.
3. THE System SHALL 손익 0(동률)을 이득으로 세지 않는다.
4. IF 금액이 정수가 아니거나 음수·0원이거나 k>H이면 THEN THE System SHALL 계산 전에 거부한다.
5. THE System SHALL Python 참조 구현(`research` 단계 산출물)과 같은 값을 낸다.

### Requirement 20 (R20): 계산 전제 표시

**User Story:** 결제자로서, 숫자가 어떤 가정에서 나왔는지 함께 보고 싶다.

#### Acceptance Criteria

1. WHILE 손익 숫자나 조언 문장을 보여 주는 동안 THE System SHALL 가격 출처·확인 시각·적용일·기존가 자격·H·k·가격 고정·쉬는 동안 0원·제외 비용 가정을 함께 보여 준다.
2. WHEN 공개 요금으로 계산하면 THE System SHALL "예시 계산"으로 표시한다.
3. THE System SHALL 계산상 차이를 실제 절감액·환불액으로 표시하지 않는다.

### Requirement 21 (R21): 대안 비교

**User Story:** 가족으로서, 해지 말고 더 싼 방법(연간권·광고형·낮은 등급)이 있는지 같은 기간으로 비교하고 싶다.

#### Acceptance Criteria

1. WHEN 대안을 검토하면 THE System SHALL 같은 H 동안 연간권·광고형·낮은 등급의 총액과 선결제·환불 제약, 기존가 상실을 표시한다.
2. WHEN 필수 요구(광고 없음·4K·동시 4명·선결제 안 함)를 충족하지 못하면 THE System SHALL 그 대안을 "안 맞음"으로 표시하고 추천 순위에서 뺀다.
3. IF 권리 정보가 미확인이면 THEN THE System SHALL "확인 필요"로 두고 추천하지 않는다.

### Requirement 28 (R28): 결제 경로별 가격 차이

**User Story:** 아이폰 사용자로서, App Store로 결제하는 구독이 웹이나 Android보다 비싼지 알고 싶다. 그래야 같은 서비스를 더 싸게 이용한다.

#### Acceptance Criteria

1. WHEN 구독의 결제 경로와 요금제가 확인되면 THE System SHALL 다른 결제 경로(웹·App Store·Google Play)의 가격과 비교해 월·연 차액을 보여 준다.
2. THE System SHALL 공식 페이지나 스토어 목록으로 확인된 가격(verified)만 차액 계산에 쓰고, 보도 기준 가격은 "확인 필요"로만 표시한다.
3. WHEN 실제 청구액이 있으면 THE System SHALL 공개 가격 대신 그 금액을 현재 가격으로 쓴다.
4. WHEN 기존 요금 자격이 있는 구독이면 THE System SHALL 경로를 옮기면 새로 가입하는 것이라 신규 요금이 적용될 수 있다고 경고한다.
5. THE System SHALL 경로를 옮기는 단계(현재 경로 자동 갱신 끄기 → 기간 종료 확인 → 새 경로 가입 → 다음 청구 확인)를 공식 절차 자료로 보여 준다.

### Requirement 29 (R29): 무료체험·결제 경로별 결정 마감

**User Story:** 결제자로서, 무료체험이 유료로 바뀌기 전에, 그리고 앱마켓이 요구하는 시점 전에 결정할 수 있게 미리 알림을 받고 싶다.

#### Acceptance Criteria

1. WHEN 무료체험 종료일이 있으면 THE System SHALL 정기결제일 대신 체험 종료일을 결정 기준일로 쓴다.
2. WHEN 결제 경로가 App Store이면 THE System SHALL 결정 마감을 기준일 하루 전으로 둔다(결제 24시간 전까지 자동 갱신을 꺼야 함).

### Requirement 30 (R30): 경로를 옮기는 중의 청구 구분

**User Story:** 결제자로서, 결제 경로를 옮긴 뒤 새 경로 청구는 정상으로, 이전 경로 청구는 이중 결제로 구분해 알고 싶다.

#### Acceptance Criteria

1. WHEN 경로 이동 사건에서 새 경로 청구가 관측되면 THE System SHALL 예상된 청구로 기록하고 사건을 다시 열지 않는다.
2. WHEN 이전 경로 청구가 관측되면 THE System SHALL 사건을 `reopened`로 되돌리고 그 경로의 취소·환불 요청 방법을 안내한다.
3. WHEN 앱마켓 청구 문자에 서비스명이 없으면(예: APPLE.COM/BILL) THE System SHALL 같은 결제 경로 구독과 금액으로 연결하고 연결 근거를 표시한다.
4. IF 지금과 같은 경로로 옮기려 하면 THEN THE System SHALL 거부한다.
