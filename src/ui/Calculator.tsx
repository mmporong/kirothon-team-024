// [R19][R20][R21] 손익 계산기: 같은 도메인 함수(src/domain)를 그대로 쓴다.
import { useMemo, useState } from 'react';
import { cheapestFit, compareAlternatives, NEED_LABEL, type Need } from '../domain/alternatives';
import { formatSignedWon, formatWon } from '../domain/money';
import { getPlan, getPolicy } from '../domain/pricePolicy';
import { CALC_ERROR_TEXT, computeScenario } from '../domain/resubBreakeven';

const PLANS = [
  { id: 'standard', label: '스탠다드' },
  { id: 'premium', label: '프리미엄' },
] as const;

export function Calculator() {
  const pol = getPolicy('disney_plus_kr')!;
  const [planId, setPlanId] = useState<'standard' | 'premium'>('standard');
  const plan = getPlan('disney_plus_kr', planId)!;
  const [oldWon, setOldWon] = useState<string>(String(plan.legacy_monthly));
  const [horizon, setHorizon] = useState(12);
  const [k, setK] = useState(1);
  const [needs, setNeeds] = useState<Need[]>([]);

  const pickPlan = (id: 'standard' | 'premium') => {
    setPlanId(id);
    setOldWon(String(getPlan('disney_plus_kr', id)!.legacy_monthly));
  };
  const old = Number(oldWon.replace(/,/g, ''));
  const isExample = old === plan.legacy_monthly;
  const r = useMemo(
    () =>
      computeScenario({
        oldWon: old,
        newWon: plan.new_monthly!,
        horizon,
        pauseMonths: Math.min(k, horizon),
        serviceId: 'disney_plus_kr',
        planId,
        serviceName: `${pol.name} ${planId === 'standard' ? '스탠다드' : '프리미엄'}`,
        effectiveDate: pol.change_effective_date,
        policyCheckedAt: pol.checked_at,
        sourceUrl: pol.sources[0] ?? null,
        inputKind: isExample ? 'example' : 'confirmed',
      }),
    [old, plan.new_monthly, horizon, k, planId, pol, isExample],
  );
  const opts = r.ok ? compareAlternatives({ serviceId: 'disney_plus_kr', planId, oldWon: old, horizon, pauseMonths: r.value.pauseMonths, pauseTotal: r.value.pause, needs }) : [];
  const best = cheapestFit(opts);
  const toggle = (n: Need) => setNeeds((xs) => (xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n]));

  return (
    <section className="grid2">
      <div className="card">
        <h2>해지했다가 다시 가입하면? (보조)</h2>
        <p className="small">기존 요금으로 이용 중인 구독만 해당해요. 해지하거나 결제 경로를 옮기면 새로 가입하는 것이라 신규 요금이 붙을 수 있어요.</p>
        <p className="muted">
          디즈니+는 {pol.change_effective_date}부터 해지 후 재가입·멤버십 변경에 신규 요금을 적용해요. 같은 기간으로 계속 유지와 쉬었다 돌아오기를 비교해요.
        </p>
        <div className="row">
          {PLANS.map((p) => (
            <button key={p.id} className={planId === p.id ? 'chip on' : 'chip'} onClick={() => pickPlan(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="field">
          지금 내는 월 요금(원)
          <input inputMode="numeric" value={oldWon} onChange={(e) => setOldWon(e.target.value)} />
        </label>
        <p className="muted small">재가입하면 월 {formatWon(plan.new_monthly!)} (공개 정규 요금)</p>
        <label className="field">
          비교 기간: <b>{horizon}개월</b>
          <input type="range" min={1} max={24} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
        </label>
        <label className="field">
          쉬는 개월: <b>{Math.min(k, horizon)}개월</b>
          <input type="range" min={0} max={horizon} value={Math.min(k, horizon)} onChange={(e) => setK(Number(e.target.value))} />
        </label>
        {r.ok ? (
          <>
            <p className={`verdict ${r.value.delta > 0 ? 'good' : r.value.delta < 0 ? 'bad' : ''}`}>{r.value.verdict}</p>
            <p className="advice">{r.value.advice}</p>
            <table className="tbl">
              <thead>
                <tr>
                  <th>쉬는 개월</th>
                  <th>계속 유지</th>
                  <th>쉬고 복귀</th>
                  <th>쉬기 손익</th>
                </tr>
              </thead>
              <tbody>
                {r.value.table.slice(0, Math.min(horizon, 6) + 1).map((row) => (
                  <tr key={row.pauseMonths} className={row.pauseMonths === r.value.pauseMonths ? 'hl' : ''}>
                    <td>{row.pauseMonths}개월</td>
                    <td>{formatWon(row.keep)}</td>
                    <td>{formatWon(row.pause)}</td>
                    <td className={row.delta > 0 ? 'pos' : row.delta < 0 ? 'neg' : ''}>{formatSignedWon(row.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">손익분기: {r.value.breakEven}개월 이상 쉬면 이득 · 결과 ID {r.value.resultId}</p>
          </>
        ) : (
          <p className="warn">{CALC_ERROR_TEXT[r.error]}</p>
        )}
      </div>
      <div className="card">
        <h2>대안 비교 ({horizon}개월 총액)</h2>
        <div className="row wrap">
          {(Object.keys(NEED_LABEL) as Need[]).map((n) => (
            <label key={n} className="check">
              <input type="checkbox" checked={needs.includes(n)} onChange={() => toggle(n)} /> {NEED_LABEL[n]}
            </label>
          ))}
        </div>
        <ul className="opts">
          {opts.map((o) => (
            <li key={o.kind} className={`opt ${o.fit}`}>
              <div className="opt-head">
                <b>{o.title}</b>
                <span className="amt">{o.total === null ? '미확인' : formatWon(o.total)}</span>
              </div>
              <div className="small muted">{o.detail}</div>
              <div className="small">
                {o.fit === 'unfit' ? <span className="badge bad">안 맞음: {o.unfitReasons.join(', ')}</span> : o.fit === 'unknown' ? <span className="badge">확인 필요</span> : <span className="badge good">요구 충족</span>}{' '}
                {o.constraints.join(' · ')}
              </div>
            </li>
          ))}
        </ul>
        {best && <p className="verdict good">요구에 맞는 가장 싼 안: {best.title}</p>}
        <h3>계산 전제</h3>
        <ul className="assume">{r.ok && r.value.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="muted small">권리(광고·화질·동시 시청) 표기는 확인 전 값이 섞여 있어요. 가입 전 공식 요금제 표를 확인해 주세요.</p>
      </div>
    </section>
  );
}
