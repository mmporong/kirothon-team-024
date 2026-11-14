// Kiro를 어디에 어떻게 썼는지: 개발(Steering·Spec·Hooks·Agents) + 제품 런타임(봇 = Kiro CLI 에이전트 + MCP).
import { BRAND } from '../brand';

const blob = (p: string) => `${BRAND.repo}/blob/main/${p}`;
const tree = (p: string) => `${BRAND.repo}/tree/main/${p}`;

const ROWS: { feature: string; where: string; link: string; what: string }[] = [
  { feature: 'Spec (요구·설계·작업)', where: '.kiro/specs/', link: tree('.kiro/specs'), what: 'EARS 요구 R01~R30 → 설계(정확성 속성 P1~P10) → 작업. 코드·테스트·커밋 메시지가 같은 ID를 쓴다.' },
  { feature: 'Steering 7개', where: '.kiro/steering/', link: tree('.kiro/steering'), what: '제품 범위·금지 표현, 기술 규칙, 폴더 구조, 한국 해지 규칙, 가족 동의 규칙, 개인정보, 봇 행동 규칙(B1~B6).' },
  { feature: 'Hooks', where: '.kiro/hooks/', link: tree('.kiro/hooks'), what: '세션 시작·도구 호출 전·턴 종료 기록은 hook-log.jsonl에서 확인할 수 있어요. 저장 후 시험과 위험 요청 차단은 별도 합성 입력 검사이며 Kiro 실행 실증과 구분해요.' },
  { feature: '커스텀 에이전트', where: '.kiro/agents/', link: tree('.kiro/agents'), what: 'subs-bot: household MCP 도구만 허용, 파일·셸 deny. reviewer는 읽기 전용으로 설정했지만 검토 실행이 중단됐어요. 이후 검수와 수정은 Codex가 맡았어요.' },
  { feature: 'MCP 서버', where: 'mcp/server.ts', link: blob('mcp/server.ts'), what: '봇이 쓰는 도구 13개. 상태 변경은 앱과 같은 evaluateAction. 결제 문자 원문은 모델에 돌려주지 않는다.' },
  { feature: 'Kiro CLI 헤드리스 = 봇 런타임', where: 'scripts/bot-patrol.ts', link: blob('scripts/bot-patrol.ts'), what: 'kiro-cli chat --agent subs-bot --output-format stream-json 으로 점검 1회. 모델·시간·도구·훅·크레딧을 영수증으로 저장.' },
];

export function HowBuilt() {
  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">똑이가 일하는 방식</p><h2>다음 질문은 AI가, 결정은 사람이.</h2><p className="muted">Kiro가 다음 행동을 고르고, 금액과 가족 동의는 코드로 확인해요.</p></div></div>
      <div className="card how-it-works">
        <ol className="principle-list">
          <li><span className="principle-number">01</span><div><h3>필요한 자료만 확인</h3><p>합성 결제 자료와 가족의 답을 읽어요. 개인 문자함은 열지 않아요.</p></div></li>
          <li><span className="principle-number">02</span><div><h3>상황에 맞게 다시 제안</h3><p>반대나 미응답이 있으면 이유를 읽고 다음 질문을 골라요.</p></div></li>
          <li><span className="principle-number">03</span><div><h3>사람의 동의 뒤에 안내</h3><p>동의와 조건을 확인한 뒤 방법을 알려요. 실제 해지는 결제자가 해요.</p></div></li>
        </ol>
      </div>
      <div className="evidence-links"><a className="btn" href={blob('BUILD_REPORT.md')} target="_blank" rel="noreferrer">개발 과정 보기 ↗</a><a className="btn" href={tree('docs/evidence/bot-runs')} target="_blank" rel="noreferrer">실제 실행 기록 ↗</a><a className="btn" href={blob('docs/evidence/traceability.md')} target="_blank" rel="noreferrer">요구사항과 검증 ↗</a></div>
      <details className="disclosure"><summary>Kiro 기능과 구현 근거</summary><div className="disclosure-body table-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>기능</th>
              <th>파일</th>
              <th>무엇을 했나</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.feature}>
                <td>
                  <b>{r.feature}</b>
                </td>
                <td>
                  <a href={r.link} target="_blank" rel="noreferrer">
                    <code>{r.where}</code>
                  </a>
                </td>
                <td>{r.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">메시지의 원화 금액을 확인한 값과 대조하며, 날짜와 자유 문장 전체를 검증하지는 않아요. 과거 Kiro 녹화와 인계 후 Codex 수정·검증을 구분해 기록했어요.</p>
      </div></details>
    </section>
  );
}
