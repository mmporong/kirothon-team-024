# FINAL-PRICE-AUDIT — 46개 통합 원본 최종 가격 검수

작업 ID: FINAL-PRICE-AUDIT attempt1
작성 범위: 이 보고서 한 파일. 가격 원본·구현·녹화 기록은 수정하지 않았다.

## 최종 판정

**TVING 4개 등급은 한국 공개 기본 월간 가격 비교에 사용할 수 있다.** 양쪽 공식 원문에서 등급명·월간·KRW·VAT 포함을 연결했다. 공개 정가의 차이와 사용자에게 실제 적용될 절감액은 구분한다. 기존 할인·유지 요금·프로모션·계정 자격·가입 시점의 최종 금액은 별도 확인 대상이다.

**YouTube iOS 개인/Lite, Genie 30일, Watcha iOS는 기본 월간 절감 계산 보류가 필요하다.** 총괄이 보류 처리할 예정이라는 지시를 받았으며, 이 문서는 수정 완료를 주장하지 않는다. Wavve·Millie·Notion은 표시값 관측과 산술은 맞지만 세금 또는 동일 조건 확인이 남아 있다.

- `verified`는 공식 출처에 표시된 값의 확인을 뜻한다. 같은 조건의 최종 결제액 비교 가능성까지 보장하지 않는다.
- 아래 전수 표는 값이 있는 모든 채널 쌍을 포함한다. 가격이 다른 쌍뿐 아니라 같은 값의 대조도 포함한다.
- 판단 등급: **critical** = 월간/상품 대응이 불명확하거나 확인되지 않은 조건이 절감 확정으로 넘어가는 문제. **medium** = 표시가 비교는 가능하지만 세금·대상 조건·문서 보정이 남은 경우. **PASS** = 명시한 범위의 근거와 산술을 충족.
- 최종 범위 고정 지시에 따라 확장검색을 종료했다. 아래 공식 공개 원문과 기존에 수행한 검수 결과만 종합했다.

- 최종 기록: 2026-11-14T16:20:53+09:00
- 앱 generated_at: 2026-11-14T16:10:37.650+09:00

## 범위와 시점

1. 최신 PRICE-A 35개와 PRICE-B 11개를 합친 앱 46개를 기준으로 고정했다. 가격·상태·통화·URL·확인 시각·evidence·note·plan 식별자는 원본과 대조했다. 앱이 부여한 `researcher` 메타데이터 차이는 가격 차이로 보지 않았다.
2. 서로 다른 금액의 후보는 **13개 요금제·17개 채널 쌍**이다. 15개는 `monthly`, 2개는 `annual`이다. 별도로 동가 7쌍(월 5·연 2)을 대조했다. 한 요금제에 채널 쌍이 여러 개 있어 요금제 수와 쌍 수는 다르다.
3. `verified`이고 해당 기간 값이 양의 안전한 정수인 두 채널을 후보로 삼았다. 모든 실제 후보의 통화는 KRW다. `unknown`·`reported`·`not_offered` 및 null은 비교 대상에서 제외했다.
4. 예전 29개 앱 스냅샷은 2026-11-14 15:45:23.272 KST의 녹화 기준이다. 그때의 해시 `20a2c4ca3c0d96228b4dbb32910b6e864b5f3b5a950251a1a82679f10903e4e2`는 역사적 기록으로만 남긴다. 현재 데이터의 누락으로 취급하거나 녹화 당시 결과를 46개로 고쳐 쓰지 않는다.

## 입력과 구현 해시

아래 SHA-256은 Git SHA가 아닌 파일 내용 해시다. Git 명령은 실행하지 않았다. 가격 원본 5개와 계산 함수 1개는 감사 기준으로 고정했다. 병행 개선 중인 UI와 봇 파일은 관측 시점의 해시이며 수정 완료를 승인하는 기준으로 사용하지 않는다.

| 파일 | SHA-256 | bytes |
|---|---|---:|
| `/Users/lim/kirothon-team-024/src/data/channel_prices.json` | `5ddc18d0f492b365fb9864c154f08a13bbaea3d76fe88d6c6f2d603e4367f7af` | 75075 |
| `/Users/lim/hackathon-specialist/reports/kirothon-2026/research/L1/channel-prices-A.json` | `df896fc9b3feb9602d4ddfdb3f644340550b5f269bfd873490e4975c740caff8` | 56741 |
| `/Users/lim/hackathon-specialist/reports/kirothon-2026/research/L1/channel-prices-A.md` | `f0af0d685439009f7bd7bbf456dace353272d98091398724698230ff8d45833f` | 29497 |
| `/Users/lim/hackathon-specialist/reports/kirothon-2026/research/L1/channel-prices-B.json` | `2f81ff44ccc344e58ca28eca88a2318b8d669a9e0bffe6f22aab482314acea80` | 16455 |
| `/Users/lim/hackathon-specialist/reports/kirothon-2026/research/L1/channel-prices-B.md` | `42d79c446055009b699ddc881ae983268ac0baf24e6c56bb1686524c4c0a52bb` | 19464 |
| `/Users/lim/kirothon-team-024/src/domain/channelPrice.ts` | `d92b015e2cf9a89697868fdc34d3f601c5f49e0e3ee5ed0c30aa622feb5bb55b` | 7319 |
| `/Users/lim/kirothon-team-024/src/ui/ChannelCheck.tsx` | `a4ff1b710a7b48cd72b6dd27d0a67483b6703239129b44f85a750e07e5781642` | 6832 |
| `/Users/lim/kirothon-team-024/src/bot/tools.ts` | `654e5fe513e6b74f4d50347bc6ff86124d7df5f49479f1f7478bbfd054a2df30` | 40936 |

## 13개 요금제: 조건별 최종 판정

모든 행의 통화는 KRW이며 한국 공개 페이지/스토어를 대상으로 했다. △는 계정 최종 적용 또는 추가 대응 근거가 남았다는 뜻이다.

| 요금제 | 같은 상품/등급 | 기간 대응 | 세금 | 신규·기존/지역·자격 | 표시 목록 / 절감 조건 판정 | 위치 |
|---|---|---|---|---|---|---|
| 유튜브 프리미엄 / 개인 | iOS 개인/SKU △ | iOS 월간 미확인 | 웹 포함 / iOS·GP △ | 한국 공개 목록 / 계정 △ | 표시값 관측 / critical C01 | app /services/0 (L6); A /services/0 (L7) |
| 유튜브 프리미엄 / 라이트 | iOS 개인/SKU △ | iOS 월간 미확인 | 웹 포함 / iOS·GP △ | 한국 공개 목록 / 계정 △ | 표시값 관측 / critical C01 | app /services/1 (L49); A /services/1 (L49) |
| 티빙 / 광고형 스탠다드 | 네 등급 이름 대응 | 웹 월간 / iOS 1개월 | 양쪽 VAT 포함 | 한국 공개 기본가 / 개인 기존가 △ | 기본 비교 PASS / 개인 조건 medium | app /services/6 (L264); A /services/6 (L259) |
| 티빙 / 베이직 | 네 등급 이름 대응 | 웹 월간 / iOS 1개월 | 양쪽 VAT 포함 | 한국 공개 기본가 / 개인 기존가 △ | 기본 비교 PASS / 개인 조건 medium | app /services/7 (L307); A /services/7 (L301) |
| 티빙 / 스탠다드 | 네 등급 이름 대응 | 웹 월간 / iOS 1개월 | 양쪽 VAT 포함 | 한국 공개 기본가 / 개인 기존가 △ | 기본 비교 PASS / 개인 조건 medium | app /services/8 (L350); A /services/8 (L343) |
| 티빙 / 프리미엄 | 네 등급 이름 대응 | 웹 월간 / iOS 1개월 | 양쪽 VAT 포함 | 한국 공개 기본가 / 개인 기존가 △ | 기본 비교 PASS / 개인 조건 medium | app /services/9 (L393); A /services/9 (L385) |
| 웨이브 / 베이직 | 등급명 대응 / 권리 △ | 웹 1개월 / iOS 1개월 | iOS 포함 / 웹 △ | 한국 공개 목록 / 기존·프로모션 △ | 표시값 관측 / medium | app /services/11 (L479); A /services/11 (L469) |
| 웨이브 / 스탠다드 | 등급명 대응 / 권리 △ | 웹 1개월 / iOS 1개월 | iOS 포함 / 웹 △ | 한국 공개 목록 / 기존·프로모션 △ | 표시값 관측 / medium | app /services/12 (L522); A /services/12 (L511) |
| 웨이브 / 프리미엄 | 등급명 대응 / 권리 △ | 웹 1개월 / iOS 1개월 | iOS 포함 / 웹 △ | 한국 공개 목록 / 기존·프로모션 △ | 표시값 관측 / medium | app /services/13 (L565); A /services/13 (L553) |
| 지니 / 음악감상 30일(기기제한 없음) | 음악감상 / 전기기 권리 △ | 30일끼리 대응; monthly 부적합 | A 웹 포함 기록 / 재현·iOS △ | 한국 공개 목록 / 갱신·대상 △ | 30일 표시값 / 월간 critical C02 | app /services/19 (L823); A /services/19 (L805) |
| 왓챠 / 베이직 구독권 | 베이직 명칭 대응 | iOS 기간 미확인 | 양쪽 연결 미완결 | 판매중단 SKU 제외 / 계정 △ | 표시값 관측 / critical C03 | app /services/31 (L1339); A /services/31 (L1309) |
| 밀리의서재 / 전자책 정기구독 | 같은 전자책 정기구독 | 월·연 각각 명시 | 양쪽 △ | 한국 공개 목록 / 개인 조건 △ | 표시값 관측 / medium | app /services/33 (L1425); A /services/33 (L1393) |
| Notion / Plus 1좌석 | Plus 1좌석; Business 제외 | 월·연 각각 명시 | 웹 포함 여부 △ / 한국 VAT 안내 있음 | 모바일 Free·1명·workspace 자격 | 표시값 관측 / medium | app /services/40 (L1726); B /services/5 (L217) |

## 서로 다른 가격 17쌍 전수 산술

월 필드의 차이와 실제 연간 SKU의 차이를 분리한다. C01–C03의 monthly 필드는 감사 대상 입력 명칭이며 기간 검증을 통과했다는 뜻이 아니다. 12회 환산은 연간 SKU가 아니다.

| 앱 위치 / 원본 위치 | 기간 | 채널 A / 원 | 채널 B / 원 | 절대 차이 | 월 필드 차이×12 | 판정 |
|---|---|---:|---:|---:|---:|---|
| `/services/0/prices/0/monthly` ↔ `/services/0/prices/1/monthly`; A services/0 | monthly | web / 14,900 | app_store / 19,500 | 4,600 | 55,200 | critical C01 |
| `/services/0/prices/1/monthly` ↔ `/services/0/prices/2/monthly`; A services/0 | monthly | app_store / 19,500 | google_play / 14,900 | 4,600 | 55,200 | critical C01 |
| `/services/1/prices/0/monthly` ↔ `/services/1/prices/1/monthly`; A services/1 | monthly | web / 8,500 | app_store / 10,900 | 2,400 | 28,800 | critical C01 |
| `/services/1/prices/1/monthly` ↔ `/services/1/prices/2/monthly`; A services/1 | monthly | app_store / 10,900 | google_play / 8,500 | 2,400 | 28,800 | critical C01 |
| `/services/6/prices/0/monthly` ↔ `/services/6/prices/1/monthly`; A services/6 | monthly | web / 5,500 | app_store / 6,300 | 800 | 9,600 | 기본 비교 PASS |
| `/services/7/prices/0/monthly` ↔ `/services/7/prices/1/monthly`; A services/7 | monthly | web / 9,500 | app_store / 10,900 | 1,400 | 16,800 | 기본 비교 PASS |
| `/services/8/prices/0/monthly` ↔ `/services/8/prices/1/monthly`; A services/8 | monthly | web / 13,500 | app_store / 15,500 | 2,000 | 24,000 | 기본 비교 PASS |
| `/services/9/prices/0/monthly` ↔ `/services/9/prices/1/monthly`; A services/9 | monthly | web / 17,000 | app_store / 19,500 | 2,500 | 30,000 | 기본 비교 PASS |
| `/services/11/prices/0/monthly` ↔ `/services/11/prices/1/monthly`; A services/11 | monthly | web / 7,900 | app_store / 9,000 | 1,100 | 13,200 | medium |
| `/services/12/prices/0/monthly` ↔ `/services/12/prices/1/monthly`; A services/12 | monthly | web / 10,900 | app_store / 12,500 | 1,600 | 19,200 | medium |
| `/services/13/prices/0/monthly` ↔ `/services/13/prices/1/monthly`; A services/13 | monthly | web / 13,900 | app_store / 16,000 | 2,100 | 25,200 | medium |
| `/services/19/prices/0/monthly` ↔ `/services/19/prices/1/monthly`; A services/19 | monthly | web / 9,240 | app_store / 9,900 | 660 | 7,920 (360일/12회) | critical C02 |
| `/services/31/prices/0/monthly` ↔ `/services/31/prices/1/monthly`; A services/31 | monthly | web / 7,900 | app_store / 9,500 | 1,600 | 19,200 | critical C03 |
| `/services/33/prices/0/monthly` ↔ `/services/33/prices/1/monthly`; A services/33 | monthly | web / 11,900 | app_store / 14,900 | 3,000 | 36,000 | medium |
| `/services/33/prices/0/annual` ↔ `/services/33/prices/1/annual`; A services/33 | annual | web / 119,000 | app_store / 149,000 | 30,000 | 해당 없음 | medium |
| `/services/40/prices/0/monthly` ↔ `/services/40/prices/1/monthly`; B services/5 | monthly | web / 16,800 | app_store / 17,000 | 200 | 2,400 | medium |
| `/services/40/prices/0/annual` ↔ `/services/40/prices/1/annual`; B services/5 | annual | web / 168,000 | app_store / 179,000 | 11,000 | 해당 없음 | medium |

Millie의 월간 12회 표시 차이는 36,000원, 실제 연간 상품끼리의 차이는 30,000원이다. Notion은 각각 2,400원과 11,000원이다. UI의 기존 12개월 환산 안내를 유지하면서 이 두 개념을 섞지 않아야 한다.


## 동가 7쌍 대조

차이가 없다는 산술과 동일한 최종 청구 조건의 확정은 별개다.

| 요금제 / 위치 | 기간 | 채널 | 각 표시값 / 원 | 산술 차이 | 판정 |
|---|---|---|---:|---:|---|
| 유튜브 프리미엄 / 개인 / services/0 prices/0↔2 | monthly | web ↔ google_play | 14,900 | 0 | 공식 웹/Android 월 정가 동가; 개별 GP 조건 medium |
| 유튜브 프리미엄 / 라이트 / services/1 prices/0↔2 | monthly | web ↔ google_play | 8,500 | 0 | 공식 웹/Android 월 정가 동가; 개별 GP 조건 medium |
| 디즈니+ / 스탠다드 / services/3 prices/0↔1 | monthly | web ↔ app_store | 11,500 | 0 | critical C04: iOS 기간·대상·VAT 미완결 |
| 디즈니+ / 스탠다드 / services/3 prices/0↔1 | annual | web ↔ app_store | 115,000 | 0 | critical C04: iOS 기간·대상·VAT 미완결 |
| 디즈니+ / 프리미엄 / services/4 prices/0↔1 | monthly | web ↔ app_store | 16,500 | 0 | critical C04: iOS 기간·대상·VAT 미완결 |
| 디즈니+ / 프리미엄 / services/4 prices/0↔1 | annual | web ↔ app_store | 165,000 | 0 | critical C04: iOS 기간·대상·VAT 미완결 |
| 유튜브 뮤직 / Music Premium 개인 / services/18 prices/0↔2 | monthly | web ↔ google_play | 11,990 | 0 | 공식 웹/Android 월 정가 동가; 개별 GP 조건 medium |

## TVING: 기본 비교에 사용할 공식 근거

공식 페이지와 App Store를 공개 GET으로 확인했다. 웹과 iOS 재조회 성공 시각은 각각 **2026-11-14 16:16:21 / 16:16:22 KST**다. 기존 연구자의 같은 원문 재검수도 16:11:37 KST에 회수했다.

| 확인 항목 | 웹 공식 원문 | 한국 App Store 원문 | 판정 |
|---|---|---|---|
| 등급 / 가격 | 광고형 스탠다드 5,500 / 베이직 9,500 / 스탠다드 13,500 / 프리미엄 17,000 | 같은 네 등급에 iOS 표시, 6,300 / 10,900 / 15,500 / 19,500 | 네 등급끼리 대응 |
| 청구 기간 | 웹 JSON-LD가 월간 이용권과 가격을 연결 | App Store 결제 1개월 단위, 매월 구매일 자동결제 설명 | 달력상 월간끼리 비교 |
| 통화·지역 | 한국 공식 요금제의 원화 정가 | `/kr/` 스토어의 원화 IAP 목록 | KRW / 한국 공개 목록 |
| 세금 | “결제 금액에는 부가가치세(VAT)가 모두 포함되어 있습니다.” | “티빙의 모든 이용권 가격은 부가세(VAT)가 포함된 가격입니다.” | 양쪽 VAT 포함 |
| 적용 대상 | 공개 기본 가격 | 공개 iOS 기본 가격 목록 | 기본 비교 승인. 개별 계정의 할인·기존 유지가 적용은 미확인 |

웹 가격·월간 설명은 [TVING 공식 요금제](https://www.tving.com/bill/subscription/plan), iOS 등급·가격·월 청구·VAT 설명은 [한국 App Store TVING](https://apps.apple.com/kr/app/tving/id400101401?platform=ipad)에 있다. App Store의 옛 “티빙 무제한” 8,900원·“무제한 플러스” 14,000원, 포인트 상품은 이번 네 등급과 섞지 않았다.

웹 원문에는 같은 가구 구성원 이용과 결제 방식에 따른 포인트 적립 차이도 있다. 기본 비교는 구독료 정가만 비교하며, 포인트 가치를 차감하거나 이용 권리·가족 자격의 동등함을 새로 보장하지 않는다.

PRICE-A 문서 89–92행의 “웹 VAT 미확인” 설명은 위 현행 원문과 다르다. **숫자 정정은 필요 없고 VAT 근거 문서 보완을 권고한다.** 해당 원본은 총괄 소유이므로 이 검수에서는 수정하지 않았다.


## critical: 계산 보류와 소비 코드 쟁점

### C01. YouTube 개인 / Lite: iOS의 월간 SKU 대응이 완결되지 않음

앱 `/services/0`·`/services/1` 및 A의 같은 위치다. [YouTube 공식 한국 블로그](https://blog.youtube/intl/ko-kr/news-and-events/yt-premium-lite-kr/)는 웹/Android 월 정가를 명시한다. [한국 App Store](https://apps.apple.com/kr/app/youtube/id544007664)는 “YouTube Premium ￦19,500”, “Premium Lite ￦10,900”을 보여 준다. 그러나 해당 공개 목록에는 월간 기간, 개인/기존/신규 대상, 세금, 상품 ID를 연결하는 정보가 충분하지 않다. 브랜드명과 숫자만으로 월간 개인 SKU를 확정하지 않는다.

웹 14,900·8,500원의 월간/VAT 표시는 A 원문의 `ytInitialData` 확인 기록과 일치한다. Android 월 가격도 공식 블로그로 확인되며, [공식 청구 도움말](https://support.google.com/youtube/answer/7548835?co=GENIE.Platform%3DiOS&hl=ko)은 신규 Android 구독의 Google Play 청구를 설명한다. 따라서 Android 월 정가의 공식 근거 자체가 없다는 뜻은 아니다. 다만 모든 기존 Android 가입·제휴 결제까지 동일한 Google Play SKU·VAT·자격을 보장하는 근거로 확대하지 않는다.

**판정:** iOS를 포함하는 4쌍은 critical. 4,600·2,400원의 산술 차이는 맞지만 기본 월간 절감 추천은 보류한다. 웹↔Android 동가 2쌍은 공식 공개 정가 관측으로 유지하되 strict한 개별 청구 비교는 medium 조건부다. 총괄의 보류 예정 항목이다.

### C02. Genie: 30일을 월간으로 사용하고 12회 금액을 12개월로 보여 줌

앱 `/services/19`, A `/services/19`. [공식 음악감상 상품](https://pay.genie.co.kr/product/f_Product_Sub/monthly?apvn=0)은 음악감상·30일·전기기 정상가 9,240원을 연결한다. [한국 App Store 지니뮤직](https://apps.apple.com/kr/app/%EC%A7%80%EB%8B%88%EB%AE%A4%EC%A7%81-genie/id858266085)은 음악감상 30일 9,900원을 표시한다. 둘의 표시 차이 660원은 **30일당**이다. 12회는 360일이다.

A 문서도 `monthly`가 이 경우 30일권이라는 점을 밝히지만 소비 함수는 기간을 읽지 않는다. A의 웹 VAT 포함 기록은 이번 상품 페이지 재GET에서 같은 문구를 재현하지 못했고, iOS VAT·자동 갱신·전기기 권리 대응도 추가 근거가 필요하다.

**판정:** 달력상 월간 비교·연 7,920원 주장에는 critical. 30일 관측값은 보존하고 월간 절감 계산에서 보류한다. “12회 차이 7,920원”과 “12개월 차이”는 구분한다. 총괄의 보류 예정 항목이다.

### C03. Watcha 베이직: 9,500원 iOS 상품의 기간이 공개 목록에 없음

앱 `/services/31`, A `/services/31`. [공식 FAQ 공개 API](https://help.watcha.com/api/v2/help_center/ko/articles/12820787376409.json)는 2026-09-18 갱신 문서에서 베이직 1개월 7,900원을 확인한다. [한국 App Store](https://apps.apple.com/kr/app/watcha/id1096493180)의 베이직 9,500원에는 월·연 기간이 표시되지 않는다. 판매중단 7,900·13,000원 항목을 제외한 것은 적절하지만, 그 사실만으로 남은 상품의 월간 대응이 확정되지는 않는다.

**판정:** 1,600원/월·19,200원/12개월 기본 비교는 critical. iOS 관측값을 보존하되 기간/SKU 근거 확보 전 비교 계산에서 보류한다. 총괄의 보류 예정 항목이다.

### C04. Disney 동가 대조: 웹 금액을 이용한 iOS 월·연 추정

앱 `/services/3`·`/services/4`. [공식 가격 변경 공지](https://www.disney.co.kr/notice/update-20261030)는 2026-11-10 이후 신규 및 유효 구독이 없는 재가입자의 월·연 정가를 명시한다. [한국 App Store](https://apps.apple.com/kr/app/disney/id1446075923)는 상품명·금액이 중복되는 목록을 보여 주지만 해당 항목의 기간·VAT·대상 계정·SKU ID는 연결하지 않는다.

**판정:** 이번 4쌍의 차이 0원은 산술상 맞다. 그러나 “두 결제 경로의 월·연 최종 가격이 동일하다”는 확정은 critical 근거 공백이다. 새 가격을 기존 유지가 가입자에게 적용하지 말고 iOS 기간 대응을 보류하거나 조건부 관측으로 내려야 한다. 잘못된 숫자가 입증됐다는 의미는 아니다.

### C05. verified 표시값을 절감 가능 조건으로 취급하는 공통 게이트

검수 당시 `src/domain/channelPrice.ts:62`의 `usable`은 verified·양의 안전한 정수인 monthly만 검사한다. `compareChannels` 68–85행은 통화·세금·기간·계정·이용권 권리·대상 SKU 조건을 확인하지 않고 `cheaper_available`을 반환한다. `listDifferences` 89–99행도 같은 조건을 쓴다. 추가 검증에 필요한 필드는 `ChannelPrice` 10–20행에 구조화돼 있지 않다.

실제 TypeScript 모듈을 메모리에서 실행한 결과, 감사 기준 원본의 13개 요금제가 모두 `cheaper_available`, `reasons: []`를 반환했다. YouTube 개인은 4,600 / 55,200, Genie는 660 / 7,920, Watcha는 1,600 / 19,200, Notion은 200 / 2,400이었다. 각 숫자는 월 필드 차이와 12배라는 코드 계산을 재현한 값이며 최종 절감 승인 수치가 아니다.

`src/ui/ChannelCheck.tsx:67`에는 표시가격 차이가 실제 절감액이나 연간권 가격이 아니라는 안내가 있고, 131행에 월 차액×12 및 요금제·지역·세금 변동 설명이 있다. 병행 UI 개선본의 이 설명을 확인했으며 이를 누락으로 지적하지 않는다. **차액 의미와 비교 자격을 계산 전에 구분하는 게이트는 여전히 별도 문제다.** 통화 불일치가 현재 후보에서 발생한 것은 아니지만, 함수가 통화를 검사하지 않는 점은 향후 입력 방어의 공백이다.

**권고:** price_observed와 comparable_for_savings에 해당하는 판정을 분리하고, 보류 사유를 숫자와 함께 전달한다. 명확한 TVING 공개 기본 비교는 사용하되 사용자 청구액과의 비교에는 실제 기간·세금·요금제·대상 조건을 확인한다. 본 작업은 구현을 수정하지 않았다.


## medium: 표시값은 확인됐으나 최종 총액 조건이 남음

| 항목 | 확인된 것 | 남은 조건 / 권고 |
|---|---|---|
| Wavve 베이직·스탠다드·프리미엄 | 공식 웹 API의 1개월 상품 7,900·10,900·13,900원. iOS 같은 등급 9,000·12,500·16,000원. iOS 설명에 1개월 청구·VAT 포함 | 웹 API에서 VAT 명시를 확인하지 못함. iOS 등급별 기기/화질/동시시청 권리와 기존가 자격까지 같은 상품인지 연결 필요. 표시 차이로만 제시 |
| Millie 전자책 월 / 연 | 웹 `product_amount` 11,900 / 119,000. iOS는 월 정기구독 14,900 / 연 정기구독 149,000으로 기간·상품명 명시 | 양쪽 VAT 포함 범위 미확인. 실제 연간 SKU 차이와 월간 12회 차이를 분리. 웹 `product_display_amount` 142,800은 판매가가 아님 |
| Notion Plus 1좌석 월 / 연 | 공식 HTML current KRW 객체의 plus/month/year 16,800 / 168,000, iOS 월간/연간 Plus 17,000 / 179,000 재현 | 웹 표시가 VAT 포함 여부 미확인. 한국 소비자 VAT 부과와 사업자 조건 차이는 공식 도움말에 있음. 월 200·연 11,000을 최종 절감액으로 확정하지 않음 |
| YouTube 웹↔Android 공개 정가 | 공식 블로그에 웹/Android 월 가격, 공식 도움말에 신규 Android Google Play 청구 | 구형·제휴·세금·SKU 조건을 모든 기존 계정으로 일반화하지 않음 |
| TVING 개인별 적용 | 기본 월간·등급·KRW·VAT는 PASS | 기존 할인·유지 요금·실제 가입 가능 조건은 개별 확인. 이 조건은 공개 정가 기본 비교를 막는 사유로 쓰지 않음 |
| PRICE-A VAT 설명 | TVING 웹 원문에서 VAT 포함 확인 | A MD 89–92행의 미확인 설명을 공식 근거로 갱신 권고. 원본은 총괄 소유 |

Notion의 current 객체는 이번 세션에서 공개 GET 200으로 재현했다. `external_id=plus_monthly_krw`·`product=plus`·`billing_interval=month`·`currency=KRW`·`unit_amount=16800`, 그리고 `plus_yearly_krw_202407`·year·168000이 함께 있다. 연간 월 환산 14,000원을 월 결제 정가로 대입하지 않았다. [공식 가격](https://www.notion.com/ko/pricing), [한국 App Store](https://apps.apple.com/kr/app/id1232780281).

[Notion 한국 세금 안내](https://www.notion.com/ko/help/sales-tax)의 대한민국 절은 한국 소비자 VAT와 유효한 사업자등록번호를 가진 비즈니스의 후속 청구 예외를 설명한다. 이 설명만으로 표시가에 이미 VAT가 포함됐는지를 결정할 수 없다. [모바일 업그레이드 안내](https://www.notion.com/help/upgrade-or-downgrade-your-plan)는 모바일 Plus의 워크스페이스 구성원을 1명으로 제한하고 모든 워크스페이스에서 이용할 수 있는 것은 아니라고 한다. 이번 `plus_single_seat` 범위 밖의 팀 요금제·Business·AI 사용량 상품을 섞지 않는다.

Wavve 근거: [공식 API](https://apis.wavve.com/passes/v1/service/wavve/pc), [한국 App Store](https://apps.apple.com/kr/app/wavve-%EC%9B%A8%EC%9D%B4%EB%B8%8C/id987782077). Millie 근거: [공식 상품 API](https://apis.millie.co.kr/v2/product/), [한국 App Store](https://apps.apple.com/kr/app/millie/id1213788923). 해당 검수 결과의 회수 시각은 2026-11-14 16:10:06 KST다.


## AI 앱과 비교 제외 대조

| 앱 / 통합 위치 | 원본의 처리 | 판정 |
|---|---|---|
| ChatGPT Plus `/services/35` | 세 채널 unknown/null. iOS 29,000·299,000의 월·연 대응 보류 | PASS: 월/연 추정·USD 환산으로 차이를 만들지 않음 |
| Claude Pro `/services/36` | iOS 월 33,000 / 연 349,000만 verified. 웹 USD 정가는 KRW null, GP unknown | PASS: 같은 기간의 다른 KRW 경로가 없어 비교 제외 |
| Duolingo Super `/services/37` | 기간 불명 목록은 unknown. Family·Max와 구분 | PASS: 다른 권리 상품을 교차 비교하지 않음 |
| Google AI Pro 5TB `/services/38` | 세 경로 unknown/null. 과거 AI Premium 2TB와 분리 | PASS: 용량·시점·월/연 추정으로 차이를 만들지 않음 |
| Microsoft 365 Personal `/services/39` | 웹 월 12,500 / 연 125,000만 verified. iOS는 기간 불명으로 null | PASS: 같은 숫자가 보인다고 같은 기간으로 추정하지 않음 |
| Notion Plus 1좌석 `/services/40` | 웹·iOS 월/연의 같은 기간 숫자가 있어 후보에 포함 | 표시값 비교 가능 / 최종 총액은 medium |
| 배민 `/services/43` / 카카오 GP `/services/45/prices/2` | reported | PASS: 보도값을 verified로 승격해 비교하지 않음 |

최신 통합본은 배민 `edition2_new`와 카카오 `individual_current_web_sale` 식별자를 보존한다. 예전 29개 스냅샷의 축약 plan 이름 문제를 최신 파일의 현행 결함으로 반복하지 않는다.

실제 함수 실행에서 ChatGPT·Claude·Google AI Pro·Microsoft 365·Duolingo의 iOS 기준 비교는 모두 `not_comparable`였다. Claude는 `no_verified_alternative`, 나머지는 `current_price_unknown`이었다. 단일 채널 값의 존재와 결제 경로 간 가격차는 구분한다.


## 전체 46개 스코프 대조

열의 verified 수는 채널 수다. 후보 수는 월·연 기간별 모든 채널 쌍 수이며 동가를 포함한다. 후보 0은 가격이 0원이라는 뜻이 아니다.

| 앱 / 원본 | 서비스 / 요금제 | verified 채널 | 후보 쌍 | 처리 |
|---|---|---:|---:|---|
| services/0 / A services/0 | youtube_premium_kr / individual | 3 | 3 | 전수 표에 수록 |
| services/1 / A services/1 | youtube_premium_kr / lite | 3 | 3 | 전수 표에 수록 |
| services/2 / A services/2 | youtube_premium_kr / family | 0 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/3 / A services/3 | disney_plus_kr / standard | 2 | 2 | 전수 표에 수록 |
| services/4 / A services/4 | disney_plus_kr / premium | 2 | 2 | 전수 표에 수록 |
| services/5 / A services/5 | disney_plus_kr / ad_standard | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/6 / A services/6 | tving_kr / ad_standard | 2 | 1 | 전수 표에 수록 |
| services/7 / A services/7 | tving_kr / basic | 2 | 1 | 전수 표에 수록 |
| services/8 / A services/8 | tving_kr / standard | 2 | 1 | 전수 표에 수록 |
| services/9 / A services/9 | tving_kr / premium | 2 | 1 | 전수 표에 수록 |
| services/10 / A services/10 | wavve_kr / ad_standard | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/11 / A services/11 | wavve_kr / basic | 2 | 1 | 전수 표에 수록 |
| services/12 / A services/12 | wavve_kr / standard | 2 | 1 | 전수 표에 수록 |
| services/13 / A services/13 | wavve_kr / premium | 2 | 1 | 전수 표에 수록 |
| services/14 / A services/14 | melon_kr / streaming_club | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/15 / A services/15 | melon_kr / streaming_plus | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/16 / A services/16 | melon_kr / i_streaming_ticket_30d | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/17 / A services/17 | melon_kr / i_streaming_plus_ticket_30d | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/18 / A services/18 | youtube_music_premium_kr / individual | 2 | 1 | 전수 표에 수록 |
| services/19 / A services/19 | genie_kr / unlimited_streaming | 2 | 1 | 전수 표에 수록 |
| services/20 / A services/20 | flo_kr / mobile_unlimited_streaming | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/21 / A services/21 | spotify_kr / individual | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/22 / A services/22 | spotify_kr / basic | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/23 / A services/23 | spotify_kr / student | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/24 / A services/24 | spotify_kr / duo | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/25 / A services/25 | netflix_kr / ad_standard | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/26 / A services/26 | netflix_kr / standard | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/27 / A services/27 | netflix_kr / premium | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/28 / A services/28 | coupang_play_kr / basic_content | 0 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/29 / A services/29 | coupang_play_kr / sports_pass_wow | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/30 / A services/30 | coupang_play_kr / sports_pass_regular | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/31 / A services/31 | watcha_kr / basic | 2 | 1 | 전수 표에 수록 |
| services/32 / A services/32 | watcha_kr / premium | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/33 / A services/33 | millie_kr / ebook_subscription | 2 | 2 | 전수 표에 수록 |
| services/34 / A services/34 | ridi_select_kr / subscription | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/35 / B services/0 | chatgpt_plus / plus_individual | 0 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/36 / B services/1 | claude_pro / pro_individual | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/37 / B services/2 | duolingo_super / super_individual | 0 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/38 / B services/3 | google_one_ai_pro / ai_pro_5tb | 0 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/39 / B services/4 | microsoft_365_personal / personal | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/40 / B services/5 | notion_plus / plus_single_seat | 2 | 2 | 전수 표에 수록 |
| services/41 / B services/6 | naver_plus_membership / individual | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/42 / B services/7 | coupang_wow / individual | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/43 / B services/8 | baemin_club / edition2_new | 0 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/44 / B services/9 | kurly_membership / individual | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |
| services/45 / B services/10 | kakao_emoticon_plus / individual_current_web_sale | 1 | 0 | 같은 기간에 두 번째 verified 값 없음 |

138개 채널 상태: not_offered 9, reported 2, unknown 69, verified 58.


## 총괄 반영 권고와 미해결

| 우선순위 | 소유자에게 반환할 조치 | 현재 상태 |
|---|---|---|
| P0 | YouTube iOS 개인/Lite·Genie 30일·Watcha iOS를 기본 월간 비교에서 보류 | 총괄이 처리 예정이라고 알림. 본 감사는 미수정 |
| P0 | verified 표시값과 절감 비교 자격을 분리. note의 기간·세금·대상 제한이 숫자 계산을 통제하게 함 | 구현 담당 반환 |
| P1 | TVING 네 등급의 공식 월간/KRW/VAT 근거를 기본 비교·문서에 사용 | 본 감사에서 기본 비교 PASS |
| P1 | Disney iOS 월/연 동가 확정과 기존 유지가 적용을 보류 | 공식 기간/SKU·대상 조건 미해결 |
| P1 | Wavve 웹 VAT/권리, Millie VAT, Notion 세금 포함·대상 조건 확보 전 최종 절감 문구 보류 | 추가 근거 미확보. 확장검색 종료 |
| P2 | TVING A 문서의 VAT 미확인 문구 보완. 월 12회 환산과 연간 상품 가격의 별도 표시 유지 | 원본·UI 소유자에게 권고만 반환 |

로그인·결제 화면·개인 계정 청구서는 확인하지 않았다. 이 제약 때문에 실제 계정의 기존 유지 요금·프로모션·국가·세금·가입 가능성까지 검증했다고 주장하지 않는다. 공개 원문의 비노출은 미판매나 세금 별도를 뜻하지 않는다. 공개 목록을 관측한 사실과 비교를 보류한 판정은 동시에 보존한다.

## 검증 결과와 재현

- 원본 통합: A 35 + B 11 = 46개, 중복 key 없음. researcher 메타데이터 외 서비스/가격 내용 일치.
- 전수 산술: 서로 다른 17쌍 + 동가 7쌍 = 24쌍. 다른 가격 후보는 13개 요금제. 모든 후보 KRW, 양의 안전한 정수.
- 실행 검증: 실제 `channelPrice.ts`와 로컬 의존 모듈을 Node의 타입 제거·VM 모듈로 메모리에서 실행. 46개 요금제·13개 차이 요금제·AI 제외 대조 5개 PASS.
- 외부 근거: 기존 검수 결과를 회수하고 공개 원문 GET으로 TVING 웹/iOS, YouTube 한국 블로그, Notion 웹/iOS를 재확인. Notion 세금/모바일 조건은 공식 도움말로 확인.
- 구현·데이터 쓰기, Git, Kiro 호출, 로그인·가입·결제·외부 게시, 브라우저 포커스 변경 없음. 장기 실행 프로세스 없음.
- 작성 후 별도 검증 패스에서 표의 커버리지·입력 해시·필수 절·금지 표현·최종 상태를 확인한다. 독립 검수자의 승인이라고 과장하지 않는다.

아래 명령은 파일을 생성하지 않는다. Node 컴파일 캐시를 끄고 실제 함수 실행을 재현한다.


```sh
cd "$HOME/kirothon-team-024"
python3 -B - <<'PY'
from pathlib import Path
import json, hashlib, itertools
root = Path.home()
research = root/'hackathon-specialist/reports/kirothon-2026/research/L1'
app_path = Path('src/data/channel_prices.json')
app = json.loads(app_path.read_text(encoding='utf-8'))
sources = []
for letter in 'AB':
    p = research/f'channel-prices-{letter}.json'
    sources += json.loads(p.read_text(encoding='utf-8'))['services']
    print(p, hashlib.sha256(p.read_bytes()).hexdigest())
key = lambda s: (s['id'], s['plan'])
clean = lambda s: {k:v for k,v in s.items() if k != 'researcher'}
assert len({key(s) for s in sources}) == len(sources) == 46
assert {key(s):clean(s) for s in app['services']} == {key(s):clean(s) for s in sources}
different, equal = [], []
for i, s in enumerate(app['services']):
    for a, b in itertools.combinations(s['prices'], 2):
        for term in ('monthly', 'annual'):
            x,y = a.get(term),b.get(term)
            if a['status'] == b['status'] == 'verified' and all(
                type(v) is int and 0 < v <= 2**53-1 for v in (x,y)):
                assert a['currency'] == b['currency'] == 'KRW'
                (different if x != y else equal).append((key(s),term,abs(x-y)))
assert (len(different),len(equal)) == (17,7)
assert len({r[0] for r in different}) == 13
print(app_path, hashlib.sha256(app_path.read_bytes()).hexdigest())
print('PASS 46 source plans / 17 different pairs / 7 equal controls')
PY
```

```sh
cd "$HOME/kirothon-team-024"
NODE_DISABLE_COMPILE_CACHE=1 node --no-warnings --experimental-vm-modules --input-type=commonjs <<'JS'
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const context = vm.createContext({ console }), cache = new Map();
async function load(file) {
  if (cache.has(file)) return cache.get(file);
  let mod;
  if (file.endsWith('.json')) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    mod = new vm.SyntheticModule(['default'], function () {
      this.setExport('default', value);
    }, { context, identifier: file });
  } else {
    mod = new vm.SourceTextModule(
      stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'strip' }),
      { context, identifier: file });
  }
  cache.set(file, mod);
  await mod.link(async (specifier, parent) => {
    assert(specifier.startsWith('.'));
    let resolved = path.resolve(path.dirname(parent.identifier), specifier);
    if (!fs.existsSync(resolved)) resolved += '.ts';
    return load(resolved);
  });
  return mod;
}
(async () => {
  const mod = await load(path.resolve('src/domain/channelPrice.ts'));
  await mod.evaluate();
  const { CHANNEL_PRICES: table, listDifferences, compareChannels } = mod.namespace;
  assert.equal(table.services.length, 46);
  const rows = listDifferences(table);
  assert.equal(rows.length, 13);
  for (const r of rows) {
    const c = compareChannels(table, r.service.id, r.service.plan, r.max.channel);
    assert.equal(c.status, 'cheaper_available');
    assert.equal(c.monthlyDiff, r.monthlyDiff);
    assert.equal(c.annualDiff, r.monthlyDiff * 12);
    console.log(r.service.id, r.service.plan, c.monthlyDiff, c.annualDiff);
  }
  for (const id of ['chatgpt_plus', 'claude_pro', 'google_one_ai_pro',
                    'microsoft_365_personal', 'duolingo_super']) {
    const s = table.services.find(x => x.id === id);
    assert.equal(compareChannels(table, id, s.plan, 'app_store').status, 'not_comparable');
  }
  console.log('PASS 46 plans / 13 different plans / 5 exclusion controls');
})().catch(e => { console.error(e); process.exitCode = 1; });
JS
```

## 변경 파일과 완료 경계

변경 파일은 `/Users/lim/hackathon-specialist/reports/kirothon-2026/research/L1/final-price-audit.md` 하나다. 가격 원본·store_procedures·UI·녹화 스냅샷은 각 소유자의 작업을 유지했다.

본 작업의 완료는 **전수검수·판정·근거·반영 권고의 인계**를 뜻한다. 보류 처리나 UI 개선을 완료했다는 뜻이 아니다. 위 미해결 조건은 최종 인계 항목으로 남기며 추가 검색은 종료한다.



최종 검증 기록: 2026-11-14T16:22:22+09:00. 가격 원본 5개와 계산 함수 해시 일치, 46개 스코프 행, 보고서의 Python/Node 재현 명령 2개 모두 exit 0. 병행 UI 파일 갱신은 관측 해시에 반영했고, 비교 함수 해시는 유지됐다. 보고서 외 파일을 수정하지 않았다.

STATUS: ready_for_review

## 총괄 반영

공식 표시값은 보존하고 `src/data/channel_price_review.json`의 보류 조건을 통합 데이터의 `comparable`·`comparison_note`에 반영했다. `compareChannels`와 결제 경로 이동 정책은 비교 보류 가격·다른 통화 가격을 추천에 쓰지 않는다. TVING 네 등급은 같은 기본 월간 공개 가격 비교에 사용하며, 개인의 최종 결제 금액과 가입 자격은 별도 확인한다. 원본 Kiro 녹화는 수정 전 합성 조건의 기록이다.
