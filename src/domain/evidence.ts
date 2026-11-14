// 비식별 사건 요약. 결제 문자 원문·전화번호·실명은 넣지 않는다. [R13][R18]
import { tally } from './consent';
import { formatSignedWon, formatWon } from './money';
import { STAGE_LABEL, type CaseState } from './policy';
import type { Scenario } from './resubBreakeven';
import { CLOSURE_LABEL, closureStatus } from './verification';

export interface CaseSummary {
  caseId: string;
  service: string;
  stage: string;
  closure: string;
  scope: string | null;
  scenario: { resultId: string; horizon: number; pauseMonths: number; keep: string; pause: string; delta: string; breakEven: number; inputKind: string } | null;
  family: { version: number; agree: number; object: number; abstain: number; pending: number; staleIgnored: number } | null;
  record: { requested: boolean; providerConfirmed: boolean; paymentMethod: string; refund: string; chargesAfterRequest: number; checkedChannels: string[] };
  audit: { at: string; action: string; allowed: boolean; reasons: string[] }[];
  generatedAt: string;
  notice: string;
}

export function buildSummary(state: CaseState, scenario: Scenario | null, now: string): CaseSummary {
  const today = now.slice(0, 10);
  const s = closureStatus(state.closure, today);
  const t = state.proposal ? tally(state.proposal) : null;
  const reqDate = state.closure.requestedAt?.slice(0, 10) ?? null;
  return {
    caseId: state.caseId,
    service: state.subscription.name,
    stage: STAGE_LABEL[state.stage],
    closure: CLOSURE_LABEL[s.status],
    scope: s.scope,
    scenario: scenario
      ? { resultId: scenario.resultId, horizon: scenario.horizon, pauseMonths: scenario.pauseMonths, keep: formatWon(scenario.keep), pause: formatWon(scenario.pause), delta: formatSignedWon(scenario.delta), breakEven: scenario.breakEven, inputKind: scenario.inputKind === 'example' ? '예시 계산' : '확인한 값' }
      : null,
    family: t && state.proposal ? { version: state.proposal.version, agree: t.agree.length, object: t.object.length, abstain: t.abstain.length, pending: t.pending.length, staleIgnored: t.staleIgnored } : null,
    record: {
      requested: !!state.closure.requestedAt,
      providerConfirmed: !!state.closure.providerConfirmedAt,
      paymentMethod: state.closure.paymentMethod,
      refund: state.closure.refund,
      chargesAfterRequest: reqDate ? state.closure.observedCharges.filter((c) => c.date >= reqDate).length : 0,
      checkedChannels: [...state.closure.checkedChannels],
    },
    audit: state.audit.map((a) => ({ at: a.at, action: a.action, allowed: a.allowed, reasons: [...a.reasons] })),
    generatedAt: now,
    notice: '계산상 차이는 실제 절감액이 아니며, "추가 청구 관측 없음"은 표시된 기간·경로에 한정됩니다. 원문 문자는 포함하지 않았습니다.',
  };
}

export function summaryMarkdown(s: CaseSummary): string {
  const lines = [
    `# 구독 마침표 사건 요약 — ${s.service}`,
    '',
    `- 사건: ${s.caseId} · 단계: ${s.stage} · 해지 확인: ${s.closure}`,
    s.scope ? `- 범위: ${s.scope}` : '- 범위: 아직 판단 전',
  ];
  if (s.scenario) lines.push(`- 손익(${s.scenario.inputKind}): ${s.scenario.horizon}개월 기준 유지 ${s.scenario.keep} vs ${s.scenario.pauseMonths}개월 쉬기 ${s.scenario.pause} → ${s.scenario.delta} (손익분기 ${s.scenario.breakEven}개월, 결과 ID ${s.scenario.resultId})`);
  if (s.family) lines.push(`- 가족 제안 v${s.family.version}: 동의 ${s.family.agree} · 반대 ${s.family.object} · 보류 ${s.family.abstain} · 미응답 ${s.family.pending} · 무효 처리된 이전 응답 ${s.family.staleIgnored}`);
  lines.push(`- 기록: 해지 요청 ${s.record.requested ? '있음' : '없음'} · 사업자 확인 ${s.record.providerConfirmed ? '있음' : '없음'} · 결제수단 ${s.record.paymentMethod} · 환불 ${s.record.refund} · 해지 후 청구 ${s.record.chargesAfterRequest}건`);
  lines.push('', '## 감사 기록', '', '| 시각 | 행동 | 허용 | 사유 |', '|---|---|---|---|');
  for (const a of s.audit) lines.push(`| ${a.at} | ${a.action} | ${a.allowed ? '예' : '아니오'} | ${a.reasons.join(', ')} |`);
  lines.push('', `> ${s.notice}`);
  return lines.join('\n');
}
