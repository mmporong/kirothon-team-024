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
    <section className="grid2" aria-label="해지 후 재가입 손익 계산">
      <div className="card">
        <div className="section-head">
          <p className="eyebrow">기존 요금이 있는 구독만 · 보조 계산</p>
          <h2>쉬었다 돌아오면 얼마일까요?</h2>
        </div>
        <p className="small">해지하거나 요금제를 바꾸면 기존 요금 자격을 잃을 수 있어요. 내 계정에서 유지 중인 요금을 확인하세요.</p>
        <div className="action-row row wrap" role="group" aria-label="디즈니+ 요금제">
          {PLANS.map((planOption) => (
            <button type="button" key={planOption.id} className={planId === planOption.id ? 'btn primary' : 'btn'} aria-pressed={planId === planOption.id} onClick={() => pickPlan(planOption.id)}>
              {planOption.label}
            </button>
          ))}
        </div>
        <div className="field-grid">
          <label className="field">
            지금 내는 월 요금 (원)
            <input inputMode="numeric" value={oldWon} aria-invalid={!r.ok && r.field === 'oldWon'} onChange={(e) => setOldWon(e.target.value)} />
          </label>
          <label className="field">
            비교 기간: <b>{horizon}개월</b>
            <input type="range" min={1} max={24} value={horizon} aria-valuetext={`${horizon}개월`} onChange={(e) => setHorizon(Number(e.target.value))} />
          </label>
          <label className="field">
            쉬는 기간: <b>{Math.min(k, horizon)}개월</b>
            <input type="range" min={0} max={horizon} value={Math.min(k, horizon)} aria-valuetext={`${Math.min(k, horizon)}개월`} onChange={(e) => setK(Number(e.target.value))} />
          </label>
        </div>
        <p className="small">복귀 요금은 월 <strong>{formatWon(plan.new_monthly!)}</strong> · {isExample ? '현재 입력은 공개 요금 예시예요.' : '입력한 월 요금으로 비교해요.'}</p>
        {r.ok ? (
          <div role="status" aria-live="polite" aria-atomic="true">
            <p className={`verdict ${r.value.delta > 0 ? 'good' : r.value.delta < 0 ? 'bad' : ''}`}>{r.value.verdict}</p>
            <p className="small">구독료가 더 적어지는 시작점: <strong>{r.value.breakEven}개월 이상 쉬기</strong></p>
          </div>
        ) : (
          <p className="warn" role="alert">{CALC_ERROR_TEXT[r.error]}</p>
        )}
        <p className="muted small">{horizon}개월 동안 두 요금이 고정된다는 가정이에요. 할인·환불·제휴 조건은 제외해요.</p>

        <details className="disclosure">
          <summary>쉬는 기간별 금액 표와 자세한 판정</summary>
          {r.ok ? (
            <>
              <p className="small">{r.value.advice}</p>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="쉬는 기간별 구독료 비교">
                <table className="tbl">
                  <thead>
                    <tr><th scope="col">쉬는 기간</th><th scope="col">계속 유지</th><th scope="col">쉬고 복귀</th><th scope="col">쉬기 손익</th></tr>
                  </thead>
                  <tbody>
                    {r.value.table.map((row) => (
                      <tr key={row.pauseMonths} className={row.pauseMonths === r.value.pauseMonths ? 'hl' : ''}>
                        <td>{row.pauseMonths}개월</td>
                        <td>{formatWon(row.keep)}</td>
                        <td>{formatWon(row.pause)}</td>
                        <td className={row.delta > 0 ? 'pos' : row.delta < 0 ? 'neg' : ''}>{formatSignedWon(row.delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="small">월 요금을 올바르게 입력하면 금액 표를 볼 수 있어요.</p>}
        </details>
      </div>

      <div className="card">
        <h2>다른 선택과 계산 근거</h2>
        <details className="disclosure">
          <summary>연간권·광고형 등 대안 비교 ({horizon}개월)</summary>
          <div className="row wrap" role="group" aria-label="대안에 필요한 조건">
            {(Object.keys(NEED_LABEL) as Need[]).map((need) => (
              <label key={need} className="check">
                <input type="checkbox" checked={needs.includes(need)} onChange={() => toggle(need)} /> {NEED_LABEL[need]}
              </label>
            ))}
          </div>
          <ul className="opts">
            {opts.map((option) => (
              <li key={option.kind} className={`opt ${option.fit}`}>
                <div className="opt-head">
                  <b>{option.title}</b>
                  <span className="amt">{option.total === null ? '미확인' : formatWon(option.total)}</span>
                </div>
                <p className="small muted">{option.detail}</p>
                <p className="small">
                  {option.fit === 'unfit' ? <span className="badge bad">안 맞음: {option.unfitReasons.join(', ')}</span> : option.fit === 'unknown' ? <span className="badge">확인 필요</span> : <span className="badge good">요구 충족</span>}{' '}
                  {option.constraints.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
          {best && <p className="verdict good">조건에 맞는 가장 낮은 총액: {best.title}</p>}
          {!r.ok && <p className="small">입력값을 확인하면 대안을 비교할 수 있어요.</p>}
          <p className="muted small">광고·화질·동시 시청 정보에는 미확인 값이 있어요. 가입 전 공식 요금제 표를 확인하세요.</p>
        </details>
        <details className="disclosure">
          <summary>계산 전제와 가격 출처</summary>
          <p className="small">디즈니+는 {pol.change_effective_date}부터 해지 후 재가입·멤버십 변경에 신규 요금을 적용해요.</p>
          <ul className="compact-list assume">{r.ok && r.value.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
          {r.ok && <p className="muted small">계산 기록: <code>{r.value.resultId}</code></p>}
        </details>
      </div>
    </section>
  );
}
