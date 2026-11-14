// [R28][R30] 결제 경로 비교: 같은 구독을 App Store·Google Play·웹 중 어디서 내느냐에 따른 가격 차이(검증된 가격만).
import { useMemo, useState } from 'react';
import { CHANNEL_PRICES, compareChannels, listDifferences, PRICE_STATUS_LABEL, switchSteps } from '../domain/channelPrice';
import { formatWon } from '../domain/money';
import { CHANNEL_SHORT, type Channel } from '../domain/types';

const CHANNELS: Channel[] = ['app_store', 'google_play', 'web'];

export function ChannelCheck() {
  const diffs = useMemo(() => listDifferences(CHANNEL_PRICES), []);
  const services = CHANNEL_PRICES.services.filter((s) => s.prices.some((p) => p.status === 'verified'));
  const [key, setKey] = useState(() => (diffs[0] ? `${diffs[0].service.id}|${diffs[0].service.plan}` : `${services[0]?.id}|${services[0]?.plan}`));
  const [channel, setChannel] = useState<Channel>('app_store');
  const [charged, setCharged] = useState('');
  const [serviceId, planId] = key.split('|') as [string, string];
  const sp = CHANNEL_PRICES.services.find((s) => s.id === serviceId && s.plan === planId);
  const chargedNum = charged.trim() ? Number(charged.replace(/,/g, '')) : null;
  const c = compareChannels(CHANNEL_PRICES, serviceId, planId, channel, Number.isSafeInteger(chargedNum) ? chargedNum : null);
  const steps = c.status === 'cheaper_available' ? switchSteps(serviceId, channel, c.cheapest!.channel, c.cheapest!.channel === 'web' ? c.cheapest!.source_url : null) : [];
  const why: Record<string, string> = { no_price_data: '이 요금제의 경로별 가격 자료가 없어요', channel_unknown: '결제 경로를 골라 주세요', current_price_unknown: '이 경로의 가격이 검증되지 않았어요. 내 청구액을 넣으면 비교할 수 있어요', no_verified_alternative: '다른 경로의 검증된 가격이 없어요' };

  return (
    <section className="grid2">
      <div className="card">
        <h2>App Store로 내면 더 비쌀 수 있어요</h2>
        <p className="muted small">공식 가격 페이지와 App Store 한국 앱 페이지의 '앱 내 구입' 목록으로 확인한 가격만 비교해요(확인 {CHANNEL_PRICES.generated_at?.slice(0, 16).replace('T', ' ') ?? '-'}).</p>
        {diffs.length === 0 && <p className="muted">검증된 경로별 가격 차이가 아직 없어요.</p>}
        <table className="tbl">
          <thead>
            <tr>
              <th>서비스·요금제</th>
              <th>비싼 경로</th>
              <th>싼 경로</th>
              <th>월 차이</th>
              <th>1년</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => (
              <tr key={`${d.service.id}|${d.service.plan}`} className={key === `${d.service.id}|${d.service.plan}` ? 'hl' : ''} onClick={() => setKey(`${d.service.id}|${d.service.plan}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <b>{d.service.name}</b> {d.service.plan_label}
                </td>
                <td>
                  {CHANNEL_SHORT[d.max.channel]} {formatWon(d.max.monthly!)}
                </td>
                <td>
                  {CHANNEL_SHORT[d.min.channel]} {formatWon(d.min.monthly!)}
                </td>
                <td className="neg">{formatWon(d.monthlyDiff)}</td>
                <td className="neg">{formatWon(d.monthlyDiff * 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">가격은 요금제·지역·프로모션·환율 정책에 따라 바뀔 수 있어요. 결제 전 내 구독 화면의 금액을 확인해 주세요.</p>
      </div>
      <div className="card">
        <h2>내 구독 확인하기</h2>
        <label className="field">
          서비스·요금제
          <select value={key} onChange={(e) => setKey(e.target.value)}>
            {services.map((s) => (
              <option key={`${s.id}|${s.plan}`} value={`${s.id}|${s.plan}`}>
                {s.name} {s.plan_label}
              </option>
            ))}
          </select>
        </label>
        <div className="row wrap">
          <span className="small">지금 결제 경로</span>
          {CHANNELS.map((ch) => (
            <button key={ch} className={channel === ch ? 'chip on' : 'chip'} onClick={() => setChannel(ch)}>
              {CHANNEL_SHORT[ch]}
            </button>
          ))}
        </div>
        <label className="field">
          내 청구액(선택, 원)
          <input inputMode="numeric" value={charged} placeholder="예: 19500" onChange={(e) => setCharged(e.target.value)} />
        </label>
        {c.status === 'cheaper_available' ? (
          <>
            <p className="verdict bad">
              {CHANNEL_SHORT[channel]} 월 {formatWon(c.currentMonthly!)}({c.currentBasis === 'charge' ? '내 청구액' : '공개 가격'}) → {CHANNEL_SHORT[c.cheapest!.channel]} 월 {formatWon(c.cheapest!.monthly!)}: 월 {formatWon(c.monthlyDiff!)}, 1년 {formatWon(c.annualDiff!)} 더 내고 있어요.
            </p>
            {c.legacyWarning && <p className="warn small">이 구독은 기존 요금 자격이 있어요. 경로를 옮기면 새로 가입하는 것이라 신규 요금이 적용될 수 있어요(손익 계산기 탭에서 확인).</p>}
            <h3>옮기는 방법</h3>
            <ol className="small">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </>
        ) : (
          <p className={`verdict ${c.status === 'already_cheapest' ? 'good' : ''}`}>{c.status === 'already_cheapest' ? '지금 경로가 가장 싸거나 같아요.' : c.reasons.map((r) => why[r] ?? r).join(' / ')}</p>
        )}
        <h3>경로별 가격 근거</h3>
        <table className="tbl small">
          <tbody>
            {sp?.prices.map((p) => (
              <tr key={p.channel}>
                <td>{CHANNEL_SHORT[p.channel]}</td>
                <td>{p.monthly === null ? '-' : formatWon(p.monthly)}</td>
                <td>
                  <span className={`badge ${p.status === 'verified' ? 'good' : ''}`}>{PRICE_STATUS_LABEL[p.status]}</span>
                </td>
                <td>
                  {p.source_url ? (
                    <a href={p.source_url} target="_blank" rel="noreferrer">
                      출처
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
