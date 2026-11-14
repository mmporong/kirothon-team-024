# Requirements Document — subs-bot (구독 점검 봇)

## Introduction

구독 점검 봇은 Kiro CLI 커스텀 에이전트(`.kiro/agents/subs-bot.json`)다. 한 번 실행될 때마다 가구 상태를 스스로 점검하고, 결제 전에 결제자에게 먼저 묻고, 가족 동의를 모으고, 정책 관문이 거부하면 사유에 맞게 계획을 바꾸고, 해지 뒤 재청구를 추적한다. 봇은 프로젝트 MCP 서버(`mcp/server.ts`, 서버 이름 `household`)의 도구만 쓸 수 있고, 모든 상태 변경은 웹앱과 같은 `evaluateAction`(spec `subscription-closure` 요구 16)을 거친다.

요구사항 번호 N은 코드·테스트의 `RNN`이다(요구 22 = `R22`).

## Glossary

- **Bot**: `subs-bot` 에이전트와 그 실행기(`scripts/bot-patrol.ts`).
- **점검(patrol)**: 봇 실행 1회. `kiro-cli chat --no-interactive --agent subs-bot`.
- **MCP Server**: `household` 서버. 도구 13개.
- **사람 결정**: 투표·동의 철회·해지 신청 기록·사업자 확인. 사람만 할 수 있다.

## Requirements

### Requirement 22 (R22): 스스로 점검

**User Story:** 결제자로서, 내가 앱을 열지 않아도 봇이 알아서 결제 예정을 살피고 먼저 물어 주기를 원한다.

#### Acceptance Criteria

1. WHEN 점검이 시작되면 THE Bot SHALL 가구 상태를 읽고, 새 결제 문자를 구조화하고, 3일 안에 결제될 구독을 찾고, 손익과 대안을 계산한 뒤, 열린 사건마다 다음 행동을 스스로 정해 MCP 도구로 실행한다.
2. WHEN 결정 마감(무료체험 종료·정기결제, App Store는 하루 전)이 3일 안이고 열린 사건과 대기 질문이 없으면 THE Bot SHALL 결제자에게 먼저 묻는다. 결제 경로가 App Store·Google Play면 더 싼 공식 경로의 차액 문장을, 기존 요금 자격이 있으면 재가입 손익 경고(보조)를 함께 넣는다.
3. IF 같은 사람에게 같은 구독의 질문이 대기 중이면 THEN THE MCP Server SHALL 다시 보내지 않고 `duplicate_pending`을 돌려준다.
4. WHEN 점검이 끝나면 THE Bot SHALL 한 일과 기다리는 것을 `finish_patrol`로 남긴다.

### Requirement 23 (R23): 사람 결정 분리

**User Story:** 가족 구성원으로서, AI가 내 대신 동의하거나 해지를 신청하지 않기를 원한다.

#### Acceptance Criteria

1. THE MCP Server SHALL 투표·동의 철회·해지 신청 기록·사업자 확인 도구를 제공하지 않는다.
2. WHEN 사람의 결정이 필요하면 THE Bot SHALL 알맞은 사람에게 계산 문장과 선택지를 보내고 다음 점검까지 기다린다.
3. THE Bot SHALL 파일 읽기·쓰기·셸 도구를 쓸 수 없다(에이전트 권한 deny).

### Requirement 24 (R24): 거부되면 다시 계획

**User Story:** 결제자로서, 가족 중 한 명이 반대하면 봇이 그 의견을 반영한 새 안을 계산해 주기를 원한다.

#### Acceptance Criteria

1. WHEN 결제자 인계가 `consent_missing`으로 거부되면 THE Bot SHALL 미응답자에게만 다시 알린다(최근 2시간 안에 물어본 사람은 건너뛴다).
2. WHEN 인계가 `objection_present`로 거부되면 THE Bot SHALL 반대 의견을 읽고, 바뀐 조건의 손익을 계산한 뒤, 손해가 아니면 개정안(새 버전)을 내고 이전 동의가 무효라는 점을 알린다.
3. WHEN 도구가 거부 사유를 돌려주면 THE Bot SHALL 같은 행동을 그대로 반복하지 않는다.

### Requirement 25 (R25): 해지 후 재청구 추적

**User Story:** 결제자로서, 해지했는데 다른 경로(예: Google Play)로 또 결제되면 바로 알고 그 경로의 해지 방법을 받고 싶다.

#### Acceptance Criteria

1. WHEN 해지 요청 뒤 청구 문자가 들어오면 THE MCP Server SHALL 정책 관문을 거쳐 같은 사건을 `reopened`로 되돌린다.
2. WHEN 사건이 다시 열리면 THE Bot SHALL 문자에서 확인한 결제 채널의 공식 해지 경로와 환불 요청 경로를 결제자에게 보낸다. 같은 달 새 경로 청구도 있으면 이중 결제라고 알린다.
3. IF 같은 사건·채널의 경로를 이미 보냈으면 THEN THE MCP Server SHALL 다시 보내지 않는다.

### Requirement 26 (R26): 실행 영수증

**User Story:** 심사자로서, 봇이 실제로 Kiro로 실행됐다는 기록을 보고 싶다.

#### Acceptance Criteria

1. WHEN 점검이 끝나면 THE System SHALL 모델·엔진·걸린 시간·도구 호출·거부 수·훅 실행·크레딧·모델 자동 전환 여부를 `docs/evidence/bot-runs/`에 남긴다.
2. THE System SHALL 웹앱에서 기록된 실행을 "녹화 기록"으로 표시하고 실시간 실행처럼 보이게 하지 않는다.

### Requirement 27 (R27): 원문 비노출과 숫자 검증

**User Story:** 사용자로서, 내 결제 문자 원문이 모델에게 가지 않고, 봇이 숫자를 지어내지 않기를 원한다.

#### Acceptance Criteria

1. WHILE 봇이 결제 문자를 처리하는 동안 THE MCP Server SHALL 원문을 돌려주지 않고 구조화 필드와 근거 위치만 돌려준다.
2. IF 봇이 보내는 글에 도구가 계산·확인하지 않은 금액('N원')이 있으면 THEN THE MCP Server SHALL `unverified_number`로 거부한다.
