// 똑Pay 점검 봇 '똑이'의 MCP 도구. 모든 상태 변경은 domain/policy.evaluateAction 을 거친다. [R16][R22][R23][R24][R25][R27]
// 사람만 할 수 있는 일(투표·동의 철회·해지 요청 기록·사업자 확인)은 도구로 만들지 않았다. [R23][B1]
import { cheapestFit, compareAlternatives, NEED_LABEL, type Need } from '../domain/alternatives';
import { CHANNEL_PRICES, compareChannels, findPrices, PRICE_STATUS_LABEL, refundRoute, switchSteps } from '../domain/channelPrice';
import { CHOICE_LABEL, tally, type Choice } from '../domain/consent';
import { routeFor } from '../domain/guides';
import { formatSignedWon, formatWon } from '../domain/money';
import { EVENT_LABEL, parsePaymentText } from '../domain/parsePayment';
import { evaluateAction, newCase, REASON_TEXT, STAGE_LABEL, type CaseState, type Reason } from '../domain/policy';
import { getPlan, getPolicy, PLAN_LABEL } from '../domain/pricePolicy';
import { decisionDeadline, REVIEW_LABEL, reviewStatus } from '../domain/reminders';
import { computeScenario, type Scenario } from '../domain/resubBreakeven';
import { CHANNEL_LABEL, CHANNEL_SHORT, josa, withRo, type Channel, type Subscription } from '../domain/types';
import { chargesAfterRequest, chargesOnNewChannel, CLOSURE_LABEL, closureStatus } from '../domain/verification';
import { hoursBetween, labelOf, memberOf, nextId, openCaseFor, replaceCase, todayOf, TX_EFFECT_LABEL, type BotState, type Message } from './state';

export interface ToolOutcome {
  ok: boolean;
  reasons: string[];
  summary: string;
  result: Record<string, unknown>;
}

type Args = Record<string, unknown>;

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (s: BotState, args: Args) => ToolOutcome;
}

const ok = (summary: string, result: Record<string, unknown> = {}): ToolOutcome => ({ ok: true, reasons: [], summary, result });
const fail = (reasons: string[], summary: string, result: Record<string, unknown> = {}): ToolOutcome => ({ ok: false, reasons, summary, result });

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const int = (v: unknown, d: number): number => (typeof v === 'number' && Number.isInteger(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : d);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function subOf(s: BotState, id: unknown): Subscription | null {
  return s.subscriptions.find((x) => x.id === id || x.serviceId === id) ?? null;
}

function caseOf(s: BotState, id: unknown): CaseState | null {
  return s.cases.find((c) => c.caseId === id) ?? (typeof id === 'string' ? openCaseFor(s, id) : null);
}

function ensureCase(s: BotState, sub: Subscription): CaseState {
  const existing = openCaseFor(s, sub.id);
  if (existing) return existing;
  const c = newCase(nextId(s, `case-${sub.serviceId}`), sub);
  s.cases.push(c);
  return c;
}

function send(s: BotState, m: Omit<Message, 'id' | 'at' | 'readByBot' | 'patrolId' | 'from'> & { from?: string }): Message {
  const msg: Message = { id: nextId(s, 'msg'), at: s.clock, from: m.from ?? 'bot', readByBot: m.from !== undefined && m.from !== 'bot' ? false : true, patrolId: s.activePatrolId, ...m } as Message;
  s.messages.push(msg);
  return msg;
}

// ---- 숫자 검증 [B2]: 봇이 쓰는 'N원'은 도구가 계산하거나 정책·청구에서 확인된 값이어야 한다.
function allowedNumbers(s: BotState, subId: string | null): Set<number> {
  const set = new Set<number>();
  const subs = subId ? s.subscriptions.filter((x) => x.id === subId) : s.subscriptions;
  for (const sub of subs) {
    if (sub.monthlyWon !== null) set.add(sub.monthlyWon);
    const pol = getPolicy(sub.serviceId);
    for (const plan of Object.values(pol?.plans ?? {})) for (const v of [plan.legacy_monthly, plan.new_monthly, plan.new_annual]) if (typeof v === 'number') set.add(v);
    for (const sc of Object.values(s.scenarios)) {
      if (sc.subscriptionId !== sub.id) continue;
      set.add(sc.keep);
      set.add(sc.pause);
      for (const row of sc.table) {
        set.add(Math.abs(row.delta));
        set.add(row.pause);
      }
    }
    for (const p of findPrices(CHANNEL_PRICES, sub.serviceId, sub.planId)?.prices ?? []) if (p.status === 'verified') for (const v of [p.monthly, p.annual]) if (typeof v === 'number') set.add(v);
    const opts = s.optionBook[sub.id] ?? [];
    for (const v of opts) set.add(v);
    for (const tx of s.transactions) if (tx.linkedSubscriptionId === sub.id && tx.amountWon !== null) set.add(tx.amountWon);
  }
  return set;
}

export function unverifiedNumbers(text: string, allowed: Set<number>): number[] {
  const bad: number[] = [];
  for (const m of text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s?원/g)) {
    const n = Number(m[1]!.replace(/,/g, ''));
    if (!allowed.has(n)) bad.push(n);
  }
  return bad;
}

function scenarioFor(s: BotState, sub: Subscription, pauseMonths: number, horizon: number): { ok: true; sc: Scenario } | { ok: false; reasons: string[]; why: string } {
  const pol = getPolicy(sub.serviceId);
  const plan = getPlan(sub.serviceId, sub.planId);
  if (!pol || !plan || plan.new_monthly === null) return { ok: false, reasons: ['price_unknown'], why: '재가입 요금이 확인되지 않아 계산을 보류해요' };
  const oldWon = sub.monthlyWon ?? plan.legacy_monthly;
  if (oldWon === null) return { ok: false, reasons: ['legacy_price_unknown'], why: '지금 내는 요금을 몰라 계산을 보류해요' };
  const r = computeScenario({
    oldWon,
    newWon: plan.new_monthly,
    horizon,
    pauseMonths,
    serviceId: sub.serviceId,
    planId: sub.planId,
    serviceName: `${pol.name} ${PLAN_LABEL[sub.planId] ?? sub.planId}`,
    effectiveDate: pol.change_effective_date,
    policyCheckedAt: pol.checked_at,
    sourceUrl: pol.sources[0] ?? null,
    inputKind: sub.sourceKind === 'demo' ? 'example' : 'confirmed',
  });
  if (!r.ok) return { ok: false, reasons: [r.error], why: r.error };
  s.scenarios[r.value.resultId] = { ...r.value, subscriptionId: sub.id };
  return { ok: true, sc: r.value };
}

export function caseView(s: BotState, c: CaseState) {
  const t = c.proposal ? tally(c.proposal) : null;
  const cs = closureStatus(c.closure, todayOf(s));
  return {
    caseId: c.caseId,
    subscriptionId: c.subscription.id,
    service: c.subscription.name,
    stage: c.stage,
    stageLabel: STAGE_LABEL[c.stage],
    proposal:
      c.proposal && t
        ? {
            version: c.proposal.version,
            choice: CHOICE_LABEL[c.proposal.terms.choice],
            pauseMonths: c.proposal.terms.pauseMonths,
            horizon: c.proposal.terms.horizon,
            sentence: c.proposal.terms.sentence,
            agree: t.agree.map((m) => labelOf(s, m)),
            object: t.object.map((m) => ({ member: labelOf(s, m), comment: c.proposal!.votes.find((v) => v.memberId === m && v.version === c.proposal!.version && !v.revoked)?.comment ?? null })),
            abstain: t.abstain.map((m) => labelOf(s, m)),
            pending: t.pending.map((m) => labelOf(s, m)),
            invalidatedOldVotes: t.staleIgnored,
          }
        : null,
    closure: CLOSURE_LABEL[cs.status],
    cancelRequestedAt: c.closure.requestedAt,
  };
}

function routeMessage(s: BotState, sub: Subscription, channel: Channel | null, lead: string): { text: string; status: string; url: string | null } {
  const r = routeFor(sub.serviceId, channel);
  const next = sub.nextChargeDate ? `다음 결제 예정일 ${sub.nextChargeDate}에 청구가 오는지 지켜볼게요.` : '다음 청구가 오는지 지켜볼게요.';
  if (r.status === 'channel_unknown') return { text: `${lead} 어디서 결제되는지(서비스 웹·App Store·Google Play·통신사) 먼저 확인해 주세요. 결제 경로마다 해지하는 곳이 달라요.`, status: r.status, url: null };
  if (r.status === 'no_guide') return { text: `${lead} ${CHANNEL_LABEL[r.channel]} 해지 경로 자료가 아직 없어요. 결제 내역에서 청구처를 확인해 주세요.`, status: r.status, url: null };
  const steps = r.route.steps?.length ? `${r.route.steps.join(' → ')}.` : '공식 주소의 구독 관리 메뉴에서 해지해 주세요(세부 단계는 아직 확인되지 않았어요).';
  const refund = r.refundNote ? ` 참고: ${r.refundNote}` : '';
  return {
    text: `${lead} ${r.serviceName} 해지 경로 — ${CHANNEL_LABEL[r.route.channel]}: ${steps} 공식 주소: ${r.route.official_url}${refund} 해지를 신청하면 앱에서 '해지 신청함'을 눌러 주세요. ${next}`,
    status: 'ok',
    url: r.route.official_url,
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: 'get_status',
    description: '가구 상태를 읽는다: 지금 시각, 구성원, 구독(다음 결제일·D-day·결제 채널·공유 여부), 열린 사건(단계·가족 제안 버전·동의/반대/미응답과 반대 의견), 대기 중 질문, 봇이 아직 읽지 않은 답장, 처리 안 된 결제 문자 수. 점검을 시작할 때 먼저 호출한다.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler(s) {
      const t = todayOf(s);
      const subscriptions = s.subscriptions.map((sub) => {
        const r = reviewStatus(sub, t);
        const dl = decisionDeadline(sub);
        const cc = compareChannels(CHANNEL_PRICES, sub.serviceId, sub.planId, sub.channel, sub.monthlyWon);
        const legacy = getPlan(sub.serviceId, sub.planId)?.legacy_monthly ?? null;
        return {
          id: sub.id,
          name: sub.name,
          monthly: sub.monthlyWon === null ? (sub.trialEndsAt ? '무료체험 중' : '미확인') : formatWon(sub.monthlyWon),
          trialEndsAt: sub.trialEndsAt ?? null,
          nextChargeDate: sub.nextChargeDate,
          deadline: dl.kind === 'trial_end' ? '무료체험 종료(유료 전환)' : '정기결제',
          decideBy: dl.cancelBy,
          decideByNote: dl.leadDays ? `${CHANNEL_SHORT[sub.channel!]}는 결제 ${dl.leadDays * 24}시간 전까지 자동 갱신을 꺼야 해요` : null,
          daysToDecide: r.daysToDecision,
          daysToChargeOrTrialEnd: r.daysToChargeOrTrialEnd,
          reviewBasis: 'cancel_deadline',
          review: REVIEW_LABEL[r.status],
          dueWithin3Days: ['d3', 'd2', 'd1', 'today'].includes(r.status),
          cheaperChannel: cc.status === 'cheaper_available' ? `${josa(CHANNEL_SHORT[cc.cheapest!.channel], '이/가')} 월 ${formatWon(cc.monthlyDiff!)} 쌈 — compare_channels로 확인` : null,
          legacyPrice: legacy !== null && sub.monthlyWon === legacy ? '기존 요금 자격 있음(해지·경로 변경 후 다시 가입하면 신규 요금)' : null,
          channel: sub.channel ? CHANNEL_LABEL[sub.channel] : '미확인',
          owner: labelOf(s, sub.ownerId),
          sharedWith: sub.sharedWith.map((m) => labelOf(s, m)),
          caseId: openCaseFor(s, sub.id)?.caseId ?? null,
          usage: sub.usage ? `${sub.usage.period} ${sub.usage.observed ?? '미확인'}${sub.usage.unit}` : '미확인(0회로 보지 않음)',
        };
      });
      const unread = s.messages.filter((m) => m.to === 'bot' && !m.readByBot);
      for (const m of unread) m.readByBot = true;
      return ok(`구독 ${subscriptions.length}개, 3일 안 취소 결정 마감 ${subscriptions.filter((x) => x.dueWithin3Days).length}개, 새 답장 ${unread.length}개`, {
        now: s.clock,
        today: t,
        members: s.household.members.map((m) => ({ id: m.id, label: m.label, role: m.role === 'owner' ? '결제자' : '구성원' })),
        subscriptions,
        cases: s.cases.map((c) => caseView(s, c)),
        newReplies: unread.map((m) => ({ id: m.id, at: m.at, from: labelOf(s, m.from), kind: m.kind, text: m.text, subscriptionId: m.subscriptionId, caseId: m.caseId, version: m.version ?? null })),
        pendingQuestions: s.questions.filter((q) => q.status === 'pending').map((q) => ({ id: q.id, to: labelOf(s, q.to), topic: q.topic === 'decide' ? '결정 질문' : '가족 동의 요청', subscriptionId: q.subscriptionId, version: q.version, askedAt: q.at })),
        unprocessedSms: s.inbox.filter((m) => !m.processed).length,
      });
    },
  },
  {
    name: 'ingest_sms',
    description: '처리 안 된 결제 문자를 기기 안 규칙으로 구조화한다. 원문은 돌려주지 않고 종류·서비스·금액·날짜·결제 채널·근거 위치만 돌려준다. 해지 요청 뒤 청구가 확인되면 그 사건을 정책 관문을 거쳐 다시 연다.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler(s) {
      const out: Record<string, unknown>[] = [];
      for (const item of s.inbox.filter((m) => !m.processed)) {
        item.processed = true;
        const p = parsePaymentText(item.text);
        if (!p) {
          out.push({ smsId: item.id, type: '분류 불가', effect: TX_EFFECT_LABEL.ignored_not_charge });
          continue;
        }
        let sub = p.serviceId ? s.subscriptions.find((x) => x.serviceId === p.serviceId) ?? null : null;
        let linkedBy: string | null = sub ? '서비스명' : null;
        if (!sub && p.isCharge && (p.channel === 'app_store' || p.channel === 'google_play')) {
          // 앱마켓 청구 문자는 서비스명 없이 청구처(APPLE.COM/BILL 등)만 보이는 경우가 많다 → 같은 경로 구독과 금액으로 연결
          const cands = s.subscriptions.filter((x) => x.channel === p.channel);
          const byAmount = cands.filter((x) => (x.monthlyWon !== null && x.monthlyWon === p.amountWon) || findPrices(CHANNEL_PRICES, x.serviceId, x.planId)?.prices.find((q) => q.channel === p.channel)?.monthly === p.amountWon);
          const pick = byAmount.length === 1 ? byAmount[0]! : cands.length === 1 ? cands[0]! : null;
          if (pick) {
            sub = pick;
            linkedBy = byAmount.length === 1 ? '청구처·금액' : '청구처(이 경로 구독이 하나뿐)';
          }
        }
        let effect: keyof typeof TX_EFFECT_LABEL;
        let caseStage: string | null = null;
        if (!p.isCharge) effect = 'ignored_not_charge';
        else if (!sub) effect = 'unlinked';
        else {
          const c = openCaseFor(s, sub.id);
          if (c && c.closure.requestedAt && p.date && p.amountWon !== null && p.date >= c.closure.requestedAt.slice(0, 10)) {
            const d = evaluateAction(c, { type: 'observe_charge', actor: 'bot', charge: { date: p.date, amountWon: p.amountWon, channel: p.channel, synthetic: item.synthetic } }, s.clock);
            replaceCase(s, d.next);
            effect = d.reasons.includes('charge_after_cancel') ? 'charge_after_cancel' : d.reasons.includes('charge_on_new_channel') ? 'expected_new_channel' : 'charge_recorded';
            caseStage = STAGE_LABEL[d.next.stage];
          } else effect = p.amountWon === sub.monthlyWon ? 'matches_subscription' : 'amount_differs';
        }
        s.transactions.push({ smsId: item.id, receivedAt: item.receivedAt, eventType: p.eventType, serviceId: p.serviceId, amountWon: p.amountWon, foreignAmount: p.foreignAmount, date: p.date, channel: p.channel, spans: p.spans, linkedSubscriptionId: sub?.id ?? null, effect });
        out.push({
          smsId: item.id,
          type: EVENT_LABEL[p.eventType],
          service: p.serviceName ?? '미확인',
          amount: p.amountWon !== null ? formatWon(p.amountWon) : p.foreignAmount ? `${p.foreignAmount.currency} ${p.foreignAmount.value}` : '미확인',
          date: p.date ?? '미확인',
          channel: p.channel ? CHANNEL_LABEL[p.channel] : '미확인',
          subscriptionId: sub?.id ?? null,
          linkedBy,
          effect: TX_EFFECT_LABEL[effect],
          caseStage,
          evidenceSpans: p.spans,
        });
      }
      const reopened = out.filter((o) => o.effect === TX_EFFECT_LABEL.charge_after_cancel).length;
      return ok(`문자 ${out.length}건 구조화${reopened ? `, 해지 후 청구 ${reopened}건으로 사건 재개방` : ''}`, { processed: out, rawTextReturned: false });
    },
  },
  {
    name: 'calc_resub',
    description: '해지 후 재가입 손익을 계산한다. 같은 기간(horizon, 기본 12개월) 동안 지금 요금으로 계속 유지 vs pauseMonths개월 쉬고 신규 요금으로 복귀. 판정 문장·조언 문장·손익분기·전제를 돌려준다. 사람에게 숫자를 말하기 전에 반드시 호출한다.',
    inputSchema: { type: 'object', properties: { subscriptionId: { type: 'string' }, pauseMonths: { type: 'integer', minimum: 0 }, horizon: { type: 'integer', minimum: 1, maximum: 60 } }, required: ['subscriptionId', 'pauseMonths'] },
    handler(s, a) {
      const sub = subOf(s, a.subscriptionId);
      if (!sub) return fail(['unknown_subscription'], '구독을 찾지 못했어요');
      const r = scenarioFor(s, sub, int(a.pauseMonths, 1), int(a.horizon, 12));
      if (!r.ok) return fail(r.reasons, r.why);
      const sc = r.sc;
      return ok(sc.verdict, {
        resultId: sc.resultId,
        verdict: sc.verdict,
        advice: sc.advice,
        keepTotal: formatWon(sc.keep),
        pauseTotal: formatWon(sc.pause),
        delta: formatSignedWon(sc.delta),
        breakEvenMonths: sc.breakEven,
        byPauseMonths: sc.table.slice(1, Math.min(sc.horizon, 6) + 1).map((row) => `${row.pauseMonths}개월 쉬기: ${formatSignedWon(row.delta)}`),
        inputKind: sc.inputKind === 'example' ? '예시 계산(공개 요금 기준)' : '확인한 값',
        assumptions: sc.assumptions.slice(0, 5),
      });
    },
  },
  {
    name: 'compare_options',
    description: '같은 기간 총액으로 대안을 비교한다: 계속 유지, k개월 쉬기, 연간권, 광고형, 낮은 등급. needs(no_ads, uhd, streams4, no_prepay)를 넣으면 맞지 않는 대안은 부적합으로 표시한다.',
    inputSchema: { type: 'object', properties: { subscriptionId: { type: 'string' }, pauseMonths: { type: 'integer', minimum: 0 }, horizon: { type: 'integer' }, needs: { type: 'array', items: { type: 'string', enum: ['no_ads', 'uhd', 'streams4', 'no_prepay'] } } }, required: ['subscriptionId', 'pauseMonths'] },
    handler(s, a) {
      const sub = subOf(s, a.subscriptionId);
      if (!sub) return fail(['unknown_subscription'], '구독을 찾지 못했어요');
      const horizon = int(a.horizon, 12);
      const r = scenarioFor(s, sub, int(a.pauseMonths, 1), horizon);
      if (!r.ok) return fail(r.reasons, r.why);
      const needs = strList(a.needs).filter((n): n is Need => n in NEED_LABEL);
      const opts = compareAlternatives({ serviceId: sub.serviceId, planId: sub.planId, oldWon: r.sc.oldWon, horizon, pauseMonths: r.sc.pauseMonths, pauseTotal: r.sc.pause, needs });
      const keep = opts.find((o) => o.kind === 'keep')?.total ?? null;
      const book = new Set(s.optionBook[sub.id] ?? []);
      for (const o of opts) if (o.total !== null) {
        book.add(o.total);
        if (keep !== null) book.add(Math.abs(keep - o.total));
      }
      s.optionBook[sub.id] = [...book];
      const best = cheapestFit(opts);
      return ok(`대안 ${opts.length}개 비교${best ? `, 요구에 맞는 가장 싼 안: ${best.title}` : ''}`, {
        horizon,
        needs: needs.map((n) => NEED_LABEL[n]),
        options: opts.map((o) => ({ kind: o.kind, title: o.title, total: o.total === null ? '미확인' : formatWon(o.total), vsKeep: o.total !== null && keep !== null ? formatSignedWon(keep - o.total) : null, fit: o.fit === 'fit' ? '맞음' : o.fit === 'unfit' ? '안 맞음' : '확인 필요', why: o.unfitReasons, constraints: o.constraints })),
        cheapestFit: best?.title ?? null,
      });
    },
  },
  {
    name: 'compare_channels',
    description: '이 구독을 지금 결제 경로보다 싸게 낼 수 있는 공식 경로(웹·App Store·Google Play)가 있는지 본다. 검증된 가격만 비교해 월·연 차액, 옮기는 단계, 기존 요금 자격 경고를 돌려준다. App Store·Google Play로 결제하는 구독은 먼저 묻기 전에 호출한다.',
    inputSchema: { type: 'object', properties: { subscriptionId: { type: 'string' } }, required: ['subscriptionId'] },
    handler(s, a) {
      const sub = subOf(s, a.subscriptionId);
      if (!sub) return fail(['unknown_subscription'], '구독을 찾지 못했어요');
      const c = compareChannels(CHANNEL_PRICES, sub.serviceId, sub.planId, sub.channel, sub.monthlyWon);
      const sp = findPrices(CHANNEL_PRICES, sub.serviceId, sub.planId);
      const book = new Set(s.optionBook[sub.id] ?? []);
      for (const v of [c.currentMonthly, c.cheapest?.monthly ?? null, c.monthlyDiff, c.annualDiff]) if (typeof v === 'number') book.add(v);
      s.optionBook[sub.id] = [...book];
      const listed = (sp?.prices ?? []).map((p) => ({ channel: CHANNEL_SHORT[p.channel], status: PRICE_STATUS_LABEL[p.status], monthly: p.monthly === null ? '미확인' : formatWon(p.monthly), source: p.source_url, checkedAt: p.checked_at }));
      const why: Record<string, string> = { no_price_data: '이 요금제의 경로별 가격 자료가 없어요', channel_unknown: '결제 경로를 몰라요', current_price_unknown: '지금 경로의 가격이 검증되지 않았어요', no_verified_alternative: '다른 경로의 검증된 가격이 없어요' };
      if (c.status !== 'cheaper_available') return ok(c.status === 'already_cheapest' ? '지금 경로가 가장 싸거나 같아요' : `비교 보류: ${c.reasons.map((r) => why[r] ?? r).join(', ')}`, { status: c.status, reasons: c.reasons.map((r) => why[r] ?? r), listed });
      const from = sub.channel as Channel;
      const to = c.cheapest!.channel;
      const steps = switchSteps(sub.serviceId, from, to, to === 'web' ? c.cheapest!.source_url : null, { trial: !!sub.trialEndsAt });
      const sentence = `${withRo(CHANNEL_SHORT[from])} 결제하면 월 ${formatWon(c.currentMonthly!)}, ${josa(CHANNEL_SHORT[to], '은/는')} 월 ${formatWon(c.cheapest!.monthly!)}이라 월 ${formatWon(c.monthlyDiff!)}(1년 ${formatWon(c.annualDiff!)}) 차이예요.`;
      return ok(`${withRo(CHANNEL_SHORT[to])} 옮기면 월 ${formatWon(c.monthlyDiff!)} 덜 내요`, {
        status: c.status,
        sentence,
        current: { channel: CHANNEL_SHORT[from], monthly: formatWon(c.currentMonthly!), basis: c.currentBasis === 'charge' ? '내 청구액' : '공개 가격' },
        cheapest: { channel: CHANNEL_SHORT[to], channelId: to, monthly: formatWon(c.cheapest!.monthly!), source: c.cheapest!.source_url, checkedAt: c.cheapest!.checked_at },
        monthlyDiff: formatWon(c.monthlyDiff!),
        annualDiff: formatWon(c.annualDiff!),
        steps,
        legacyWarning: c.legacyWarning ? '이 구독은 기존 요금 자격이 있어 경로를 옮기면(새로 가입) 신규 요금이 적용될 수 있어요. calc_resub로 확인하세요.' : null,
        listed,
      });
    },
  },
  {
    name: 'ask_member',
    description: '구성원 한 명에게 결정 질문을 보낸다(예: 결제 전 유지/쉬기/가족 상의). 같은 사람에게 같은 구독의 질문이 대기 중이면 보내지 않는다. 본문의 금액은 도구가 계산한 값만 쓸 수 있다.',
    inputSchema: { type: 'object', properties: { to: { type: 'string', description: '구성원 id 또는 이름' }, subscriptionId: { type: 'string' }, text: { type: 'string' }, choices: { type: 'array', items: { type: 'string' } } }, required: ['to', 'subscriptionId', 'text'] },
    handler(s, a) {
      const m = memberOf(s, str(a.to));
      const sub = subOf(s, a.subscriptionId);
      if (!m || !sub) return fail(['unknown_target'], '받는 사람이나 구독을 찾지 못했어요');
      const dup = s.questions.find((q) => q.status === 'pending' && q.to === m.id && q.subscriptionId === sub.id && q.topic === 'decide');
      if (dup) return fail(['duplicate_pending'], `${m.label}에게 같은 질문이 이미 대기 중이라 다시 보내지 않았어요`, { questionId: dup.id });
      const text = str(a.text).trim();
      const bad = unverifiedNumbers(text, allowedNumbers(s, sub.id));
      if (bad.length) return fail(['unverified_number'], `도구로 확인하지 않은 금액이 있어요: ${bad.map(formatWon).join(', ')}. calc_resub·compare_options 결과의 숫자만 쓰세요`, { unverified: bad });
      const c = ensureCase(s, sub);
      const qid = nextId(s, 'q');
      s.questions.push({ id: qid, at: s.clock, to: m.id, subscriptionId: sub.id, caseId: c.caseId, topic: 'decide', version: null, status: 'pending', patrolId: s.activePatrolId });
      send(s, { to: m.id, kind: 'question', text, subscriptionId: sub.id, caseId: c.caseId, choices: strList(a.choices).slice(0, 5), questionId: qid });
      return ok(`${m.label}에게 질문을 보냈어요`, { questionId: qid, caseId: c.caseId });
    },
  },
  {
    name: 'propose_family_plan',
    description: '공유 구독에 대해 가족 제안을 만들거나 고친다(choice: pause|cancel|keep|annual|ad|downgrade, pauseMonths). 조건이 바뀌면 새 버전이 되고 이전 응답은 무효가 된다. 공유 구성원 전원에게 동의 요청을 자동으로 보낸다. 조건이 같으면 아무것도 보내지 않는다.',
    inputSchema: { type: 'object', properties: { subscriptionId: { type: 'string' }, choice: { type: 'string', enum: ['pause', 'cancel', 'keep', 'annual', 'ad', 'downgrade'] }, pauseMonths: { type: 'integer', minimum: 0 }, horizon: { type: 'integer' }, needs: { type: 'array', items: { type: 'string' } }, note: { type: 'string', description: '바뀐 이유(예: 동생 의견 반영)' } }, required: ['subscriptionId', 'choice', 'pauseMonths'] },
    handler(s, a) {
      const sub = subOf(s, a.subscriptionId);
      if (!sub) return fail(['unknown_subscription'], '구독을 찾지 못했어요');
      const choice = (Object.keys(CHOICE_LABEL).includes(str(a.choice)) ? str(a.choice) : 'pause') as Choice;
      const k = choice === 'pause' ? int(a.pauseMonths, 1) : 0;
      const horizon = int(a.horizon, 12);
      const r = scenarioFor(s, sub, k, horizon);
      if (!r.ok) return fail(r.reasons, r.why);
      const note = str(a.note).trim().slice(0, 200);
      const bad = unverifiedNumbers(note, allowedNumbers(s, sub.id));
      if (bad.length) return fail(['unverified_number'], `메모에 확인하지 않은 금액이 있어요: ${bad.map(formatWon).join(', ')}`);
      const c = ensureCase(s, sub);
      const before = c.proposal?.version ?? 0;
      const plan = getPlan(sub.serviceId, sub.planId);
      const legacy = plan?.legacy_monthly !== null && plan?.legacy_monthly !== undefined && sub.monthlyWon === plan.legacy_monthly;
      const sentence =
        choice === 'cancel'
          ? `${sub.nextChargeDate ?? '다음 결제일'} 결제 전에 해지해요.${legacy && plan?.new_monthly ? ` 나중에 다시 가입하면 월 ${formatWon(plan.new_monthly)}(신규 요금)이에요.` : ''}`
          : r.sc.verdict;
      const terms = { resultId: r.sc.resultId, horizon, pauseMonths: k, choice, needs: strList(a.needs), sentence };
      const d = evaluateAction(c, c.proposal ? { type: 'revise_terms', actor: 'bot', terms } : { type: 'request_family_review', actor: 'bot', terms }, s.clock);
      replaceCase(s, d.next);
      if (!d.allowed) return fail(d.reasons, d.reasons.map((x) => REASON_TEXT[x as Reason]).join(' / '));
      const p = d.next.proposal!;
      if (p.version === before) return ok('조건이 같아 새 버전을 만들지 않았어요', { status: 'unchanged', version: p.version });
      for (const q of s.questions) if (q.caseId === c.caseId && q.topic === 'vote' && q.status === 'pending') q.status = 'superseded';
      const label = `${CHOICE_LABEL[choice]}${choice === 'pause' ? ` ${k}개월` : ''}`;
      const sentTo: string[] = [];
      for (const mid of p.requiredMembers) {
        const qid = nextId(s, 'q');
        s.questions.push({ id: qid, at: s.clock, to: mid, subscriptionId: sub.id, caseId: c.caseId, topic: 'vote', version: p.version, status: 'pending', patrolId: s.activePatrolId });
        const text = `[가족 제안 v${p.version}] ${sub.name} — ${label}. ${sentence}${note ? ` (${note})` : ''}${p.version > 1 ? ' 조건이 바뀌어 이전 응답은 무효가 됐어요. 다시 응답해 주세요.' : ''}`;
        send(s, { to: mid, kind: 'vote_request', text, subscriptionId: sub.id, caseId: c.caseId, choices: ['동의', '반대', '보류'], version: p.version, questionId: qid });
        sentTo.push(labelOf(s, mid));
      }
      return ok(`가족 제안 v${p.version}(${label})을 ${sentTo.join('·')}에게 보냈어요`, { status: before === 0 ? 'created' : 'revised', caseId: c.caseId, version: p.version, invalidatedOldVotes: tally(p).staleIgnored, sentTo, sentence });
    },
  },
  {
    name: 'remind_pending',
    description: '현재 버전 가족 제안에 아직 응답하지 않은 사람에게만 한 번 다시 알린다. 2시간 안에 물어본 사람이나 이미 다시 알린 사람은 건너뛴다.',
    inputSchema: { type: 'object', properties: { caseId: { type: 'string' } }, required: ['caseId'] },
    handler(s, a) {
      const c = caseOf(s, a.caseId);
      if (!c?.proposal) return fail(['no_proposal'], '가족 제안이 없어요');
      const p = c.proposal;
      const remindedTo: string[] = [];
      const skipped: { member: string; reason: string }[] = [];
      for (const mid of tally(p).pending) {
        const asks = s.messages.filter((m) => m.to === mid && m.caseId === c.caseId && m.version === p.version && (m.kind === 'vote_request' || m.kind === 'reminder'));
        const last = asks.at(-1);
        if (asks.some((m) => m.kind === 'reminder')) skipped.push({ member: labelOf(s, mid), reason: '이미 다시 알림' });
        else if (last && hoursBetween(last.at, s.clock) < 2) skipped.push({ member: labelOf(s, mid), reason: '2시간 안에 물어봄' });
        else {
          send(s, { to: mid, kind: 'reminder', text: `[다시 알림] ${c.subscription.name} 가족 제안 v${p.version}에 아직 응답이 없어요. ${p.terms.sentence}`, subscriptionId: c.subscription.id, caseId: c.caseId, choices: ['동의', '반대', '보류'], version: p.version });
          remindedTo.push(labelOf(s, mid));
        }
      }
      return ok(remindedTo.length ? `${remindedTo.join('·')}에게 다시 알렸어요` : '다시 알릴 사람이 없어요', { remindedTo, skipped });
    },
  },
  {
    name: 'request_handoff',
    description: '결제자 인계를 정책 관문에 요청한다. 가족 공유 해지는 현재 버전 제안에 공유 구성원 전원이 동의해야 한다. 가족 결제 경로 변경은 경로·가격 조건 동의를 지원할 때까지 보류한다. 개인 구독의 절약 목적 switchTo는 현재보다 싼 공식 확인 가격의 경로만 허용한다. 허용되면 결제자에게 공식 절차를 보낸다.',
    inputSchema: { type: 'object', properties: { caseId: { type: 'string' }, switchTo: { type: 'string', enum: ['web', 'app_store', 'google_play'], description: '결제 경로를 옮길 때 새 경로(compare_channels의 cheapest.channelId)' } }, required: ['caseId'] },
    handler(s, a) {
      const c = caseOf(s, a.caseId);
      if (!c) return fail(['unknown_case'], '사건을 찾지 못했어요');
      if (a.switchTo !== undefined && !['web', 'app_store', 'google_play'].includes(str(a.switchTo))) return fail(['invalid_switch_target'], '옮길 결제 경로를 확인해 주세요');
      const switchTo = (['web', 'app_store', 'google_play'].includes(str(a.switchTo)) ? str(a.switchTo) : undefined) as Channel | undefined;
      const d = evaluateAction(c, { type: 'prepare_owner_handoff', actor: 'bot', ...(switchTo ? { switchTo } : {}) }, s.clock);
      replaceCase(s, d.next);
      const view = caseView(s, d.next);
      if (!d.allowed) return fail(d.reasons, `정책 관문 거부: ${d.reasons.map((x) => REASON_TEXT[x as Reason]).join(' / ')}`, { reasons: d.reasons.map((x) => REASON_TEXT[x as Reason]), proposal: view.proposal });
      const sub = d.next.subscription;
      const lead = sub.sharedWith.length ? `가족 모두 동의했어요(제안 v${d.next.proposal?.version ?? '-'}: ${d.next.proposal?.terms.sentence ?? ''}).` : '말씀하신 대로 진행할게요.';
      if (switchTo && sub.channel) {
        const target = findPrices(CHANNEL_PRICES, sub.serviceId, sub.planId)?.prices.find((p) => p.channel === switchTo);
        const signup = switchTo === 'web' ? target?.source_url ?? null : null;
        const steps = switchSteps(sub.serviceId, sub.channel, switchTo, signup, { trial: !!sub.trialEndsAt });
        const text = `${lead} ${sub.name}을 ${CHANNEL_SHORT[sub.channel]}에서 ${withRo(CHANNEL_SHORT[switchTo])} 옮기는 방법이에요. ${steps.map((x, i) => `${i + 1}) ${x}`).join(' ')} ${CHANNEL_SHORT[sub.channel]} 쪽을 끄면 앱에서 '해지 신청함'을 눌러 주세요.`;
        send(s, { to: sub.ownerId, kind: 'route', text, subscriptionId: sub.id, caseId: c.caseId });
        return ok(`인계 허용 — ${labelOf(s, sub.ownerId)}에게 ${withRo(CHANNEL_SHORT[switchTo])} 옮기는 방법을 보냈어요`, { stage: STAGE_LABEL[d.next.stage], switchTo: CHANNEL_SHORT[switchTo], steps });
      }
      const msg = routeMessage(s, sub, sub.channel, lead);
      send(s, { to: sub.ownerId, kind: 'route', text: msg.text, subscriptionId: sub.id, caseId: c.caseId });
      return ok(`인계 허용 — ${labelOf(s, sub.ownerId)}에게 해지 경로를 보냈어요`, { stage: STAGE_LABEL[d.next.stage], routeStatus: msg.status, officialUrl: msg.url });
    },
  },
  {
    name: 'send_cancel_route',
    description: '결제자에게 공식 해지·환불 경로를 보낸다. 해지 후 문제 청구에서 경로를 고르며 정상 새 경로 청구는 제외한다. channel을 지정하면 실제 문제 청구와 일치해야 한다. 문제 청구가 없으면 등록 경로를 사용하고 정상 새 경로 청구만 있으면 보류한다. 같은 사건·채널 안내는 반복하지 않는다.',
    inputSchema: { type: 'object', properties: { subscriptionId: { type: 'string' }, channel: { type: 'string', enum: ['web', 'app_store', 'google_play', 'carrier', 'partner'] } }, required: ['subscriptionId'] },
    handler(s, a) {
      const sub = subOf(s, a.subscriptionId);
      if (!sub) return fail(['unknown_subscription'], '구독을 찾지 못했어요');
      const c = openCaseFor(s, sub.id);
      if (a.channel !== undefined && !['web', 'app_store', 'google_play', 'carrier', 'partner'].includes(str(a.channel))) return fail(['invalid_channel'], '결제 경로를 확인해 주세요');
      const explicitChannel = a.channel === undefined ? undefined : str(a.channel) as Channel;
      const after = c ? chargesAfterRequest(c.closure) : [];
      if (explicitChannel && after.length && !after.some((x) => x.channel === explicitChannel)) return fail(['problem_charge_channel_mismatch'], '지정한 경로가 실제 문제 청구의 경로와 달라 안내를 보류해요');
      const lastAfter = (explicitChannel ? after.filter((x) => x.channel === explicitChannel) : after).at(-1) ?? null;
      if (!lastAfter && c && chargesOnNewChannel(c.closure).length) return fail(['no_unexpected_charge'], '옮긴 새 경로의 정상 청구만 있어 해지·환불 안내를 보류해요');
      const channel = lastAfter ? lastAfter.channel : explicitChannel ?? sub.channel;
      if (s.messages.some((m) => m.kind === 'route' && m.caseId === (c?.caseId ?? null) && m.text.includes(channel ? CHANNEL_LABEL[channel] : '먼저 확인해 주세요') && m.at >= (c?.closure.requestedAt ?? ''))) return fail(['duplicate_route'], '같은 해지 경로를 이미 보냈어요');
      const dup = c ? chargesOnNewChannel(c.closure).filter((x) => lastAfter && x.date.slice(0, 7) === lastAfter.date.slice(0, 7)) : [];
      const dupNote = dup.length ? ` 같은 달에 ${dup[0]!.channel ? CHANNEL_SHORT[dup[0]!.channel] : '새 경로'} 결제(${formatWon(dup[0]!.amountWon)})도 있어 이중 결제예요.` : '';
      const lead = lastAfter
        ? `해지 신청 뒤 ${lastAfter.date}에 ${lastAfter.channel ? CHANNEL_SHORT[lastAfter.channel] : '확인 안 된 경로'}로 ${formatWon(lastAfter.amountWon)}이 청구됐어요.${dupNote} 이 결제 경로의 구독이 아직 켜져 있는지 확인하고 꺼 주세요.`
        : '요청하신 해지 경로예요.';
      const refund = lastAfter?.channel ? refundRoute(lastAfter.channel) : null;
      const msg = routeMessage(s, sub, channel, lead);
      const text = refund ? `${msg.text} 환불 요청: ${[refund.url, ...refund.steps].filter(Boolean).join(' → ')}` : msg.text;
      send(s, { to: sub.ownerId, kind: 'route', text, subscriptionId: sub.id, caseId: c?.caseId ?? null });
      return ok(`${labelOf(s, sub.ownerId)}에게 ${channel ? CHANNEL_LABEL[channel] : '결제 채널 확인'} 경로를 보냈어요`, { routeStatus: msg.status, officialUrl: msg.url, channel, problemCharge: lastAfter });
    },
  },
  {
    name: 'notify_member',
    description: '구성원에게 짧은 안내를 보낸다(질문이 아닌 알림). 같은 사람에게 같은 글을 다시 보내지 않는다. 금액은 도구가 확인한 값만 쓸 수 있다.',
    inputSchema: { type: 'object', properties: { to: { type: 'string' }, text: { type: 'string' }, subscriptionId: { type: 'string' }, caseId: { type: 'string' } }, required: ['to', 'text'] },
    handler(s, a) {
      const m = memberOf(s, str(a.to));
      if (!m) return fail(['unknown_target'], '받는 사람을 찾지 못했어요');
      const text = str(a.text).trim();
      if (s.messages.some((x) => x.to === m.id && x.text === text)) return fail(['duplicate_message'], '같은 안내를 이미 보냈어요');
      const sub = subOf(s, a.subscriptionId);
      const bad = unverifiedNumbers(text, allowedNumbers(s, sub?.id ?? null));
      if (bad.length) return fail(['unverified_number'], `도구로 확인하지 않은 금액이 있어요: ${bad.map(formatWon).join(', ')}`, { unverified: bad });
      send(s, { to: m.id, kind: 'info', text, subscriptionId: sub?.id ?? null, caseId: str(a.caseId) || null });
      return ok(`${m.label}에게 안내를 보냈어요`);
    },
  },
  {
    name: 'check_closure',
    description: '해지 요청이 기록된 사건의 다음 청구를 확인한다. 결제 예정일(+3일)이 지나고 확인한 결제 경로에서 청구가 없을 때만 "확인한 기간·경로에서 추가 청구 관측 없음"이 된다.',
    inputSchema: { type: 'object', properties: { caseId: { type: 'string' } }, required: ['caseId'] },
    handler(s, a) {
      const c = caseOf(s, a.caseId);
      if (!c) return fail(['unknown_case'], '사건을 찾지 못했어요');
      const d = evaluateAction(c, { type: 'check_next_cycle', actor: 'bot' }, s.clock);
      replaceCase(s, d.next);
      const cs = closureStatus(d.next.closure, todayOf(s));
      return { ok: d.allowed, reasons: d.reasons, summary: CLOSURE_LABEL[cs.status], result: { status: CLOSURE_LABEL[cs.status], scope: cs.scope, reasons: d.reasons.map((x) => REASON_TEXT[x as Reason]) } };
    },
  },
  {
    name: 'finish_patrol',
    description: '점검을 마치며 이번에 한 일과 기다리는 것을 기록한다. 점검 마지막에 한 번 호출한다.',
    inputSchema: { type: 'object', properties: { summary: { type: 'string' }, waitingFor: { type: 'array', items: { type: 'string' } } }, required: ['summary'] },
    handler(s, a) {
      const p = s.patrols.find((x) => x.id === s.activePatrolId);
      const report = { summary: str(a.summary).slice(0, 600), waitingFor: strList(a.waitingFor).slice(0, 8) };
      if (p) p.report = report;
      return ok('점검 기록을 남겼어요', report);
    },
  },
];

export const TOOL_NAMES = TOOLS.map((t) => t.name);

/** 도구 하나를 실행한다. 상태는 복사본에서 바꾸고, 호출 기록(toolLog)을 남긴다. */
export function runTool(state: BotState, name: string, args: Args = {}): { state: BotState; outcome: ToolOutcome } {
  const s: BotState = structuredClone(state);
  const def = TOOLS.find((t) => t.name === name);
  const outcome: ToolOutcome = def ? def.handler(s, args ?? {}) : fail(['unknown_tool'], `없는 도구: ${name}`);
  s.toolLog.push({ seq: s.toolLog.length + 1, at: s.clock, patrolId: s.activePatrolId, tool: name, args: redact(args), ok: outcome.ok, reasons: outcome.reasons, summary: outcome.summary });
  return { state: s, outcome };
}

function redact(args: Args): Args {
  const out: Args = {};
  for (const [k, v] of Object.entries(args ?? {})) out[k] = typeof v === 'string' && v.length > 300 ? `${v.slice(0, 300)}…` : v;
  return out;
}
