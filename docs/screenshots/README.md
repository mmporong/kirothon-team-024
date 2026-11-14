# 배포 화면 스크린샷

## 현재 제출 화면: Kiro 테마 개편본

아래 5장이 현재 UI의 최종 브라우저 검사 대상이다. 기존 01~06 캡처는 개편 전 기록으로 보존한다. 데모는 다섯 장면으로 탐색하고 메시지·실행 근거를 펼쳐 볼 수 있다.

| 파일 | 픽셀 크기 | SHA-256 |
|---|---|---|
| [front-home-1440.png](front-home-1440.png) | 1440 x 1286 | `75645ab85efda267dbc7ef9898646652e119241a4d46a89e5e4a82d66b64a932` |
| [front-home-820.png](front-home-820.png) | 820 x 1448 | `57985f9140d0774512d0d9bb328c9fb00f3862c9084a3837c6dc2d056ba2d85a` |
| [front-home-390.png](front-home-390.png) | 390 x 1991 | `8400ae425db6c270195243e967f87bfcb97363571a987504dadc3b9535419fc6` |
| [front-channel-desktop.png](front-channel-desktop.png) | 1440 x 1000 | `5426e3435ad00985a5252a17d0d3cbcdb7b55ab8c65079a364defe7f244f4dd2` |
| [front-reflow-200.png](front-reflow-200.png) | 1440 x 3730 | `65e75d20f1fb735aba60e182ac5698bb87f8fc73afcbd1a4e24ef637044b9744` |

브라우저 검사 37개·오류 0건. 움직이는 캐릭터의 프레임 변화, 멈춤, 축소 동작 설정, 장면·가족 메시지 선택, 금액 입력 오류, 동의·철회·재청구, 키보드 조작과 세 화면 폭을 확인했다. `front-reflow-200.png`는 720 CSS px·device scale factor 2의 재배치 검사다. 실행 기록은 `../evidence/front-qa.json`이다.

## 개편 전 캡처 기록
배포 주소 <https://mmporong.github.io/kirothon-team-024/>를 **2026-11-14 16:03:00 KST에 HTTP 200**으로 확인한 뒤 Google Chrome headless로 촬영했다. 로컬 preview 서버는 사용하지 않았다.

최초 검수 시각: 2026-11-14T16:06:00+09:00. PNG 6장을 모두 열어 화면 내용을 확인했고, 작성 패스와 분리한 native verifier도 6장 모두 PASS로 검수했다. 빈 페이지, 브라우저 오류 화면, 렌더 실패 문구는 없었다. FINAL-SHOTS 재확인 시각은 아래 인계 검증 절에 기록했다.

## 파일별 URL·크기·확인 결과

크기는 PNG 헤더의 실제 픽셀 값이다. 파일 용량은 1 KiB=1,024 bytes이며, 시각은 KST(+09:00)다.

| 파일 | 촬영 URL | 픽셀 크기 | 파일 용량 | virtual-time-budget(ms) | 최종 촬영 시각 | 확인 결과 |
|---|---|---:|---:|---:|---|---|
| [01-bot-replay-all.png](01-bot-replay-all.png) | <https://mmporong.github.io/kirothon-team-024/?step=all#bot> | 1440×6000 | 1309.9 KiB | 12,000 | 2026-11-14T16:04:10+09:00 | PASS — 27/27 전체 상태, P1~P5, 마지막 청구·사건 재개방과 푸터까지 확인. 초기 높이 1900의 잘림을 수정해 재촬영. |
| [02-bot-replay-start.png](02-bot-replay-start.png) | <https://mmporong.github.io/kirothon-team-024/?step=2#bot> | 1440×1100 | 276.4 KiB | 9,000 | 2026-11-14T16:03:02+09:00 | PASS — 초기 3/27 상태와 첫 질문 확인. 요청한 1440×1100 뷰포트 유지. |
| [03-channel.png](03-channel.png) | <https://mmporong.github.io/kirothon-team-024/#channel> | 1440×1900 | 269.1 KiB | 9,000 | 2026-11-14T16:03:03+09:00 | PASS — 결제 경로 비교표, 전환 절차, 가격 근거 영역 표시. |
| [04-family.png](04-family.png) | <https://mmporong.github.io/kirothon-team-024/#family> | 1440×1900 | 103.0 KiB | 9,000 | 2026-11-14T16:03:03+09:00 | PASS — 가족 제안·응답·인계·다음 청구 버튼과 초기 상태 표시. 감사 기록이 없는 초기 화면임을 확인. |
| [05-calc.png](05-calc.png) | <https://mmporong.github.io/kirothon-team-024/#calc> | 1440×1900 | 280.2 KiB | 9,000 | 2026-11-14T16:03:04+09:00 | PASS — 손익표, 대안 비교, 계산 전제 영역 표시. 붉은 손익 안내는 의도된 화면 요소. |
| [06-kiro.png](06-kiro.png) | <https://mmporong.github.io/kirothon-team-024/#kiro> | 1440×1900 | 167.8 KiB | 9,000 | 2026-11-14T16:03:04+09:00 | PASS — 봇 구성 흐름, Kiro 활용표, 증거 파일 링크 영역 표시. |

## 촬영 조건과 재촬영

- 도구: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- 공통 옵션: `--headless=new --hide-scrollbars`
- 기본 창: `--window-size=1440,1900`, 대기 예산 `--virtual-time-budget=9000`
- 시작 화면만 요청한 `--window-size=1440,1100` 사용.
- 전체 기록은 최초 1440×1900에서 P2 아래가 잘렸다. `--window-size=1440,6000 --virtual-time-budget=12000`으로 같은 URL을 다시 촬영해 P5와 마지막 푸터까지 포함했다. 초기 파일을 최종본으로 교체했다.
- 03~06 하단의 흰 영역은 짧은 페이지의 여백이며 빈 화면 오류가 아니다. 02는 초기 화면용 1100 높이여서 아래 대화는 해당 뷰포트 밖에 있다.
- 각 촬영에 별도 Chrome 프로필을 사용해 다른 화면의 상태가 이어지지 않게 했다. 프로필·캐시·임시 파일은 이 폴더 안의 임시 경로에만 두었고 촬영 후 제거했다.
- 작업용 Chrome 프로세스 잔류 0개를 확인했다. 로컬 서버를 띄우지 않았으므로 종료할 preview PID는 없다.
- 이미지 편집이나 앱 코드 변경은 수행하지 않았다. 로그인·가입·결제·Kiro CLI·Crew 실행·Git 명령·외부 게시도 수행하지 않았다.
- 앱 안에 보이는 합성 문자, 정책 거부, 미확인 안내, 녹화된 Kiro 실행 기록은 화면 내용이며 이번 촬영 작업에서 새로 수행한 행동이 아니다.

## FINAL-SHOTS attempt1 — 캡처 버전과 인계 검증

- 재확인 시각: 2026-11-14T16:07:52+09:00.
- 캡처 세트 버전: **SHOTS-v1-0a072a04993e**. 이미지 파일 내용의 해시로 식별하는 버전이다.
- 세트 SHA-256: `0a072a04993efc296010946bf04d876d169c028b9c66cad1654e921ac1e09f35`.
- 브라우저: Google Chrome `157.0.8103.52`(설치본 Info.plist 확인).
- 원래 촬영 시각과 URL은 위 표의 값을 유지했다. 이번 인계 검증에서 PNG를 다시 저장하거나 바꾸지 않았다.
- 6개 PNG의 SHA-256이 16:06:00 검수 manifest와 모두 같았다. 따라서 앞서 파일을 열어 확인한 빈 화면·오류·잘림 검수 결과가 같은 이미지에 적용된다.
- PNG 각 청크의 CRC, 파일 끝 IEND, 실제 해상도를 검사해 6개 모두 통과했다. 01은 전체 기록·푸터까지 포함하고, 02는 요청된 시작 화면용 1100 높이를 유지한다.
- 앱 배포 커밋 SHA는 확인하지 않았다. 위 버전은 앱 커밋 번호가 아닌 캡처 세트의 식별자다.

| 보존 파일 | SHA-256 | 무결성·기존 검수본 일치 |
|---|---|---|
| [01-bot-replay-all.png](01-bot-replay-all.png) | `2ced62a2368e0c3890dfc530411f1b9aa1bbdf41cefde4604553bf480fa6838c` | PASS |
| [02-bot-replay-start.png](02-bot-replay-start.png) | `7b05fcd448da6a8bfbd97290bc77ad53547a8ca746c86c2801b8673ea64dd6d4` | PASS |
| [03-channel.png](03-channel.png) | `cf1514bcd73c46f36bb7bbd130e08f8edb061f0041f9a366e2620a23e9d36fd1` | PASS |
| [04-family.png](04-family.png) | `01dbc92f0f7ba6ed12dc71d9bb96aa0ce07e139b6f550092337292d72be44e13` | PASS |
| [05-calc.png](05-calc.png) | `1fc5841d1280baebac6aa8aa47ae294efc07a1ac68132de1126c7897245b61f2` | PASS |
| [06-kiro.png](06-kiro.png) | `f7f5646f8e53884b4ad70eff501110b748e73edad73609bec7cebd0bf7edb432` | PASS |

세트 해시는 위 파일 순서대로 `파일명 ASCII + NUL 1바이트 + 해당 파일 SHA-256 원시 32바이트`를 이어 SHA-256으로 계산했다.

### 실행한 검증과 결과

```bash
cd "$HOME/kirothon-team-024"
sips -g pixelWidth -g pixelHeight docs/screenshots/*.png
```

결과: 01은 1440×6000, 02는 1440×1100, 03~06은 1440×1900으로 모두 일치했다. Python 표준 라이브러리의 `hashlib.sha256`, `struct.unpack`, `zlib.crc32`로 같은 6개 파일의 해시·PNG 청크도 확인했다.

프로세스 목록은 `ps -axo pid=,command=`의 결과를 읽고, Chrome 실행 경로이면서 이 작업의 `docs/screenshots/.shots-runtime` 경로를 포함하는 항목만 검사했다. 결과는 0개였고 임시 폴더도 없었다. 다른 세션의 브라우저나 서버에는 종료 신호를 보내지 않았다. 이 작업은 배포 주소로 촬영했으므로 로컬 preview 서버를 시작하지 않았다.

이번 FINAL-SHOTS 인계에서 변경한 파일은 이 README뿐이다. PNG 6개를 보존했고 폴더에는 PNG 6개와 README만 남아 있다. Git·push·외부 게시·Kiro 호출은 수행하지 않았다. 실행 중인 작업용 장기 프로세스와 필수 미해결 사항은 없다.

STATUS: ready_for_review
