// Kiro를 어디에 어떻게 썼는지: 개발(Steering·Spec·Hooks·Agents) + 제품 런타임(봇 = Kiro CLI 에이전트 + MCP).
import { BRAND } from '../brand';

const blob = (p: string) => `${BRAND.repo}/blob/main/${p}`;
const tree = (p: string) => `${BRAND.repo}/tree/main/${p}`;

const ROWS: { feature: string; where: string; link: string; what: string }[] = [
  { feature: 'Spec (요구·설계·작업)', where: '.kiro/specs/', link: tree('.kiro/specs'), what: 'EARS 요구 R01~R27 → 설계(정확성 속성 P1~P8) → 작업 T01~T16. 코드·테스트·커밋 메시지가 같은 ID를 쓴다.' },
  { feature: 'Steering 7개', where: '.kiro/steering/', link: tree('.kiro/steering'), what: '제품 범위·금지 표현, 기술 규칙, 폴더 구조, 한국 해지 규칙, 가족 동의 규칙, 개인정보, 봇 행동 규칙(B1~B6).' },
  { feature: 'Hooks', where: '.kiro/hooks/', link: tree('.kiro/hooks'), what: '세션 시작 시 남은 작업 주입, 저장 후 테스트, 위험 명령·원문 경로 차단(exit 2), 턴 종료 요약. 결과는 docs/evidence/hook-log.jsonl.' },
  { feature: '커스텀 에이전트', where: '.kiro/agents/', link: tree('.kiro/agents'), what: 'subs-bot: household MCP 도구만 허용, 파일·셸 deny. reviewer: 읽기 전용 검토자.' },
  { feature: 'MCP 서버', where: 'mcp/server.ts', link: blob('mcp/server.ts'), what: '봇이 쓰는 도구 12개. 상태 변경은 앱과 같은 evaluateAction. 결제 문자 원문은 모델에 돌려주지 않는다.' },
  { feature: 'Kiro CLI 헤드리스 = 봇 런타임', where: 'scripts/bot-patrol.ts', link: blob('scripts/bot-patrol.ts'), what: 'kiro-cli chat --agent subs-bot --output-format stream-json 으로 점검 1회. 모델·시간·도구·훅·크레딧을 영수증으로 저장.' },
];

export function HowBuilt() {
  return (
    <section>
      <div className="card">
        <h2>봇이 움직이는 방식</h2>
        <div className="flow">
          <div className="node">데모 시계·답장·결제 문자</div>
          <div className="arrow">→</div>
          <div className="node kiro">Kiro CLI 에이전트 subs-bot (점검 1회)</div>
          <div className="arrow">→</div>
          <div className="node">household MCP 도구 12개</div>
          <div className="arrow">→</div>
          <div className="node gate">정책 관문 evaluateAction</div>
          <div className="arrow">→</div>
          <div className="node">질문·가족 제안·해지 경로 메시지</div>
        </div>
        <p className="small muted">
          투표·동의 철회·해지 신청 기록은 사람만 할 수 있어 도구 자체가 없어요. 봇이 거부를 받으면 사유(미응답·반대 의견)를 읽고 다시 계획해요. 금액은 도구가 계산한 값만 쓸 수 있고, 다른 숫자를 쓰면 도구가 거부해요.
        </p>
      </div>
      <div className="card">
        <h2>Kiro 활용</h2>
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
        <p className="small">
          자세한 기록: <a href={blob('BUILD_REPORT.md')}>BUILD_REPORT.md</a> · 요구사항 추적표: <a href={blob('docs/evidence/traceability.md')}>docs/evidence/traceability.md</a> · 봇 실행 영수증: <a href={tree('docs/evidence/bot-runs')}>docs/evidence/bot-runs/</a>
        </p>
      </div>
    </section>
  );
}
