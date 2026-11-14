---
inclusion: fileMatch
fileMatchPattern: ["src/domain/consent.ts", "src/domain/policy.ts", "src/ui/Family*.tsx"]
---
# 가족 동의 규칙

- 제안(Proposal)은 `version`을 가진다. 계산 조건(H·k·가격·대안·필수 요구)이 바뀌면 version을 올리고 이전 버전의 응답은 모두 무효다.
- 응답은 `agree | object | abstain`. 응답이 없으면 `pending`. 반대가 하나라도 있으면 결제자 인계를 잠근다.
- 동의는 언제든 철회할 수 있다(`revoke`). 철회는 미응답과 같게 처리한다.
- 결제자 인계(`prepare_owner_handoff`)는 **현재 version에서 필수 구성원 전원 agree**일 때만 허용한다.
- 시뮬레이션 사례(`simulation: true`)의 응답은 실제 사례에 섞지 않는다. 화면에 "같은 기기 2역할 시뮬레이션"을 표시한다.
- 앱 안의 동의는 법적 위임이 아니다. 화면 문구에 그렇게 쓰지 않는다.
