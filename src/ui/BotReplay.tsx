// [R26] 실제 Kiro CLI 봇 실행 기록(녹화)을 단계별로 재생한다. 로그인 없이 볼 수 있다.
import { useEffect, useMemo, useState } from 'react';

type Msg = { id: string; at: string; from: string; to: string; fromLabel: string; toLabel: string; kind: string; text: string; choices?: string[]; version?: number };
type Tool = { seq: number; tool: string; ok: boolean; reasons: string[]; summary: string; args: Record<string, unknown> };
type Receipt = { model: string | null; engine: string | null; ms: number; toolCalls: number; denied: number; credits: number | null; fallback: boolean; hooks: { name: string; status: string }[]; finalText: string };
type CaseView = { caseId: string; service: string; stageLabel: string; closure: string; proposal: null | { version: number; choice: string; pauseMonths: number; sentence: string; agree: string[]; object: { member: string; comment: string | null }[]; abstain: string[]; pending: string[]; invalidatedOldVotes: number } };
type Step =
  | { kind: 'patrol'; id: string; clock: string; receipt: Receipt; report: { summary: string; waitingFor: string[] } | null; tools: Tool[]; messages: Msg[]; cases: CaseView[] }
  | { kind: 'human'; clock: string; actor: string; action: string; text: string; allowed: boolean; reasons: string[]; cases: CaseView[] }
  | { kind: 'event'; clock: string; text: string; sms?: string };
type Replay = { title: string; recordedAt: string; note: string; household: { members: { id: string; label: string; role: string }[] }; steps: Step[] };

const KIND: Record<string, string> = { question: '질문', vote_request: '동의 요청', reminder: '다시 알림', route: '해지 경로', info: '안내', reply: '답장', vote: '응답', action: '기록' };
const TOOL_KO: Record<string, string> = {
  get_status: '가구 상태 읽기',
  ingest_sms: '결제 문자 구조화',
  calc_resub: '재가입 손익 계산',
  compare_options: '대안 비교',
  compare_channels: '결제 경로 가격 비교',
  ask_member: '먼저 묻기',
  propose_family_plan: '가족 제안',
  remind_pending: '미응답자 재알림',
  request_handoff: '정책 관문: 결제자 인계',
  send_cancel_route: '해지 경로 보내기',
  notify_member: '안내 보내기',
  check_closure: '해지 확인',
  finish_patrol: '점검 기록',
};
const hhmm = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)} ${iso.slice(11, 16)}`;

export function BotReplay() {
  const [data, setData] = useState<Replay | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [upto, setUpto] = useState(0);
  useEffect(() => {
    fetch('./replay/demo.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Replay) => {
        setData(d);
        // ?step=all 이면 전체, ?step=N 이면 N단계까지(스크린샷·발표용)
        const q = new URLSearchParams(window.location.search).get('step');
        const n = q === 'all' ? d.steps.length - 1 : q && /^\d+$/.test(q) ? Math.min(Number(q), d.steps.length - 1) : Math.min(1, d.steps.length - 1);
        setUpto(n);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const visible = data ? data.steps.slice(0, upto + 1) : [];
  const patrols = visible.filter((s): s is Extract<Step, { kind: 'patrol' }> => s.kind === 'patrol');
  const allPatrols = data ? data.steps.filter((s): s is Extract<Step, { kind: 'patrol' }> => s.kind === 'patrol') : [];
  const totals = useMemo(() => {
    const t = { patrols: allPatrols.length, tools: 0, denied: 0, ms: 0, credits: 0, msgs: 0, model: allPatrols[0]?.receipt.model ?? '-' };
    for (const p of allPatrols) {
      t.tools += p.tools.length;
      t.denied += p.tools.filter((x) => !x.ok).length;
      t.ms += p.receipt.ms;
      t.credits += p.receipt.credits ?? 0;
      t.msgs += p.messages.length;
    }
    return t;
  }, [allPatrols]);
  const lastCases = [...visible].reverse().find((s) => s.kind !== 'event') as Extract<Step, { cases: CaseView[] }> | undefined;
  const inbox = useMemo(() => {
    const by: Record<string, Msg[]> = {};
    for (const p of patrols) for (const m of p.messages) (by[m.to] ??= []).push(m);
    return by;
  }, [patrols]);

  if (err) return <div className="card warn">재생 기록을 불러오지 못했어요({err}). 로컬에서 `npm run bot:demo`로 만들 수 있어요.</div>;
  if (!data) return <div className="card">불러오는 중…</div>;
  const members = data.household.members;

  return (
    <section>
      <div className="card banner">
        <div>
          <span className="badge rec">녹화 기록</span> <b>{data.title}</b>
          <p className="muted small">{data.note}</p>
        </div>
        <div className="metrics">
          <Metric label="점검" value={`${totals.patrols}회`} />
          <Metric label="도구 호출" value={`${totals.tools}회`} />
          <Metric label="정책 거부 → 재계획" value={`${totals.denied}회`} />
          <Metric label="보낸 메시지" value={`${totals.msgs}개`} />
          <Metric label="Kiro 실행 시간" value={`${Math.round(totals.ms / 1000)}초`} />
          <Metric label="모델" value={totals.model ?? '-'} />
        </div>
      </div>
      <div className="controls">
        <button className="btn" onClick={() => setUpto(0)}>
          처음부터
        </button>
        <button className="btn primary" onClick={() => setUpto((u) => Math.min(u + 1, data.steps.length - 1))} disabled={upto >= data.steps.length - 1}>
          다음 단계 ▶
        </button>
        <button className="btn" onClick={() => setUpto(data.steps.length - 1)}>
          전체 보기
        </button>
        <span className="muted small">
          {upto + 1} / {data.steps.length} 단계
        </span>
      </div>
      <div className="grid2 wide-left">
        <ol className="timeline">
          {visible.map((s, i) => (
            <li key={i} className={`step ${s.kind}${i === upto ? ' now' : ''}`}>
              <div className="when">{hhmm(s.clock)}</div>
              {s.kind === 'event' && (
                <div>
                  <b>{s.text}</b>
                  {s.sms && <pre className="sms">{s.sms}</pre>}
                </div>
              )}
              {s.kind === 'human' && (
                <div>
                  <span className={`badge ${s.allowed ? '' : 'bad'}`}>사람 · {s.actor}</span> {s.text}
                </div>
              )}
              {s.kind === 'patrol' && <PatrolCard p={s} />}
            </li>
          ))}
        </ol>
        <div>
          <div className="phones">
            {members.map((m) => (
              <div key={m.id} className="phone">
                <div className="phone-head">
                  {m.label} <span className="muted small">{m.role === 'owner' ? '결제자' : '가족'}</span>
                </div>
                {(inbox[m.id] ?? []).length === 0 && <p className="muted small">아직 받은 메시지 없음</p>}
                {(inbox[m.id] ?? []).map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.kind}`}>
                    <div className="small muted">
                      {KIND[msg.kind] ?? msg.kind}
                      {msg.version ? ` v${msg.version}` : ''} · {hhmm(msg.at)}
                    </div>
                    <div>{msg.text}</div>
                    {msg.choices && msg.choices.length > 0 && (
                      <div className="row wrap">
                        {msg.choices.map((c) => (
                          <span key={c} className="chip sm">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {lastCases?.cases.map((c) => (
            <div key={c.caseId} className="card case">
              <h3>
                사건 {c.service} · <span className="badge">{c.stageLabel}</span>
              </h3>
              <p className="small">해지 확인: {c.closure}</p>
              {c.proposal && (
                <div className="small">
                  <p>
                    가족 제안 <b>v{c.proposal.version}</b> — {c.proposal.choice} {c.proposal.pauseMonths ? `${c.proposal.pauseMonths}개월` : ''}: {c.proposal.sentence}
                  </p>
                  <p>
                    동의 {c.proposal.agree.join('·') || '-'} · 반대 {c.proposal.object.map((o) => o.member).join('·') || '-'} · 미응답 {c.proposal.pending.join('·') || '-'}
                    {c.proposal.invalidatedOldVotes ? ` · 무효 처리된 이전 응답 ${c.proposal.invalidatedOldVotes}건` : ''}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PatrolCard({ p }: { p: Extract<Step, { kind: 'patrol' }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="row wrap">
        <span className="badge kiro">Kiro 봇 점검 {p.id}</span>
        <span className="chip sm">{p.receipt.model}</span>
        <span className="chip sm">{Math.round(p.receipt.ms / 1000)}초</span>
        <span className="chip sm">도구 {p.tools.length}회</span>
        {p.tools.some((t) => !t.ok) && <span className="chip sm bad">거부 {p.tools.filter((t) => !t.ok).length}회</span>}
        {p.receipt.credits !== null && <span className="chip sm">{p.receipt.credits} 크레딧</span>}
        {p.receipt.fallback && <span className="chip sm bad">다른 모델로 처리됨</span>}
      </div>
      {p.report && <p className="report">{p.report.summary}</p>}
      <ul className="tools">
        {p.tools.map((t) => (
          <li key={t.seq} className={t.ok ? '' : 'denied'}>
            <code>{t.tool}</code> <span className="muted">{TOOL_KO[t.tool] ?? ''}</span> — {t.summary}
          </li>
        ))}
      </ul>
      {p.report && p.report.waitingFor.length > 0 && <p className="small muted">기다리는 것: {p.report.waitingFor.join(' / ')}</p>}
      <button className="link" onClick={() => setOpen((o) => !o)}>
        {open ? '접기' : '실행 영수증 보기'}
      </button>
      {open && (
        <div className="small receipt">
          <p>엔진 {p.receipt.engine} · 훅 실행 {p.receipt.hooks.length}회({[...new Set(p.receipt.hooks.map((h) => h.name))].join(', ')})</p>
          <pre>{p.receipt.finalText}</pre>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="mv">{value}</div>
      <div className="ml">{label}</div>
    </div>
  );
}
