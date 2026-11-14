// [R28][R30] 결제 경로 비교: 검증된 가격과 실제 청구액으로 같은 요금제를 비교한다.
import { useEffect, useState } from 'react';
import { CHANNEL_PRICES, compareChannels, listDifferences, PRICE_STATUS_LABEL, switchSteps } from '../domain/channelPrice';
import { formatWon } from '../domain/money';
import { CHANNEL_SHORT, type Channel } from '../domain/types';

const CHANNELS: Channel[] = ['app_store', 'google_play', 'web'];
const ALL_CHANNELS: Channel[] = [...CHANNELS, 'carrier', 'partner'];
const DIFFS = listDifferences(CHANNEL_PRICES);
const SERVICES = CHANNEL_PRICES.services;
const DEFAULT_KEY = DIFFS[0] ? `${DIFFS[0].service.id}|${DIFFS[0].service.plan}` : `${SERVICES[0]?.id}|${SERVICES[0]?.plan}`;

function resolveKey(serviceId?: string, planId?: string): string {
  return SERVICES.some((service) => service.id === serviceId && service.plan === planId) ? `${serviceId}|${planId}` : DEFAULT_KEY;
}

function resolveChannel(value?: Channel): Channel {
  return value && ALL_CHANNELS.includes(value) ? value : 'app_store';
}

function resolveCharge(value?: number): string {
  return value === undefined ? '' : String(value);
}

export interface ChannelCheckProps {
  initialServiceId?: string;
  initialPlanId?: string;
  initialChannel?: Channel;
  initialMonthlyWon?: number;
}

export function ChannelCheck({ initialServiceId, initialPlanId, initialChannel, initialMonthlyWon }: ChannelCheckProps = {}) {
  const diffs = DIFFS;
  const services = SERVICES;
  const [key, setKey] = useState(() => resolveKey(initialServiceId, initialPlanId));
  const [channel, setChannel] = useState<Channel>(() => resolveChannel(initialChannel));
  const [charged, setCharged] = useState(() => resolveCharge(initialMonthlyWon));

  useEffect(() => {
    setKey(resolveKey(initialServiceId, initialPlanId));
    setChannel(resolveChannel(initialChannel));
    setCharged(resolveCharge(initialMonthlyWon));
  }, [initialServiceId, initialPlanId, initialChannel, initialMonthlyWon]);
  const [serviceId, planId] = key.split('|') as [string, string];
  const sp = CHANNEL_PRICES.services.find((s) => s.id === serviceId && s.plan === planId);
  const chargedText = charged.trim();
  const chargedNum = chargedText ? Number(chargedText.replace(/,/g, '')) : null;
  const invalidCharge = chargedText !== '' && (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(chargedText) || !Number.isSafeInteger(chargedNum) || chargedNum === null || chargedNum <= 0);
  const c = invalidCharge ? null : compareChannels(CHANNEL_PRICES, serviceId, planId, channel, chargedNum);
  const steps = c?.status === 'cheaper_available' ? switchSteps(serviceId, channel, c.cheapest!.channel, c.cheapest!.channel === 'web' ? c.cheapest!.source_url : null) : [];
  const why: Record<string, string> = { no_price_data: '이 요금제의 가격 자료가 없어요.', channel_unknown: '결제 경로를 골라 주세요.', current_price_unknown: '이 경로는 가격 확인이 필요해요. 내 청구액을 입력해 비교하세요.', no_verified_alternative: '다른 경로의 확인된 가격이 없어 비교를 보류해요.' };

  return (
    <section className="grid2" aria-label="결제 경로 비교">
      <div className="card">
        <div className="section-head">
          <p className="eyebrow">내 구독 가격 비교</p>
          <h2>어디서 결제하면 나을까요?</h2>
        </div>
        <label className="field">
          서비스·요금제
          <select value={key} onChange={(e) => { setKey(e.target.value); setCharged(''); }}>
            {services.map((s) => (
              <option key={`${s.id}|${s.plan}`} value={`${s.id}|${s.plan}`}>
                {s.name} {s.plan_label}
              </option>
            ))}
          </select>
        </label>
        <p className="small">지금 결제하는 곳</p>
        <div className="action-row row wrap" role="group" aria-label="지금 결제 경로">
          {CHANNELS.map((ch) => (
            <button type="button" key={ch} className={channel === ch ? 'btn primary' : 'btn'} aria-pressed={channel === ch} onClick={() => setChannel(ch)}>
              {CHANNEL_SHORT[ch]}
            </button>
          ))}
        </div>
        <label className="field">
          내 월 청구액 (선택, 원)
          <input inputMode="numeric" value={charged} placeholder="예: 19500" aria-invalid={invalidCharge} aria-describedby={invalidCharge ? 'channel-charge-error' : undefined} onChange={(e) => setCharged(e.target.value)} />
        </label>

        {invalidCharge && <p id="channel-charge-error" className="warn" role="alert">월 청구액은 양수인 원 단위 숫자로 입력해 주세요. 올바른 값을 입력할 때까지 비교를 보류해요.</p>}
        {c && <div role="status" aria-live="polite" aria-atomic="true">
          <p className="small">{CHANNEL_SHORT[channel]} 월 요금 · {c.currentBasis === 'charge' ? '내 청구액' : '공개 표시가격'}</p>
          <p className="result-amount">{c.currentMonthly === null ? '확인 필요' : formatWon(c.currentMonthly)}</p>
          {c.status === 'cheaper_available' ? (
            <div className="verdict good">
              <p>월 표시가격 차이 <strong>{formatWon(c.monthlyDiff!)}</strong></p>
              <p>{CHANNEL_SHORT[c.cheapest!.channel]} 월 {formatWon(c.cheapest!.monthly!)} · 같은 가격을 유지하면 12개월 환산 {formatWon(c.annualDiff!)}</p>
            </div>
          ) : (
            <p className={`verdict ${c.status === 'already_cheapest' ? 'good' : ''}`}>
              {c.status === 'already_cheapest' ? '지금 경로가 가장 저렴하거나 같은 가격이에요.' : c.currentBasis !== 'charge' && c.current?.comparable === false ? '비교 조건 확인 중이에요. 표시기간·세금 등의 조건이 확인될 때까지 차액 계산을 보류해요.' : c.reasons.map((reason) => why[reason] ?? '가격 정보를 확인한 뒤 비교해 주세요.').join(' ')}
            </p>
          )}
        </div>}
        {c?.legacyWarning && <p className="warn small">경로를 옮기면 기존 요금 자격을 잃을 수 있어요. 재가입 손익을 먼저 확인하세요.</p>}
        <p className="muted small">표시가격 차이는 실제 절감액이나 연간권 가격이 아니에요. 결제 전 내 구독 화면의 총액을 확인하세요.</p>
      </div>

      <div className="card">
        <h2>전환 안내와 가격 자료</h2>
        {c?.status === 'cheaper_available' && (
          <details className="disclosure">
            <summary>{CHANNEL_SHORT[c.cheapest!.channel]} 결제로 옮기는 방법</summary>
            <ol className="compact-list small">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </details>
        )}
        <details className="disclosure">
          <summary>선택한 요금제의 가격 근거와 비교 조건</summary>
          {sp?.note && <p className="muted small">{sp.note}</p>}
          <p className="muted small">자료 확인: {CHANNEL_PRICES.generated_at?.slice(0, 16).replace('T', ' ') ?? '미확인'}. 공식 가격·한국 App Store의 앱 내 구입 목록 기준이에요.</p>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="선택한 요금제의 결제 경로별 가격">
            <table className="tbl small">
              <thead>
                <tr><th scope="col">경로</th><th scope="col">표시가격</th><th scope="col">출처 확인</th><th scope="col">비교 조건</th><th scope="col">근거</th></tr>
              </thead>
              <tbody>
                {sp?.prices.map((price) => {
                  const comparable = price.status === 'verified' && price.comparable !== false && (price.currency ?? 'KRW') === 'KRW' && price.monthly !== null && Number.isSafeInteger(price.monthly) && price.monthly > 0;
                  return (
                    <tr key={price.channel}>
                      <td>{CHANNEL_SHORT[price.channel]}</td>
                      <td>{price.monthly === null ? '미확인' : (price.currency ?? 'KRW') === 'KRW' ? formatWon(price.monthly) : `${price.monthly.toLocaleString('ko-KR')} ${price.currency}`}</td>
                      <td><span className={`badge ${price.status === 'verified' ? 'good' : ''}`}>{PRICE_STATUS_LABEL[price.status]}</span></td>
                      <td>
                        <span className="badge">{price.comparable === false ? '비교 조건 확인 중' : comparable ? '월 요금 비교 가능' : '비교 보류'}</span>
                        {price.comparison_note && <p className="small muted">{price.comparison_note}</p>}
                      </td>
                      <td>{price.source_url ? <a href={price.source_url} target="_blank" rel="noreferrer">출처</a> : '미확인'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
        <details className="disclosure">
          <summary>전체 요금제의 표시가격 차이 ({diffs.length}개)</summary>
          {diffs.length === 0 && <p className="muted">확인된 가격 차이가 아직 없어요.</p>}
          <p className="small muted">요금제 이름을 누르면 위 비교 항목이 바뀌어요.</p>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="전체 요금제 가격 차이">
            <table className="tbl">
              <thead>
                <tr><th scope="col">서비스·요금제</th><th scope="col">높은 월 가격</th><th scope="col">낮은 월 가격</th><th scope="col">월 차이</th><th scope="col">12개월 환산</th></tr>
              </thead>
              <tbody>
                {diffs.map((difference) => {
                  const optionKey = `${difference.service.id}|${difference.service.plan}`;
                  return (
                    <tr key={optionKey} className={key === optionKey ? 'hl' : ''}>
                      <td>
                        <button type="button" className="btn" aria-pressed={key === optionKey} onClick={() => setKey(optionKey)}>
                          {difference.service.name} {difference.service.plan_label}
                        </button>
                      </td>
                      <td>{CHANNEL_SHORT[difference.max.channel]} {formatWon(difference.max.monthly!)}</td>
                      <td>{CHANNEL_SHORT[difference.min.channel]} {formatWon(difference.min.monthly!)}</td>
                      <td className="neg">{formatWon(difference.monthlyDiff)}</td>
                      <td className="neg">{formatWon(difference.monthlyDiff * 12)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">12개월 환산은 월 차액 × 12예요. 요금제·지역·프로모션·세금·환율에 따라 가격이 달라질 수 있어요.</p>
        </details>
      </div>
    </section>
  );
}
